-- =============================================================================
-- AuraBI bank — analytical views, ETL compatibility view, data-quality catalog
-- =============================================================================

SET search_path = bank;

-- Monthly business KPIs (EUR).
CREATE VIEW v_monthly_kpis AS
SELECT date_trunc('month', t.txn_ts)::date                                              AS month,
       count(*)                                                                         AS transactions,
       count(*) FILTER (WHERE t.status = 'COMPLETED')                                   AS completed,
       round(sum(t.amount_eur) FILTER (WHERE t.status = 'COMPLETED' AND t.direction = 'DEBIT'), 2)  AS debit_volume_eur,
       round(sum(t.amount_eur) FILTER (WHERE t.status = 'COMPLETED' AND t.direction = 'CREDIT'), 2) AS credit_volume_eur,
       count(DISTINCT a.customer_id)                                                    AS active_customers,
       round(100.0 * count(*) FILTER (WHERE t.status = 'DECLINED') / count(*), 2)      AS declined_pct,
       round(coalesce(sum(f.loss_amount_eur), 0), 2)                                    AS fraud_loss_eur
FROM transactions t
JOIN accounts a USING (account_id)
LEFT JOIN fraud_cases f ON f.transaction_id = t.transaction_id AND f.confirmed
WHERE t.txn_ts < timestamp '2026-01-01'
GROUP BY 1;

-- One row per customer.
CREATE VIEW v_customer_360 AS
WITH acc AS (
    SELECT a.customer_id, count(*) AS n_accounts, round(sum(a.balance / r.rate), 2) AS total_balance_eur
    FROM accounts a JOIN fx_rates r ON r.rate_date = date '2025-12-31' AND r.quote = a.currency
    GROUP BY a.customer_id
), crd AS (
    SELECT a.customer_id, count(*) AS n_cards
    FROM cards k JOIN accounts a USING (account_id) GROUP BY a.customer_id
), tx AS (
    SELECT a.customer_id, count(*) AS txn_count_2025,
           round(sum(t.amount_eur) FILTER (WHERE t.direction = 'DEBIT' AND t.status = 'COMPLETED'), 2) AS spend_2025_eur
    FROM transactions t JOIN accounts a USING (account_id)
    WHERE t.txn_ts >= timestamp '2025-01-01' AND t.txn_ts < timestamp '2026-01-01'
    GROUP BY a.customer_id
), ln AS (
    SELECT l.customer_id, count(*) AS n_loans,
           round(sum(l.outstanding_balance / r.rate), 2) AS outstanding_eur,
           (ARRAY['REPAID','CURRENT','LATE_30','LATE_90','DEFAULT'])[max(
               CASE l.status WHEN 'REPAID' THEN 1 WHEN 'CURRENT' THEN 2 WHEN 'LATE_30' THEN 3
                             WHEN 'LATE_90' THEN 4 ELSE 5 END)] AS worst_status
    FROM loans l JOIN fx_rates r ON r.rate_date = date '2025-12-31' AND r.quote = l.currency
    GROUP BY l.customer_id
), fr AS (
    SELECT a.customer_id, count(*) AS confirmed_fraud_cases
    FROM fraud_cases f JOIN transactions t USING (transaction_id) JOIN accounts a USING (account_id)
    WHERE f.confirmed GROUP BY a.customer_id
)
SELECT c.customer_id, c.first_name, c.last_name, c.segment, c.country_code, c.city,
       c.kyc_status, c.risk_rating, b.branch_code,
       coalesce(acc.n_accounts, 0)           AS n_accounts,
       coalesce(acc.total_balance_eur, 0)    AS total_balance_eur,
       coalesce(crd.n_cards, 0)              AS n_cards,
       coalesce(tx.txn_count_2025, 0)        AS txn_count_2025,
       coalesce(tx.spend_2025_eur, 0)        AS spend_2025_eur,
       coalesce(ln.n_loans, 0)               AS n_loans,
       coalesce(ln.outstanding_eur, 0)       AS loan_outstanding_eur,
       ln.worst_status                       AS worst_loan_status,
       coalesce(fr.confirmed_fraud_cases, 0) AS confirmed_fraud_cases
FROM customers c
JOIN branches b USING (branch_id)
LEFT JOIN acc USING (customer_id)
LEFT JOIN crd USING (customer_id)
LEFT JOIN tx  USING (customer_id)
LEFT JOIN ln  USING (customer_id)
LEFT JOIN fr  USING (customer_id);

-- Deposits, loan book and default rate per branch (EUR).
CREATE VIEW v_branch_performance AS
WITH dep AS (
    SELECT a.branch_id, round(sum(GREATEST(a.balance, 0) / r.rate), 2) AS deposits_eur
    FROM accounts a JOIN fx_rates r ON r.rate_date = date '2025-12-31' AND r.quote = a.currency
    WHERE a.status <> 'CLOSED' GROUP BY a.branch_id
), lb AS (
    SELECT c.branch_id, count(*) AS loans,
           round(sum(l.outstanding_balance / r.rate), 2) AS loan_book_eur,
           round(100.0 * count(*) FILTER (WHERE l.status = 'DEFAULT') / count(*), 2) AS default_rate_pct
    FROM loans l JOIN customers c USING (customer_id)
    JOIN fx_rates r ON r.rate_date = date '2025-12-31' AND r.quote = l.currency
    GROUP BY c.branch_id
)
SELECT b.branch_code, b.name, b.city, b.country_code, b.region,
       (SELECT count(*) FROM customers c WHERE c.branch_id = b.branch_id) AS customers,
       coalesce(dep.deposits_eur, 0) AS deposits_eur,
       coalesce(lb.loans, 0) AS loans,
       coalesce(lb.loan_book_eur, 0) AS loan_book_eur,
       coalesce(lb.default_rate_pct, 0) AS default_rate_pct
