import React, { useState } from 'react';
import { ShoppingBag, Search, Plus, Minus, Trash2, ArrowRight, AlertCircle, Package, AlertTriangle } from 'lucide-react';
import Scanner from './Scanner';
import QuantityKeypadModal from './QuantityKeypadModal';
import CheckoutModal from './CheckoutModal';
import ReceiptModal from './ReceiptModal';

export default function PosView({
  products = [],
  categories = [],
  activeMarket,
  currencySymbol = '€',
  onSaveSale,
  onOpenProductModal,
  onOpenMarketModal
}) {
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [selectedCartItemForQty, setSelectedCartItemForQty] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState(null);
  const [notFoundCode, setNotFoundCode] = useState(null);
  const [stockWarning, setStockWarning] = useState(null);
  const [mobileTab, setMobileTab] = useState('catalog'); // 'catalog' | 'cart' on mobile

  // Available products for POS (only items with stock > 0)
  const availableProducts = products.filter(p => typeof p.stock === 'number' ? p.stock > 0 : true);

  // Add product to cart (by object)
  const addToCart = (product, qty = 1) => {
    const maxStock = typeof product.stock === 'number' ? product.stock : 999;

    if (maxStock <= 0) {
      setStockWarning(`"${product.name}" is out of stock (0 items available).`);
      setTimeout(() => setStockWarning(null), 4500);
      return;
    }

    const existingItem = cart.find(item => item.id === product.id || (item.code && item.code === product.code));
    const currentQtyInCart = existingItem ? existingItem.quantity : 0;

    if (currentQtyInCart + qty > maxStock) {
      setStockWarning(`Cannot add more "${product.name}". Only ${maxStock} in stock (${currentQtyInCart} already in cart).`);
      setTimeout(() => setStockWarning(null), 4500);

      if (currentQtyInCart < maxStock) {
        updateQuantity(product.id, maxStock);
      }
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex(item => item.id === product.id || (item.code && item.code === product.code));
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + qty
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            id: product.id,
            code: product.code || '',
            name: product.name,
            price: Number(product.price || 0),
            category: product.category || 'General',
            color: product.color || '#6366f1',
            quantity: qty,
            stock: maxStock,
            unit: product.unit || 'un'
          }
        ];
      }
    });
  };

  // Handle scanned barcode / QR code
  const handleScanCode = (code) => {
    if (!code) return;
    const clean = code.toString().trim().toLowerCase();
    const product = products.find(p => p.code && p.code.toString().trim().toLowerCase() === clean);

    if (product) {
      const maxStock = typeof product.stock === 'number' ? product.stock : 999;
      if (maxStock <= 0) {
        setStockWarning(`"${product.name}" is out of stock (0 items available).`);
        setTimeout(() => setStockWarning(null), 4500);
        return;
      }

      addToCart(product, 1);
      setNotFoundCode(null);
    } else {
      setNotFoundCode(code);
      setTimeout(() => setNotFoundCode(null), 5000);
    }
  };

  // Adjust item quantity
  const updateQuantity = (itemId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(itemId);
      return;
    }

    const origProduct = products.find(p => p.id === itemId);
    const maxStock = origProduct && typeof origProduct.stock === 'number' ? origProduct.stock : 999;

    if (newQty > maxStock) {
      setStockWarning(`Cannot increase quantity for "${origProduct?.name || 'Item'}". Only ${maxStock} in stock.`);
      setTimeout(() => setStockWarning(null), 4500);
      newQty = maxStock;
    }

    setCart(prev => prev.map(item => item.id === itemId ? { ...item, quantity: Math.min(newQty, maxStock) } : item));
  };

  // Remove single item from cart
  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  // Clear entire cart
  const clearCart = () => {
    if (cart.length > 0 && confirm('Clear all items in cart?')) {
      setCart([]);
    }
  };

  // Complete checkout sale
  const handleSaleCompleted = async (saleRecord) => {
    await onSaveSale(saleRecord);
    setLastCompletedSale(saleRecord);
    setCart([]);
    setMobileTab('catalog');
  };

  // Filtered products list (only with stock > 0)
  const filteredProducts = availableProducts.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      (p.code && p.code.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div>
      {/* Mobile Segmented View Switcher (Hidden on Desktop) */}
      <div className="mobile-pos-switcher">
        <button
          className={`mobile-pos-switch-btn ${mobileTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setMobileTab('catalog')}
        >
          <Package size={16} />
          <span>Catalog & Scanner</span>
        </button>

        <button
          className={`mobile-pos-switch-btn ${mobileTab === 'cart' ? 'active' : ''}`}
          onClick={() => setMobileTab('cart')}
        >
          <ShoppingBag size={16} />
          <span>Cart ({totalUnits}) {totalUnits > 0 ? `• €${subtotal.toFixed(2)}` : ''}</span>
        </button>
      </div>

      <div className="pos-grid">
        {/* Left Column: Scanner & Product Catalog */}
        <div className={`pos-catalog-column ${mobileTab === 'cart' ? 'mobile-hidden' : ''}`}>
          {/* Scanner Component */}
          <Scanner
            onScanSuccess={handleScanCode}
            isScannerActive={isScannerActive}
            setIsScannerActive={setIsScannerActive}
          />

          {/* Stock Warning Banner */}
          {stockWarning && (
            <div style={{
              background: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              animation: 'fadeIn 0.2s ease-out',
              color: '#92400e',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0 }} />
              <div>{stockWarning}</div>
            </div>
          )}

          {/* Code Not Found Banner with quick Add button */}
          {notFoundCode && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626' }}>
                <AlertCircle size={18} />
                <div style={{ fontSize: '0.85rem' }}>
                  Barcode <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>"{notFoundCode}"</span> not registered in catalog.
                </div>
              </div>
              <button
                className="btn btn-primary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', minHeight: '34px' }}
                onClick={() => onOpenProductModal({ code: notFoundCode })}
              >
                <Plus size={13} /> Add Product
              </button>
            </div>
          )}

          {/* Products Search & Category Filter Section */}
          <div className="pos-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  className="input-styled"
                  placeholder="Search products by name or SKU..."
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
              <button
                className="btn btn-secondary"
                onClick={() => onOpenProductModal()}
                style={{ fontSize: '0.8rem', padding: '0.65rem 0.85rem' }}
              >
                <Plus size={15} /> New Item
              </button>
            </div>

            {/* Category Filter Pills (In-Stock Counts) */}
            <div className="category-pills-container">
              <button
                className={`category-pill ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                All ({availableProducts.length})
              </button>
              {categories.map((cat) => {
                const count = availableProducts.filter(p => p.category === cat.name).length;
                return (
                  <button
                    key={cat.id}
                    className={`category-pill ${selectedCategory === cat.name ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.name)}
                  >
                    {cat.name} ({count})
                  </button>
                );
              })}
            </div>

            {/* Product Quick Grid (Available Stock Only) */}
            <div className="products-grid">
              {filteredProducts.map((p) => {
                const inCartItem = cart.find(c => c.id === p.id);
                const maxStock = typeof p.stock === 'number' ? p.stock : 999;
                const isMaxInCart = inCartItem && inCartItem.quantity >= maxStock;

                return (
                  <div
                    key={p.id}
                    className="product-card-pos"
                    style={{
                      '--item-color': p.color || '#6366f1',
                      opacity: isMaxInCart ? 0.75 : 1
                    }}
                    onClick={() => addToCart(p, 1)}
                  >
                    <div className="product-card-title">{p.name}</div>

                    {inCartItem && (
                      <span style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        background: isMaxInCart ? '#f59e0b' : 'var(--primary)',
                        color: 'white',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.4rem',
                        borderRadius: 'var(--radius-full)'
                      }}>
                        x{inCartItem.quantity} {isMaxInCart ? '(Max)' : ''}
                      </span>
                    )}

                    <div className="product-card-meta">
                      <span className="product-card-price">
                        {p.price.toFixed(2)} {currencySymbol}
                      </span>
                      {p.code && (
                        <span className="product-card-code">
                          {p.code.slice(-6)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredProducts.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  {availableProducts.length === 0
                    ? 'All items currently in catalog are out of stock (0 stock).'
                    : `No available products found matching "${searchQuery}".`}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: POS Cart & Checkout */}
        <div className={`pos-card cart-panel ${mobileTab === 'catalog' ? 'mobile-hidden' : ''}`}>
          <div className="cart-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'rgba(5, 150, 105, 0.12)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShoppingBag size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Current Cart</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {totalUnits} {totalUnits === 1 ? 'item' : 'items'} in order
                </div>
              </div>
            </div>

            {cart.length > 0 && (
              <button
                className="btn btn-secondary btn-icon"
                style={{ width: '32px', height: '32px', minHeight: '32px' }}
                onClick={clearCart}
                title="Clear Cart"
              >
                <Trash2 size={14} color="#dc2626" />
              </button>
            )}
          </div>

          {/* Cart Item Rows */}
          {cart.length > 0 ? (
            <div className="cart-items-list">
              {cart.map((item) => {
                const origProduct = products.find(p => p.id === item.id || (p.code && p.code === item.code));
                const maxStock = origProduct && typeof origProduct.stock === 'number' ? origProduct.stock : (item.stock || 999);
                const isAtMax = item.quantity >= maxStock;

                return (
                  <div key={item.id} className="cart-item-row">
                    <div className="cart-item-info">
                      <div className="cart-item-name">{item.name}</div>
                      <div className="cart-item-unit-price" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>{item.price.toFixed(2)} {currencySymbol}</span>
                        {item.code && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            • {item.code}
                          </span>
                        )}
                        {maxStock < 999 && (
                          <span style={{ fontSize: '0.7rem', color: isAtMax ? '#d97706' : 'var(--text-muted)', fontWeight: isAtMax ? 700 : 400 }}>
                            • Max: {maxStock}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="qty-stepper">
                      <button
                        className="qty-btn"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        title="Decrease"
                      >
                        <Minus size={14} />
                      </button>
                      <div
                        className="qty-display"
                        onClick={() => setSelectedCartItemForQty({ ...item, maxStock })}
                        title="Tap to type custom quantity"
                      >
                        {item.quantity}
                      </div>
                      <button
                        className="qty-btn"
                        disabled={isAtMax}
                        style={{
                          opacity: isAtMax ? 0.35 : 1,
                          cursor: isAtMax ? 'not-allowed' : 'pointer'
                        }}
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        title={isAtMax ? `Maximum available stock reached (${maxStock})` : 'Increase'}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Line Total */}
                    <div className="cart-item-total">
                      {(item.price * item.quantity).toFixed(2)} {currencySymbol}
                    </div>

                    {/* Delete Item Button */}
                    <button
                      className="btn btn-secondary btn-icon"
                      style={{ width: '30px', height: '30px', minHeight: '30px', opacity: 0.6 }}
                      onClick={() => removeFromCart(item.id)}
                      title="Remove item"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="cart-empty-state">
              <ShoppingBag size={44} strokeWidth={1.2} />
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                Cart is Empty
              </div>
              <div style={{ fontSize: '0.8rem', maxWidth: '240px' }}>
                Scan a barcode or tap products from the catalog to start selling.
              </div>
              <button
                className="btn btn-secondary"
                style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}
                onClick={() => setMobileTab('catalog')}
              >
                Back to Catalog
              </button>
            </div>
          )}

          {/* Cart Summary & Proceed to Checkout Footer */}
          <div className="cart-footer">
            <div className="summary-row">
              <span>Market Location:</span>
              <span
                style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={onOpenMarketModal}
              >
                {activeMarket ? activeMarket.name : 'Select Market'}
              </span>
            </div>

            <div className="summary-row">
              <span>Subtotal:</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>
                {subtotal.toFixed(2)} {currencySymbol}
              </span>
            </div>

            <div className="summary-row total">
              <span>Grand Total</span>
              <span className="summary-total-amount">
                {subtotal.toFixed(2)} {currencySymbol}
              </span>
            </div>

            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={cart.length === 0}
              onClick={() => setIsCheckoutOpen(true)}
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Bottom Quick Cart Bar on Mobile */}
      {cart.length > 0 && mobileTab === 'catalog' && (
        <div
          className="mobile-floating-cart-bar visible"
          onClick={() => setMobileTab('cart')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              background: 'var(--primary)',
              color: 'white',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.8rem'
            }}>
              {totalUnits}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>View Current Cart</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {cart.length} unique {cart.length === 1 ? 'item' : 'items'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>
              {subtotal.toFixed(2)} {currencySymbol}
            </span>
            <ArrowRight size={16} color="var(--primary)" />
          </div>
        </div>
      )}

      {/* Quantity Keypad Modal */}
      {selectedCartItemForQty && (
        <QuantityKeypadModal
          isOpen={Boolean(selectedCartItemForQty)}
          item={selectedCartItemForQty}
          onClose={() => setSelectedCartItemForQty(null)}
          onUpdateQuantity={updateQuantity}
        />
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          cartItems={cart}
          activeMarket={activeMarket}
          currencySymbol={currencySymbol}
          onCompleteSale={handleSaleCompleted}
        />
      )}

      {/* Receipt Modal */}
      {lastCompletedSale && (
        <ReceiptModal
          sale={lastCompletedSale}
          isOpen={Boolean(lastCompletedSale)}
          onClose={() => setLastCompletedSale(null)}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  );
}
