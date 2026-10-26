-- =============================================================================
-- AuraBI bank — data
-- Deterministic: setseed() makes every install produce exactly the same rows,
-- so the expected results in database/README.md hold everywhere.
-- =============================================================================

SET search_path = bank;
SELECT setseed(0.2025);

-- Helpers used only while seeding (dropped at the end).
CREATE SCHEMA seed;
SET search_path = bank, seed;

-- random() is double precision; let round(x, n) accept it while seeding.
CREATE FUNCTION seed.round(x double precision, n int) RETURNS numeric
LANGUAGE sql IMMUTABLE AS $$ SELECT pg_catalog.round(x::numeric, n) $$;

CREATE FUNCTION seed.pick(arr text[]) RETURNS text
LANGUAGE sql VOLATILE AS $$
    SELECT arr[1 + floor(random() * array_length(arr, 1))::int]
$$;

-- Random number in [lo, hi), skewed towards lo (most payments are small).
CREATE FUNCTION seed.skewed(lo numeric, hi numeric) RETURNS numeric
LANGUAGE sql VOLATILE AS $$
    SELECT lo + (hi - lo) * power(random()::numeric, 2)
$$;

CREATE FUNCTION seed.digits(n int) RETURNS text
LANGUAGE sql VOLATILE AS $$
    SELECT string_agg(floor(random() * 10)::int::text, '') FROM generate_series(1, n)
$$;

