import React, { useState, useRef } from 'react';
import { Settings, MapPin, Plus, Trash2, Volume2, VolumeX, Smartphone, DollarSign, Database, Download, Upload, RefreshCcw, Check, Store, Cloud, CloudOff, RefreshCw, Copy, CheckCheck, ExternalLink, ShieldCheck, Layers } from 'lucide-react';
import { downloadJSON } from '../utils/exportUtils';
import { audioService } from '../utils/audio';
import { SUPABASE_SQL_SCHEMA, supabaseService } from '../db/supabase';
import { db } from '../db/storage';

export default function SettingsView({
  settings,
  markets,
  activeMarket,
  onSaveSettings,
  onSaveMarket,
  onDeleteMarket,
  onSetActiveMarket,
  onExportBackup,
  onImportBackup,
  onResetDemoData,
  onRefreshAllData
}) {
  const [storeName, setStoreName] = useState(settings?.storeName || 'O Meu Mercadinho');
  const [currencySymbol, setCurrencySymbol] = useState(settings?.currencySymbol || '€');
  const [soundEnabled, setSoundEnabled] = useState(settings?.soundEnabled !== false);
  const [supabaseUrl, setSupabaseUrl] = useState(settings?.supabaseUrl || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(settings?.supabaseAnonKey || '');

  const [newMarketName, setNewMarketName] = useState('');
  const [newMarketCity, setNewMarketCity] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null); // { type: 'success' | 'error' | 'loading', message: string }
  const [copiedSql, setCopiedSql] = useState(false);
  const fileInputRef = useRef(null);

  const handleSaveGeneral = (e) => {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      storeName,
      currencySymbol,
      soundEnabled,
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim()
    });
    audioService.toggleSound(soundEnabled);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSyncCloud = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) return;

    setSyncStatus({ type: 'loading', message: 'Connecting and synchronizing data with Supabase...' });
    
    // Save settings first
    await onSaveSettings({
      ...settings,
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim()
    });

    const res = await db.syncWithCloud();
    if (res.success) {
      setSyncStatus({ type: 'success', message: res.message });
      if (onRefreshAllData) onRefreshAllData();
    } else {
      setSyncStatus({ type: 'error', message: res.message });
    }
  };

  const handlePullFromCloud = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      alert('Please enter your Supabase Project URL and Anon Key first.');
      return;
    }

    if (!confirm('⚠️ WARNING: This will DELETE all local products, categories, markets, and sales from this browser and replace them with the data stored in your remote Supabase database. Are you sure you want to proceed?')) {
      return;
    }

    setSyncStatus({ type: 'loading', message: 'Wiping local storage and downloading remote database...' });

    await onSaveSettings({
      ...settings,
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim()
    });

    const res = await db.pullFromCloudAndReplaceLocal();
    if (res.success) {
      setSyncStatus({ type: 'success', message: res.message });
      if (onRefreshAllData) onRefreshAllData();
      alert('✅ ' + res.message);
    } else {
      setSyncStatus({ type: 'error', message: res.message });
      alert('❌ ' + res.message);
    }
  };

  const handlePushToCloud = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      alert('Please enter your Supabase Project URL and Anon Key first.');
      return;
    }

    if (!confirm('This will upload all your local products, categories, markets, and sales to your remote Supabase cloud database. Proceed?')) {
      return;
    }

    setSyncStatus({ type: 'loading', message: 'Uploading local data to Supabase cloud...' });

    await onSaveSettings({
      ...settings,
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim()
    });

    const res = await db.pushAllLocalDataToCloud();
    if (res.success) {
      setSyncStatus({ type: 'success', message: res.message });
      alert('✅ ' + res.message);
    } else {
      setSyncStatus({ type: 'error', message: res.message });
      alert('❌ ' + res.message);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleAddMarket = (e) => {
    e.preventDefault();
    if (!newMarketName.trim()) return;

    onSaveMarket({
      name: newMarketName.trim(),
      city: newMarketCity.trim() || 'Portugal'
    });

    setNewMarketName('');
    setNewMarketCity('');
  };

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      if (confirm('Importing this backup will restore all products, sales history, and markets. Continue?')) {
        await onImportBackup(backupData);
        alert('Database restored successfully!');
      }
    } catch (err) {
      alert('Failed to parse backup file: ' + err.message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto' }}>
      <div className="analytics-header">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Settings size={24} color="var(--primary)" />
            <span>Store & Application Settings</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Manage market locations, cloud synchronization (Supabase), currency, and local backups
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Section 1: General Preferences */}
        <div className="pos-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Store size={18} color="var(--primary)" />
            <span>Store Preferences</span>
          </h3>

          <form onSubmit={handleSaveGeneral} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  Store / Vendor Name
                </label>
                <input
                  type="text"
                  className="input-styled"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  Currency Symbol
                </label>
                <select
                  className="input-styled input-mono"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                >
                  <option value="€">EUR (€)</option>
                  <option value="$">USD ($)</option>
                  <option value="R$">BRL (R$)</option>
                  <option value="£">GBP (£)</option>
                  <option value="CHF">CHF</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {soundEnabled ? <Volume2 size={16} color="var(--primary)" /> : <VolumeX size={16} />}
                  Audio Feedback (Scan Beeps & Chimes)
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="submit" className="btn btn-primary">
                {saveSuccess ? <><Check size={16} /> Preferences Saved</> : 'Save Preferences'}
              </button>
            </div>
          </form>
        </div>

        {/* Section 2: Real-time Cloud Sync with Supabase (Free) */}
        <div className="pos-card" style={{ border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cloud size={20} color="var(--primary)" />
              <span>Real-Time Cloud Sync (Supabase Free Tier)</span>
            </h3>

            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
            >
              <span>Create Free Supabase Account</span>
              <ExternalLink size={12} />
            </a>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Connect a free Supabase database to automatically synchronize products, barcodes, and sales history between your <strong>Desktop computer</strong> and <strong>Mobile phone</strong>.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                Supabase Project URL
              </label>
              <input
                type="text"
                className="input-styled input-mono"
                placeholder="https://xyzabcdefg.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                Supabase Anon Public Key (API Key)
              </label>
              <input
                type="password"
                className="input-styled input-mono"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
              />
            </div>
          </div>

          {/* Sync Status Banner */}
          {syncStatus && (
            <div style={{
              background: syncStatus.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : syncStatus.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
              border: `1px solid ${syncStatus.type === 'success' ? 'var(--primary)' : syncStatus.type === 'error' ? 'var(--danger)' : '#6366f1'}`,
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {syncStatus.type === 'loading' && <RefreshCw size={16} className="spin-animation" />}
              {syncStatus.type === 'success' && <ShieldCheck size={16} color="var(--primary)" />}
              {syncStatus.type === 'error' && <CloudOff size={16} color="var(--danger)" />}
              <span>{syncStatus.message}</span>
            </div>
          )}

          {/* Cloud Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCopySql}
                title="Copy the SQL code to paste into Supabase SQL Editor"
              >
                {copiedSql ? <CheckCheck size={16} color="var(--primary)" /> : <Copy size={16} />}
                <span>{copiedSql ? 'SQL Snippet Copied!' : 'Copy Supabase SQL Setup Code'}</span>
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSyncCloud}
                disabled={!supabaseUrl.trim() || !supabaseAnonKey.trim() || syncStatus?.type === 'loading'}
              >
                <RefreshCw size={16} className={syncStatus?.type === 'loading' ? 'spin-animation' : ''} />
                <span>Test & 2-Way Sync</span>
              </button>
            </div>

            {/* Cloud Override Actions: Pull and Push */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem'
            }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Layers size={15} color="var(--primary)" />
                <span>Cloud Database Overwrite & Sync Options</span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ flex: 1, minWidth: '220px', fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}
                  onClick={handlePullFromCloud}
                  disabled={!supabaseUrl.trim() || !supabaseAnonKey.trim() || syncStatus?.type === 'loading'}
                  title="Wipe local browser data and load everything stored in your Supabase database"
                >
                  <Download size={14} />
                  <span>Delete Local Data & Load from Database</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, minWidth: '200px', fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}
                  onClick={handlePushToCloud}
                  disabled={!supabaseUrl.trim() || !supabaseAnonKey.trim() || syncStatus?.type === 'loading'}
                  title="Upload all local products, categories, markets, and sales from this browser to Supabase"
                >
                  <Upload size={14} />
                  <span>Upload Local Data to Cloud</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Market Locations Management */}
        <div className="pos-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} color="#6366f1" />
            <span>Market Locations ({markets.length})</span>
          </h3>

          {/* List of Markets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {markets.map((mkt) => {
              const isSelected = activeMarket && activeMarket.id === mkt.id;
              return (
                <div
                  key={mkt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-input)',
                    border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <MapPin size={16} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} />
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{mkt.name}</span>
                      {mkt.city && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                          ({mkt.city})
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isSelected ? (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                        Active Location
                      </span>
                    ) : (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                        onClick={() => onSetActiveMarket(mkt)}
                      >
                        Set Active
                      </button>
                    )}

                    {markets.length > 1 && (
                      <button
                        className="btn btn-secondary btn-icon"
                        style={{ width: '28px', height: '28px', opacity: 0.7 }}
                        onClick={() => {
                          if (confirm(`Delete market "${mkt.name}"?`)) {
                            onDeleteMarket(mkt.id);
                          }
                        }}
                      >
                        <Trash2 size={13} color="#f87171" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Market Form */}
          <form onSubmit={handleAddMarket} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="input-styled"
              placeholder="Market name (e.g. Feira da Ladra)..."
              value={newMarketName}
              onChange={(e) => setNewMarketName(e.target.value)}
              style={{ flex: 2, minWidth: '180px' }}
              required
            />
            <input
              type="text"
              className="input-styled"
              placeholder="City (e.g. Lisboa)..."
              value={newMarketCity}
              onChange={(e) => setNewMarketCity(e.target.value)}
              style={{ flex: 1, minWidth: '120px' }}
            />
            <button type="submit" className="btn btn-secondary" disabled={!newMarketName.trim()}>
              <Plus size={16} /> Add Market
            </button>
          </form>
        </div>

        {/* Section 4: Database Backup & Restore */}
        <div className="pos-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={18} color="var(--accent)" />
            <span>Local Database & GitHub Pages Offline Storage</span>
          </h3>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            All your products, barcode codes, market locations, and sales history are saved offline inside your browser's IndexedDB. Download a JSON backup to migrate between devices or preserve records.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={async () => {
                const backup = await onExportBackup();
                downloadJSON(backup, `mercadinho_backup_${new Date().toISOString().split('T')[0]}.json`);
              }}
            >
              <Download size={16} color="var(--primary)" />
              <span>Export Full Backup (JSON)</span>
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} />
              <span>Restore Backup File</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileImport}
              accept=".json"
              style={{ display: 'none' }}
            />

            <button
              className="btn btn-danger"
              onClick={async () => {
                if (confirm('Reset to initial sample catalog and sales demonstration data? Your custom changes will be replaced with demo items.')) {
                  await onResetDemoData();
                  alert('Reset to demo data completed!');
                }
              }}
            >
              <RefreshCcw size={16} />
              <span>Reset to Demo Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
