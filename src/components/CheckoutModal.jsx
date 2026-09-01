import React, { useState, useEffect } from 'react';
import { X, CreditCard, Banknote, Smartphone, CheckCircle, Percent, ArrowRight, MapPin } from 'lucide-react';
import confetti from 'canvas-confetti';
import { audioService } from '../utils/audio';

export default function CheckoutModal({
  isOpen,
  onClose,
  cartItems,
  activeMarket,
  currencySymbol = '€',
  onCompleteSale
}) {
  if (!isOpen) return null;

  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'card' | 'mbway' | 'other'
  const [discountType, setDiscountType] = useState('none'); // 'none' | 'percent' | 'fixed'
  const [discountValue, setDiscountValue] = useState(0);
  const [amountReceived, setAmountReceived] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalUnits = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  let discountAmount = 0;
  if (discountType === 'percent') {
    discountAmount = (subtotal * (Number(discountValue) || 0)) / 100;
  } else if (discountType === 'fixed') {
    discountAmount = Number(discountValue) || 0;
  }
  discountAmount = Math.min(subtotal, Math.max(0, discountAmount));

  const total = Number(Math.max(0, subtotal - discountAmount).toFixed(2));
  const parsedReceived = Number(amountReceived) || 0;
  const change = paymentMethod === 'cash' && parsedReceived >= total ? Number((parsedReceived - total).toFixed(2)) : 0;

  // Initialize default tendered cash with exact total
  useEffect(() => {
    if (paymentMethod === 'cash' && !amountReceived) {
      setAmountReceived(String(total));
    }
  }, [paymentMethod, total]);

  // Quick Cash Preset suggestions
  const cashPresets = [
    { label: 'Exact', value: total },
    { label: `€${Math.ceil(total / 5) * 5 || 5}`, value: Math.ceil(total / 5) * 5 || 5 },
    { label: `€${Math.ceil(total / 10) * 10 || 10}`, value: Math.ceil(total / 10) * 10 || 10 },
    { label: '€20', value: 20 },
    { label: '€50', value: 50 }
  ].filter((p, idx, arr) => arr.findIndex(x => x.value === p.value) === idx && p.value >= total);

  const handleFinish = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0 || isProcessing) return;

    setIsProcessing(true);

    // Trigger celebration sounds & confetti
    audioService.playSuccessChime();
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    const saleRecord = {
      timestamp: new Date().toISOString(),
      market: activeMarket ? activeMarket.name : 'General Market',
      items: cartItems.map(i => ({
        id: i.id,
        code: i.code || '',
        name: i.name,
        price: Number(i.price),
        category: i.category || 'General',
        quantity: Number(i.quantity),
        total: Number((i.price * i.quantity).toFixed(2))
      })),
      subtotal: Number(subtotal.toFixed(2)),
      discount: Number(discountAmount.toFixed(2)),
      total: total,
      paymentMethod: paymentMethod,
      amountReceived: paymentMethod === 'cash' ? (parsedReceived || total) : total,
      change: change,
      notes: notes.trim()
    };

    setTimeout(() => {
      onCompleteSale(saleRecord);
      setIsProcessing(false);
      onClose();
    }, 400);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
              <MapPin size={13} /> {activeMarket ? activeMarket.name : 'Unknown Market'}
            </div>
            <h3 className="modal-title">Proceed with Shopping / Checkout</h3>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Order Summary Pill */}
        <div style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Cart ({totalUnits} {totalUnits === 1 ? 'item' : 'items'})
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {cartItems.map(i => `${i.quantity}x ${i.name}`).join(', ').slice(0, 45)}...
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)' }}>
              {total.toFixed(2)} {currencySymbol}
            </div>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Payment Method
          </div>
          <div className="payment-methods-grid">
            <div
              className={`payment-method-card ${paymentMethod === 'cash' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('cash')}
            >
              <Banknote size={20} />
              <span>Cash</span>
            </div>
            <div
              className={`payment-method-card ${paymentMethod === 'card' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('card')}
            >
              <CreditCard size={20} />
              <span>Card / POS</span>
            </div>
            <div
              className={`payment-method-card ${paymentMethod === 'mbway' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('mbway')}
            >
              <Smartphone size={20} />
              <span>MBWay / QR</span>
            </div>
          </div>
        </div>

        {/* Cash Tender & Change Calculator (if Cash) */}
        {paymentMethod === 'cash' && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Amount Tendered ({currencySymbol})</label>
            </div>

            <div className="cash-preset-row">
              {cashPresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="cash-preset-btn"
                  onClick={() => setAmountReceived(String(preset.value))}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <input
              type="number"
              step="0.01"
              className="input-styled input-mono"
              placeholder="Enter cash received..."
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              style={{ fontSize: '1.1rem', fontWeight: 700 }}
            />

            {/* Change Box */}
            <div className="change-calculator-box" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Change Due (Troco)</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {parsedReceived >= total ? 'To return to customer' : 'Awaiting full payment'}
                </div>
              </div>
              <div className="change-amount">
                {change.toFixed(2)} {currencySymbol}
              </div>
            </div>
          </div>
        )}

        {/* Optional Discount Toggle */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Discount (Optional)
            </span>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              <button
                type="button"
                className={`btn btn-secondary ${discountType === 'none' ? 'active' : ''}`}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                onClick={() => { setDiscountType('none'); setDiscountValue(0); }}
              >
                None
              </button>
              <button
                type="button"
                className={`btn btn-secondary ${discountType === 'percent' ? 'active' : ''}`}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                onClick={() => { setDiscountType('percent'); setDiscountValue(10); }}
              >
                10%
              </button>
              <button
                type="button"
                className={`btn btn-secondary ${discountType === 'fixed' ? 'active' : ''}`}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                onClick={() => { setDiscountType('fixed'); setDiscountValue(2); }}
              >
                Custom €
              </button>
            </div>
          </div>

          {discountType !== 'none' && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
              <input
                type="number"
                step="0.1"
                className="input-styled input-mono"
                placeholder={discountType === 'percent' ? 'Discount % (e.g. 10)' : 'Discount Amount (e.g. 2.50)'}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
              />
              <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, minWidth: '70px', textAlign: 'right' }}>
                -€{discountAmount.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Optional Notes */}
        <div style={{ marginBottom: '1.5rem' }}>
          <input
            type="text"
            className="input-styled"
            placeholder="Sale notes (optional, e.g. VIP discount, stall 14)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Complete Checkout Button */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '0.75rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isProcessing}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={handleFinish}
            disabled={isProcessing || (paymentMethod === 'cash' && parsedReceived < total && parsedReceived > 0)}
          >
            <CheckCircle size={20} /> Finish & Record Sale
          </button>
        </div>
      </div>
    </div>
  );
}
