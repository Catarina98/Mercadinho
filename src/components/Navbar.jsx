import React from 'react';
import { ShoppingBag, TrendingUp, History, Package, Settings, MapPin, Volume2, VolumeX, Store } from 'lucide-react';
import { audioService } from '../utils/audio';

export default function Navbar({
  activeTab,
  setActiveTab,
  activeMarket,
  onOpenMarketModal,
  soundEnabled,
  onToggleSound,
  cartCount = 0
}) {
  return (
    <>
      <nav className="navbar no-print">
        <div className="navbar-inner">
          {/* Logo Group */}
          <div className="logo-group" onClick={() => setActiveTab('pos')}>
            <div className="logo-icon">
              <ShoppingBag size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="logo-title">Mercadinho</span>
                <span className="logo-badge">POS</span>
              </div>
            </div>
          </div>

          {/* Active Market Location Pill */}
          <button
            className="market-pill-btn"
            onClick={onOpenMarketModal}
            title="Click to change active selling market / location"
          >
            <span className="market-pill-dot" />
            <MapPin size={14} color="var(--primary)" />
            <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeMarket ? activeMarket.name : 'Select Market'}
            </span>
          </button>

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
              className={`nav-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>
          </div>

          {/* Audio Mute / Sound Toggle */}
          <button
            className="btn btn-secondary btn-icon"
            onClick={onToggleSound}
            title={soundEnabled ? 'Disable Scan Sound' : 'Enable Scan Sound'}
          >
            {soundEnabled ? <Volume2 size={18} color="var(--primary)" /> : <VolumeX size={18} color="var(--text-muted)" />}
          </button>
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
