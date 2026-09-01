import { createClient } from '@supabase/supabase-js';

// SQL snippet for setting up Supabase tables with 1 click
export const SUPABASE_SQL_SCHEMA = `
-- 1. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    code TEXT,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    category TEXT,
    stock INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'pc',
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

-- Enable Row Level Security (RLS) and allow public read/write for demo
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all markets" ON public.markets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);
`.trim();

class SupabaseService {
  constructor() {
    this.client = null;
    this.url = '';
    this.anonKey = '';
    this.isConnected = false;
  }

  init(url, anonKey) {
    if (!url || !anonKey) {
      this.client = null;
      this.isConnected = false;
      return null;
    }

    try {
      this.url = url.trim();
      this.anonKey = anonKey.trim();
      this.client = createClient(this.url, this.anonKey);
      return this.client;
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      this.client = null;
      this.isConnected = false;
      return null;
    }
  }

  async testConnection() {
    if (!this.client) return false;
    try {
      const { data, error } = await this.client.from('products').select('id').limit(1);
      if (error) {
        console.warn('Supabase test connection error:', error);
        this.isConnected = false;
        return false;
      }
      this.isConnected = true;
      return true;
    } catch (e) {
      this.isConnected = false;
      return false;
    }
  }

  // --- Remote CRUD Sync Operations ---

  async fetchRemoteData() {
    if (!this.client) return null;
    try {
      const [prodsRes, catsRes, mktsRes, salesRes] = await Promise.all([
        this.client.from('products').select('*'),
        this.client.from('categories').select('*'),
        this.client.from('markets').select('*'),
        this.client.from('sales').select('*').order('timestamp', { ascending: false })
      ]);

      if (prodsRes.error || catsRes.error || mktsRes.error || salesRes.error) {
        console.warn('Error fetching remote data from Supabase:', {
          prods: prodsRes.error,
          cats: catsRes.error,
          mkts: mktsRes.error,
          sales: salesRes.error
        });
        return null;
      }

      // Map snake_case to app structure if needed
      const sales = (salesRes.data || []).map(s => ({
        id: s.id,
        timestamp: s.timestamp,
        dateStr: s.date_str,
        market: s.market,
        items: s.items || [],
        subtotal: Number(s.subtotal || 0),
        discount: Number(s.discount || 0),
        total: Number(s.total || 0),
        paymentMethod: s.payment_method,
        amountReceived: Number(s.amount_received || 0),
        change: Number(s.change || 0),
        notes: s.notes || ''
      }));

      return {
        products: prodsRes.data || [],
        categories: catsRes.data || [],
        markets: mktsRes.data || [],
        sales: sales
      };
    } catch (err) {
      console.warn('Supabase fetch exception:', err);
      return null;
    }
  }

  async syncProduct(product) {
    if (!this.client) return;
    try {
      await this.client.from('products').upsert({
        id: product.id,
        code: product.code,
        name: product.name,
        price: product.price,
        category: product.category,
        stock: product.stock,
        unit: product.unit,
        color: product.color,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Supabase syncProduct error:', e);
    }
  }

  async deleteProduct(id) {
    if (!this.client) return;
    try {
      await this.client.from('products').delete().eq('id', id);
    } catch (e) {}
  }

  async syncMarket(market) {
    if (!this.client) return;
    try {
      await this.client.from('markets').upsert({
        id: market.id,
        name: market.name,
        city: market.city,
        active: Boolean(market.active)
      });
    } catch (e) {}
  }

  async deleteMarket(id) {
    if (!this.client) return;
    try {
      await this.client.from('markets').delete().eq('id', id);
    } catch (e) {}
  }

  async syncCategory(category) {
    if (!this.client) return;
    try {
      await this.client.from('categories').upsert({
        id: category.id,
        name: category.name,
        color: category.color,
        icon: category.icon
      });
    } catch (e) {}
  }

  async deleteCategory(id) {
    if (!this.client) return;
    try {
      await this.client.from('categories').delete().eq('id', id);
    } catch (e) {}
  }

  async syncSale(sale) {
    if (!this.client) return;
    try {
      await this.client.from('sales').upsert({
        id: sale.id,
        timestamp: sale.timestamp,
        date_str: sale.dateStr,
        market: sale.market,
        items: sale.items,
        subtotal: sale.subtotal,
        discount: sale.discount,
        total: sale.total,
        payment_method: sale.paymentMethod,
        amount_received: sale.amountReceived,
        change: sale.change,
        notes: sale.notes
      });
    } catch (e) {
      console.warn('Supabase syncSale error:', e);
    }
  }

  async deleteSale(id) {
    if (!this.client) return;
    try {
      await this.client.from('sales').delete().eq('id', id);
    } catch (e) {}
  }

  async pushAllLocalData(localData) {
    if (!this.client) return false;
    try {
      if (localData.products?.length) {
        await this.client.from('products').upsert(localData.products);
      }
      if (localData.categories?.length) {
        await this.client.from('categories').upsert(localData.categories);
      }
      if (localData.markets?.length) {
        await this.client.from('markets').upsert(localData.markets);
      }
      if (localData.sales?.length) {
        const salesRows = localData.sales.map(s => ({
          id: s.id,
          timestamp: s.timestamp,
          date_str: s.dateStr,
          market: s.market,
          items: s.items,
          subtotal: s.subtotal,
          discount: s.discount,
          total: s.total,
          payment_method: s.paymentMethod,
          amount_received: s.amountReceived,
          change: s.change,
          notes: s.notes
        }));
        await this.client.from('sales').upsert(salesRows);
      }
      return true;
    } catch (e) {
      console.error('Failed to push all local data to Supabase:', e);
      return false;
    }
  }
}

export const supabaseService = new SupabaseService();
