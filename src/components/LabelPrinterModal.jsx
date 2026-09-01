import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Barcode as BarcodeIcon, QrCode, CheckSquare, Square, Layers } from 'lucide-react';
import { renderBarcode, renderQRCode, formatCurrency } from '../utils/exportUtils';

export default function LabelPrinterModal({ isOpen, onClose, products = [], currencySymbol = '€' }) {
  if (!isOpen) return null;

  const [selectedProductIds, setSelectedProductIds] = useState(products.map(p => p.id));
  const [labelFormat, setLabelFormat] = useState('barcode'); // 'barcode' | 'qrcode'
  const [copiesPerItem, setCopiesPerItem] = useState(1);
  const [layoutMode, setLayoutMode] = useState('grid'); // 'grid' | 'thermal'

  const labelsContainerRef = useRef(null);

  // Render barcodes/QR codes on mount and update
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      // Render Barcodes
      if (labelFormat === 'barcode') {
        document.querySelectorAll('.barcode-target-svg').forEach((svg) => {
          const code = svg.getAttribute('data-code');
          if (code) {
            renderBarcode(svg, code, {
              height: layoutMode === 'thermal' ? 50 : 35,
              width: 1.6,
              fontSize: 10
            });
          }
        });
      }

      // Render QR Codes
      if (labelFormat === 'qrcode') {
        document.querySelectorAll('.qrcode-target-canvas').forEach((canvas) => {
          const code = canvas.getAttribute('data-code');
          if (code) {
            renderQRCode(canvas, code, {
              width: layoutMode === 'thermal' ? 90 : 70
            });
          }
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen, selectedProductIds, labelFormat, copiesPerItem, layoutMode]);

  const toggleSelectAll = () => {
    if (selectedProductIds.length === products.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(products.map(p => p.id));
    }
  };

  const toggleProduct = (id) => {
    if (selectedProductIds.includes(id)) {
      setSelectedProductIds(selectedProductIds.filter(x => x !== id));
    } else {
      setSelectedProductIds([...selectedProductIds, id]);
    }
  };

  // Build array of items to render based on copies
  const itemsToRender = [];
  products.filter(p => selectedProductIds.includes(p.id)).forEach(p => {
    for (let c = 0; c < copiesPerItem; c++) {
      itemsToRender.push(p);
    }
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '820px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header no-print">
          <div>
            <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarcodeIcon size={20} color="var(--primary)" />
              <span>Barcode & QR Label Sticker Generator</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Generate printable scannable labels for price tags and merchandise
            </p>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Toolbar & Options */}
        <div className="no-print" style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem',
          marginBottom: '1rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
          alignItems: 'center'
        }}>
          {/* Format Toggle */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Code Type</label>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              <button
                className={`btn btn-secondary ${labelFormat === 'barcode' ? 'active' : ''}`}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', flex: 1 }}
                onClick={() => setLabelFormat('barcode')}
              >
                <BarcodeIcon size={14} /> Barcode (128)
              </button>
              <button
                className={`btn btn-secondary ${labelFormat === 'qrcode' ? 'active' : ''}`}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', flex: 1 }}
                onClick={() => setLabelFormat('qrcode')}
              >
                <QrCode size={14} /> QR Code
              </button>
            </div>
          </div>

          {/* Copies Per Product */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Copies Per Item</label>
            <input
              type="number"
              min="1"
              max="50"
              className="input-styled input-mono"
              style={{ padding: '0.35rem 0.65rem' }}
              value={copiesPerItem}
              onChange={(e) => setCopiesPerItem(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
          </div>

          {/* Select All Toggle */}
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%' }}>
            <button
              className="btn btn-secondary"
              style={{ width: '100%', padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
              onClick={toggleSelectAll}
            >
              {selectedProductIds.length === products.length ? <CheckSquare size={14} /> : <Square size={14} />}
              {selectedProductIds.length === products.length ? 'Deselect All' : `Select All (${products.length})`}
            </button>
          </div>
        </div>

        {/* Selected Count & Print CTA */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Selected <strong>{selectedProductIds.length}</strong> products • Total <strong>{itemsToRender.length}</strong> stickers to print
          </span>

          <button
            className="btn btn-primary"
            onClick={handlePrint}
            disabled={itemsToRender.length === 0}
          >
            <Printer size={16} /> Print Sticker Sheet
          </button>
        </div>

        {/* Sheet Preview Area */}
        <div ref={labelsContainerRef} className="printable-area labels-sheet-preview">
          {itemsToRender.map((product, idx) => (
            <div key={`${product.id}-${idx}`} className="label-sticker">
              <div className="label-sticker-title">{product.name}</div>
              <div className="label-sticker-price">
                {formatCurrency(product.price, currencySymbol)}
              </div>

              {labelFormat === 'barcode' ? (
                <svg
                  className="barcode-target-svg"
                  data-code={product.code || '000000'}
                  style={{ maxWidth: '100%' }}
                />
              ) : (
                <canvas
                  className="qrcode-target-canvas"
                  data-code={product.code || '000000'}
                />
              )}

              <div style={{ fontSize: '9px', color: '#64748b', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                {product.category}
              </div>
            </div>
          ))}

          {itemsToRender.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#64748b' }}>
              No products selected. Select at least one product above to generate stickers.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
