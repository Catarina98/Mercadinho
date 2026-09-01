import { DEFAULT_CATEGORIES, DEFAULT_MARKETS, DEFAULT_PRODUCTS, generateSampleSales } from '../utils/sampleData';
import { supabaseService } from './supabase';

const DB_NAME = 'mercadinho_pos_db_v3';
const DB_VERSION = 1;

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
  theme: 'dark',
  supabaseUrl: '',
  supabaseAnonKey: '',
  cloudSyncEnabled: false
};

class PosStorage {
  constructor() {
    this.db = null;
    this.ready = this.init();
  }

  async init() {
    if (!('indexedDB' in window)) {
      console.warn('IndexedDB not available, falling back to localStorage');
      this.initLocalStorageDefaults();
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

      request.onsuccess = async (event) => {
        this.db = event.target.result;
        resolve(this.db);
        try {
          await this.seedDefaultsIfEmpty();
        } catch (e) {
          console.error("Seeding error:", e);
        }
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        this.initLocalStorageDefaults();
        resolve(null);
      };
    });
  }

  initLocalStorageDefaults() {
    if (!localStorage.getItem(KEYS.PRODUCTS)) {
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
    }
    if (!localStorage.getItem(KEYS.CATEGORIES)) {
      localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    }
    if (!localStorage.getItem(KEYS.MARKETS)) {
      localStorage.setItem(KEYS.MARKETS, JSON.stringify(DEFAULT_MARKETS));
    }
    if (!localStorage.getItem(KEYS.ACTIVE_MARKET)) {
      localStorage.setItem(KEYS.ACTIVE_MARKET, JSON.stringify(DEFAULT_MARKETS[0]));
    }
    if (!localStorage.getItem(KEYS.SALES)) {
      localStorage.setItem(KEYS.SALES, JSON.stringify(generateSampleSales()));
    }
    if (!localStorage.getItem(KEYS.SETTINGS)) {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }
  }

  async seedDefaultsIfEmpty() {
    if (!this.db) return;

    const countStore = (storeName) => new Promise((res) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).count();
      req.onsuccess = () => res(req.result);
      req.onerror = () => res(0);
    });

    const putItem = (storeName, item) => new Promise((res) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const req = tx.objectStore(storeName).put(item);
      req.onsuccess = () => res(req.result);
      req.onerror = () => res(null);
    });

    const prodCount = await countStore('products');
    if (prodCount === 0) {
      for (const p of DEFAULT_PRODUCTS) {
        await putItem('products', p);
      }
    }

    const catCount = await countStore('categories');
    if (catCount === 0) {
      for (const c of DEFAULT_CATEGORIES) {
        await putItem('categories', c);
      }
    }

    const mktCount = await countStore('markets');
    if (mktCount === 0) {
      for (const m of DEFAULT_MARKETS) {
        await putItem('markets', m);
      }
    }

    const salesCount = await countStore('sales');
    if (salesCount === 0) {
      const sampleSales = generateSampleSales();
      for (const s of sampleSales) {
        await putItem('sales', s);
      }
    }

    const settings = await this.get('settings', 'config');
    if (!settings) {
      await putItem('settings', { key: 'config', ...DEFAULT_SETTINGS });
    }
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

  async saveProduct(product) {
    if (!product.id) {
      product.id = `prod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    }
    await this.put('products', product);
    supabaseService.syncProduct(product);
    return product;
  }

  async deleteProduct(id) {
    supabaseService.deleteProduct(id);
    return await this.delete('products', id);
  }

  async getCategories() {
    return await this.getAll('categories');
  }

  async saveCategory(category) {
    if (!category.id) {
      category.id = `cat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    }
    await this.put('categories', category);
    supabaseService.syncCategory(category);
    return category;
  }

  async deleteCategory(id) {
    supabaseService.deleteCategory(id);
    return await this.delete('categories', id);
  }

  async getMarkets() {
    return await this.getAll('markets');
  }

  async saveMarket(market) {
    if (!market.id) {
      market.id = `mkt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    }
    await this.put('markets', market);
    supabaseService.syncMarket(market);
    return market;
  }

  async deleteMarket(id) {
    supabaseService.deleteMarket(id);
    return await this.delete('markets', id);
  }

  getActiveMarket() {
    const raw = localStorage.getItem(KEYS.ACTIVE_MARKET);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return DEFAULT_MARKETS[0];
  }

  setActiveMarket(market) {
    localStorage.setItem(KEYS.ACTIVE_MARKET, JSON.stringify(market));
  }

  async getSales() {
    const sales = await this.getAll('sales');
    return sales.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  async saveSale(saleData) {
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

    await this.put('sales', sale);
    supabaseService.syncSale(sale);

    // Optional stock decrement
    const products = await this.getProducts();
    for (const item of sale.items) {
      const product = products.find(p => p.id === item.id || (p.code && p.code === item.code));
      if (product && typeof product.stock === 'number') {
        product.stock = Math.max(0, product.stock - (item.quantity || 1));
        await this.put('products', product);
        supabaseService.syncProduct(product);
      }
    }

    return sale;
  }

  async deleteSale(id) {
    supabaseService.deleteSale(id);
    return await this.delete('sales', id);
  }

  async getSettings() {
    const config = await this.get('settings', 'config');
    return config ? { ...DEFAULT_SETTINGS, ...config } : DEFAULT_SETTINGS;
  }

  async saveSettings(newSettings) {
    const updated = { key: 'config', ...newSettings };
    await this.put('settings', updated);
    
    // Initialize or reconfigure Supabase client
    if (updated.supabaseUrl && updated.supabaseAnonKey) {
      supabaseService.init(updated.supabaseUrl, updated.supabaseAnonKey);
    }
    return updated;
  }

  async syncWithCloud() {
    const settings = await this.getSettings();
    if (!settings.supabaseUrl || !settings.supabaseAnonKey) {
      return { success: false, message: 'Supabase URL and Anon Key not configured' };
    }

    supabaseService.init(settings.supabaseUrl, settings.supabaseAnonKey);
    const isConn = await supabaseService.testConnection();
    if (!isConn) {
      return { success: false, message: 'Could not connect to Supabase. Check credentials and table schema.' };
    }

    const remote = await supabaseService.fetchRemoteData();
    if (!remote) {
      return { success: false, message: 'Failed to fetch data from Supabase' };
    }

    // Merge remote into local
    if (remote.products?.length) {
      for (const p of remote.products) await this.put('products', p);
    }
    if (remote.categories?.length) {
      for (const c of remote.categories) await this.put('categories', c);
    }
    if (remote.markets?.length) {
      for (const m of remote.markets) await this.put('markets', m);
    }
    if (remote.sales?.length) {
      for (const s of remote.sales) await this.put('sales', s);
    }

    // Push local items that might not be in remote
    const localData = {
      products: await this.getProducts(),
      categories: await this.getCategories(),
      markets: await this.getMarkets(),
      sales: await this.getSales()
    };
    await supabaseService.pushAllLocalData(localData);

    return {
      success: true,
      message: 'Cloud Sync Complete! All data synchronized with Supabase.'
    };
  }

  // Wipe local data completely and replace with cloud database records
  async pullFromCloudAndReplaceLocal() {
    const settings = await this.getSettings();
    if (!settings.supabaseUrl || !settings.supabaseAnonKey) {
      return { success: false, message: 'Supabase URL and Anon Key are not configured in settings.' };
    }

    supabaseService.init(settings.supabaseUrl, settings.supabaseAnonKey);
    const isConn = await supabaseService.testConnection();
    if (!isConn) {
      return { success: false, message: 'Could not connect to Supabase. Please verify your Project URL and Anon Key.' };
    }

    const remote = await supabaseService.fetchRemoteData();
    if (!remote) {
      return { success: false, message: 'Failed to fetch data from Supabase tables.' };
    }

    // 1. Wipe local database stores
    await this.clear('products');
    await this.clear('categories');
    await this.clear('markets');
    await this.clear('sales');

    // 2. Insert all remote records
    const prods = remote.products || [];
    const cats = remote.categories || [];
    const mkts = remote.markets || [];
    const sales = remote.sales || [];

    for (const p of prods) await this.put('products', p);
    for (const c of cats) await this.put('categories', c);
    for (const m of mkts) await this.put('markets', m);
    for (const s of sales) await this.put('sales', s);

    if (mkts.length > 0) {
      const activeM = mkts.find(m => m.active) || mkts[0];
      this.setActiveMarket(activeM);
    }

    return {
      success: true,
      message: `Successfully replaced local data! Loaded ${prods.length} products, ${cats.length} categories, ${mkts.length} markets, and ${sales.length} sales from your cloud database.`,
      counts: {
        products: prods.length,
        categories: cats.length,
        markets: mkts.length,
        sales: sales.length
      }
    };
  }

  // Push all local data to Supabase (initial seed or force push)
  async pushAllLocalDataToCloud() {
    const settings = await this.getSettings();
    if (!settings.supabaseUrl || !settings.supabaseAnonKey) {
      return { success: false, message: 'Supabase URL and Anon Key are not configured in settings.' };
    }

    supabaseService.init(settings.supabaseUrl, settings.supabaseAnonKey);
    const isConn = await supabaseService.testConnection();
    if (!isConn) {
      return { success: false, message: 'Could not connect to Supabase. Please verify your Project URL and Anon Key.' };
    }

    const localData = {
      products: await this.getProducts(),
      categories: await this.getCategories(),
      markets: await this.getMarkets(),
      sales: await this.getSales()
    };

    const res = await supabaseService.pushAllLocalData(localData);
    if (!res) {
      return { success: false, message: 'Failed to upload local data to Supabase.' };
    }

    return {
      success: true,
      message: `Successfully uploaded ${localData.products.length} products, ${localData.categories.length} categories, ${localData.markets.length} markets, and ${localData.sales.length} sales to Supabase cloud!`
    };
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
    if (!backupData || !backupData.data) {
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

  async resetToDemoData() {
    await this.clear('products');
    await this.clear('categories');
    await this.clear('markets');
    await this.clear('sales');
    await this.clear('settings');

    for (const p of DEFAULT_PRODUCTS) await this.put('products', p);
    for (const c of DEFAULT_CATEGORIES) await this.put('categories', c);
    for (const m of DEFAULT_MARKETS) await this.put('markets', m);
    for (const s of generateSampleSales()) await this.put('sales', s);
    await this.put('settings', { key: 'config', ...DEFAULT_SETTINGS });
    this.setActiveMarket(DEFAULT_MARKETS[0]);
    return true;
  }
}

export const db = new PosStorage();
