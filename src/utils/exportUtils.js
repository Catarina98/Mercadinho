import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

// Format currency
export function formatCurrency(amount, symbol = '€') {
  const num = Number(amount) || 0;
  return `${num.toFixed(2)} ${symbol}`;
}

// Format date & time
export function formatDateTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('pt-PT', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Format date only
export function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('pt-PT', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });
}

// Export Sales to CSV
export function exportSalesToCSV(sales) {
  if (!sales || sales.length === 0) {
    alert('No sales data to export');
    return;
  }

  const headers = ['Sale ID', 'Date & Time', 'Market / Location', 'Payment Method', 'Items Count', 'Items Detail', 'Subtotal (€)', 'Discount (€)', 'Total (€)', 'Notes'];
  
  const rows = sales.map(sale => {
    const itemsDetail = sale.items.map(i => `${i.name} (x${i.quantity} @ €${i.price.toFixed(2)})`).join('; ');
    const totalUnits = sale.items.reduce((sum, i) => sum + i.quantity, 0);

    return [
      `"${sale.id}"`,
      `"${formatDateTime(sale.timestamp)}"`,
      `"${(sale.market || '').replace(/"/g, '""')}"`,
      `"${sale.paymentMethod || 'cash'}"`,
      totalUnits,
      `"${itemsDetail.replace(/"/g, '""')}"`,
      sale.subtotal.toFixed(2),
      sale.discount.toFixed(2),
      sale.total.toFixed(2),
      `"${(sale.notes || '').replace(/"/g, '""')}"`
    ];
  });

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `mercadinho_sales_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export Products to CSV
export function exportProductsToCSV(products) {
  if (!products || products.length === 0) {
    alert('No products to export');
    return;
  }

  const headers = ['SKU / Code', 'Product Name', 'Price (€)', 'Category', 'Stock', 'Unit'];
  const rows = products.map(p => [
    `"${p.code || ''}"`,
    `"${(p.name || '').replace(/"/g, '""')}"`,
    (p.price || 0).toFixed(2),
    `"${(p.category || '').replace(/"/g, '""')}"`,
    p.stock || 0,
    `"${p.unit || 'un'}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `mercadinho_products_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Download JSON file
export function downloadJSON(data, filename) {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
  const link = document.createElement('a');
  link.setAttribute('href', dataStr);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Helper to draw barcode on SVG or Canvas element
export function renderBarcode(element, code, options = {}) {
  if (!element || !code) return;
  try {
    JsBarcode(element, String(code), {
      format: 'CODE128',
      width: options.width || 1.8,
      height: options.height || 45,
      displayValue: options.displayValue !== undefined ? options.displayValue : true,
      fontSize: options.fontSize || 12,
      font: 'JetBrains Mono',
      margin: 4,
      background: '#ffffff',
      lineColor: '#000000',
      ...options
    });
  } catch (e) {
    console.warn(`Could not render barcode for code "${code}":`, e);
  }
}

// Helper to render QR code on canvas
export async function renderQRCode(canvas, text, options = {}) {
  if (!canvas || !text) return;
  try {
    await QRCode.toCanvas(canvas, String(text), {
      width: options.width || 100,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      ...options
    });
  } catch (e) {
    console.warn(`Could not render QR code for "${text}":`, e);
  }
}
