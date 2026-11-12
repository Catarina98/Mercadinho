import React, { useState, useRef } from 'react';
import { Settings, MapPin, Plus, Trash2, Database, Download, Upload, Check, Store, LogOut } from 'lucide-react';
import { downloadJSON } from '../utils/exportUtils';
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
  onSignOut
}) {
  const [storeName, setStoreName] = useState(settings?.storeName || 'Fiordaria');
  const [currencySymbol, setCurrencySymbol] = useState(settings?.currencySymbol || '€');
  const [newMarketName, setNewMarketName] = useState('');
  const [newMarketCity, setNewMarketCity] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const fileInputRef = useRef(null);

  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    await onSaveSettings({
      storeName,
      currencySymbol
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSignOut = async () => {
    setSignOutError('');
    try {
      await onSignOut();
    } catch {
      setSignOutError('Não foi possível terminar a sessão. Tenta novamente.');
    }
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
      if (confirm('This backup restores products, sales, and markets on this device only. Continue?')) {
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
            Manage market locations, currency, and local backups
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <section className="pos-card settings-session" aria-labelledby="settings-session-title">
          <h3 id="settings-session-title">Conta do Mercadinho</h3>
          <button type="button" className="btn btn-secondary" onClick={handleSignOut}>
            <LogOut size={16} /> Terminar sessão
          </button>
          {signOutError && <p role="alert">{signOutError}</p>}
        </section>
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="submit" className="btn btn-primary">
                {saveSuccess ? <><Check size={16} /> Preferences Saved</> : 'Save Preferences'}
              </button>
            </div>
          </form>
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
            Download a JSON backup of the products, barcodes, markets, and sales on this device.
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
          </div>
        </div>
      </div>
    </div>
  );
}
