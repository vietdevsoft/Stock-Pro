-- Run this file inside the Stock Pro application database.
-- Example:
--   psql "$DATABASE_URL" -f database/init.sql

BEGIN;

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id),
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_credentials (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    symbol VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    product_code VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    unit_id INTEGER REFERENCES units(id),
    min_stock INTEGER DEFAULT 0,
    price NUMERIC(12, 2) NOT NULL,
    image_url TEXT,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_stocks (
    id SERIAL PRIMARY KEY,
    product_id INTEGER UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    quantity_on_hand INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('import', 'export')),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    actor_user_id INTEGER REFERENCES users(id),
    actor_email VARCHAR(255),
    actor_role_id INTEGER,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE user_credentials ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE user_credentials ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE categories ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE units ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE units ADD COLUMN IF NOT EXISTS symbol VARCHAR(50);

ALTER TABLE products ADD COLUMN IF NOT EXISTS product_code VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_id INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price NUMERIC(12, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE product_stocks ADD COLUMN IF NOT EXISTS product_id INTEGER;
ALTER TABLE product_stocks ADD COLUMN IF NOT EXISTS quantity_on_hand INTEGER DEFAULT 0;
ALTER TABLE product_stocks ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE product_stocks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS product_id INTEGER;
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(20);
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS quantity INTEGER;
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12, 2);
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS operator_name VARCHAR(255);
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS operator_role VARCHAR(100);
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_unit_id ON products(unit_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_stocks_product_id_unique ON product_stocks(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON inventory_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

INSERT INTO roles (id, name)
SELECT 1, 'admin'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE id = 1 OR name = 'admin');

INSERT INTO roles (id, name)
SELECT 2, 'user'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE id = 2 OR name = 'user');

INSERT INTO roles (id, name)
SELECT 3, 'manager'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE id = 3 OR name = 'manager');

UPDATE roles SET name = 'admin'
WHERE id = 1
  AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin' AND id <> 1);

UPDATE roles SET name = 'user'
WHERE id = 2
  AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'user' AND id <> 2);

UPDATE roles SET name = 'manager'
WHERE id = 3
  AND NOT EXISTS (SELECT 1 FROM roles WHERE name = 'manager' AND id <> 3);

INSERT INTO roles (name)
SELECT 'staff'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'staff');

SELECT setval(
    pg_get_serial_sequence('roles', 'id'),
    GREATEST((SELECT COALESCE(MAX(id), 1) FROM roles), 3)
);

DO $$
DECLARE
    canonical_id INTEGER;
    legacy_ids INTEGER[];
BEGIN
    SELECT id INTO canonical_id
    FROM units
    WHERE name = 'Cái'
    ORDER BY id
    LIMIT 1;

    SELECT ARRAY_AGG(id) INTO legacy_ids
    FROM units
    WHERE name = 'Cai' OR symbol = 'cai';

    IF canonical_id IS NOT NULL AND legacy_ids IS NOT NULL THEN
        UPDATE products SET unit_id = canonical_id WHERE unit_id = ANY(legacy_ids);
        DELETE FROM units WHERE id = ANY(legacy_ids);
        UPDATE units SET symbol = 'cái' WHERE id = canonical_id;
    ELSE
        UPDATE units
        SET name = 'Cái',
            symbol = 'cái'
        WHERE name = 'Cai'
           OR symbol = 'cai';
    END IF;

    SELECT id INTO canonical_id
    FROM units
    WHERE name = 'Hộp'
    ORDER BY id
    LIMIT 1;

    SELECT ARRAY_AGG(id) INTO legacy_ids
    FROM units
    WHERE name = 'Hop' OR symbol = 'hop';

    IF canonical_id IS NOT NULL AND legacy_ids IS NOT NULL THEN
        UPDATE products SET unit_id = canonical_id WHERE unit_id = ANY(legacy_ids);
        DELETE FROM units WHERE id = ANY(legacy_ids);
        UPDATE units SET symbol = 'hộp' WHERE id = canonical_id;
    ELSE
        UPDATE units
        SET name = 'Hộp',
            symbol = 'hộp'
        WHERE name = 'Hop'
           OR symbol = 'hop';
    END IF;
END $$;

UPDATE units
SET symbol = 'cái'
WHERE name = 'Cái'
  AND (symbol IS NULL OR symbol = '' OR symbol = 'cai');

UPDATE units
SET symbol = 'hộp'
WHERE name = 'Hộp'
  AND (symbol IS NULL OR symbol = '' OR symbol = 'hop');

INSERT INTO units (name, symbol)
SELECT unit_name, unit_symbol
FROM (VALUES ('Cái', 'cái'), ('Hộp', 'hộp'), ('Kg', 'kg')) AS seed(unit_name, unit_symbol)
WHERE NOT EXISTS (
    SELECT 1 FROM units WHERE units.name = seed.unit_name
);

COMMIT;
