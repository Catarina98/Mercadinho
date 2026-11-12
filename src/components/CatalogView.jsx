import React, { useState } from 'react';
import {
  Package, Plus, Search, Edit2, Trash2, Printer, Download, Upload,
  Barcode, Sparkles, Tag, Layers, RefreshCw, X, Check, FolderPlus,
  Palette, ChevronUp, ChevronDown, ArrowUpDown, ArrowDownAZ, ArrowUpAZ, BarChart2
} from 'lucide-react';
import { formatCurrency, exportProductsToCSV } from '../utils/exportUtils';
import LabelPrinterModal from './LabelPrinterModal';

const PRESET_COLORS = [
  '#059669', // Emerald
  '#4f46e5', // Indigo
  '#f59e0b', // Amber
  '#dc2626', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#64748b'  // Slate
];

export default function CatalogView({
  products = [],
  categories = [],
  currencySymbol = '€',
  onSaveProduct,
  onDeleteProduct,
  onManageCatalogStock,
  onSaveCategory,
  onReorderCategories,
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
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Category Management State
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0]);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatColor, setEditCatColor] = useState(PRESET_COLORS[0]);
  const [isInlineCreatingCategory, setIsInlineCreatingCategory] = useState(false);
  const [inlineCatName, setInlineCatName] = useState('');

  // Form State for Product Create/Edit
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCategory, setFormCategory] = useState(categories[0]?.name || 'General');
  const [formStock, setFormStock] = useState('1');
  const [formUnit, setFormUnit] = useState('un');
  const [formColor, setFormColor] = useState('#6366f1');

  const openAddModal = (initialData = {}) => {
    setEditingProduct(null);
    setFormName(initialData.name || '');
    setFormCode(initialData.code || generateRandomBarcode());
    setFormPrice(initialData.price ? String(initialData.price) : '5.00');
    setFormCategory(initialData.category || categories[0]?.name || 'General');
    setFormStock(initialData.stock ? String(initialData.stock) : '1');
    setFormUnit(initialData.unit || 'un');
    setFormColor(initialData.color || '#6366f1');
    setIsInlineCreatingCategory(false);
    setIsProductModalOpen(true);
  };

  const openEditModal = (product) => {
    if (product.sanity_product_id) {
      onManageCatalogStock(product);
      return;
    }
    setEditingProduct(product);
    setFormName(product.name || '');
    setFormCode(product.code || '');
    setFormPrice(String(product.price || ''));
    setFormCategory(product.category || categories[0]?.name || 'General');
    setFormStock(String(product.stock !== undefined ? product.stock : 1));
    setFormUnit(product.unit || 'un');
    setFormColor(product.color || '#6366f1');
    setIsInlineCreatingCategory(false);
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
      unit: formUnit.trim() || 'un',
      color: formColor
    };

    onSaveProduct(productData);
    setIsProductModalOpen(false);
    if (onClearInitialEditingProduct) onClearInitialEditingProduct();
  };

  // Category Handlers
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    await onSaveCategory({
      name: newCatName.trim(),
      color: newCatColor,
      order: categories.length
    });

    setNewCatName('');
  };

  const handleSaveInlineCategory = async () => {
    if (!inlineCatName.trim()) return;
    const catName = inlineCatName.trim();

    await onSaveCategory({
      name: catName,
      color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
      order: categories.length
    });

    setFormCategory(catName);
    setInlineCatName('');
    setIsInlineCreatingCategory(false);
  };

  const startEditCategory = (cat) => {
    setEditingCategoryId(cat.id);
    setEditCatName(cat.name);
    setEditCatColor(cat.color || PRESET_COLORS[0]);
  };

  const saveEditCategory = async (catId) => {
    if (!editCatName.trim()) return;
    const oldCat = categories.find(c => c.id === catId);

    await onSaveCategory({
      id: catId,
      name: editCatName.trim(),
      color: editCatColor,
      order: oldCat?.order !== undefined ? oldCat.order : 0
    });

    // Optionally update products that used the old category name
    if (oldCat && oldCat.name !== editCatName.trim()) {
      const affected = products.filter(p => p.category === oldCat.name);
      for (const p of affected) {
        onSaveProduct({ ...p, category: editCatName.trim() });
      }
    }

    setEditingCategoryId(null);
  };

  const handleDeleteCategoryWithConfirm = async (cat) => {
    const productsInCat = products.filter(p => p.category === cat.name);
    let confirmMsg = `Delete category "${cat.name}"?`;
    if (productsInCat.length > 0) {
      confirmMsg = `Category "${cat.name}" has ${productsInCat.length} products assigned to it. Are you sure you want to delete it?`;
    }

    if (confirm(confirmMsg)) {
      await onDeleteCategory(cat.id);
    }
  };

  const handleMoveCategory = async (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= categories.length) return;
    const copy = [...categories];
    const [moved] = copy.splice(index, 1);
    copy.splice(newIndex, 0, moved);
    if (onReorderCategories) {
      await onReorderCategories(copy);
    }
  };

  const handleSortCategories = async (type) => {
    let sorted = [...categories];
    if (type === 'az') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    } else if (type === 'za') {
      sorted.sort((a, b) => b.name.localeCompare(a.name, undefined, { sensitivity: 'base' }));
    } else if (type === 'count') {
      sorted.sort((a, b) => {
        const countA = products.filter(p => p.category === a.name).length;
        const countB = products.filter(p => p.category === b.name).length;
        return countB - countA;
      });
    }
    if (onReorderCategories) {
      await onReorderCategories(sorted);
    }
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
            Manage product names, prices, categories ({categories.length}), and generate printable barcode labels
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setIsCategoryModalOpen(true)}
            title="Add, rename, sort or delete product categories"
          >
            <Tag size={16} color="var(--primary)" />
            <span>Manage Categories ({categories.length})</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => setIsLabelModalOpen(true)}
            title="Generate printable barcode sticker sheets"
          >
            <Printer size={16} color="var(--accent)" />
            <span>Print Barcode Labels</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => exportProductsToCSV(products)}
            title="Download CSV Catalog"
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
        </div>
      </div>

      {/* Products Table (Desktop) & Cards (Mobile) */}
      <div className="pos-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Desktop Table View */}
        <div style={{ overflowX: 'auto' }} className="desktop-only-table">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'rgba(0, 0, 0, 0.02)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
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
                      background: '#f1f5f9',
                      border: '1px solid var(--border-subtle)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      fontWeight: 600
                    }}>
                      {p.category}
                    </span>
                  </td>

                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                    {formatCurrency(p.price, currencySymbol)}
                  </td>

                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontFamily: 'var(--font-mono)', color: p.stock < 10 ? '#dc2626' : 'inherit' }}>
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
                        <Trash2 size={14} color="#dc2626" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No products found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Product Cards View */}
        <div className="mobile-product-cards-list" style={{ display: 'none', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem' }}>
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color || 'var(--primary)' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{p.code}</span>
                  <span>•</span>
                  <span>{p.category}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>
                    {formatCurrency(p.price, currencySymbol)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {p.stock} {p.unit}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <button
                    className="btn btn-secondary btn-icon"
                    style={{ width: '32px', height: '32px', minHeight: '32px' }}
                    onClick={() => openEditModal(p)}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    className="btn btn-secondary btn-icon"
                    style={{ width: '32px', height: '32px', minHeight: '32px' }}
                    onClick={() => {
                      if (confirm(`Delete product "${p.name}"?`)) {
                        onDeleteProduct(p.id);
                      }
                    }}
                  >
                    <Trash2 size={13} color="#dc2626" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ======================= MANAGE CATEGORIES MODAL ======================= */}
      {isCategoryModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsCategoryModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Tag size={20} color="var(--primary)" />
                  <span>Manage Product Categories ({categories.length})</span>
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Create, edit, reorder, or sort your categories
                </p>
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsCategoryModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Create New Category Card */}
            <form
              onSubmit={handleCreateCategory}
              style={{
                background: '#f8fafc',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem',
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}
            >
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Create New Category
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="input-styled"
                  placeholder="e.g. Miniaturas, Porta-Chaves, Natal..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  style={{ flex: 1, minHeight: '38px', fontSize: '0.88rem' }}
                />

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!newCatName.trim()}
                  style={{ minHeight: '38px', fontSize: '0.82rem' }}
                >
                  <Plus size={15} /> Add Category
                </button>
              </div>

              {/* Color Swatch Picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: '0.3rem' }}>Color:</span>
                {PRESET_COLORS.map(c => (
                  <div
                    key={c}
                    onClick={() => setNewCatColor(c)}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: c,
                      cursor: 'pointer',
                      border: newCatColor === c ? '2px solid #0f172a' : '2px solid transparent',
                      transform: newCatColor === c ? 'scale(1.2)' : 'scale(1)',
                      transition: 'var(--transition)'
                    }}
                  />
                ))}
              </div>
            </form>

            {/* Sorting Quick-Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              marginBottom: '0.65rem',
              flexWrap: 'wrap'
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <ArrowUpDown size={14} />
                <span>Sort Categories:</span>
              </span>

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', minHeight: '30px' }}
                  onClick={() => handleSortCategories('az')}
                  title="Sort Alphabetically A to Z"
                >
                  <ArrowDownAZ size={13} />
                  <span>A → Z</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', minHeight: '30px' }}
                  onClick={() => handleSortCategories('za')}
                  title="Sort Alphabetically Z to A"
                >
                  <ArrowUpAZ size={13} />
                  <span>Z → A</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', minHeight: '30px' }}
                  onClick={() => handleSortCategories('count')}
                  title="Sort by Number of Products"
                >
                  <BarChart2 size={13} />
                  <span>Most Items</span>
                </button>
              </div>
            </div>

            {/* Existing Categories List with Move Up / Move Down controls */}
            <div style={{
              maxHeight: '340px',
              overflowY: 'auto',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)'
            }}>
              {categories.map((cat, index) => {
                const count = products.filter(p => p.category === cat.name).length;
                const isEditing = editingCategoryId === cat.id;

                if (isEditing) {
                  return (
                    <div
                      key={cat.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        padding: '0.65rem 0.85rem',
                        borderBottom: '1px solid var(--border-subtle)',
                        background: '#f1f5f9'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <input
                          type="text"
                          className="input-styled"
                          value={editCatName}
                          onChange={(e) => setEditCatName(e.target.value)}
                          style={{ flex: 1, minHeight: '34px', fontSize: '0.85rem' }}
                          autoFocus
                        />
                        <button
                          className="btn btn-primary"
                          style={{ padding: '0.3rem 0.6rem', minHeight: '34px' }}
                          onClick={() => saveEditCategory(cat.id)}
                        >
                          <Check size={14} /> Save
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', minHeight: '34px' }}
                          onClick={() => setEditingCategoryId(null)}
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {PRESET_COLORS.map(c => (
                          <div
                            key={c}
                            onClick={() => setEditCatColor(c)}
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: c,
                              cursor: 'pointer',
                              border: editCatColor === c ? '2px solid #0f172a' : '2px solid transparent'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={cat.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.85rem',
                      borderBottom: '1px solid var(--border-subtle)',
                      gap: '0.5rem'
                    }}
                  >
                    {/* Position Reorder Steppers */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <button
                        className="btn btn-secondary btn-icon"
                        style={{ width: '26px', height: '26px', minHeight: '26px', padding: 0 }}
                        disabled={index === 0}
                        onClick={() => handleMoveCategory(index, -1)}
                        title="Move category up"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        className="btn btn-secondary btn-icon"
                        style={{ width: '26px', height: '26px', minHeight: '26px', padding: 0 }}
                        disabled={index === categories.length - 1}
                        onClick={() => handleMoveCategory(index, 1)}
                        title="Move category down"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: cat.color || 'var(--primary)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cat.name}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: '#f1f5f9', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-full)' }}>
                        {count} {count === 1 ? 'product' : 'products'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button
                        className="btn btn-secondary btn-icon"
                        style={{ width: '30px', height: '30px', minHeight: '30px' }}
                        onClick={() => startEditCategory(cat)}
                        title="Edit category"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        className="btn btn-secondary btn-icon"
                        style={{ width: '30px', height: '30px', minHeight: '30px', opacity: 0.7 }}
                        onClick={() => handleDeleteCategoryWithConfirm(cat)}
                        title="Delete category"
                      >
                        <Trash2 size={13} color="#dc2626" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {categories.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No categories created yet.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsCategoryModalOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= ADD / EDIT PRODUCT MODAL ======================= */}
      {isProductModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsProductModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsProductModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  Product Name *
                </label>
                <input
                  type="text"
                  className="input-styled"
                  placeholder="e.g. Abóbora, Mini Mira..."
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
                  placeholder="5602000000001"
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Category
                    </label>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                      onClick={() => setIsInlineCreatingCategory(!isInlineCreatingCategory)}
                    >
                      {isInlineCreatingCategory ? 'Select existing' : '+ New'}
                    </button>
                  </div>

                  {isInlineCreatingCategory ? (
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <input
                        type="text"
                        className="input-styled"
                        placeholder="New category name..."
                        value={inlineCatName}
                        onChange={(e) => setInlineCatName(e.target.value)}
                        style={{ fontSize: '0.82rem' }}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                        disabled={!inlineCatName.trim()}
                        onClick={handleSaveInlineCategory}
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  ) : (
                    <select
                      className="input-styled"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  )}
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
                    placeholder="1"
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
                    placeholder="un, pack, kg, jar..."
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
          categories={categories}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  );
}
