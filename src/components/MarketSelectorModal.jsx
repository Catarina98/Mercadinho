import React, { useState } from 'react';
import { MapPin, Plus, Check, Trash2, X, Store } from 'lucide-react';

export default function MarketSelectorModal({
  isOpen,
  onClose,
  markets,
  activeMarket,
  onSelectMarket,
  onAddMarket,
  onDeleteMarket
}) {
  const [newMarketName, setNewMarketName] = useState('');
  const [newMarketCity, setNewMarketCity] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newMarketName.trim()) return;

    onAddMarket({
      name: newMarketName.trim(),
      city: newMarketCity.trim() || 'Portugal'
    });

    setNewMarketName('');
    setNewMarketCity('');
    setIsAdding(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Store size={20} />
            </div>
            <div>
              <h3 className="modal-title">Selling Location / Market</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Select where you are currently selling
              </p>
            </div>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* List of Markets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
          {markets.map((mkt) => {
            const isSelected = activeMarket && activeMarket.id === mkt.id;
            return (
              <div
                key={mkt.id}
                onClick={() => {
                  onSelectMarket(mkt);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-input)',
                  border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: isSelected ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                    color: isSelected ? 'white' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <MapPin size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {mkt.name}
                    </div>
                    {mkt.city && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {mkt.city}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isSelected && (
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--primary)',
                      background: 'rgba(16, 185, 129, 0.15)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: 'var(--radius-full)'
                    }}>
                      <Check size={14} /> Active
                    </span>
                  )}
                  {markets.length > 1 && (
                    <button
                      className="btn btn-secondary btn-icon"
                      style={{ width: '28px', height: '28px', opacity: 0.6 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Remove market "${mkt.name}"?`)) {
                          onDeleteMarket(mkt.id);
                        }
                      }}
                      title="Delete market"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add New Market Section */}
        {isAdding ? (
          <form onSubmit={handleCreate} style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Add New Location / Market</div>
            <input
              type="text"
              className="input-styled"
              placeholder="e.g. Feira da Ladra, Mercado de Cascais..."
              value={newMarketName}
              onChange={(e) => setNewMarketName(e.target.value)}
              autoFocus
              required
            />
            <input
              type="text"
              className="input-styled"
              placeholder="City / Region (optional, e.g. Lisboa)"
              value={newMarketCity}
              onChange={(e) => setNewMarketCity(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsAdding(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!newMarketName.trim()}
              >
                Save & Set Active
              </button>
            </div>
          </form>
        ) : (
          <button
            className="btn btn-secondary"
            style={{ width: '100%', borderStyle: 'dashed' }}
            onClick={() => setIsAdding(true)}
          >
            <Plus size={16} /> Add Another Selling Location
          </button>
        )}
      </div>
    </div>
  );
}
