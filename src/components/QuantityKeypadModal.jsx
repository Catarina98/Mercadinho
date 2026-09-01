import React, { useState } from 'react';
import { X, Check, Plus, Minus } from 'lucide-react';

export default function QuantityKeypadModal({ isOpen, onClose, item, onUpdateQuantity }) {
  if (!isOpen || !item) return null;

  const [qty, setQty] = useState(String(item.quantity || 1));

  const handleNumpad = (digit) => {
    if (qty === '0' || qty === '') {
      setQty(String(digit));
    } else if (qty.length < 4) {
      setQty(qty + digit);
    }
  };

  const handleBackspace = () => {
    if (qty.length <= 1) {
      setQty('1');
    } else {
      setQty(qty.slice(0, -1));
    }
  };

  const handleClear = () => {
    setQty('1');
  };

  const handleSave = (e) => {
    if (e) e.preventDefault();
    const finalQty = Math.max(1, parseInt(qty, 10) || 1);
    onUpdateQuantity(item.id, finalQty);
    onClose();
  };

  const addPreset = (amount) => {
    const current = parseInt(qty, 10) || 1;
    setQty(String(Math.max(1, current + amount)));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '380px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Set Item Quantity</div>
            <h3 className="modal-title" style={{ fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '260px' }}>
              {item.name}
            </h3>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Big Quantity Display */}
        <div style={{
          background: 'var(--bg-input)',
          border: '2px solid var(--primary)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          textAlign: 'center',
          marginBottom: '1rem'
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)' }}>
            {qty}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Total: €{(Number(item.price) * (parseInt(qty, 10) || 1)).toFixed(2)}
          </div>
        </div>

        {/* Quick Presets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
          {[1, 5, 10, 20].map((preset) => (
            <button
              key={preset}
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.5rem', fontSize: '0.85rem', fontWeight: 700 }}
              onClick={() => setQty(String(preset))}
            >
              ={preset}
            </button>
          ))}
        </div>

        {/* Numpad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              className="btn btn-secondary"
              style={{
                padding: '0.85rem',
                fontSize: '1.25rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                borderRadius: 'var(--radius-md)'
              }}
              onClick={() => handleNumpad(num)}
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '0.85rem', fontSize: '0.9rem', color: 'var(--danger)' }}
            onClick={handleClear}
          >
            Clear
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{
              padding: '0.85rem',
              fontSize: '1.25rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700
            }}
            onClick={() => handleNumpad(0)}
          >
            0
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '0.85rem', fontSize: '1rem' }}
            onClick={handleBackspace}
          >
            ⌫
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '0.75rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            <Check size={18} /> Confirm Quantity
          </button>
        </div>
      </div>
    </div>
  );
}
