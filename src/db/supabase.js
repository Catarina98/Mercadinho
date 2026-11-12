import { createClient } from '@supabase/supabase-js';

class SupabaseService {
  constructor() {
    this.client = null;
    this.url = '';
    this.anonKey = '';
    // Check for environment variables if available
    const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
    const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';
    if (envUrl && envKey) {
      this.init(envUrl, envKey);
    }
  }


  init(url, anonKey) {
    if (!url || !anonKey) {
      this.client = null;
      this.url = '';
      this.anonKey = '';
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
      this.client = createClient(this.url, this.anonKey, {
        global: {
          fetch: (input, options = {}) => {
            if (!AbortSignal.any || !AbortSignal.timeout) return fetch(input, options);
            return fetch(input, {
              ...options,
              signal: AbortSignal.any([AbortSignal.timeout(15000), ...(options.signal ? [options.signal] : [])])
            });
          }
        }
      });
      return this.client;
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      this.client = null;
      return null;
    }
  }

  async signIn(email, password) {
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signOut() {
    const { error } = await this.client.auth.signOut({ scope: 'local' });
    if (error) throw error;
  }

  async checkAccess() {
    const { data, error } = await this.client.rpc('is_mercadinho_operator');
    if (error) throw error;
    return data === true;
  }

  async removeWallapopLink(product) {
    const { data, error } = await this.client.functions.invoke('remove-wallapop-link', {
      body: { productId: product.id, expectedUrl: product.wallapop_url }
    });
    if (error) {
      const details = await error.context?.json?.().catch(() => null);
      throw new Error(details?.error || 'Não foi possível confirmar a remoção do link. Tenta novamente.');
    }
    return data;
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
    if (product.sanity_product_id || product.id.startsWith('sanity:')) return;
    const { error } = await this.client.from('products').upsert({
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
    if (error) throw error;
  }

  async deleteProduct(id) {
    const { error } = await this.client.from('products').delete().eq('id', id);
    if (error) throw error;
  }

  async syncMarket(market) {
    const { error } = await this.client.from('markets').upsert({
      id: market.id, name: market.name, city: market.city, active: Boolean(market.active)
    });
    if (error) throw error;
  }

  async deleteMarket(id) {
    const { error } = await this.client.from('markets').delete().eq('id', id);
    if (error) throw error;
  }

  async syncCategory(category) {
    const { error } = await this.client.from('categories').upsert({
      id: category.id, name: category.name, color: category.color, icon: category.icon
    });
    if (error) throw error;
  }

  async deleteCategory(id) {
    const { error } = await this.client.from('categories').delete().eq('id', id);
    if (error) throw error;
  }

  async deleteSale(id) {
    const { error } = await this.client.from('sales').delete().eq('id', id);
    if (error) throw error;
  }

  async fetchProductsById(ids) {
    const { data, error } = await this.client.from('products').select('*').in('id', ids);
    if (error) throw error;
    return data;
  }
}

export const supabaseService = new SupabaseService();
