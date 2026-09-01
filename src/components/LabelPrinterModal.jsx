import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Printer, Barcode as BarcodeIcon, QrCode, CheckSquare, Square,
  Search, Filter, Plus, Minus, Check, Layers, Eye, PackageCheck, Sliders
} from 'lucide-react';
import { renderBarcode, renderQRCode, formatCurrency } from '../utils/exportUtils';

export default function LabelPrinterModal({ isOpen, onClose, products = [], categories = [], currencySymbol = '€' }) {
  if (!isOpen) return null;

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [viewMode, setViewMode] = useState('select'); // 'select' | 'preview'

  // Selection state: Map of productId -> quantity of stickers to print
  const [itemQuantities, setItemQuantities] = useState(() => {
    const initial = {};
    products.forEach(p => {
      initial[p.id] = 1; // default 1 copy per product
    });
    return initial;
  });

  const [selectedProductIds, setSelectedProductIds] = useState(() => products.map(p => p.id));
  const [labelFormat, setLabelFormat] = useState('barcode'); // 'barcode' | 'qrcode'
  const [globalCopies, setGlobalCopies] = useState(1);

  const labelsContainerRef = useRef(null);

  // In-stock products count
  const inStockProductsCount = useMemo(() => {
    return products.filter(p => typeof p.stock === 'number' ? p.stock > 0 : true).length;
  }, [products]);

  // Filter products by search, category & stock
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchStock = !onlyInStock || (typeof p.stock === 'number' ? p.stock > 0 : true);
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        p.name.toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));
      return matchCat && matchStock && matchSearch;
    });
  }, [products, selectedCategory, searchQuery, onlyInStock]);

  // Total stickers to print calculation
  const totalStickersCount = useMemo(() => {
    return selectedProductIds.reduce((sum, id) => {
      return sum + (itemQuantities[id] || 1);
    }, 0);
  }, [selectedProductIds, itemQuantities]);

  // Build list of all stickers to render in print sheet
  const itemsToRender = useMemo(() => {
    const list = [];
    products.forEach(p => {
      if (selectedProductIds.includes(p.id)) {
        const qty = itemQuantities[p.id] || 1;
        for (let i = 0; i < qty; i++) {
          list.push(p);
        }
      }
    });
    return list;
  }, [products, selectedProductIds, itemQuantities]);

  // Render barcodes/QR codes in DOM whenever items or format change
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (labelFormat === 'barcode') {
        document.querySelectorAll('.barcode-target-svg').forEach((svg) => {
          const code = svg.getAttribute('data-code');
          if (code) {
            renderBarcode(svg, code, {
              height: 35,
              width: 1.6,
              fontSize: 10
            });
          }
        });
      }

      if (labelFormat === 'qrcode') {
        document.querySelectorAll('.qrcode-target-canvas').forEach((canvas) => {
          const code = canvas.getAttribute('data-code');
          if (code) {
            renderQRCode(canvas, code, {
              width: 70
            });
          }
        });
      }
    }, 80);

    return () => clearTimeout(timer);
  }, [isOpen, itemsToRender, labelFormat, viewMode]);

  // Toggle single product selection
  const toggleProduct = (id) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Select / Deselect only currently filtered products
  const toggleSelectFiltered = () => {
    const filteredIds = filteredProducts.map(p => p.id);
    const allFilteredSelected = filteredIds.every(id => selectedProductIds.includes(id));

    if (allFilteredSelected) {
      setSelectedProductIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedProductIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // Select all in-stock products only
  const selectInStockOnly = () => {
    const inStockIds = products.filter(p => typeof p.stock === 'number' ? p.stock > 0 : true).map(p => p.id);
    setSelectedProductIds(inStockIds);
  };

  // Match label quantities to actual stock counts
  const matchQuantitiesToStock = () => {
    setItemQuantities(prev => {
      const updated = { ...prev };
      products.forEach(p => {
        const stockCount = typeof p.stock === 'number' ? Math.max(1, p.stock) : 1;
        updated[p.id] = stockCount;
      });
      return updated;
    });
  };

  // Select all products in catalog
  const selectAllProducts = () => {
    setSelectedProductIds(products.map(p => p.id));
  };

  // Deselect all products
  const deselectAllProducts = () => {
    setSelectedProductIds([]);
  };

  // Update quantity for a specific product
  const updateProductQuantity = (id, newQty) => {
    const validQty = Math.max(1, Math.min(100, newQty));
    setItemQuantities(prev => ({
      ...prev,
      [id]: validQty
    }));
  };

  // Apply global quantity to all selected items
  const applyGlobalCopies = (copies) => {
    setGlobalCopies(copies);
    setItemQuantities(prev => {
      const updated = { ...prev };
      products.forEach(p => {
        updated[p.id] = copies;
      });
      return updated;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const allFilteredSelected = filteredProducts.length > 0 &&
    filteredProducts.every(p => selectedProductIds.includes(p.id));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '940px', width: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header no-print" style={{ margin: 0, paddingBottom: '0.85rem' }}>
          <div>
            <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarcodeIcon size={22} color="var(--primary)" />
              <span>Barcode & QR Price Sticker Generator</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Filter products, select in-stock items, set print quantities, and print scannable stickers
            </p>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* View Switcher Tabs (Select Products vs Preview Sheet) */}
        <div className="no-print" style={{ display: 'flex', gap: '0.5rem', margin: '0.85rem 0', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
          <button
            className={`btn ${viewMode === 'select' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
            onClick={() => setViewMode('select')}
          >
            <CheckSquare size={16} />
            <span>1. Select Products ({selectedProductIds.length})</span>
          </button>

          <button
            className={`btn ${viewMode === 'preview' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
            onClick={() => setViewMode('preview')}
          >
            <Eye size={16} />
            <span>2. Preview Stickers ({totalStickersCount} labels)</span>
          </button>
        </div>

        {/* ===================== VIEW 1: PRODUCT SELECTION & FILTER ===================== */}
        {viewMode === 'select' && (
          <div className="no-print" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', overflow: 'hidden' }}>
            {/* Filter Controls Toolbar */}
            <div style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.65rem',
              alignItems: 'center'
            }}>
              {/* Search by Name / SKU */}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input-styled"
                  placeholder="Filter by name or barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '2.3rem', fontSize: '0.85rem', minHeight: '38px' }}
                />
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '0.8rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}
                />
              </div>

              {/* Filter by Category Dropdown */}
              <div>
                <select
                  className="input-styled"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{ fontSize: '0.85rem', minHeight: '38px' }}
                >
                  <option value="all">All Categories ({products.length} items)</option>
                  {categories.map(c => {
                    const count = products.filter(p => p.category === c.name).length;
                    return (
                      <option key={c.id} value={c.name}>
                        {c.name} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* In-Stock Filter Toggle */}
              <button
                type="button"
                className={`btn ${onlyInStock ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', minHeight: '38px' }}
                onClick={() => setOnlyInStock(!onlyInStock)}
                title="Filter products to only show in-stock items"
              >
                <PackageCheck size={14} />
                <span>In-Stock Only ({inStockProductsCount})</span>
              </button>

              {/* Code Format Toggle (Barcode vs QR) */}
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  className={`btn ${labelFormat === 'barcode' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '0.35rem 0.6rem', fontSize: '0.78rem', minHeight: '38px' }}
                  onClick={() => setLabelFormat('barcode')}
                >
                  <BarcodeIcon size={14} /> Barcode
                </button>
                <button
                  className={`btn ${labelFormat === 'qrcode' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '0.35rem 0.6rem', fontSize: '0.78rem', minHeight: '38px' }}
                  onClick={() => setLabelFormat('qrcode')}
                >
                  <QrCode size={14} /> QR
                </button>
              </div>
            </div>

            {/* Quick Multi-Select Action Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', padding: '0 0.25rem' }}>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem', minHeight: '32px' }}
                  onClick={toggleSelectFiltered}
                >
                  {allFilteredSelected ? <Square size={14} /> : <CheckSquare size={14} />}
                  <span>{allFilteredSelected ? 'Deselect Filtered' : `Select Filtered (${filteredProducts.length})`}</span>
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem', minHeight: '32px', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                  onClick={selectInStockOnly}
                  title="Select only products that have stock > 0"
                >
                  <PackageCheck size={14} />
                  <span>Select In-Stock Only ({inStockProductsCount})</span>
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem', minHeight: '32px' }}
                  onClick={matchQuantitiesToStock}
                  title="Set print quantities to match inventory stock for all products"
                >
                  <Sliders size={14} />
                  <span>Match Quantities to Stock</span>
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem', minHeight: '32px' }}
                  onClick={selectAllProducts}
                >
                  Select All ({products.length})
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem', minHeight: '32px' }}
                  onClick={deselectAllProducts}
                >
                  Clear All
                </button>
              </div>

              {/* Global Copies Multiplier */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span>Copies each:</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  className="input-styled input-mono"
                  style={{ width: '65px', padding: '0.25rem 0.5rem', minHeight: '32px', textAlign: 'center' }}
                  value={globalCopies}
                  onChange={(e) => applyGlobalCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
              </div>
            </div>

            {/* Products Selection Checklist */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              maxHeight: '380px',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)'
            }}>
              {filteredProducts.map((p) => {
                const isSelected = selectedProductIds.includes(p.id);
                const qty = itemQuantities[p.id] || 1;
                const inStock = typeof p.stock === 'number' ? p.stock > 0 : true;

                return (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isSelected ? 'rgba(5, 150, 105, 0.04)' : 'transparent',
                      gap: '0.75rem',
                      transition: 'var(--transition)'
                    }}
                  >
                    {/* Checkbox & Product Info */}
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, cursor: 'pointer', minWidth: 0 }}
                      onClick={() => toggleProduct(p.id)}
                    >
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: isSelected ? '2px solid var(--primary)' : '2px solid #cbd5e1',
                        background: isSelected ? 'var(--primary)' : '#ffffff',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {isSelected && <Check size={14} strokeWidth={3} />}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{p.code}</span>
                          <span>•</span>
                          <span>{p.category}</span>
                          <span>•</span>
                          <span style={{
                            color: inStock ? 'var(--primary)' : '#dc2626',
                            fontWeight: 600,
                            background: inStock ? '#ecfdf5' : '#fef2f2',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px'
                          }}>
                            {inStock ? `Stock: ${p.stock} ${p.unit || 'un'}` : 'Out of stock (0)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Price & Quantity Stepper */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)', minWidth: '60px', textAlign: 'right' }}>
                        {formatCurrency(p.price, currencySymbol)}
                      </div>

                      {/* Item Quantity Stepper */}
                      <div className="qty-stepper" style={{ opacity: isSelected ? 1 : 0.4 }}>
                        <button
                          className="qty-btn"
                          style={{ width: '28px', height: '28px' }}
                          disabled={!isSelected || qty <= 1}
                          onClick={() => updateProductQuantity(p.id, qty - 1)}
                        >
                          <Minus size={12} />
                        </button>
                        <div className="qty-display" style={{ minWidth: '28px', fontSize: '0.82rem' }}>
                          {qty}
                        </div>
                        <button
                          className="qty-btn"
                          style={{ width: '28px', height: '28px' }}
                          disabled={!isSelected}
                          onClick={() => updateProductQuantity(p.id, qty + 1)}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredProducts.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                  No products match your current filters.
                </div>
              )}
            </div>

            {/* Bottom Action Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Selected: <strong>{selectedProductIds.length}</strong> items • Total: <strong>{totalStickersCount}</strong> labels
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  disabled={selectedProductIds.length === 0}
                  onClick={() => setViewMode('preview')}
                >
                  <Eye size={16} />
                  <span>Preview & Print ({totalStickersCount})</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================== VIEW 2: PREVIEW & PRINT STICKER SHEET ===================== */}
        {viewMode === 'preview' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', overflow: 'hidden' }}>
            {/* Top Toolbar in Preview Mode */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                onClick={() => setViewMode('select')}
              >
                ← Back to Selection
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Sheet Preview: <strong>{itemsToRender.length}</strong> stickers
                </span>

                <button
                  className="btn btn-primary"
                  style={{ padding: '0.45rem 1rem' }}
                  onClick={handlePrint}
                >
                  <Printer size={16} />
                  <span>Print Sticker Sheet</span>
                </button>
              </div>
            </div>

            {/* Print Sheet Container */}
            <div
              ref={labelsContainerRef}
              className="printable-sticker-sheet"
              style={{
                flex: 1,
                overflowY: 'auto',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem'
              }}
            >
              <div className="labels-grid">
                {itemsToRender.map((p, idx) => (
                  <div key={`${p.id}-${idx}`} className="label-sticker-card">
                    <div className="label-product-name">{p.name}</div>
                    <div className="label-product-price">
                      {p.price ? Number(p.price).toFixed(2) : '0.00'} {currencySymbol}
                    </div>

                    <div className="label-code-graphic">
                      {labelFormat === 'barcode' ? (
                        <svg className="barcode-target-svg" data-code={p.code} />
                      ) : (
                        <canvas className="qrcode-target-canvas" data-code={p.code} />
                      )}
                    </div>
                  </div>
                ))}

                {itemsToRender.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    No products selected. Click "Back to Selection" to choose products to print.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
