import React from 'react';
import { ShoppingBag, TrendingUp, History, Package, Settings, MapPin, Cloud, RefreshCw, Store } from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  activeMarket,
  onOpenMarketModal,
  cartCount = 0,
  cloudSyncStatus = 'synced',
  cloudSyncMessage = '',
  onTriggerCloudSync
}) {
  return (
    <>
      <nav className="navbar no-print">
        <div className="navbar-inner">
          {/* Brand Logo Button */}
          <button
            className="logo-btn"
            onClick={() => setActiveTab('pos')}
            title="Fiordaria POS - Go to POS"
            aria-label="Fiordaria POS"
          >
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Fiordaria Logo" className="logo-img" />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            {/* Active Market Location Pill */}
            <button
              className="market-pill-btn"
              onClick={onOpenMarketModal}
              title="Click to change active selling market / location"
            >
              <span className="market-pill-dot" />
              <MapPin size={14} color="var(--primary)" />
              <span className="market-pill-text">
                {activeMarket ? activeMarket.name : 'Select Market'}
              </span>
            </button>

            {/* Cloud Database Sync Pill */}
            <button
              className={`cloud-pill-btn status-${cloudSyncStatus}`}
              onClick={onTriggerCloudSync}
              disabled={cloudSyncStatus === 'syncing'}
              title={cloudSyncMessage || 'Atualizar inventário e vendas'}
            >
              <span className={`cloud-pill-dot status-${cloudSyncStatus}`} />
              {cloudSyncStatus === 'syncing' ? <RefreshCw size={13} className="spin-animation" /> : <Cloud size={13} />}
              <span className="cloud-pill-text">
                {cloudSyncStatus === 'syncing' ? 'A atualizar…' : 'Sincronizado'}
              </span>
            </button>
          </div>

          {/* Desktop Navigation Tabs */}
          <div className="nav-tabs">
            <button
              className={`nav-tab-btn ${activeTab === 'pos' ? 'active' : ''}`}
              onClick={() => setActiveTab('pos')}
            >
              <ShoppingBag size={16} />
              <span>POS / Scanner</span>
              {cartCount > 0 && (
                <span style={{
                  background: activeTab === 'pos' ? '#ffffff' : 'var(--primary)',
                  color: activeTab === 'pos' ? 'var(--primary)' : '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '0.1rem 0.4rem',
                  borderRadius: 'var(--radius-full)'
                }}>
                  {cartCount}
                </span>
              )}
            </button>

            <button
              className={`nav-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <TrendingUp size={16} />
              <span>Analytics & Graphs</span>
            </button>

            <button
              className={`nav-tab-btn ${activeTab === 'sales' ? 'active' : ''}`}
              onClick={() => setActiveTab('sales')}
            >
              <History size={16} />
              <span>Sales History</span>
            </button>

            <button
              className={`nav-tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
              onClick={() => setActiveTab('catalog')}
            >
              <Package size={16} />
              <span>Products & Labels</span>
            </button>

            <button
              className={`nav-tab-btn ${activeTab === 'wallapop' ? 'active' : ''}`}
              onClick={() => setActiveTab('wallapop')}
            >
              <Store size={16} />
              <span>Wallapop</span>
            </button>

            <button
              className={`nav-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <div className="mobile-nav-bar no-print">
        <button
          className={`mobile-nav-item ${activeTab === 'pos' ? 'active' : ''}`}
          onClick={() => setActiveTab('pos')}
        >
          <ShoppingBag size={20} />
          {cartCount > 0 && <span className="mobile-badge-counter">{cartCount}</span>}
          <span>POS</span>
        </button>

        <button
          className={`mobile-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <TrendingUp size={20} />
          <span>Graphs</span>
        </button>

        <button
          className={`mobile-nav-item ${activeTab === 'sales' ? 'active' : ''}`}
          onClick={() => setActiveTab('sales')}
        >
          <History size={20} />
          <span>Sales</span>
        </button>

        <button
          className={`mobile-nav-item ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          <Package size={20} />
          <span>Products</span>
        </button>

        <button
          className={`mobile-nav-item ${activeTab === 'wallapop' ? 'active' : ''}`}
          onClick={() => setActiveTab('wallapop')}
        >
          <Store size={20} />
          <span>Wallapop</span>
        </button>

        <button
          className={`mobile-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </div>
    </>
  );
}
