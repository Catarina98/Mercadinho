import React, { useState } from 'react';
import { Package, Plus, Search, Edit2, Trash2, Printer, Download, Upload, Barcode, Sparkles, Tag, Layers, RefreshCw } from 'lucide-react';
import { formatCurrency, exportProductsToCSV } from '../utils/exportUtils';
import LabelPrinterModal from './LabelPrinterModal';

export default function CatalogView({
  products = [],
  categories = [],
  currencySymbol = '€',
  onSaveProduct,
  onDeleteProduct,
  onSaveCategory,
  onDeleteCategory,
  onResetDemoData,
  editingProductInitial = null,
  onClearInitialEditingProduct
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isProductModalOpen, setIsProductModalOpen] = useState(Boolean(editingProductInitial));
  const [editingProduct, setEditingProduct] = useState(editingProductInitial || null);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);

  // Form State for Product Create/Edit
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCategory, setFormCategory] = useState(categories[0]?.name || 'General');
  const [formStock, setFormStock] = useState('50');
  const [formUnit, setFormUnit] = useState('pc');
  const [formColor, setFormColor] = useState('#6366f1');

  const openAddModal = (initialData = {}) => {
    setEditingProduct(null);
    setFormName(initialData.name || '');
    setFormCode(initialData.code || generateRandomBarcode());
    setFormPrice(initialData.price ? String(initialData.price) : '5.00');
    setFormCategory(initialData.category || categories[0]?.name || 'General');
    setFormStock(initialData.stock ? String(initialData.stock) : '50');
    setFormUnit(initialData.unit || 'pc');
    setFormColor(initialData.color || '#6366f1');
    setIsProductModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormName(product.name || '');
    setFormCode(product.code || '');
    setFormPrice(String(product.price || ''));
    setFormCategory(product.category || categories[0]?.name || 'General');
    setFormStock(String(product.stock !== undefined ? product.stock : 50));
    setFormUnit(product.unit || 'pc');
    setFormColor(product.color || '#6366f1');
    setIsProductModalOpen(true);
  };

  const handleProductSubmit = (e) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const productData = {
      id: editingProduct ? editingProduct.id : undefined,
      name: formName.trim(),
      code: formCode.trim() || generateRandomBarcode(),
      price: Math.max(0, parseFloat(formPrice) || 0),
      category: formCategory,
      stock: parseInt(formStock, 10) || 0,
      unit: formUnit.trim() || 'pc',
      color: formColor
    };

    onSaveProduct(productData);
    setIsProductModalOpen(false);
    if (onClearInitialEditingProduct) onClearInitialEditingProduct();
  };

  // Generate 13-digit realistic EAN barcode
  const generateRandomBarcode = () => {
    const prefix = '560'; // Portugal EAN prefix
    let rest = '';
    for (let i = 0; i < 10; i++) {
      rest += Math.floor(Math.random() * 10);
    }
    return prefix + rest;
  };

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      (p.code && p.code.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q));
    return matchesCat && matchesSearch;
  });

  return (
    <div>
      {/* Header & Main Actions */}
      <div className="analytics-header">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Package size={24} color="var(--primary)" />
            <span>Product Catalog & Barcodes</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Manage product names, prices, categories, and generate printable barcode labels
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setIsLabelModalOpen(true)}
          >
            <Printer size={16} color="var(--accent)" />
            <span>Print Barcode Labels</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => exportProductsToCSV(products)}
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={() => openAddModal()}
          >
            <Plus size={16} />
            <span>New Product</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="pos-card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              className="input-styled"
              placeholder="Search products by name, code or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.4rem' }}
            />
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}
            />
          </div>

          <div style={{ minWidth: '180px' }}>
            <select
              className="input-styled"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Table (Desktop) & Cards (Mobile) */}
      <div className="pos-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Desktop Table View */}
        <div style={{ overflowX: 'auto' }} className="desktop-only-table">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.85rem 1.25rem' }}>Product Name</th>
                <th style={{ padding: '0.85rem 1rem' }}>Barcode / SKU</th>
                <th style={{ padding: '0.85rem 1rem' }}>Category</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Price</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Stock</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'var(--transition)' }}>
                  <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.color || 'var(--primary)' }} />
                      <span>{p.name}</span>
                    </div>
                  </td>

                  <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Barcode size={15} color="var(--primary)" />
                      <span>{p.code}</span>
                    </div>
                  </td>

                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)'
                    }}>
                      {p.category}
                    </span>
                  </td>

                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                    {formatCurrency(p.price, currencySymbol)}
                  </td>

                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontFamily: 'var(--font-mono)', color: p.stock < 10 ? '#f87171' : 'inherit' }}>
                    {p.stock} {p.unit}
                  </td>

                  <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                      <button
                        className="btn btn-secondary btn-icon"
                        style={{ width: '34px', height: '34px', minHeight: '34px' }}
                        onClick={() => openEditModal(p)}
                        title="Edit product"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="btn btn-secondary btn-icon"
                        style={{ width: '34px', height: '34px', minHeight: '34px', opacity: 0.7 }}
                        onClick={() => {
                          if (confirm(`Delete product "${p.name}"?`)) {
                            onDeleteProduct(p.id);
                          }
                        }}
                        title="Delete product"
                      >
                        <Trash2 size={14} color="#f87171" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Product Cards List */}
        <div className="mobile-product-cards-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.75rem' }}>
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color || 'var(--primary)', flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{p.code}</span>
                  <span>•</span>
                  <span>{p.category}</span>
                  <span>•</span>
                  <span>{p.stock} {p.unit}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--primary)', fontSize: '0.95rem' }}>
                  {formatCurrency(p.price, currencySymbol)}
                </div>

                <button
                  className="btn btn-secondary btn-icon"
                  style={{ width: '34px', height: '34px', minHeight: '34px' }}
                  onClick={() => openEditModal(p)}
                >
                  <Edit2 size={14} />
                </button>
                <button
                  className="btn btn-secondary btn-icon"
                  style={{ width: '34px', height: '34px', minHeight: '34px', opacity: 0.7 }}
                  onClick={() => {
                    if (confirm(`Delete product "${p.name}"?`)) {
                      onDeleteProduct(p.id);
                    }
                  }}
                >
                  <Trash2 size={14} color="#f87171" />
                </button>
              </div>
            </div>
          ))}

          {filteredProducts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              No products found matching "{searchQuery}".
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsProductModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsProductModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  Product Name *
                </label>
                <input
                  type="text"
                  className="input-styled"
                  placeholder="e.g. Handmade Ceramic Mug"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Barcode / QR Code String *
                  </label>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                    onClick={() => setFormCode(generateRandomBarcode())}
                  >
                    <RefreshCw size={12} /> Auto Generate EAN
                  </button>
                </div>
                <input
                  type="text"
                  className="input-styled input-mono"
                  placeholder="e.g. 5601234567890"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Price ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-styled input-mono"
                    placeholder="0.00"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Category
                  </label>
                  <select
                    className="input-styled"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="input-styled input-mono"
                    placeholder="50"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Unit
                  </label>
                  <input
                    type="text"
                    className="input-styled"
                    placeholder="pc, pack, kg, jar..."
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsProductModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!formName.trim()}
                >
                  {editingProduct ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Label Sticker Sheet Generator Modal */}
      {isLabelModalOpen && (
        <LabelPrinterModal
          isOpen={isLabelModalOpen}
          onClose={() => setIsLabelModalOpen(false)}
          products={products}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  );
}