FROM branches b
LEFT JOIN dep USING (branch_id)
LEFT JOIN lb USING (branch_id);

-- Card and direct-debit spend by merchant category and year (EUR).
CREATE VIEW v_merchant_category_spend AS
SELECT m.category,
       extract(year FROM t.txn_ts)::int AS year,
       count(*)                          AS transactions,
       round(sum(t.amount_eur), 2)       AS volume_eur,
       round(avg(t.amount_eur), 2)       AS avg_ticket_eur
FROM transactions t
JOIN merchants m USING (merchant_id)
WHERE t.status = 'COMPLETED' AND t.txn_ts < timestamp '2026-01-01'
GROUP BY m.category, extract(year FROM t.txn_ts);

-- -----------------------------------------------------------------------------
-- ora_demo.transactions — the flat table the backend ETL demo reads
-- (app/etl/sql_planner.py defaults to it). Now backed by the real bank data.
-- -----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS ora_demo;

CREATE VIEW ora_demo.transactions AS
SELECT t.transaction_id                         AS id,
       t.txn_ts::date                           AS transaction_date,
       c.email                                  AS client_email,
       c.first_name || ' ' || c.last_name       AS client_name,
       a.iban,
       t.amount,
       t.currency,
       lower(coalesce(m.category, t.channel))   AS category,
       t.country_code
FROM bank.transactions t
JOIN bank.accounts a  USING (account_id)
JOIN bank.customers c USING (customer_id)
LEFT JOIN bank.merchants m USING (merchant_id);

-- -----------------------------------------------------------------------------
-- bank_meta — answer key for the deliberate defects. Not granted to Zetaris,
-- so the AI has to find these issues on its own.
-- -----------------------------------------------------------------------------
CREATE SCHEMA bank_meta;

CREATE TABLE bank_meta.data_quality_catalog (
    check_id        VARCHAR(4)  PRIMARY KEY,
    issue           VARCHAR(160) NOT NULL,
    detection_sql   TEXT        NOT NULL,
    expected_count  BIGINT
);

INSERT INTO bank_meta.data_quality_catalog (check_id, issue, detection_sql) VALUES
('Q1', 'Duplicate transactions (same account, time, amount, merchant)',
 $q$SELECT count(*) FROM (SELECT account_id, txn_ts, amount, merchant_id FROM bank.transactions
     GROUP BY 1, 2, 3, 4 HAVING count(*) > 1) d$q$),
('Q2', 'Customers with a missing or malformed e-mail',
 $q$SELECT count(*) FROM bank.customers WHERE email IS NULL OR email !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'$q$),
('Q3', 'Accounts whose IBAN fails the ISO 13616 mod-97 check',
 $q$SELECT count(*) FROM bank.accounts WHERE
     (substr(iban, 5) || (ascii(substr(iban, 1, 1)) - 55)::text || (ascii(substr(iban, 2, 1)) - 55)::text
      || substr(iban, 3, 2))::numeric % 97 <> 1$q$),
('Q4', 'Customers under 18 holding a credit card',
 $q$SELECT count(DISTINCT c.customer_id) FROM bank.customers c JOIN bank.accounts a USING (customer_id)
     JOIN bank.cards k USING (account_id) WHERE k.card_type = 'CREDIT' AND age(date '2025-12-31', c.birth_date) < interval '18 years'$q$),
('Q5', 'Transactions dated in the future (after 2025-12-31)',
 $q$SELECT count(*) FROM bank.transactions WHERE txn_ts >= timestamp '2026-01-01'$q$),
('Q6', 'DORMANT accounts with completed activity in Q4 2025',
 $q$SELECT count(DISTINCT a.account_id) FROM bank.accounts a JOIN bank.transactions t USING (account_id)
     WHERE a.status = 'DORMANT' AND t.status = 'COMPLETED' AND t.txn_ts >= timestamp '2025-10-01'$q$),
('Q7', 'Transactions with a negative amount',
 $q$SELECT count(*) FROM bank.transactions WHERE amount < 0$q$),
('Q8', 'Accounts overdrawn beyond their authorised overdraft',
 $q$SELECT count(*) FROM bank.accounts WHERE balance < -overdraft_limit$q$),
('Q9', 'Customers with REJECTED KYC that still have completed transactions',
 $q$SELECT count(DISTINCT c.customer_id) FROM bank.customers c JOIN bank.accounts a USING (customer_id)
     JOIN bank.transactions t USING (account_id) WHERE c.kyc_status = 'REJECTED' AND t.status = 'COMPLETED'$q$),
('F1', 'Confirmed fraud cases',
 $q$SELECT count(*) FROM bank.fraud_cases WHERE confirmed$q$);

DO $$
DECLARE r record; n bigint;
BEGIN
    FOR r IN SELECT check_id, detection_sql FROM bank_meta.data_quality_catalog LOOP
        EXECUTE r.detection_sql INTO n;
        UPDATE bank_meta.data_quality_catalog SET expected_count = n WHERE check_id = r.check_id;
    END LOOP;
END $$;
