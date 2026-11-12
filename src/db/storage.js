import { supabaseService } from './supabase';

const DB_NAME = 'mercadinho_pos_db_v3';
const DB_VERSION = 1;
function requireOnline() {
  if (!navigator.onLine) throw new Error('O Mercadinho precisa de uma ligação à internet.');
}

const PENDING_CATALOG_SALE = 'mercadinho_pending_catalog_sale:';

// Storage keys for localStorage fallback or key-value caches
const KEYS = {
  PRODUCTS: 'mercadinho_products_v3',
  CATEGORIES: 'mercadinho_categories_v3',
  MARKETS: 'mercadinho_markets_v3',
  ACTIVE_MARKET: 'mercadinho_active_market_v3',
  SALES: 'mercadinho_sales_v3',
  SETTINGS: 'mercadinho_settings_v3'
};

const DEFAULT_SETTINGS = {
  currency: 'EUR',
  currencySymbol: '€',
  soundEnabled: true,
  vibrationEnabled: true,
  taxRate: 0,
  storeName: 'Amigurumi & Artesanato',
  theme: 'dark'
};

class PosStorage {
  constructor() {
    this.db = null;
    this.ready = this.init();
  }

  async init() {
    if (!('indexedDB' in window)) {
      console.warn('IndexedDB not available, falling back to localStorage');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('products')) {
          const prodStore = db.createObjectStore('products', { keyPath: 'id' });
          prodStore.createIndex('code', 'code', { unique: false });
          prodStore.createIndex('category', 'category', { unique: false });
        }
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('markets')) {
          db.createObjectStore('markets', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sales')) {
          const salesStore = db.createObjectStore('sales', { keyPath: 'id' });
          salesStore.createIndex('timestamp', 'timestamp', { unique: false });
          salesStore.createIndex('market', 'market', { unique: false });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        resolve(null);
      };
    });
  }

  // Generic IndexedDB helpers with localStorage fallback
  async getAll(storeName) {
    await this.ready;
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } else {
      const key = KEYS[storeName.toUpperCase()] || storeName;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    }
  }

  async get(storeName, id) {
    await this.ready;
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } else {
      const all = await this.getAll(storeName);
      return all.find(item => item.id === id || item.key === id) || null;
    }
  }

  async put(storeName, item) {
    await this.ready;
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(item);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } else {
      const key = KEYS[storeName.toUpperCase()] || storeName;
      const all = await this.getAll(storeName);
      const index = all.findIndex(i => (i.id && i.id === item.id) || (i.key && i.key === item.key));
      if (index >= 0) {
        all[index] = item;
      } else {
        all.push(item);
      }
      localStorage.setItem(key, JSON.stringify(all));
      return item.id || item.key;
    }
  }

  async delete(storeName, id) {
    await this.ready;
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } else {
      const key = KEYS[storeName.toUpperCase()] || storeName;
      const all = await this.getAll(storeName);
      const filtered = all.filter(i => i.id !== id && i.key !== id);
      localStorage.setItem(key, JSON.stringify(filtered));
      return true;
    }
  }

  async clear(storeName) {
    await this.ready;
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } else {
      const key = KEYS[storeName.toUpperCase()] || storeName;
      localStorage.removeItem(key);
      return true;
    }
  }

  // --- Specific Business Logic Operations ---

  async getProducts() {
    return await this.getAll('products');
  }

  async getProductByCode(code) {
    if (!code) return null;
    const cleanCode = code.toString().trim().toLowerCase();
    const products = await this.getProducts();
    return products.find(p => p.code && p.code.toString().trim().toLowerCase() === cleanCode) || null;
  }

  getPendingCatalogSales() {
    return Object.keys(localStorage)
      .filter(key => key.startsWith(PENDING_CATALOG_SALE))
      .map(key => JSON.parse(localStorage.getItem(key)))
      .filter(Boolean)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  async flushCatalogSales() {
    if (!this.catalogSalesSync) {
      this.catalogSalesSync = (async () => {
        requireOnline();
        for (const sale of this.getPendingCatalogSales()) {
          await supabaseService.recordCatalogSale(sale);
          localStorage.removeItem(PENDING_CATALOG_SALE + sale.id);
        }
      })().finally(() => { this.catalogSalesSync = null; });
    }
    return this.catalogSalesSync;
  }

  async prepareWallapopListing(product) {
    requireOnline();
    return supabaseService.wallapopListing({ action: 'prepare', productId: product.id });
  }

  async updateWallapopLink(product, url) {
    requireOnline();
    const result = await supabaseService.wallapopListing(url
      ? { action: 'associate', productId: product.id, url }
      : { productId: product.id, expectedUrl: product.wallapop_url });
    const cached = await this.get('products', product.id);
    if (cached) await this.put('products', { ...cached, wallapop_url: result.wallapopUrl });
    return result;
  }

  async setCatalogStock(product, stock) {
    requireOnline();
    const updated = await supabaseService.setCatalogStock(product, stock);
    await this.put('products', updated);
    return updated;
  }

  async linkCatalogInventory(imported, existingId) {
    requireOnline();
    const linked = await supabaseService.linkCatalogInventory(imported, existingId);
    await this.put("products", linked);
    await this.delete("products", imported.id);
    return linked;
  }

  async syncFromCloudOnStartup() {
    requireOnline();
    if (!(await supabaseService.checkAccess())) {
      return { success: false, source: 'forbidden', message: 'Esta conta não tem acesso ao Mercadinho.' };
    }

    // Retry legacy pending sales from devices running the previous version.
    try {
      await this.flushCatalogSales();
    } catch (error) {
      console.warn('Há vendas antigas por sincronizar:', error);
    }

    // 4. Fetch all remote records from the database
    const remote = await supabaseService.fetchRemoteData();
    if (!remote) {
      return {
        success: false,
        source: 'error',
        message: 'Não foi possível carregar o inventário e as vendas.'
      };
    }

    const { products = [], categories = [], markets = [], sales = [] } = remote;
    // Keep historical local records and remove obsolete links to the Sanity catalog.
    const remoteIds = new Set(products.map(product => product.id));
    for (const product of await this.getProducts()) {
      if (product.sanity_product_id && !remoteIds.has(product.id)) {
        await this.delete('products', product.id);
      }
    }

    for (const p of products) await this.put('products', p);
    for (const c of categories) {
      const cached = await this.get('categories', c.id);
      await this.put('categories', { order: cached?.order, ...c });
    }
    for (const m of markets) await this.put('markets', m);
    for (const s of sales) await this.put('sales', s);

    if (markets.length > 0) {
      const currentMarket = this.getActiveMarket();
      this.setActiveMarket(markets.find(m => m.id === currentMarket?.id) || markets.find(m => m.active) || markets[0]);
    }
    return { success: true, source: 'cloud', message: this.getPendingCatalogSales().length ? 'Dados atualizados. Há vendas antigas por sincronizar.' : 'Inventário e vendas atualizados.' };
  }

  async saveProduct(product) {
    if (!product.id) {
      product.id = `prod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    }
    requireOnline();
    await supabaseService.syncProduct(product);
    await this.put('products', product);
    return product;
  }

  async deleteProduct(id) {
    const existing = await this.get('products', id);
    if (existing?.sanity_product_id || id.startsWith('sanity:')) return false;
    requireOnline();
    await supabaseService.deleteProduct(id);
    return await this.delete('products', id);
  }

  async getCategories() {
    const cats = await this.getAll('categories');
    return cats.sort((a, b) => (a.order !== undefined ? a.order : 999) - (b.order !== undefined ? b.order : 999));
  }

  async saveCategory(category) {
    if (!category.id) {
      category.id = `cat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    }
    if (category.order === undefined) {
      const existing = await this.getAll('categories');
      category.order = existing.length;
    }
    requireOnline();
    await supabaseService.syncCategory(category);
    await this.put('categories', category);
    return category;
  }

  async saveAllCategories(categoriesList) {
    requireOnline();
    await this.clear('categories');
    const ordered = categoriesList.map((c, idx) => ({ ...c, order: idx }));
    for (const c of ordered) {
      await this.put('categories', c);
    }

    return ordered;
  }

  async deleteCategory(id) {
    requireOnline();
    await supabaseService.deleteCategory(id);
    return await this.delete('categories', id);
  }

  async getMarkets() {
    return await this.getAll('markets');
  }

  async saveMarket(market) {
    if (!market.id) {
      market.id = `mkt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    }
    requireOnline();
    await supabaseService.syncMarket(market);
    await this.put('markets', market);
    return market;
  }

  async deleteMarket(id) {
    requireOnline();
    await supabaseService.deleteMarket(id);
    return await this.delete('markets', id);
  }

  getActiveMarket() {
    const raw = localStorage.getItem(KEYS.ACTIVE_MARKET);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) { }
    }
    return null;
  }

  setActiveMarket(market) {
    localStorage.setItem(KEYS.ACTIVE_MARKET, JSON.stringify(market));
  }

  async getSales() {
    const sales = await this.getAll('sales');
    return sales.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  async deleteSale(id) {
    if (localStorage.getItem(PENDING_CATALOG_SALE + id)) {
      throw new Error('Esta venda ainda está por sincronizar.');
    }
    requireOnline();
    await supabaseService.deleteSale(id);
    return await this.delete('sales', id);
  }

  async saveSale(saleData) {
    requireOnline();
    const sale = {
      id: saleData.id || `sale-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: saleData.timestamp || new Date().toISOString(),
      dateStr: (saleData.timestamp ? new Date(saleData.timestamp) : new Date()).toISOString().split('T')[0],
      market: saleData.market || 'Unknown Market',
      items: saleData.items || [],
      subtotal: Number(saleData.subtotal || 0),
      discount: Number(saleData.discount || 0),
      tax: Number(saleData.tax || 0),
      total: Number(saleData.total || 0),
      paymentMethod: saleData.paymentMethod || 'cash',
      amountReceived: Number(saleData.amountReceived || saleData.total || 0),
      change: Number(saleData.change || 0),
      notes: saleData.notes || ''
    };

    const existingSale = await this.get('sales', sale.id);
    if (existingSale) return existingSale;

    // The same server transaction records the sale and subtracts stock for all inventory items.
    // Reusing the sale ID makes retries safe if the connection drops before the response arrives.
    await supabaseService.recordCatalogSale(sale);
    await this.put('sales', sale);

    try {
      const ids = [...new Set(sale.items.map(item => item.id))];
      const products = await supabaseService.fetchProductsById(ids);
      for (const product of products) await this.put('products', product);
    } catch (error) {
      console.warn('Venda registada. Não foi possível atualizar o stock no dispositivo:', error);
    }
    return sale;
  }

  async getSettings() {
    const config = await this.get('settings', 'config');
    const { supabaseUrl, supabaseAnonKey, autoSyncOnStartup, cloudSyncEnabled, ...preferences } = config || {};
    return { ...DEFAULT_SETTINGS, ...preferences };
  }

  async saveSettings(newSettings) {
    const { supabaseUrl, supabaseAnonKey, autoSyncOnStartup, cloudSyncEnabled, ...preferences } = newSettings;
    const updated = { ...await this.getSettings(), ...preferences, key: 'config' };
    await this.put('settings', updated);
    return updated;
  }

  async exportFullBackup() {
    const products = await this.getProducts();
    const categories = await this.getCategories();
    const markets = await this.getMarkets();
    const sales = await this.getSales();
    const settings = await this.getSettings();

    return {
      appName: 'Mercadinho POS',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: {
        products,
        categories,
        markets,
        sales,
        settings,
        activeMarket: this.getActiveMarket()
      }
    };
  }

  async importFullBackup(backupData) {
    if (!backupData?.data) {
      throw new Error('Invalid backup file format');
    }

    const { products, categories, markets, sales, settings, activeMarket } = backupData.data;

    if (Array.isArray(products)) {
      await this.clear('products');
      for (const p of products) await this.put('products', p);
    }
    if (Array.isArray(categories)) {
      await this.clear('categories');
      for (const c of categories) await this.put('categories', c);
    }
    if (Array.isArray(markets)) {
      await this.clear('markets');
      for (const m of markets) await this.put('markets', m);
    }
    if (Array.isArray(sales)) {
      await this.clear('sales');
      for (const s of sales) await this.put('sales', s);
    }
    if (settings) {
      await this.saveSettings(settings);
    }
    if (activeMarket) {
      this.setActiveMarket(activeMarket);
    }

    return true;
  }

}

export const db = new PosStorage();
