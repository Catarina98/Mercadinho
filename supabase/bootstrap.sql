-- Base schema for a new Mercadinho project. Apply the migrations afterwards.

-- 1. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    code TEXT,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    category TEXT,
    stock INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'un',
    color TEXT DEFAULT '#6366f1',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1',
    icon TEXT DEFAULT 'Tag'
);

-- 3. Markets Table
CREATE TABLE IF NOT EXISTS public.markets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT DEFAULT 'Portugal',
    active BOOLEAN DEFAULT false
);

-- 4. Sales / Transactions Table
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_str TEXT,
    market TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT DEFAULT 'cash',
    amount_received NUMERIC(10, 2) DEFAULT 0.00,
    change NUMERIC(10, 2) DEFAULT 0.00,
    notes TEXT DEFAULT ''
);

-- Enable RLS. Apply the Sanity catalog migration to grant operator access.
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