-- IBAN with a valid ISO 13616 mod-97 check: CC + check digits + numeric BBAN.
CREATE FUNCTION seed.iban(cc text, bban text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
    SELECT cc
        || lpad((98 - ((bban
                        || (ascii(substr(cc, 1, 1)) - 55)::text
                        || (ascii(substr(cc, 2, 1)) - 55)::text
                        || '00')::numeric % 97))::int::text, 2, '0')
        || bban
$$;

CREATE FUNCTION seed.unaccent(t text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
    SELECT translate(lower(t), 'éèêëàâäîïôöùûüçÿ''', 'eeeeaaaiioouuucy')
$$;

-- EUR -> account currency at generation time (XAF is pegged).
CREATE FUNCTION seed.from_eur(eur numeric, cur text) RETURNS numeric
LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE cur
        WHEN 'XAF' THEN round(eur * 655.957, 0)
        WHEN 'USD' THEN round(eur * 1.08, 2)
        ELSE round(eur, 2)
    END
$$;

-- Random timestamp in 2024-2025, mildly weighted towards recent dates (about +25 %
-- activity in 2025 vs 2024: steady business growth), mostly during the day.
CREATE FUNCTION seed.txn_ts() RETURNS timestamp
LANGUAGE sql VOLATILE AS $$
    SELECT date '2024-01-01'
         + floor(731 * power(random(), 0.85))::int
         + make_interval(hours => 7 + floor(random() * 15)::int,
                         mins  => floor(random() * 60)::int,
                         secs  => floor(random() * 60)::int)
$$;

-- -----------------------------------------------------------------------------
-- Branches
-- -----------------------------------------------------------------------------
INSERT INTO branches (branch_code, name, city, country_code, region, opened_on) VALUES
('CM-YDE-01', 'Yaoundé Centre',        'Yaoundé',    'CM', 'Centre',        '2008-03-01'),
('CM-YDE-02', 'Yaoundé Bastos',        'Yaoundé',    'CM', 'Centre',        '2012-06-15'),
('CM-DLA-01', 'Douala Akwa',           'Douala',     'CM', 'Littoral',      '2007-09-10'),
('CM-DLA-02', 'Douala Bonanjo',        'Douala',     'CM', 'Littoral',      '2010-01-20'),
('CM-DLA-03', 'Douala Bonamoussadi',   'Douala',     'CM', 'Littoral',      '2016-04-05'),
('CM-BAF-01', 'Bafoussam',             'Bafoussam',  'CM', 'Ouest',         '2011-02-14'),
('CM-GAR-01', 'Garoua',                'Garoua',     'CM', 'Nord',          '2013-08-01'),
('CM-BAM-01', 'Bamenda',               'Bamenda',    'CM', 'Nord-Ouest',    '2012-11-12'),
('CM-BUE-01', 'Buea',                  'Buea',       'CM', 'Sud-Ouest',     '2014-05-30'),
('CM-KRI-01', 'Kribi',                 'Kribi',      'CM', 'Sud',           '2017-07-07'),
('CM-BER-01', 'Bertoua',               'Bertoua',    'CM', 'Est',           '2015-03-18'),
('CM-MAR-01', 'Maroua',                'Maroua',     'CM', 'Extrême-Nord',  '2016-10-10'),
('CM-NGA-01', 'Ngaoundéré',            'Ngaoundéré', 'CM', 'Adamaoua',      '2014-09-22'),
('CM-LIM-01', 'Limbé',                 'Limbé',      'CM', 'Sud-Ouest',     '2018-01-15'),
('CM-EBO-01', 'Ebolowa',               'Ebolowa',    'CM', 'Sud',           '2019-04-01'),
('FR-PAR-01', 'Paris Opéra',           'Paris',      'FR', 'Île-de-France', '2009-05-11'),
('FR-PAR-02', 'Paris Château-Rouge',   'Paris',      'FR', 'Île-de-France', '2015-02-02'),
('FR-LYO-01', 'Lyon Part-Dieu',        'Lyon',       'FR', 'Auvergne-Rhône-Alpes', '2011-09-19'),
('FR-MRS-01', 'Marseille Vieux-Port',  'Marseille',  'FR', 'Provence-Alpes-Côte d''Azur', '2012-03-26'),
('FR-LIL-01', 'Lille Europe',          'Lille',      'FR', 'Hauts-de-France', '2014-06-16'),
('FR-BOR-01', 'Bordeaux Mériadeck',    'Bordeaux',   'FR', 'Nouvelle-Aquitaine', '2016-11-07'),
('FR-TLS-01', 'Toulouse Capitole',     'Toulouse',   'FR', 'Occitanie',     '2017-01-09'),
('FR-NAN-01', 'Nantes Commerce',       'Nantes',     'FR', 'Pays de la Loire', '2018-05-14'),
('FR-STR-01', 'Strasbourg Kléber',     'Strasbourg', 'FR', 'Grand Est',     '2019-09-02'),
('FR-NIC-01', 'Nice Masséna',          'Nice',       'FR', 'Provence-Alpes-Côte d''Azur', '2020-02-17');

-- -----------------------------------------------------------------------------
-- Customers (6,000) — 65 % served by Cameroonian branches
-- -----------------------------------------------------------------------------
INSERT INTO customers (first_name, last_name, email, phone, birth_date, national_id,
                       address_line, city, country_code, segment, kyc_status, risk_rating,
                       annual_income, branch_id, created_at)
SELECT fn, ln,
       seed.unaccent(fn) || '.' || seed.unaccent(ln) || s.g || '@'
           || CASE WHEN b.country_code = 'CM'
                   THEN seed.pick(ARRAY['gmail.com','yahoo.fr','camtel.cm','orange.cm'])
                   ELSE seed.pick(ARRAY['gmail.com','orange.fr','free.fr','laposte.net','outlook.fr']) END,
       CASE WHEN b.country_code = 'CM'
            THEN '+237 6' || seed.digits(2) || ' ' || seed.digits(2) || ' ' || seed.digits(2) || ' ' || seed.digits(2)
            ELSE '+33 6 ' || seed.digits(2) || ' ' || seed.digits(2) || ' ' || seed.digits(2) || ' ' || seed.digits(2) END,
       date '1950-01-01' + floor(s.r_age * 365 * 55)::int,
       CASE WHEN b.country_code = 'CM' THEN 'CNI' || seed.digits(9) ELSE seed.digits(13) END,
       (1 + floor(random() * 180))::int || ' '
           || CASE WHEN b.country_code = 'CM'
                   THEN seed.pick(ARRAY['Rue de Melen','Avenue Kennedy','Boulevard du 20 Mai','Rue Joss','Rue Njo-Njo',
                                        'Avenue de Gaulle','Rue des Manguiers','Carrefour Bastos','Rue Foch','Avenue Ahidjo'])
                   ELSE seed.pick(ARRAY['Rue de la République','Avenue Jean Jaurès','Boulevard Voltaire','Rue Victor Hugo',
                                        'Place de la Liberté','Rue Pasteur','Avenue Foch','Rue Nationale','Quai des Chartrons']) END,
       b.city, b.country_code, s.segment, s.kyc, s.risk,
       round(seed.from_eur(
           (CASE WHEN b.country_code = 'CM' THEN 1800 + random() * 16000 ELSE 19000 + random() * 52000 END)::numeric
           * CASE s.segment WHEN 'PREMIUM' THEN 3 WHEN 'PRIVATE' THEN 10 WHEN 'SME' THEN 6 WHEN 'CORPORATE' THEN 40 ELSE 1 END,
           CASE WHEN b.country_code = 'CM' THEN 'XAF' ELSE 'EUR' END), 2),
       b.branch_id,
       timestamp '2015-01-01' + random() * (timestamp '2023-11-30' - timestamp '2015-01-01')
FROM (
    SELECT g,
           CASE WHEN random() < 0.65 THEN 1 + floor(random() * 15)::int ELSE 16 + floor(random() * 10)::int END AS bid,
           random() AS r_age,
           CASE WHEN r1 < 0.70 THEN 'RETAIL' WHEN r1 < 0.82 THEN 'PREMIUM' WHEN r1 < 0.86 THEN 'PRIVATE'
                WHEN r1 < 0.97 THEN 'SME' ELSE 'CORPORATE' END AS segment,
           CASE WHEN r2 < 0.88 THEN 'VERIFIED' WHEN r2 < 0.94 THEN 'PENDING' WHEN r2 < 0.99 THEN 'EXPIRED' ELSE 'REJECTED' END AS kyc,
           CASE WHEN r3 < 0.75 THEN 'LOW' WHEN r3 < 0.95 THEN 'MEDIUM' ELSE 'HIGH' END AS risk
    FROM (SELECT g, random() AS r1, random() AS r2, random() AS r3 FROM generate_series(1, 6000) g) x
) s
JOIN branches b ON b.branch_id = s.bid
CROSS JOIN LATERAL (
    SELECT CASE WHEN b.country_code = 'CM'
                THEN seed.pick(ARRAY['Jean','Marie','Paul','Esther','Samuel','Brigitte','Emmanuel','Chantal','Joseph','Odile',
                                     'Armand','Pauline','Christian','Nadège','Patrice','Sandrine','Hervé','Grace','Yannick',
                                     'Carine','Boris','Larissa','Serge','Mireille','Prisca','Rodrigue','Vanessa','Stéphane',
                                     'Aïcha','Moussa','Fadimatou','Abdoulaye','Hamadou','Ibrahim','Mariam','Blaise','Linda'])
                ELSE seed.pick(ARRAY['Lucas','Emma','Louis','Jade','Gabriel','Louise','Hugo','Alice','Arthur','Chloé','Jules',
                                     'Léa','Adam','Manon','Raphaël','Inès','Thomas','Camille','Nathan','Sarah','Paul','Lina',
                                     'Antoine','Julie','Fatou','Mamadou','Yasmine','Karim']) END AS fn,
           CASE WHEN b.country_code = 'CM'
                THEN seed.pick(ARRAY['Ngono','Mbarga','Fotso','Kamga','Tchoumi','Nkoulou','Essomba','Atangana','Mballa','Ndjock',
                                     'Tchinda','Nana','Kenfack','Wamba','Djoumessi','Ngassa','Owona','Abena','Mvondo','Ewane',
                                     'Ekotto','Moukouri','Ndongo','Bello','Oumarou','Hamidou','Aboubakar','Fouda','Nguema',
                                     'Simo','Tagne','Feudjio','Yonta','Tamba','Manga','Etoundi'])
                ELSE seed.pick(ARRAY['Martin','Bernard','Dubois','Thomas','Robert','Richard','Petit','Durand','Leroy','Moreau',
                                     'Simon','Laurent','Lefebvre','Michel','Garcia','David','Bertrand','Roux','Vincent',
                                     'Fournier','Morel','Girard','André','Mercier','Dupont','Lambert','Bonnet','Diallo',
                                     'Traoré','Kamara']) END AS ln
    WHERE s.g = s.g      -- correlate so names are drawn per row
) n;

-- -----------------------------------------------------------------------------
-- Accounts: one main account each, savings for ~45 %, term deposits for ~8 %
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE new_accounts AS
SELECT c.customer_id, c.country_code, c.segment, c.branch_id, c.created_at,
       CASE WHEN c.segment IN ('SME','CORPORATE') THEN 'BUSINESS' ELSE 'CHECKING' END AS account_type
FROM customers c
UNION ALL
SELECT c.customer_id, c.country_code, c.segment, c.branch_id, c.created_at, 'SAVINGS'
FROM customers c WHERE random() < 0.45
UNION ALL
SELECT c.customer_id, c.country_code, c.segment, c.branch_id, c.created_at, 'TERM_DEPOSIT'
FROM customers c WHERE random() < 0.08;

INSERT INTO accounts (customer_id, iban, account_type, currency, opening_balance, balance,
                      overdraft_limit, status, opened_on, closed_on, branch_id)
SELECT customer_id,
       'TMP-' || row_number() OVER (),
       account_type, cur,
       seed.from_eur(base_eur, cur),
       0,
       CASE WHEN account_type IN ('CHECKING','BUSINESS') AND random() < 0.6
            THEN seed.from_eur(CASE WHEN account_type = 'BUSINESS' THEN 5000 ELSE 500 END, cur) ELSE 0 END,
       st,
       LEAST(created_at::date + floor(random() * 300)::int, date '2023-12-31'),
       CASE WHEN st = 'CLOSED' THEN date '2024-03-01' + floor(random() * 600)::int END,
       branch_id
FROM (
    SELECT a.*,
           CASE WHEN a.segment IN ('SME','CORPORATE') AND random() < 0.12 THEN 'USD'
                WHEN a.country_code = 'CM' THEN 'XAF' ELSE 'EUR' END AS cur,
           (CASE a.account_type WHEN 'SAVINGS' THEN 500 + random() * 15000
                                WHEN 'TERM_DEPOSIT' THEN 5000 + random() * 60000
                                ELSE 300 + random() * 4000 END)::numeric
             * CASE a.segment WHEN 'PREMIUM' THEN 3 WHEN 'PRIVATE' THEN 12 WHEN 'SME' THEN 5 WHEN 'CORPORATE' THEN 30 ELSE 1 END
             AS base_eur,
           CASE WHEN r < 0.90 THEN 'ACTIVE' WHEN r < 0.96 THEN 'DORMANT' WHEN r < 0.98 THEN 'FROZEN' ELSE 'CLOSED' END AS st
    FROM (SELECT na.*, random() AS r FROM new_accounts na) a
) x;

UPDATE accounts a
SET iban = seed.iban(c.country_code, seed.digits(12) || lpad(a.account_id::text, 11, '0'))
FROM customers c
WHERE c.customer_id = a.customer_id;

-- -----------------------------------------------------------------------------
-- Cards on main accounts
-- -----------------------------------------------------------------------------
INSERT INTO cards (account_id, card_number_masked, card_type, network, credit_limit, status, issued_on, expires_on)
SELECT account_id,
       first_digit || seed.digits(3) || ' **** **** ' || seed.digits(4),
       card_type,
       CASE first_digit WHEN '4' THEN 'VISA' ELSE 'MASTERCARD' END,
       CASE WHEN card_type = 'CREDIT' THEN seed.from_eur((1000 + floor(random() * 14) * 1000)::numeric, currency) END,
       CASE WHEN r < 0.92 THEN 'ACTIVE' WHEN r < 0.95 THEN 'BLOCKED' WHEN r < 0.99 THEN 'EXPIRED' ELSE 'LOST' END,
       issued, issued + interval '4 years'
FROM (
    SELECT a.account_id, a.currency, t.card_type,
           CASE WHEN random() < 0.62 THEN '4' ELSE '5' END AS first_digit,
           random() AS r,
           date '2021-01-01' + floor(random() * 1095)::int AS issued
    FROM accounts a
    JOIN customers c USING (customer_id)
    CROSS JOIN LATERAL (VALUES ('DEBIT'), ('CREDIT')) t(card_type)
    WHERE a.account_type IN ('CHECKING','BUSINESS')
      AND a.status <> 'CLOSED'
      AND ((t.card_type = 'DEBIT' AND random() < 0.85)
        OR (t.card_type = 'CREDIT' AND random() < CASE WHEN c.segment IN ('PREMIUM','PRIVATE','CORPORATE') THEN 0.55 ELSE 0.10 END))
) k;

-- -----------------------------------------------------------------------------
-- Merchants (400, fictional)
-- -----------------------------------------------------------------------------
INSERT INTO merchants (name, category, mcc, city, country_code, risk_level)
SELECT CASE cat
           WHEN 'GROCERY'     THEN seed.pick(ARRAY['Supermarché','Superette','Marché','Épicerie'])
           WHEN 'RESTAURANT'  THEN seed.pick(ARRAY['Restaurant','Maquis','Brasserie','Grillades','Café'])
           WHEN 'FUEL'        THEN seed.pick(ARRAY['Station','Carburants','Station-service'])
           WHEN 'ECOMMERCE'   THEN seed.pick(ARRAY['ShopOnline','Market Place','eBoutique','NetStore'])
           WHEN 'TELECOM'     THEN seed.pick(ARRAY['Télécom','Mobile Plus','Net Connect'])
           WHEN 'UTILITIES'   THEN seed.pick(ARRAY['Énergie','Eaux','Services Publics'])
           WHEN 'PHARMACY'    THEN seed.pick(ARRAY['Pharmacie','Parapharmacie'])
           WHEN 'TRANSPORT'   THEN seed.pick(ARRAY['Taxi','Transports','Mobilité','Bus Express'])
           WHEN 'ELECTRONICS' THEN seed.pick(ARRAY['Électro','Digital Store','TechZone'])
           WHEN 'TRAVEL'      THEN seed.pick(ARRAY['Voyages','Hôtel','Tour Agency'])
           WHEN 'AIRLINE'     THEN seed.pick(ARRAY['Air Link','SkyWays','Aéro'])
           WHEN 'HEALTH'      THEN seed.pick(ARRAY['Clinique','Centre Médical','Laboratoire'])
           WHEN 'EDUCATION'   THEN seed.pick(ARRAY['Institut','Collège','École Supérieure'])
           WHEN 'LUXURY'      THEN seed.pick(ARRAY['Joaillerie','Maison','Prestige'])
           WHEN 'GAMBLING'    THEN seed.pick(ARRAY['Paris Sportifs','Casino','Lucky Bet'])
           ELSE                    seed.pick(ARRAY['CryptoX','CoinGate','BitExchange'])
       END || ' ' || seed.pick(ARRAY['Akwa','Bastos','Etoile','Soleil','Horizon','Central','Atlas','Liberté','Baobab',
                                     'Lumière','Palmier','Océan','Savane','Rivage','Avenir','Plateau'])
         || ' #' || g,
       cat,
       CASE cat WHEN 'GROCERY' THEN '5411' WHEN 'RESTAURANT' THEN '5812' WHEN 'FUEL' THEN '5541'
                WHEN 'ECOMMERCE' THEN '5999' WHEN 'TELECOM' THEN '4814' WHEN 'UTILITIES' THEN '4900'
                WHEN 'PHARMACY' THEN '5912' WHEN 'TRANSPORT' THEN '4121' WHEN 'ELECTRONICS' THEN '5732'
                WHEN 'TRAVEL' THEN '4722' WHEN 'AIRLINE' THEN '4511' WHEN 'HEALTH' THEN '8062'
                WHEN 'EDUCATION' THEN '8220' WHEN 'LUXURY' THEN '5944' WHEN 'GAMBLING' THEN '7995'
                ELSE '6051' END,
       CASE cc WHEN 'CM' THEN seed.pick(ARRAY['Yaoundé','Douala','Bafoussam','Garoua','Bamenda','Buea','Kribi'])
               WHEN 'FR' THEN seed.pick(ARRAY['Paris','Lyon','Marseille','Lille','Bordeaux','Toulouse','Nantes'])
               WHEN 'US' THEN 'New York' WHEN 'GB' THEN 'London' WHEN 'NL' THEN 'Amsterdam' WHEN 'AE' THEN 'Dubai'
               WHEN 'CN' THEN 'Shenzhen' WHEN 'NG' THEN 'Lagos' WHEN 'SN' THEN 'Dakar' WHEN 'CI' THEN 'Abidjan'
               WHEN 'DE' THEN 'Berlin' ELSE 'Malta' END,
       cc,
       CASE WHEN cat IN ('GAMBLING','CRYPTO') THEN 'HIGH'
            WHEN cat IN ('LUXURY','ELECTRONICS','TRAVEL') OR cc NOT IN ('CM','FR') THEN 'MEDIUM'
            ELSE 'LOW' END
FROM (
    SELECT g, cat,
           CASE WHEN cat IN ('CRYPTO','GAMBLING','AIRLINE') OR (cat IN ('ECOMMERCE','ELECTRONICS','LUXURY','TRAVEL') AND random() < 0.5)
                THEN seed.pick(ARRAY['US','GB','NL','AE','CN','NG','SN','CI','DE','MT'])
                WHEN random() < 0.6 THEN 'CM' ELSE 'FR' END AS cc
    FROM (
        SELECT g, seed.pick(ARRAY['GROCERY','GROCERY','GROCERY','GROCERY','GROCERY','GROCERY','GROCERY','GROCERY',
                                  'RESTAURANT','RESTAURANT','RESTAURANT','RESTAURANT','RESTAURANT','RESTAURANT','RESTAURANT',
                                  'FUEL','FUEL','FUEL','FUEL','FUEL',
                                  'ECOMMERCE','ECOMMERCE','ECOMMERCE','ECOMMERCE','ECOMMERCE','ECOMMERCE',
                                  'TELECOM','TELECOM','TELECOM','TELECOM','UTILITIES','UTILITIES','UTILITIES',
                                  'PHARMACY','PHARMACY','PHARMACY','PHARMACY','TRANSPORT','TRANSPORT','TRANSPORT','TRANSPORT',
                                  'ELECTRONICS','ELECTRONICS','ELECTRONICS','TRAVEL','TRAVEL','AIRLINE','HEALTH','HEALTH',
                                  'EDUCATION','EDUCATION','LUXURY','GAMBLING','CRYPTO']) AS cat
        FROM generate_series(1, 400) g
    ) a
) m;

-- -----------------------------------------------------------------------------
-- FX rates (daily, 1 EUR = rate * quote). XAF is pegged to the euro.
-- -----------------------------------------------------------------------------
INSERT INTO fx_rates (rate_date, base, quote, rate)
SELECT d::date, 'EUR', q.quote,
       CASE q.quote
           WHEN 'EUR' THEN 1
           WHEN 'XAF' THEN 655.957
           WHEN 'USD' THEN round((1.085 + 0.03 * sin(i / 58.0) + (random() - 0.5) * 0.006)::numeric, 6)
           ELSE            round((0.855 + 0.015 * sin(i / 71.0) + (random() - 0.5) * 0.004)::numeric, 6)
       END
FROM generate_series(date '2024-01-01', date '2025-12-31', interval '1 day') WITH ORDINALITY AS t(d, i)
CROSS JOIN (VALUES ('EUR'), ('XAF'), ('USD'), ('GBP')) q(quote);

-- -----------------------------------------------------------------------------
-- Sampling pools
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE pool_cards AS
SELECT row_number() OVER (ORDER BY k.card_id) AS rn, k.card_id, k.account_id, a.currency, c.country_code, c.city
FROM cards k JOIN accounts a USING (account_id) JOIN customers c USING (customer_id)
WHERE k.status = 'ACTIVE' AND a.status = 'ACTIVE';

CREATE TEMP TABLE pool_main AS
SELECT row_number() OVER (ORDER BY a.account_id) AS rn, a.account_id, a.currency, c.country_code, c.segment, c.risk_rating
FROM accounts a JOIN customers c USING (customer_id)
WHERE a.status = 'ACTIVE' AND a.account_type IN ('CHECKING','BUSINESS');

CREATE TEMP TABLE pool_merchants AS
SELECT row_number() OVER (ORDER BY merchant_id) AS rn, m.* FROM merchants m;

CREATE TEMP TABLE pool_n AS
SELECT (SELECT count(*) FROM pool_cards) AS cards,
       (SELECT count(*) FROM pool_main) AS main,
       (SELECT count(*) FROM pool_merchants) AS merchants;

-- -----------------------------------------------------------------------------
-- Card purchases (120,000)
-- -----------------------------------------------------------------------------
INSERT INTO transactions (account_id, card_id, merchant_id, txn_ts, amount, currency, direction, channel, status, country_code, description)
SELECT pc.account_id, pc.card_id, m.merchant_id, s.ts,
       seed.from_eur(round(CASE m.category
            WHEN 'GROCERY' THEN seed.skewed(5, 180)        WHEN 'RESTAURANT' THEN seed.skewed(8, 120)
            WHEN 'FUEL' THEN seed.skewed(20, 110)          WHEN 'ECOMMERCE' THEN seed.skewed(10, 400)
            WHEN 'TELECOM' THEN seed.skewed(5, 60)         WHEN 'UTILITIES' THEN seed.skewed(30, 250)
            WHEN 'PHARMACY' THEN seed.skewed(4, 90)        WHEN 'TRANSPORT' THEN seed.skewed(2, 60)
            WHEN 'ELECTRONICS' THEN seed.skewed(40, 1500)  WHEN 'TRAVEL' THEN seed.skewed(80, 1800)
            WHEN 'AIRLINE' THEN seed.skewed(120, 1400)     WHEN 'HEALTH' THEN seed.skewed(20, 400)
            WHEN 'EDUCATION' THEN seed.skewed(50, 900)     WHEN 'LUXURY' THEN seed.skewed(150, 4000)
            WHEN 'GAMBLING' THEN seed.skewed(5, 300)       ELSE seed.skewed(20, 2000) END, 2), pc.currency),
       pc.currency, 'DEBIT',
       CASE WHEN m.category = 'ECOMMERCE' OR m.country_code <> pc.country_code THEN 'CARD_ONLINE' ELSE 'CARD_POS' END,
       CASE WHEN s.r < 0.965 THEN 'COMPLETED' WHEN s.r < 0.985 THEN 'DECLINED' WHEN s.r < 0.995 THEN 'PENDING' ELSE 'REVERSED' END,
       m.country_code, m.name
FROM (
    SELECT g, 1 + floor(random() * n.cards)::int AS card_rn,
              -- 80 % of purchases happen in the customer's country
              random() AS r_dom, 1 + floor(random() * n.merchants)::int AS merch_rn,
              seed.txn_ts() AS ts, random() AS r
    FROM generate_series(1, 120000) g CROSS JOIN pool_n n
) s
JOIN pool_cards pc ON pc.rn = s.card_rn
JOIN LATERAL (
    SELECT * FROM pool_merchants pm
    WHERE pm.rn >= s.merch_rn
      AND (s.r_dom >= 0.8 OR pm.country_code = pc.country_code)
    ORDER BY pm.rn LIMIT 1
) m ON true;

-- -----------------------------------------------------------------------------
-- ATM withdrawals (18,000)
-- -----------------------------------------------------------------------------
INSERT INTO transactions (account_id, card_id, txn_ts, amount, currency, direction, channel, status, country_code, description)
SELECT pc.account_id, pc.card_id, seed.txn_ts(),
       CASE WHEN pc.currency = 'XAF' THEN (5000 * (2 + floor(random() * 60)))::numeric
            ELSE seed.from_eur((10 * (2 + floor(random() * 38)))::numeric, pc.currency) END,
       pc.currency, 'DEBIT', 'ATM',
       CASE WHEN random() < 0.97 THEN 'COMPLETED' ELSE 'DECLINED' END,
       pc.country_code, 'Retrait DAB ' || pc.city
FROM (SELECT 1 + floor(random() * n.cards)::int AS rn FROM generate_series(1, 18000) g CROSS JOIN pool_n n) s
JOIN pool_cards pc ON pc.rn = s.rn;

-- -----------------------------------------------------------------------------
-- Outgoing transfers & mobile money (22,000) and incoming transfers (10,000)
-- -----------------------------------------------------------------------------
INSERT INTO transactions (account_id, counterparty_iban, txn_ts, amount, currency, direction, channel, status, country_code, description)
SELECT pm.account_id,
       seed.iban(CASE WHEN random() < 0.85 THEN pm.country_code ELSE seed.pick(ARRAY['FR','CM','BE','DE','ES']) END,
                 seed.digits(23)),
       seed.txn_ts(),
       seed.from_eur(round(seed.skewed(20, 5000)
                     * CASE WHEN pm.segment IN ('SME','CORPORATE') THEN 5 ELSE 1 END, 2), pm.currency),
       pm.currency, s.dir,
       CASE WHEN pm.country_code = 'CM' AND random() < 0.6 THEN 'MOBILE' ELSE 'TRANSFER' END,
       CASE WHEN random() < 0.98 THEN 'COMPLETED' ELSE 'REVERSED' END,
       pm.country_code,
       CASE WHEN s.dir = 'DEBIT'
            THEN seed.pick(ARRAY['Loyer','Transfert famille','Facture fournisseur','Frais de scolarité','Remboursement ami',
                                 'Mobile Money','Épargne','Cotisation tontine'])
            ELSE seed.pick(ARRAY['Virement reçu','Remboursement','Règlement client','Transfert famille','Mobile Money reçu']) END
FROM (
    SELECT 1 + floor(random() * n.main)::int AS rn, 'DEBIT' AS dir FROM generate_series(1, 22000) g CROSS JOIN pool_n n
    UNION ALL
    SELECT 1 + floor(random() * n.main)::int, 'CREDIT' FROM generate_series(1, 10000) g CROSS JOIN pool_n n
) s
JOIN pool_main pm ON pm.rn = s.rn;

-- -----------------------------------------------------------------------------
-- Salaries: monthly credit for ~55 % of salaried customers
-- -----------------------------------------------------------------------------
INSERT INTO transactions (account_id, counterparty_iban, txn_ts, amount, currency, direction, channel, status, country_code, description)
SELECT a.account_id, emp.iban,
       (m + make_interval(days => 24 + emp.payday, hours => 6))::timestamp,
       round(c.annual_income / 12 * (0.97 + random() * 0.06), CASE WHEN a.currency = 'XAF' THEN 0 ELSE 2 END),
       a.currency, 'CREDIT', 'SALARY', 'COMPLETED', c.country_code,
       'Salaire ' || to_char(m, 'MM/YYYY')
FROM accounts a
JOIN customers c USING (customer_id)
CROSS JOIN LATERAL (
    SELECT seed.iban(c.country_code, seed.digits(23)) AS iban, floor(random() * 4)::int AS payday
    WHERE a.account_id = a.account_id
) emp
CROSS JOIN generate_series(date '2024-01-01', date '2025-12-01', interval '1 month') m
WHERE a.account_type = 'CHECKING' AND a.status = 'ACTIVE'
  AND c.segment IN ('RETAIL','PREMIUM','PRIVATE')
  AND (a.account_id * 7919) % 100 < 55;

-- -----------------------------------------------------------------------------
-- Direct debits to utilities / telecom (15,000)
-- -----------------------------------------------------------------------------
INSERT INTO transactions (account_id, merchant_id, txn_ts, amount, currency, direction, channel, status, country_code, description)
SELECT pm.account_id, m.merchant_id,
       date_trunc('day', seed.txn_ts()) + interval '3 hours',
       seed.from_eur(round(seed.skewed(15, 180), 2), pm.currency),
       pm.currency, 'DEBIT', 'DIRECT_DEBIT',
       CASE WHEN random() < 0.96 THEN 'COMPLETED' ELSE 'DECLINED' END,
       pm.country_code, 'Prélèvement ' || m.name
FROM (SELECT 1 + floor(random() * n.main)::int AS rn, random() AS r FROM generate_series(1, 15000) g CROSS JOIN pool_n n) s
JOIN pool_main pm ON pm.rn = s.rn
JOIN LATERAL (
    SELECT * FROM merchants mm
    WHERE mm.category IN ('UTILITIES','TELECOM') AND mm.country_code = pm.country_code
    ORDER BY mm.merchant_id
    OFFSET floor(s.r * 10)::int LIMIT 1
) m ON true;

-- =============================================================================
-- Fraud ground truth (recorded in fraud_cases)
-- =============================================================================
CREATE TEMP TABLE fraud_txn (transaction_id bigint, fraud_type text);

-- Card-not-present fraud: night-time, foreign, high-risk merchants
WITH ins AS (
    INSERT INTO transactions (account_id, card_id, merchant_id, txn_ts, amount, currency, direction, channel, status, country_code, description)
    SELECT pc.account_id, pc.card_id, m.merchant_id,
           date '2024-01-01' + floor(731 * power(random(), 0.85))::int
               + make_interval(hours => floor(random() * 5)::int, mins => floor(random() * 60)::int),
           seed.from_eur(round(900 + random() * 8100, 2), pc.currency), pc.currency, 'DEBIT', 'CARD_ONLINE',
           CASE WHEN random() < 0.85 THEN 'COMPLETED' ELSE 'DECLINED' END,
           m.country_code, m.name
    FROM (SELECT 1 + floor(random() * n.cards)::int AS rn, random() AS r FROM generate_series(1, 450) g CROSS JOIN pool_n n) s
    JOIN pool_cards pc ON pc.rn = s.rn
    JOIN LATERAL (
        SELECT * FROM merchants mm
        WHERE mm.category IN ('CRYPTO','LUXURY','ELECTRONICS','GAMBLING') AND mm.country_code NOT IN ('CM','FR')
        ORDER BY mm.merchant_id OFFSET floor(s.r * 20)::int LIMIT 1
    ) m ON true
    RETURNING transaction_id
)
INSERT INTO fraud_txn SELECT transaction_id, 'CARD_NOT_PRESENT' FROM ins;

-- Card testing: bursts of 6 tiny online payments within minutes, then one large one
WITH bursts AS (
    SELECT b, pc.card_id, pc.account_id, pc.currency,
           date '2024-03-01' + floor(random() * 640)::int + make_interval(hours => floor(random() * 24)::int) AS t0,
           (SELECT merchant_id FROM merchants WHERE category = 'ECOMMERCE' AND country_code NOT IN ('CM','FR')
            ORDER BY merchant_id OFFSET (b % 5) LIMIT 1) AS merchant_id
    FROM (SELECT b, 1 + floor(random() * n.cards)::int AS rn FROM generate_series(1, 60) b CROSS JOIN pool_n n) s
    JOIN pool_cards pc ON pc.rn = s.rn
), ins AS (
    INSERT INTO transactions (account_id, card_id, merchant_id, txn_ts, amount, currency, direction, channel, status, country_code, description)
    SELECT bu.account_id, bu.card_id, bu.merchant_id,
           bu.t0 + make_interval(mins => i * 2, secs => floor(random() * 50)::int),
           CASE WHEN i < 6 THEN seed.from_eur(round(1 + random() * 2, 2), bu.currency)
                ELSE seed.from_eur(round(1500 + random() * 3000, 2), bu.currency) END,
           bu.currency, 'DEBIT', 'CARD_ONLINE',
           CASE WHEN i < 6 OR random() < 0.7 THEN 'COMPLETED' ELSE 'DECLINED' END,
           m.country_code, m.name
    FROM bursts bu
    JOIN merchants m ON m.merchant_id = bu.merchant_id
    CROSS JOIN generate_series(0, 6) i
    RETURNING transaction_id
)
INSERT INTO fraud_txn SELECT transaction_id, 'CARD_TESTING' FROM ins;

-- Account takeover: large night-time mobile transfers from low-risk customers
WITH ins AS (
    INSERT INTO transactions (account_id, counterparty_iban, txn_ts, amount, currency, direction, channel, status, country_code, description)
    SELECT pm.account_id, seed.iban(seed.pick(ARRAY['NG','GB','NL','AE']), seed.digits(20)),
           date '2024-02-01' + floor(random() * 690)::int + make_interval(hours => 1 + floor(random() * 4)::int),
           seed.from_eur(round(5000 + random() * 20000, 2), pm.currency), pm.currency, 'DEBIT', 'MOBILE', 'COMPLETED',
           pm.country_code, 'Transfert international'
    FROM (SELECT 1 + floor(random() * n.main)::int AS rn FROM generate_series(1, 400) g CROSS JOIN pool_n n) s
    JOIN pool_main pm ON pm.rn = s.rn
    WHERE pm.risk_rating = 'LOW'
    LIMIT 40
    RETURNING transaction_id
)
INSERT INTO fraud_txn SELECT transaction_id, 'ACCOUNT_TAKEOVER' FROM ins;

-- ATM skimming: withdrawals abroad, in clusters
WITH ins AS (
    INSERT INTO transactions (account_id, card_id, txn_ts, amount, currency, direction, channel, status, country_code, description)
    SELECT pc.account_id, pc.card_id,
           date '2025-04-10' + (g % 6) * 37 + make_interval(hours => floor(random() * 24)::int),
           seed.from_eur((10 * (20 + floor(random() * 30)))::numeric, pc.currency), pc.currency, 'DEBIT', 'ATM', 'COMPLETED',
           x.cc, 'Retrait DAB ' || x.city
    FROM (SELECT g, 1 + floor(random() * n.cards)::int AS rn FROM generate_series(1, 120) g CROSS JOIN pool_n n) s
    JOIN pool_cards pc ON pc.rn = s.rn
    CROSS JOIN LATERAL (
        SELECT (ARRAY['NG','GH','MA','ES','TR','TH'])[1 + s.g % 6] AS cc,
               (ARRAY['Lagos','Accra','Casablanca','Madrid','Istanbul','Bangkok'])[1 + s.g % 6] AS city
    ) x
    RETURNING transaction_id
)
INSERT INTO fraud_txn SELECT transaction_id, 'ATM_SKIMMING' FROM ins;

-- AML structuring: repeated incoming transfers just under the 10,000 EUR threshold
WITH ins AS (
    INSERT INTO transactions (account_id, counterparty_iban, txn_ts, amount, currency, direction, channel, status, country_code, description)
    SELECT pm.account_id, seed.iban(pm.country_code, seed.digits(23)),
           date '2025-01-06' + (k * 9 + floor(random() * 5)::int) + interval '11 hours',
           seed.from_eur(round(9000 + random() * 990, 2), pm.currency), pm.currency, 'CREDIT', 'TRANSFER', 'COMPLETED',
           pm.country_code, 'Dépôt espèces'
    FROM (SELECT DISTINCT ON (rn) rn FROM (SELECT 1 + floor(random() * n.main)::int AS rn FROM generate_series(1, 25) g CROSS JOIN pool_n n) z) s
    JOIN pool_main pm ON pm.rn = s.rn
    CROSS JOIN generate_series(1, 8) k
    RETURNING transaction_id
)
INSERT INTO fraud_txn SELECT transaction_id, 'AML_STRUCTURING' FROM ins;

-- =============================================================================
-- Deliberate data-quality defects (documented in database/README.md)
-- =============================================================================

-- Q1. 35 exact duplicate card transactions (double posting)
INSERT INTO transactions (account_id, card_id, merchant_id, counterparty_iban, txn_ts, amount, currency, direction, channel, status, country_code, description)
SELECT account_id, card_id, merchant_id, counterparty_iban, txn_ts, amount, currency, direction, channel, status, country_code, description
FROM transactions WHERE channel = 'CARD_POS' AND status = 'COMPLETED' AND transaction_id % 997 = 0
ORDER BY transaction_id LIMIT 35;

-- Q2. Missing and malformed e-mails
UPDATE customers SET email = NULL WHERE customer_id % 50 = 7;
UPDATE customers SET email = replace(email, '@', '') WHERE customer_id % 401 = 3;
UPDATE customers SET email = regexp_replace(email, '\.[a-z]+$', '') WHERE customer_id % 409 = 5;

-- Q3. 25 IBANs with a broken checksum (two digits swapped)
UPDATE accounts
SET iban = substr(iban, 1, 25) || substr(iban, 27, 1) || substr(iban, 26, 1)
WHERE account_id IN (SELECT account_id FROM accounts WHERE substr(iban, 26, 1) <> substr(iban, 27, 1)
                     ORDER BY account_id OFFSET 100 LIMIT 25);

-- Q4. 15 minors holding a credit card
UPDATE customers SET birth_date = date '2009-06-01' + (customer_id % 900)
WHERE customer_id IN (
    SELECT DISTINCT a.customer_id FROM cards k JOIN accounts a USING (account_id)
    WHERE k.card_type = 'CREDIT' ORDER BY a.customer_id LIMIT 15);

-- Q5. 12 future-dated transactions
UPDATE transactions SET txn_ts = txn_ts + interval '2 years'
WHERE transaction_id IN (SELECT transaction_id FROM transactions WHERE channel = 'TRANSFER' ORDER BY transaction_id OFFSET 500 LIMIT 12);

-- Q6. 30 DORMANT accounts with recent completed activity
INSERT INTO transactions (account_id, counterparty_iban, txn_ts, amount, currency, direction, channel, status, country_code, description)
SELECT a.account_id, seed.iban(c.country_code, seed.digits(23)),
       timestamp '2025-10-01' + random() * interval '90 days',
       seed.from_eur(round(200 + random() * 3000, 2), a.currency), a.currency, 'DEBIT', 'TRANSFER', 'COMPLETED',
       c.country_code, 'Transfert'
FROM (SELECT account_id, customer_id, currency FROM accounts WHERE status = 'DORMANT' ORDER BY account_id LIMIT 30) a
JOIN customers c USING (customer_id);

-- Q7. 20 negative amounts on card purchases
UPDATE transactions SET amount = -amount
WHERE transaction_id IN (SELECT transaction_id FROM transactions WHERE channel = 'CARD_POS' ORDER BY transaction_id OFFSET 2000 LIMIT 20);

-- =============================================================================
-- Derived values
-- =============================================================================

-- Amount in EUR at the day's rate (future-dated rows have no rate: amount_eur stays NULL).
UPDATE transactions t
SET amount_eur = round(t.amount / f.rate, 2)
FROM fx_rates f
WHERE f.rate_date = t.txn_ts::date AND f.quote = t.currency;

-- Fraud cases: confirmed losses, plus false positives raised by the monitoring system.
INSERT INTO fraud_cases (transaction_id, fraud_type, detected_on, confirmed, loss_amount_eur)
SELECT f.transaction_id, f.fraud_type,
       t.txn_ts::date + floor(random() * 20)::int,
       c.confirmed,
       CASE WHEN c.confirmed AND t.status = 'COMPLETED' THEN coalesce(t.amount_eur, 0) ELSE 0 END
FROM fraud_txn f
JOIN transactions t USING (transaction_id)
CROSS JOIN LATERAL (SELECT random() < CASE f.fraud_type WHEN 'AML_STRUCTURING' THEN 0.6 ELSE 0.85 END AS confirmed
                    WHERE f.transaction_id = f.transaction_id) c;

INSERT INTO fraud_cases (transaction_id, fraud_type, detected_on, confirmed, loss_amount_eur)
SELECT transaction_id, 'SUSPECTED', txn_ts::date + 2, false, 0
FROM transactions
WHERE channel IN ('CARD_ONLINE','TRANSFER') AND amount_eur > 1200 AND transaction_id % 23 = 0
  AND transaction_id NOT IN (SELECT transaction_id FROM fraud_txn)
ORDER BY transaction_id LIMIT 60;

-- Balances: opening balance + completed flows. Accounts that would be overdrawn beyond
-- their limit get quarterly cash top-ups — except ~2 %, left overdrawn on purpose (Q8).
CREATE TEMP TABLE net AS
SELECT a.account_id, a.currency, a.overdraft_limit, c.country_code,
       a.opening_balance + coalesce(sum(CASE WHEN t.direction = 'CREDIT' THEN t.amount ELSE -t.amount END)
                                    FILTER (WHERE t.status = 'COMPLETED'), 0) AS bal
FROM accounts a
JOIN customers c USING (customer_id)
LEFT JOIN transactions t USING (account_id)
GROUP BY a.account_id, a.currency, a.overdraft_limit, c.country_code;

INSERT INTO transactions (account_id, txn_ts, amount, currency, direction, channel, status, country_code, description)
SELECT n.account_id,
       timestamp '2024-01-15 10:00' + q * interval '3 months',
       CASE WHEN n.currency = 'XAF'
            THEN ceil((-n.bal / 8 + seed.from_eur(150, 'XAF')) / 1000) * 1000
            ELSE ceil(-n.bal / 8 + seed.from_eur(150, n.currency)) END,
       n.currency, 'CREDIT', 'TRANSFER', 'COMPLETED', n.country_code, 'Approvisionnement compte'
FROM net n
CROSS JOIN generate_series(0, 7) q
WHERE n.bal < -n.overdraft_limit AND (n.account_id * 31) % 100 >= 2;

UPDATE transactions t
SET amount_eur = round(t.amount / f.rate, 2)
FROM fx_rates f
WHERE t.amount_eur IS NULL AND f.rate_date = t.txn_ts::date AND f.quote = t.currency;

UPDATE accounts a
SET balance = a.opening_balance + coalesce(x.flow, 0)
FROM (
    SELECT account_id, sum(CASE WHEN direction = 'CREDIT' THEN amount ELSE -amount END) AS flow
    FROM transactions WHERE status = 'COMPLETED' GROUP BY account_id
) x
WHERE x.account_id = a.account_id;

UPDATE accounts SET balance = opening_balance WHERE account_id NOT IN (SELECT DISTINCT account_id FROM transactions);

-- =============================================================================
-- Loans (1,800) and their 2024-2025 repayment schedule
-- =============================================================================
CREATE TEMP TABLE tl AS
SELECT row_number() OVER (ORDER BY s.customer_id, s.g) AS loan_id, s.*,
       CASE WHEN s.r_beh < CASE s.risk_rating WHEN 'HIGH' THEN 0.25 WHEN 'MEDIUM' THEN 0.08 ELSE 0.03 END THEN 'DEFAULT'
            WHEN s.r_beh < CASE s.risk_rating WHEN 'HIGH' THEN 0.45 WHEN 'MEDIUM' THEN 0.18 ELSE 0.09 END THEN 'LATE'
            ELSE 'GOOD' END AS behaviour,
       -- first missed instalment between 2024-03 and 2025-11: gives DEFAULT, LATE_90 and LATE_30 loans
       date '2024-03-01' + (floor(random() * 21)::int * interval '1 month') AS default_from
FROM (
    SELECT d.g, c.customer_id, c.segment, c.risk_rating, c.country_code, c.birth_date,
           d.r_beh, d.r_prod, d.r_amt
    FROM (SELECT g, 1 + floor(random() * 5990)::int AS target,
                 random() AS r_beh, random() AS r_prod, random() AS r_amt
          FROM generate_series(1, 1800) g) d
    JOIN LATERAL (
        SELECT * FROM customers cc
        WHERE cc.kyc_status IN ('VERIFIED','EXPIRED') AND cc.customer_id >= d.target
        ORDER BY cc.customer_id LIMIT 1
    ) c ON true
) s;

CREATE TEMP TABLE tl2 AS
SELECT tl.*,
       CASE WHEN segment IN ('SME','CORPORATE') THEN 'SME'
            WHEN r_prod < 0.45 THEN 'PERSONAL' WHEN r_prod < 0.65 THEN 'AUTO'
            WHEN r_prod < 0.85 AND segment IN ('PREMIUM','PRIVATE') THEN 'MORTGAGE'
            WHEN r_prod < 0.85 THEN 'PERSONAL'
            ELSE 'STUDENT' END AS product,
       CASE WHEN country_code = 'CM' THEN 'XAF' ELSE 'EUR' END AS currency
FROM tl;

CREATE TEMP TABLE tl3 AS
SELECT t.*,
       seed.from_eur(round((CASE product WHEN 'MORTGAGE' THEN 60000 + r_amt * 340000 WHEN 'PERSONAL' THEN 2000 + r_amt * 28000
                                         WHEN 'AUTO' THEN 8000 + r_amt * 37000 WHEN 'SME' THEN 20000 + r_amt * 480000
                                         ELSE 3000 + r_amt * 17000 END)::numeric, -2), currency) AS principal,
       round((CASE product WHEN 'MORTGAGE' THEN 3.2 + random() * 2.3 WHEN 'PERSONAL' THEN 6 + random() * 10
                           WHEN 'AUTO' THEN 4.5 + random() * 5 WHEN 'SME' THEN 5 + random() * 7 ELSE 1.5 + random() * 3 END
              + CASE WHEN country_code = 'CM' THEN 4 ELSE 0 END)::numeric, 3) AS interest_rate,
       CASE product WHEN 'MORTGAGE' THEN 180 + 60 * floor(random() * 3)::int WHEN 'PERSONAL' THEN 12 * (1 + floor(random() * 5)::int)
                    WHEN 'AUTO' THEN 12 * (3 + floor(random() * 4)::int) WHEN 'SME' THEN 12 * (2 + floor(random() * 6)::int)
                    ELSE 12 * (3 + floor(random() * 8)::int) END AS term_months,
       date '2020-01-01' + floor(random() * 2000)::int AS start_date
FROM tl2 t;

INSERT INTO loans (loan_id, customer_id, product, currency, principal, interest_rate, term_months, start_date, status, outstanding_balance)
SELECT loan_id, customer_id, product, currency, principal, interest_rate, term_months, start_date, 'CURRENT', principal
FROM tl3;
SELECT setval('loans_loan_id_seq', (SELECT max(loan_id) FROM loans));

INSERT INTO loan_payments (loan_id, due_date, paid_date, amount_due, amount_paid, days_late)
SELECT l.loan_id, d.due::date,
       CASE WHEN u.unpaid THEN NULL ELSE d.due::date + u.late END,
       p.installment,
       CASE WHEN u.unpaid THEN 0 ELSE p.installment END,
       CASE WHEN u.unpaid THEN date '2025-12-31' - d.due::date ELSE u.late END
FROM tl3 l
CROSS JOIN LATERAL (
    SELECT round(l.principal * (l.interest_rate / 1200)
                 / (1 - power(1 + l.interest_rate / 1200, -l.term_months)), CASE WHEN l.currency = 'XAF' THEN 0 ELSE 2 END) AS installment
) p
CROSS JOIN LATERAL generate_series(
    GREATEST(date_trunc('month', l.start_date) + interval '1 month', date '2024-01-01'),
    LEAST(date_trunc('month', l.start_date) + make_interval(months => l.term_months), date '2025-12-01'),
    interval '1 month') d(due)
CROSS JOIN LATERAL (
    SELECT (l.behaviour = 'DEFAULT' AND d.due >= l.default_from)
        OR (l.behaviour = 'LATE' AND d.due >= date '2025-11-01') AS unpaid,
           CASE WHEN l.behaviour = 'LATE' AND random() < 0.4 THEN 31 + floor(random() * 45)::int
                ELSE floor(random() * 4)::int END AS late
) u
WHERE d.due >= date '2024-01-01' AND d.due <= date '2025-12-31';

-- Loan status from the oldest unpaid instalment, outstanding balance from the annuity formula.
UPDATE loans l
SET status = CASE
        WHEN o.max_overdue >= 180 THEN 'DEFAULT'
        WHEN o.max_overdue >= 90  THEN 'LATE_90'
        WHEN o.max_overdue >= 30  THEN 'LATE_30'
        WHEN l.start_date + make_interval(months => l.term_months) < date '2025-12-31' THEN 'REPAID'
        ELSE 'CURRENT' END,
    outstanding_balance = CASE
        WHEN o.max_overdue < 30 AND l.start_date + make_interval(months => l.term_months) < date '2025-12-31' THEN 0
        ELSE round(l.principal * (power(1 + l.interest_rate / 1200, l.term_months)
                                  - power(1 + l.interest_rate / 1200, LEAST(l.term_months, GREATEST(0, o.paid_months))))
                   / (power(1 + l.interest_rate / 1200, l.term_months) - 1), 2) END
FROM (
    SELECT l2.loan_id,
           coalesce(max(p.days_late) FILTER (WHERE p.paid_date IS NULL), 0) AS max_overdue,
           (EXTRACT(year FROM age(date '2025-12-31', l2.start_date)) * 12
            + EXTRACT(month FROM age(date '2025-12-31', l2.start_date)))::int
             - count(*) FILTER (WHERE p.paid_date IS NULL) AS paid_months
    FROM loans l2 LEFT JOIN loan_payments p USING (loan_id)
    GROUP BY l2.loan_id, l2.start_date
) o
WHERE o.loan_id = l.loan_id;

-- -----------------------------------------------------------------------------
-- Clean up seeding helpers
-- -----------------------------------------------------------------------------
DROP SCHEMA seed CASCADE;
ANALYZE;
