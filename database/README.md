# AuraBI bank — test database

A complete, realistic retail/SME bank operating in **Cameroon (XAF)** and **France (EUR)**
over **2024–2025**, loaded automatically into PostgreSQL on the first `docker compose up`
and registered in Zetaris as the datasource **`AURABI_BANK`**.

The data is generated deterministically (`setseed`), so every install contains exactly the
same rows and the numbers below hold everywhere. All people, companies and merchants are
fictional.

## What is inside

| Table | Rows | Content |
|---|---:|---|
| `branches` | 25 | 15 Cameroonian and 10 French branches |
| `customers` | 6,000 | Identity and contact details (PII), segment, KYC status, risk rating, income |
| `accounts` | 9,165 | Checking, savings, business and term-deposit accounts, valid IBANs (mod-97) |
| `cards` | 6,059 | Debit and credit cards (masked numbers), limits, status |
| `merchants` | 400 | 16 categories (grocery, fuel, travel, crypto…), domestic and foreign |
| `transactions` | 263,243 | Card payments, ATM, transfers, mobile money, direct debits, salaries |
| `loans` | 1,800 | Mortgages, personal, auto, SME and student loans with real annuities |
| `loan_payments` | 28,609 | 2024–2025 instalments: paid, late or missed |
| `fx_rates` | 2,924 | Daily EUR rates (XAF pegged at 655.957) |
| `fraud_cases` | 1,290 | Fraud ground truth: confirmed cases and false positives |

Views: `v_monthly_kpis`, `v_customer_360`, `v_branch_performance`, `v_merchant_category_spend`.
Every amount has an `amount_eur` column so currencies can be compared.

## Connect

```bash
# psql inside the container
docker compose exec db psql -U datapipe -d datapipe

# or any SQL client: host localhost, port 5433, database datapipe, user datapipe, password datapipe
```

Through Zetaris (web UI on http://localhost:3000, SQL editor), the same tables are
`AURABI_BANK.<table>`, read with a read-only database role.

## Try it

```sql
SET search_path = bank;

-- Monthly business activity
SELECT month, transactions, debit_volume_eur, fraud_loss_eur FROM v_monthly_kpis ORDER BY month;

-- Where the money is spent
SELECT category, volume_eur FROM v_merchant_category_spend WHERE year = 2025 ORDER BY volume_eur DESC;

-- Fraud losses by type
SELECT fraud_type, count(*), round(sum(loss_amount_eur)) AS loss_eur
FROM fraud_cases WHERE confirmed GROUP BY fraud_type ORDER BY loss_eur DESC;

-- Riskiest branches
SELECT branch_code, city, loans, default_rate_pct FROM v_branch_performance ORDER BY default_rate_pct DESC;
```

## Answer key: deliberate problems hidden in the data

The data contains realistic defects for the AI agents (Profiler, Guardian) to find. The
answer key lives in `bank_meta.data_quality_catalog`, which Zetaris **cannot** read, so the
AI has to discover them on its own.

| Check | Problem | Expected |
|---|---|---:|
| Q1 | Duplicate transactions (double posting) | 35 |
| Q2 | Customers with a missing or malformed e-mail | 149 |
| Q3 | IBANs failing the ISO 13616 mod-97 check | 25 |
| Q4 | Customers under 18 holding a credit card | 15 |
| Q5 | Transactions dated after 2025-12-31 | 12 |
| Q6 | DORMANT accounts with activity in Q4 2025 | 30 |
| Q7 | Transactions with a negative amount | 20 |
| Q8 | Accounts overdrawn beyond their authorised overdraft | 15 |
| Q9 | Customers with REJECTED KYC still transacting | 46 |
| F1 | Confirmed fraud cases | 987 |

Fraud patterns present: card-not-present (night, foreign, high-risk merchants), card testing
(bursts of tiny payments then a large one), account takeover (large night-time mobile
transfers), ATM skimming abroad, and AML structuring (deposits just under €10,000).

Check the database against the key:

```bash
docker compose exec db psql -U datapipe -d datapipe -c \
  "SELECT check_id, issue, expected_count FROM bank_meta.data_quality_catalog ORDER BY check_id"
```

`docker compose run --rm verify` re-runs every detection query and compares it to the key.

## Reset

```bash
docker compose down -v && docker compose up -d
```

`-v` deletes the database volume; the next start rebuilds the bank from `database/init/`.
