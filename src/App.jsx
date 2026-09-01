import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PosView from './components/PosView';
import AnalyticsView from './components/AnalyticsView';
import SalesHistoryView from './components/SalesHistoryView';
import CatalogView from './components/CatalogView';
import SettingsView from './components/SettingsView';
import MarketSelectorModal from './components/MarketSelectorModal';
import { db } from './db/storage';
import { audioService } from './utils/audio';

export default function App() {
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' | 'analytics' | 'sales' | 'catalog' | 'settings'
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [activeMarket, setActiveMarket] = useState(null);
  const [sales, setSales] = useState([]);
  const [settings, setSettings] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isMarketModalOpen, setIsMarketModalOpen] = useState(false);
  const [editingProductInitial, setEditingProductInitial] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data from DB
  useEffect(() => {
    async function loadData() {
      try {
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

        const currentMkt = db.getActiveMarket() || loadedMkts[0] || null;
        setActiveMarket(currentMkt);

        if (loadedSettings) {
          setSoundEnabled(loadedSettings.soundEnabled !== false);
          audioService.toggleSound(loadedSettings.soundEnabled !== false);
          if (loadedSettings.supabaseUrl && loadedSettings.supabaseAnonKey) {
            import('./db/supabase').then(({ supabaseService }) => {
              supabaseService.init(loadedSettings.supabaseUrl, loadedSettings.supabaseAnonKey);
            });
          }
        }
      } catch (err) {
        console.error('Error loading data from database:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const refreshAllData = async () => {
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
    const saved = await db.saveSale(saleData);
    const updatedSales = await db.getSales();
    const updatedProds = await db.getProducts();
    setSales(updatedSales);
    setProducts(updatedProds);
    return saved;
  };

  const handleDeleteSale = async (saleId) => {
    await db.deleteSale(saleId);
    const updatedSales = await db.getSales();
    setSales(updatedSales);
  };

  // Handlers for Settings & Sound
  const handleSaveSettings = async (newSettings) => {
    const saved = await db.saveSettings(newSettings);
    setSettings(saved);
  };

  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    audioService.toggleSound(nextState);
    if (settings) {
      handleSaveSettings({ ...settings, soundEnabled: nextState });
    }
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

  const handleResetDemoData = async () => {
    await db.resetToDemoData();
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
    setActiveMarket(m[0]);
  };

  const currencySymbol = settings?.currencySymbol || '€';

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        background: 'var(--bg-main)',
        color: 'var(--text-primary)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(16, 185, 129, 0.2)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem' }}>
          Loading Mercadinho POS...
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Top App Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeMarket={activeMarket}
        onOpenMarketModal={() => setIsMarketModalOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'pos' && (
          <PosView
            products={products}
            categories={categories}
            activeMarket={activeMarket}
            currencySymbol={currencySymbol}
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
            products={products}
            categories={categories}
            currencySymbol={currencySymbol}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onSaveCategory={handleSaveCategory}
            onReorderCategories={handleReorderCategories}
            onDeleteCategory={handleDeleteCategory}
            onResetDemoData={handleResetDemoData}
            editingProductInitial={editingProductInitial}
            onClearInitialEditingProduct={() => setEditingProductInitial(null)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            markets={markets}
            activeMarket={activeMarket}
            onSaveSettings={handleSaveSettings}
            onSaveMarket={handleAddMarket}
            onDeleteMarket={handleDeleteMarket}
            onSetActiveMarket={handleSelectMarket}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            onResetDemoData={handleResetDemoData}
            onRefreshAllData={refreshAllData}
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
          onAddMarket={handleAddMarket}
          onDeleteMarket={handleDeleteMarket}
        />
      )}
    </div>
  );
}
