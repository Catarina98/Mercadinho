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

`.trim();

class SupabaseService {
  constructor() {
    this.client = null;
    this.url = '';
    this.anonKey = '';
    this.isConnected = false;

    // Check for environment variables if available
    const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
    const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';
    if (envUrl && envKey) {
      this.init(envUrl, envKey);
    }
  }

  isConfigured() {
    return Boolean(this.url && this.anonKey && this.client);
  }

  init(url, anonKey) {
    if (!url || !anonKey) {
      this.client = null;
      this.url = '';
      this.anonKey = '';
      this.isConnected = false;
      return null;
    }

    try {
      const cleanUrl = url.trim();
      const cleanKey = anonKey.trim();

      // Avoid re-creating client if already initialized with the exact same credentials
      if (this.client && this.url === cleanUrl && this.anonKey === cleanKey) {
        return this.client;
      }

      this.url = cleanUrl;
      this.anonKey = cleanKey;
      this.client = createClient(this.url, this.anonKey);
      return this.client;
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      this.client = null;
      this.isConnected = false;
      return null;
    }
  }

  async signIn(email, password) {
    if (!this.client) throw new Error("Configura a ligação ao Supabase nas definições.");
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const permission = await this.client.rpc("is_mercadinho_operator");
    if (permission.error || !permission.data) {
      await this.client.auth.signOut();
      throw new Error("A conta ainda não tem acesso ao inventário.");
    }
  }

  async setCatalogStock(product, stock) {
    if (!this.client) throw new Error("Liga-te ao Supabase para guardar o stock.");
    const { data, error } = await this.client.rpc("set_catalog_stock", {
      product_id: product.id,
      expected_stock: product.stock,
      expected_confirmed: product.stock_confirmed,
      new_stock: stock
    });
    if (error) throw error;
    return data;
  }

  async linkCatalogInventory(imported, existingId) {
    if (!this.client) throw new Error("Liga-te ao Supabase para associar o artigo.");
    const { data, error } = await this.client.rpc("link_catalog_inventory", {
      imported_id: imported.id,
      existing_id: existingId
    });
    if (error) throw error;
    return data;
  }

  async recordCatalogSale(sale) {
    if (!this.client) throw new Error("Liga-te ao Supabase para sincronizar a venda.");
    const { error } = await this.client.rpc("record_catalog_sale", { sale });
    if (error) throw error;
  }

  async testConnection() {
    if (!this.client) return false;
    try {
      const permission = await this.client.rpc('is_mercadinho_operator');
      if ((permission.error && permission.error.code !== 'PGRST202') || permission.data === false) {
        this.isConnected = false;
        return false;
      }
      const { error } = await this.client.from('products').select('id').limit(1);
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
        dateStr: s.date_str || (s.timestamp ? s.timestamp.split('T')[0] : new Date().toISOString().split('T')[0]),
        market: s.market || '',
        items: Array.isArray(s.items) ? s.items : [],
        subtotal: Number(s.subtotal || 0),
        discount: Number(s.discount || 0),
        total: Number(s.total || 0),
        paymentMethod: s.payment_method || 'cash',
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
    if (!this.client || product.sanity_product_id || product.id.startsWith('sanity:')) return;
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

  async deleteProduct(id, code = null) {
    if (!this.client) return;
    try {
      if (id) {
        const res = await this.client.from('products').delete().eq('id', id);
        if (res.error) console.warn('Supabase deleteProduct by id error:', res.error);
      }
      if (code) {
        const resCode = await this.client.from('products').delete().eq('code', code);
        if (resCode.error) console.warn('Supabase deleteProduct by code error:', resCode.error);
      }
    } catch (e) {
      console.warn('Supabase deleteProduct exception:', e);
    }
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
      const res = await this.client.from('markets').delete().eq('id', id);
      if (res.error) console.warn('Supabase deleteMarket error:', res.error);
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
    } catch (e) {
      console.warn('Supabase syncCategory error:', e);
    }
  }

  async deleteCategory(id) {
    if (!this.client) return;
    try {
      const res = await this.client.from('categories').delete().eq('id', id);
      if (res.error) console.warn('Supabase deleteCategory error:', res.error);
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
      const res = await this.client.from('sales').delete().eq('id', id);
      if (res.error) console.warn('Supabase deleteSale error:', res.error);
    } catch (e) {}
  }

  async pushAllLocalData(localData, { overwriteAll = false } = {}) {
    if (!this.client) return false;
    try {
      // If overwriteAll is requested, delete remote items that do not exist in local
      if (overwriteAll) {
        const remote = await this.fetchRemoteData();
        if (remote) {
          const localProdIds = new Set((localData.products || []).map(p => p.id));
          for (const p of (remote.products || [])) {
            if (!p.sanity_product_id && !localProdIds.has(p.id)) {
              await this.client.from('products').delete().eq('id', p.id);
            }
          }

          const localCatIds = new Set((localData.categories || []).map(c => c.id));
          for (const c of (remote.categories || [])) {
            if (!localCatIds.has(c.id)) {
              await this.client.from('categories').delete().eq('id', c.id);
            }
          }

          const localMktIds = new Set((localData.markets || []).map(m => m.id));
          for (const m of (remote.markets || [])) {
            if (!localMktIds.has(m.id)) {
              await this.client.from('markets').delete().eq('id', m.id);
            }
          }
        }
      }

      const privateProducts = (localData.products || []).filter(p => !p.sanity_product_id && !p.id.startsWith('sanity:'));
      if (privateProducts.length) {
        const { error } = await this.client.from('products').upsert(privateProducts);
        if (error) throw error;
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
        const { error } = await this.client.from('sales').upsert(salesRows);
        if (error) throw error;
      }
      return true;
    } catch (e) {
      console.error('Failed to push all local data to Supabase:', e);
      return false;
    }
  }
}

export const supabaseService = new SupabaseService();
