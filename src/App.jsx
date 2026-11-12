import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import PosView from './components/PosView';
import AnalyticsView from './components/AnalyticsView';
import SalesHistoryView from './components/SalesHistoryView';
import CatalogView from './components/CatalogView';
import WallapopView from './components/WallapopView';
import SettingsView from './components/SettingsView';
import MarketSelectorModal from './components/MarketSelectorModal';
import { db } from './db/storage';
import { supabaseService } from './db/supabase';
import AccessScreen from './components/AccessScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' | 'analytics' | 'sales' | 'catalog' | 'settings'
  const [products, setProducts] = useState([]);
  const [stockProductId, setStockProductId] = useState('');
  const [categories, setCategories] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [activeMarket, setActiveMarket] = useState(null);
  const [sales, setSales] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isMarketModalOpen, setIsMarketModalOpen] = useState(false);
  const [editingProductInitial, setEditingProductInitial] = useState(null);
  const [userId, setUserId] = useState(undefined);
  const [validatedUser, setValidatedUser] = useState(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [access, setAccess] = useState('checking');
  const [retry, setRetry] = useState(0);
  const [cloudSyncStatus, setCloudSyncStatus] = useState('synced');
  const client = supabaseService.client;

  const refreshAllData = useCallback(async () => {
    const [loadedProds, loadedCats, loadedMkts, loadedSales, loadedSettings] = await Promise.all([
      db.getProducts(),
      db.getCategories(),
      db.getMarkets(),
      db.getSales(),
      db.getSettings()
    ]);
    setProducts(loadedProds);
    setCategories(loadedCats);
    setMarkets(loadedMkts);
    setSales(loadedSales);
    setSettings(loadedSettings);
    setActiveMarket(db.getActiveMarket() || loadedMkts[0] || null);
  }, []);

  useEffect(() => {
    if (!client) return;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user.id ?? null;
      setUserId(nextUser);
      if (!nextUser) setValidatedUser(null);
    });
    return () => subscription.unsubscribe();
  }, [client]);

  useEffect(() => {
    const reconnect = () => {
      setAccess('checking');
      setOnline(true);
      setRetry(attempt => attempt + 1);
    };
    const disconnect = () => {
      setAccess('checking');
      setOnline(false);
    };
    window.addEventListener('online', reconnect);
    window.addEventListener('offline', disconnect);
    return () => {
      window.removeEventListener('online', reconnect);
      window.removeEventListener('offline', disconnect);
    };
  }, []);

  useEffect(() => {
    if (!online || !userId) return;
    let cancelled = false;
    setAccess('checking');
    async function loadInventory() {
      try {
        const result = await db.syncFromCloudOnStartup();
        if (cancelled || !navigator.onLine) return;
        if (!result.success) {
          setAccess(result.source === 'forbidden' ? 'forbidden' : 'error');
          return;
        }
        await refreshAllData();
        if (cancelled || !navigator.onLine) return;
        setValidatedUser(userId);
        setAccess('ready');
      } catch {
        if (!cancelled && navigator.onLine) setAccess('error');
      }
    }
    loadInventory();
    return () => { cancelled = true; };
  }, [online, refreshAllData, retry, userId]);

  const canUseApp = online && access === 'ready' && Boolean(userId) && validatedUser === userId;

  // A device can report that it is online even when it cannot reach the service.
  useEffect(() => {
    if (!canUseApp) return;
    let cancelled = false;
    let checking = false;
    async function checkConnection() {
      if (checking || document.visibilityState === 'hidden') return;
      checking = true;
      try {
        if (!(await supabaseService.checkAccess()) && !cancelled) setAccess('forbidden');
      } catch {
        if (!cancelled) setAccess('error');
      } finally {
        checking = false;
      }
    }
    const interval = window.setInterval(checkConnection, 30000);
    document.addEventListener('visibilitychange', checkConnection);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', checkConnection);
    };
  }, [canUseApp]);

  const triggerCloudSync = async () => {
    setCloudSyncStatus('syncing');
    try {
      const result = await db.syncFromCloudOnStartup();
      if (result.success) await refreshAllData();
      else setAccess(result.source === 'forbidden' ? 'forbidden' : 'error');
      return result;
    } catch {
      setAccess('error');
      return { success: false, message: 'Não foi possível atualizar o inventário.' };
    } finally {
      setCloudSyncStatus('synced');
    }
  };

  const signOut = async () => {
    await supabaseService.signOut();
    setActiveTab('pos');
    setIsMarketModalOpen(false);
  };

  // These views use the same handler from both the catalog and the market selector.
  const withSaveFeedback = action => async (...args) => {
    try {
      await action(...args);
    } catch {
      window.alert('Não foi possível guardar a alteração. Verifica a ligação e tenta novamente.');
    }
  };

  // Handlers for Market Locations
  const handleSelectMarket = (mkt) => {
    setActiveMarket(mkt);
    db.setActiveMarket(mkt);
  };

  const handleAddMarket = async (mktData) => {
    const saved = await db.saveMarket(mktData);
    const updated = await db.getMarkets();
    setMarkets(updated);
    setActiveMarket(saved);
    db.setActiveMarket(saved);
  };

  const handleDeleteMarket = async (mktId) => {
    await db.deleteMarket(mktId);
    const updated = await db.getMarkets();
    setMarkets(updated);
    if (activeMarket && activeMarket.id === mktId) {
      const nextActive = updated[0] || null;
      setActiveMarket(nextActive);
      if (nextActive) db.setActiveMarket(nextActive);
    }
  };

  // Handlers for Products
  const handleSaveProduct = async (productData) => {
    await db.saveProduct(productData);
    const updated = await db.getProducts();
    setProducts(updated);
  };

  const handleDeleteProduct = async (productId) => {
    await db.deleteProduct(productId);
    const updated = await db.getProducts();
    setProducts(updated);
  };

  // Handlers for Categories
  const handleSaveCategory = async (catData) => {
    await db.saveCategory(catData);
    const updated = await db.getCategories();
    setCategories(updated);
  };

  const handleReorderCategories = async (reorderedList) => {
    const updated = await db.saveAllCategories(reorderedList);
    setCategories(updated);
  };

  const handleDeleteCategory = async (catId) => {
    await db.deleteCategory(catId);
    const updated = await db.getCategories();
    setCategories(updated);
  };

  // Handlers for Sales
  const handleSaveSale = async (saleData) => {
    if (!canUseApp || !navigator.onLine) throw new Error('Sem acesso ao Mercadinho.');
    const saved = await db.saveSale(saleData);
    const updatedSales = await db.getSales();
    const updatedProds = await db.getProducts();
    setSales(updatedSales);
    setProducts(updatedProds);
    return saved;
  };

  const handleDeleteSale = async (saleId) => {
    try {
      await db.deleteSale(saleId);
    } catch (error) {
      window.alert(error.message);
      return;
    }
    const updatedSales = await db.getSales();
    setSales(updatedSales);
  };

  // Handlers for Settings
  const handleSaveSettings = async (newSettings) => {
    const saved = await db.saveSettings(newSettings);
    setSettings(saved);
  };

  // Handlers for Backup & Restore
  const handleExportBackup = async () => {
    return await db.exportFullBackup();
  };

  const handleImportBackup = async (backupData) => {
    await db.importFullBackup(backupData);
    const [p, c, m, s, cfg] = await Promise.all([
      db.getProducts(),
      db.getCategories(),
      db.getMarkets(),
      db.getSales(),
      db.getSettings()
    ]);
    setProducts(p);
    setCategories(c);
    setMarkets(m);
    setSales(s);
    setSettings(cfg);
    setActiveMarket(db.getActiveMarket());
  };

  const currencySymbol = settings?.currencySymbol || '€';

  let screen = null;
  if (!online) screen = 'offline';
  else if (!client) screen = 'unconfigured';
  else if (userId === undefined) screen = 'checking';
  else if (!userId) screen = 'login';
  else if (!canUseApp) screen = access === 'ready' ? 'checking' : access;

  return (
    <>
      {screen && (
        <AccessScreen
          screen={screen}
          onSignIn={(email, password) => supabaseService.signIn(email, password)}
          onRetry={() => { setAccess('checking'); setRetry(attempt => attempt + 1); }}
          onSignOut={signOut}
        />
      )}
      {userId && validatedUser === userId && (
        <div key={userId} hidden={!canUseApp}>
          <div className="app-container">
            {/* Top App Navbar */}
            <Navbar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              activeMarket={activeMarket}
              onOpenMarketModal={() => setIsMarketModalOpen(true)}
              cloudSyncStatus={cloudSyncStatus}
              onTriggerCloudSync={triggerCloudSync}
            />

            {/* Main Content Area */}
            <main className="main-content">
              {activeTab === 'pos' && (
                <PosView
                  products={products.filter(product => product.sanity_active !== false && product.stock_confirmed !== false)}
                  categories={categories}
                  activeMarket={activeMarket}
                  currencySymbol={currencySymbol}
                  accessBlocked={!canUseApp}
                  onSaveSale={handleSaveSale}
                  onOpenProductModal={(initial) => {
                    setEditingProductInitial(initial || {});
                    setActiveTab('catalog');
                  }}
                  onOpenMarketModal={() => setIsMarketModalOpen(true)}
                />
              )}

              {activeTab === 'analytics' && (
                <AnalyticsView
                  sales={sales}
                  currencySymbol={currencySymbol}
                />
              )}

              {activeTab === 'sales' && (
                <SalesHistoryView
                  sales={sales}
                  markets={markets}
                  currencySymbol={currencySymbol}
                  onDeleteSale={handleDeleteSale}
                />
              )}

              {activeTab === 'catalog' && (
                <CatalogView
                  products={products.filter(product => product.sanity_active !== false)}
                  categories={categories}
                  currencySymbol={currencySymbol}
                  onSaveProduct={withSaveFeedback(handleSaveProduct)}
                  onDeleteProduct={withSaveFeedback(handleDeleteProduct)}
                  onManageCatalogStock={product => {
                    setStockProductId(product.id);
                    setActiveTab('wallapop');
                  }}
                  onSaveCategory={withSaveFeedback(handleSaveCategory)}
                  onReorderCategories={withSaveFeedback(handleReorderCategories)}
                  onDeleteCategory={withSaveFeedback(handleDeleteCategory)}
                  editingProductInitial={editingProductInitial}
                  onClearInitialEditingProduct={() => setEditingProductInitial(null)}
                />
              )}

              {activeTab === 'wallapop' && (
                <WallapopView
                  products={products}
                  stockProductId={stockProductId}
                  onSelectProduct={setStockProductId}
                  onRefresh={triggerCloudSync}
                  pendingSales={db.getPendingCatalogSales().length}
                  onLinkInventory={async (imported, existingId) => {
                    const linked = await db.linkCatalogInventory(imported, existingId);
                    setProducts(await db.getProducts());
                    setStockProductId(linked.id);
                  }}
                  onSaveStock={async (product, stock) => {
                    const updated = await db.setCatalogStock(product, stock);
                    setProducts(previous => previous.map(item => item.id === updated.id ? updated : item));
                  }}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  settings={settings}
                  markets={markets}
                  activeMarket={activeMarket}
                  onSaveSettings={handleSaveSettings}
                  onSaveMarket={withSaveFeedback(handleAddMarket)}
                  onDeleteMarket={withSaveFeedback(handleDeleteMarket)}
                  onSetActiveMarket={handleSelectMarket}
                  onExportBackup={handleExportBackup}
                  onImportBackup={handleImportBackup}
                  onSignOut={signOut}
                />
              )}
            </main>

            {/* Market Selector Modal */}
            {isMarketModalOpen && (
              <MarketSelectorModal
                isOpen={isMarketModalOpen}
                onClose={() => setIsMarketModalOpen(false)}
                markets={markets}
                activeMarket={activeMarket}
                onSelectMarket={handleSelectMarket}
                onAddMarket={withSaveFeedback(handleAddMarket)}
                onDeleteMarket={withSaveFeedback(handleDeleteMarket)}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
