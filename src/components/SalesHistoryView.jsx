import React, { useState, useMemo } from 'react';
import { History, Search, Download, MapPin, Calendar, Trash2, Eye, FileSpreadsheet, CreditCard, Banknote, Smartphone, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDateTime, exportSalesToCSV, downloadJSON } from '../utils/exportUtils';
import ReceiptModal from './ReceiptModal';

export default function SalesHistoryView({ sales = [], markets = [], currencySymbol = '€', onDeleteSale }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarket, setSelectedMarket] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | '7days' | '30days'
  const [viewingReceiptSale, setViewingReceiptSale] = useState(null);

  // Filter sales
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      // Market filter
      if (selectedMarket !== 'all' && sale.market !== selectedMarket) {
        return false;
      }
      // Payment filter
      if (selectedPayment !== 'all' && sale.paymentMethod !== selectedPayment) {
        return false;
      }
      // Date filter
      if (dateFilter !== 'all') {
        const saleDate = new Date(sale.timestamp);
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (dateFilter === 'today') {
          if (saleDate < startOfDay) return false;
        } else if (dateFilter === '7days') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          if (saleDate < sevenDaysAgo) return false;
        } else if (dateFilter === '30days') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(now.getDate() - 30);
          if (saleDate < thirtyDaysAgo) return false;
        }
      }
      // Search query (search in items name & barcode, market name, sale ID, notes)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = sale.id && sale.id.toLowerCase().includes(q);
        const matchesMarket = sale.market && sale.market.toLowerCase().includes(q);
        const matchesNotes = sale.notes && sale.notes.toLowerCase().includes(q);
        const matchesItem = sale.items && sale.items.some(i => 
          (i.name && i.name.toLowerCase().includes(q)) ||
          (i.code && i.code.toString().toLowerCase().includes(q)) ||
          (i.category && i.category.toLowerCase().includes(q))
        );
        if (!matchesId && !matchesMarket && !matchesItem && !matchesNotes) {
          return false;
        }
      }
      return true;
    });
  }, [sales, selectedMarket, selectedPayment, dateFilter, searchQuery]);

  // Totals for filtered list
  const filteredTotal = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const filteredUnits = filteredSales.reduce((sum, s) => sum + s.items.reduce((iSum, i) => iSum + (i.quantity || 1), 0), 0);

  const getPaymentIcon = (method) => {
    switch (method) {
      case 'card': return <CreditCard size={14} color="#818cf8" />;
      case 'mbway': return <Smartphone size={14} color="#ec4899" />;
      default: return <Banknote size={14} color="#10b981" />;
    }
  };

  return (
    <div>
      {/* Header & Export Controls */}
      <div className="analytics-header">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <History size={24} color="var(--primary)" />
            <span>Sales History & Receipts Archive</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Review what was sold, exact timestamp, and market location
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => exportSalesToCSV(filteredSales)}
            title="Download CSV Spreadsheet"
          >
            <FileSpreadsheet size={16} color="var(--primary)" />
            <span>Export CSV</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => downloadJSON(filteredSales, `mercadinho_sales_${new Date().toISOString().split('T')[0]}.json`)}
            title="Download JSON"
          >
            <Download size={16} />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="pos-card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="input-styled"
              placeholder="Search by product, barcode, market, or sale ID..."
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

          {/* Market Filter */}
          <select
            className="input-styled"
            value={selectedMarket}
            onChange={(e) => setSelectedMarket(e.target.value)}
          >
            <option value="all">All Markets ({markets.length})</option>
            {markets.map(m => (
              <option key={m.id} value={m.name}>{m.name}</option>
            ))}
          </select>

          {/* Date Range Filter */}
          <select
            className="input-styled"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>

          {/* Payment Method Filter */}
          <select
            className="input-styled"
            value={selectedPayment}
            onChange={(e) => setSelectedPayment(e.target.value)}
          >
            <option value="all">All Payment Methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card / POS</option>
            <option value="mbway">MBWay / QR</option>
          </select>
        </div>

        {/* Filter Summary Stats */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginTop: '1rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.85rem'
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            Showing <strong>{filteredSales.length}</strong> transactions ({filteredUnits} items)
          </span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.95rem' }}>
            Filtered Total: <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(filteredTotal, currencySymbol)}</span>
          </span>
        </div>
      </div>

      {/* Sales Transactions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filteredSales.map((sale) => (
          <div
            key={sale.id}
            className="pos-card pos-card-interactive"
            style={{ padding: '1rem 1.25rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--primary)',
                  background: 'rgba(16, 185, 129, 0.12)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: 'var(--radius-full)'
                }}>
                  <MapPin size={12} /> {sale.market}
                </span>

                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)'
                }}>
                  <Calendar size={12} /> {formatDateTime(sale.timestamp)}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  {getPaymentIcon(sale.paymentMethod)} {sale.paymentMethod}
                </span>

                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {formatCurrency(sale.total, currencySymbol)}
                </div>
              </div>
            </div>

            {/* Item Breakdown Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
              {sale.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{item.quantity}x</span>
                  <span>{item.name}</span>
                  {item.code && (
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                      [{item.code}]
                    </span>
                  )}
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                    ({(item.price * item.quantity).toFixed(2)}{currencySymbol})
                  </span>
                </div>
              ))}
            </div>

            {/* Row Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.6rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>ID: {sale.id} {sale.notes ? `• Note: "${sale.notes}"` : ''}</span>

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => setViewingReceiptSale(sale)}
                >
                  <Eye size={13} /> View Receipt
                </button>
                <button
                  className="btn btn-secondary btn-icon"
                  style={{ width: '28px', height: '28px', opacity: 0.6 }}
                  onClick={() => {
                    if (confirm(`Void & delete transaction #${sale.id}?`)) {
                      onDeleteSale(sale.id);
                    }
                  }}
                  title="Delete record"
                >
                  <Trash2 size={13} color="#f87171" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredSales.length === 0 && (
          <div className="pos-card" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <History size={48} strokeWidth={1.2} style={{ margin: '0 auto 0.75rem' }} />
            <div style={{ fontWeight: 600, fontSize: '1rem' }}>No sales records found</div>
            <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Try adjusting your search filters or start a new sale from the POS tab.
            </div>
          </div>
        )}
      </div>

      {/* Receipt Modal for viewing past receipt */}
      {viewingReceiptSale && (
        <ReceiptModal
          isOpen={Boolean(viewingReceiptSale)}
          onClose={() => setViewingReceiptSale(null)}
          sale={viewingReceiptSale}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  );
}
