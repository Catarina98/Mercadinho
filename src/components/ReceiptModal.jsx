import React from 'react';
import { X, Printer, Share2, PlusCircle, CheckCircle2, MapPin } from 'lucide-react';
import { formatDateTime } from '../utils/exportUtils';

export default function ReceiptModal({ isOpen, onClose, sale, currencySymbol = '€', onNewSale }) {
  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const text = `
=== MERCADINHO POS ===
Market: ${sale.market}
Date: ${formatDateTime(sale.timestamp)}
Receipt #${sale.id}
----------------------
${sale.items.map(i => `${i.quantity}x ${i.name} ${i.code ? `[${i.code}] ` : ''}- ${i.total.toFixed(2)}${currencySymbol}`).join('\n')}
----------------------
Subtotal: ${sale.subtotal.toFixed(2)}${currencySymbol}
Discount: -${sale.discount.toFixed(2)}${currencySymbol}
TOTAL: ${sale.total.toFixed(2)}${currencySymbol}
Payment: ${sale.paymentMethod.toUpperCase()}
======================
Obrigado pela sua compra!
    `.trim();

    navigator.clipboard.writeText(text);
    alert('Receipt copied to clipboard!');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
            <CheckCircle2 size={22} />
            <h3 className="modal-title" style={{ color: 'var(--text-primary)' }}>Sale Completed!</h3>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Thermal Printable Receipt Paper */}
        <div className="receipt-paper printable-area" id="printable-receipt">
          <div className="receipt-header">
            <div style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Mercadinho POS
            </div>
            <div style={{ fontSize: '11px', marginTop: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <span>📍</span> {sale.market}
            </div>
            <div style={{ fontSize: '10px', color: '#4b5563', marginTop: '2px' }}>
              {formatDateTime(sale.timestamp)}
            </div>
            <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '2px' }}>
              ID: {sale.id}
            </div>
          </div>

          <table className="receipt-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Item</th>
                <th style={{ textAlign: 'center', width: '35px' }}>Qty</th>
                <th style={{ textAlign: 'right', width: '65px' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ fontSize: '11px', padding: '3px 0' }}>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: '9px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '1px' }}>
                      <span>@{item.price.toFixed(2)} {currencySymbol}</span>
                      {item.code && (
                        <span style={{ fontFamily: 'monospace', color: '#1f2937', fontWeight: 600 }}>
                          • {item.code}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold', verticalAlign: 'top', paddingTop: '4px' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', verticalAlign: 'top', paddingTop: '4px' }}>
                    {item.total.toFixed(2)} {currencySymbol}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ borderTop: '1px dashed #000', paddingTop: '6px', marginTop: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span>Subtotal:</span>
              <span>{sale.subtotal.toFixed(2)} {currencySymbol}</span>
            </div>

            {sale.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#dc2626' }}>
                <span>Discount:</span>
                <span>-{sale.discount.toFixed(2)} {currencySymbol}</span>
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '14px',
              fontWeight: 'bold',
              marginTop: '4px',
              borderTop: '1px solid #000',
              paddingTop: '4px'
            }}>
              <span>TOTAL:</span>
              <span>{sale.total.toFixed(2)} {currencySymbol}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '6px', color: '#4b5563' }}>
              <span>Payment ({sale.paymentMethod}):</span>
              <span>{sale.amountReceived ? sale.amountReceived.toFixed(2) : sale.total.toFixed(2)} {currencySymbol}</span>
            </div>

            {sale.change > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold' }}>
                <span>Change:</span>
                <span>{sale.change.toFixed(2)} {currencySymbol}</span>
              </div>
            )}

            {sale.notes && (
              <div style={{ fontSize: '10px', fontStyle: 'italic', marginTop: '6px', borderTop: '1px dotted #ccc', paddingTop: '4px' }}>
                Note: {sale.notes}
              </div>
            )}
          </div>

          <div className="receipt-footer">
            <div>Obrigado pela sua visita!</div>
            <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '4px' }}>
              mercadinho-pos.github.io
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={handlePrint}>
              <Printer size={16} /> Print Receipt
            </button>
            <button className="btn btn-secondary" onClick={handleCopy}>
              <Share2 size={16} /> Copy Text
            </button>
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={() => {
              onClose();
              if (onNewSale) onNewSale();
            }}
          >
            <PlusCircle size={18} /> Start New Sale
          </button>
        </div>
      </div>
    </div>
  );
}
