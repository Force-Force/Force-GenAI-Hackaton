-- =============================================================================
-- AuraBI bank — schema
-- A retail/SME bank operating in Cameroon (XAF) and France (EUR), 2024-2025.
-- Loaded once, on the first start of the database container.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS bank;
COMMENT ON SCHEMA bank IS 'AuraBI demo bank: customers, accounts, cards, transactions, loans, fraud ground truth';

SET search_path = bank;

CREATE TABLE branches (
    branch_id     SERIAL PRIMARY KEY,
    branch_code   VARCHAR(10)  NOT NULL UNIQUE,
    name          VARCHAR(120) NOT NULL,
    city          VARCHAR(80)  NOT NULL,
    country_code  CHAR(2)      NOT NULL,
    region        VARCHAR(60)  NOT NULL,
    opened_on     DATE         NOT NULL
);

CREATE TABLE customers (
    customer_id    SERIAL PRIMARY KEY,
    first_name     VARCHAR(60)  NOT NULL,
    last_name      VARCHAR(60)  NOT NULL,
    email          VARCHAR(160),                 -- PII (some missing / malformed on purpose)
    phone          VARCHAR(30),                  -- PII
    birth_date     DATE         NOT NULL,        -- PII
    national_id    VARCHAR(20)  NOT NULL,        -- PII
    address_line   VARCHAR(160),                 -- PII
    city           VARCHAR(80)  NOT NULL,
    country_code   CHAR(2)      NOT NULL,
    segment        VARCHAR(12)  NOT NULL CHECK (segment IN ('RETAIL','PREMIUM','PRIVATE','SME','CORPORATE')),
    kyc_status     VARCHAR(10)  NOT NULL CHECK (kyc_status IN ('VERIFIED','PENDING','EXPIRED','REJECTED')),
    risk_rating    VARCHAR(6)   NOT NULL CHECK (risk_rating IN ('LOW','MEDIUM','HIGH')),
    annual_income  NUMERIC(14,2) NOT NULL,       -- in the customer's home currency
    branch_id      INT          NOT NULL REFERENCES branches(branch_id),
    created_at     TIMESTAMP    NOT NULL
);

CREATE TABLE accounts (
    account_id       SERIAL PRIMARY KEY,
    customer_id      INT          NOT NULL REFERENCES customers(customer_id),
    iban             VARCHAR(34)  NOT NULL UNIQUE,  -- valid mod-97 checksum, except a few on purpose
    account_type     VARCHAR(12)  NOT NULL CHECK (account_type IN ('CHECKING','SAVINGS','BUSINESS','TERM_DEPOSIT')),
    currency         CHAR(3)      NOT NULL,
    opening_balance  NUMERIC(16,2) NOT NULL,
    balance          NUMERIC(16,2) NOT NULL,        -- opening_balance + completed flows
    overdraft_limit  NUMERIC(14,2) NOT NULL DEFAULT 0,
    status           VARCHAR(8)   NOT NULL CHECK (status IN ('ACTIVE','DORMANT','FROZEN','CLOSED')),
    opened_on        DATE         NOT NULL,
    closed_on        DATE,
    branch_id        INT          NOT NULL REFERENCES branches(branch_id)
);

CREATE TABLE cards (
    card_id             SERIAL PRIMARY KEY,
    account_id          INT          NOT NULL REFERENCES accounts(account_id),
    card_number_masked  VARCHAR(19)  NOT NULL,
    card_type           VARCHAR(8)   NOT NULL CHECK (card_type IN ('DEBIT','CREDIT','PREPAID')),
    network             VARCHAR(10)  NOT NULL CHECK (network IN ('VISA','MASTERCARD')),
    credit_limit        NUMERIC(14,2),
    status              VARCHAR(8)   NOT NULL CHECK (status IN ('ACTIVE','BLOCKED','EXPIRED','LOST')),
    issued_on           DATE         NOT NULL,
    expires_on          DATE         NOT NULL
);

CREATE TABLE merchants (
    merchant_id   SERIAL PRIMARY KEY,
    name          VARCHAR(120) NOT NULL,
    category      VARCHAR(12)  NOT NULL,
    mcc           CHAR(4)      NOT NULL,
    city          VARCHAR(80)  NOT NULL,
    country_code  CHAR(2)      NOT NULL,
    risk_level    VARCHAR(6)   NOT NULL CHECK (risk_level IN ('LOW','MEDIUM','HIGH'))
);

CREATE TABLE fx_rates (
    rate_date   DATE          NOT NULL,
    base        CHAR(3)       NOT NULL DEFAULT 'EUR',
    quote       CHAR(3)       NOT NULL,
    rate        NUMERIC(14,6) NOT NULL,          -- 1 EUR = rate * quote
    PRIMARY KEY (rate_date, quote)
);

CREATE TABLE transactions (
    transaction_id     BIGSERIAL PRIMARY KEY,
    account_id         INT          NOT NULL REFERENCES accounts(account_id),
    card_id            INT          REFERENCES cards(card_id),
    merchant_id        INT          REFERENCES merchants(merchant_id),
    counterparty_iban  VARCHAR(34),
    txn_ts             TIMESTAMP    NOT NULL,
    amount             NUMERIC(14,2) NOT NULL,      -- always positive, except a few on purpose
    currency           CHAR(3)      NOT NULL,
    amount_eur         NUMERIC(14,2),
    direction          VARCHAR(6)   NOT NULL CHECK (direction IN ('DEBIT','CREDIT')),
    channel            VARCHAR(12)  NOT NULL CHECK (channel IN ('CARD_POS','CARD_ONLINE','ATM','TRANSFER','MOBILE','DIRECT_DEBIT','SALARY')),
    status             VARCHAR(9)   NOT NULL CHECK (status IN ('COMPLETED','PENDING','DECLINED','REVERSED')),
    country_code       CHAR(2)      NOT NULL,
    description        VARCHAR(160)
);

CREATE TABLE loans (
    loan_id              SERIAL PRIMARY KEY,
    customer_id          INT          NOT NULL REFERENCES customers(customer_id),
    product              VARCHAR(10)  NOT NULL CHECK (product IN ('MORTGAGE','PERSONAL','AUTO','SME','STUDENT')),
    currency             CHAR(3)      NOT NULL,
    principal            NUMERIC(16,2) NOT NULL,
    interest_rate        NUMERIC(5,3) NOT NULL,     -- annual, percent
    term_months          INT          NOT NULL,
    start_date           DATE         NOT NULL,
    status               VARCHAR(8)   NOT NULL CHECK (status IN ('CURRENT','LATE_30','LATE_90','DEFAULT','REPAID')),
    outstanding_balance  NUMERIC(16,2) NOT NULL
);

CREATE TABLE loan_payments (
    payment_id   SERIAL PRIMARY KEY,
    loan_id      INT          NOT NULL REFERENCES loans(loan_id),
    due_date     DATE         NOT NULL,
    paid_date    DATE,
    amount_due   NUMERIC(14,2) NOT NULL,
    amount_paid  NUMERIC(14,2) NOT NULL DEFAULT 0,
    days_late    INT          NOT NULL DEFAULT 0
);

CREATE TABLE fraud_cases (
    case_id          SERIAL PRIMARY KEY,
    transaction_id   BIGINT       NOT NULL REFERENCES transactions(transaction_id),
    fraud_type       VARCHAR(24)  NOT NULL,
    detected_on      DATE         NOT NULL,
    confirmed        BOOLEAN      NOT NULL,
    loss_amount_eur  NUMERIC(14,2) NOT NULL
);
