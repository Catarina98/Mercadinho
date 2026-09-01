import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { TrendingUp, MapPin, Package, PieChart as PieIcon, DollarSign, ShoppingCart, Calendar, Award } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/exportUtils';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AnalyticsView({ sales = [], currencySymbol = '€' }) {
  const [timeRange, setTimeRange] = useState('6months'); // '7days' | '30days' | '6months' | 'year' | 'all'
  const [metricMode, setMetricMode] = useState('revenue'); // 'revenue' | 'units'

  // Filter sales based on selected time range
  const filteredSales = useMemo(() => {
    if (timeRange === 'all') return sales;

    const now = new Date();
    const cutoff = new Date();

    if (timeRange === '7days') {
      cutoff.setDate(now.getDate() - 7);
    } else if (timeRange === '30days') {
      cutoff.setDate(now.getDate() - 30);
    } else if (timeRange === '6months') {
      cutoff.setMonth(now.getMonth() - 6);
    } else if (timeRange === 'year') {
      cutoff.setFullYear(now.getFullYear() - 1);
    }

    return sales.filter(s => new Date(s.timestamp) >= cutoff);
  }, [sales, timeRange]);

  // Aggregate Metrics & Insights
  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const totalOrders = filteredSales.length;
    const totalUnits = filteredSales.reduce((sum, s) => sum + s.items.reduce((iSum, item) => iSum + (item.quantity || 1), 0), 0);
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Market Breakdown
    const marketMap = {};
    // Product Breakdown
    const productMap = {};
    // Category Breakdown
    const categoryMap = {};
    // Monthly Breakdown
    const monthMap = {};
    // Daily Breakdown
    const dayMap = {};

    filteredSales.forEach(s => {
      // Market
      const mkt = s.market || 'Unknown';
      if (!marketMap[mkt]) {
        marketMap[mkt] = { revenue: 0, units: 0, orders: 0 };
      }
      marketMap[mkt].revenue += s.total;
      marketMap[mkt].orders += 1;

      // Month
      const date = new Date(s.timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const dayKey = date.toISOString().split('T')[0];

      monthMap[monthKey] = (monthMap[monthKey] || 0) + s.total;
      dayMap[dayKey] = (dayMap[dayKey] || 0) + s.total;

      // Items
      s.items.forEach(item => {
        const pKey = item.name || 'Unnamed';
        if (!productMap[pKey]) {
          productMap[pKey] = { revenue: 0, units: 0, category: item.category || 'General' };
        }
        const itemTotal = item.total || (item.price * item.quantity);
        productMap[pKey].revenue += itemTotal;
        productMap[pKey].units += item.quantity || 1;

        marketMap[mkt].units += item.quantity || 1;

        const cat = item.category || 'General';
        categoryMap[cat] = (categoryMap[cat] || 0) + itemTotal;
      });
    });

    // Top Market
    const topMarketEntry = Object.entries(marketMap).sort((a, b) => b[1].revenue - a[1].revenue)[0];
    const topMarket = topMarketEntry ? { name: topMarketEntry[0], revenue: topMarketEntry[1].revenue } : null;

    // Top Product
    const topProductEntry = Object.entries(productMap).sort((a, b) => b[1].revenue - a[1].revenue)[0];
    const topProduct = topProductEntry ? { name: topProductEntry[0], revenue: topProductEntry[1].revenue, units: topProductEntry[1].units } : null;

    return {
      totalRevenue,
      totalOrders,
      totalUnits,
      avgTicket,
      topMarket,
      topProduct,
      marketMap,
      productMap,
      categoryMap,
      monthMap,
      dayMap
    };
  }, [filteredSales]);

  // Chart 1: Revenue Over Time (Monthly / Daily)
  const timelineChartData = useMemo(() => {
    const isDaily = timeRange === '7days' || timeRange === '30days';
    const dataMap = isDaily ? stats.dayMap : stats.monthMap;
    const sortedKeys = Object.keys(dataMap).sort();

    const labels = sortedKeys.map(k => {
      if (isDaily) {
        const d = new Date(k);
        return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
      } else {
        const [year, month] = k.split('-');
        const d = new Date(Number(year), Number(month) - 1, 1);
        return d.toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' });
      }
    });

    const values = sortedKeys.map(k => Number(dataMap[k].toFixed(2)));

    return {
      labels,
      datasets: [
        {
          label: `Income (${currencySymbol})`,
          data: values,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#ffffff',
          pointHoverRadius: 6
        }
      ]
    };
  }, [stats, timeRange, currencySymbol]);

  // Chart 2: Sales by Market (Where I sold the most)
  const marketChartData = useMemo(() => {
    const entries = Object.entries(stats.marketMap).sort((a, b) => b[1].revenue - a[1].revenue);
    const labels = entries.map(e => e[0]);
    const values = entries.map(e => Number(e[1].revenue.toFixed(2)));

    return {
      labels,
      datasets: [
        {
          label: `Revenue (${currencySymbol})`,
          data: values,
          backgroundColor: [
            'rgba(99, 102, 241, 0.85)',
            'rgba(16, 185, 129, 0.85)',
            'rgba(245, 158, 11, 0.85)',
            'rgba(236, 72, 153, 0.85)',
            'rgba(139, 92, 246, 0.85)',
            'rgba(14, 165, 233, 0.85)'
          ],
          borderRadius: 8
        }
      ]
    };
  }, [stats, currencySymbol]);

  // Chart 3: Top Products (What I sold the most)
  const productChartData = useMemo(() => {
    const entries = Object.entries(stats.productMap)
      .sort((a, b) => metricMode === 'revenue' ? b[1].revenue - a[1].revenue : b[1].units - a[1].units)
      .slice(0, 8); // Top 8 items

    const labels = entries.map(e => e[0]);
    const values = entries.map(e => metricMode === 'revenue' ? Number(e[1].revenue.toFixed(2)) : e[1].units);

    return {
      labels,
      datasets: [
        {
          label: metricMode === 'revenue' ? `Revenue (${currencySymbol})` : 'Units Sold',
          data: values,
          backgroundColor: metricMode === 'revenue' ? 'rgba(16, 185, 129, 0.8)' : 'rgba(245, 158, 11, 0.8)',
          borderRadius: 6
        }
      ]
    };
  }, [stats, metricMode, currencySymbol]);

  // Chart 4: Category Distribution Doughnut
  const categoryChartData = useMemo(() => {
    const entries = Object.entries(stats.categoryMap).sort((a, b) => b[1] - a[1]);
    const labels = entries.map(e => e[0]);
    const values = entries.map(e => Number(e[1].toFixed(2)));

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: [
            '#6366f1',
            '#f59e0b',
            '#ec4899',
            '#10b981',
            '#8b5cf6',
            '#3b82f6',
            '#14b8a6'
          ],
          borderWidth: 2,
          borderColor: '#111827'
        }
      ]
    };
  }, [stats]);

  // Shared Light Chart Options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#475569', font: { family: 'Plus Jakarta Sans', size: 12 } }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#34d399',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        bodyFont: { family: 'JetBrains Mono', weight: 'bold' }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: { color: '#64748b', font: { size: 11 } }
      },
      y: {
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 11 } }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: { color: '#475569', font: { family: 'Plus Jakarta Sans', size: 12 } }
      },
      tooltip: chartOptions.plugins.tooltip
    }
  };

  const horizontalBarOptions = {
    ...chartOptions,
    indexAxis: 'y'
  };

  return (
    <div>
      {/* Header & Filter Controls */}
      <div className="analytics-header">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Sales Analytics & Insights</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Track monthly revenue, top markets, best-selling products, and categories
          </p>
        </div>

        {/* Time Range Selector */}
        <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.3)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          {[
            { id: '7days', label: '7 Days' },
            { id: '30days', label: '30 Days' },
            { id: '6months', label: '6 Months' },
            { id: 'year', label: '1 Year' },
            { id: 'all', label: 'All Time' }
          ].map((t) => (
            <button
              key={t.id}
              className={`btn ${timeRange === t.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', border: 'none', background: timeRange === t.id ? undefined : 'transparent' }}
              onClick={() => setTimeRange(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ '--kpi-accent': 'var(--primary)' }}>
          <div className="kpi-title">Total Income</div>
          <div className="kpi-value" style={{ color: 'var(--primary)' }}>
            {formatCurrency(stats.totalRevenue, currencySymbol)}
          </div>
          <div className="kpi-subtitle">
            From {stats.totalOrders} completed sales
          </div>
        </div>

        <div className="kpi-card" style={{ '--kpi-accent': '#6366f1' }}>
          <div className="kpi-title">Average Ticket (Ticket Médio)</div>
          <div className="kpi-value" style={{ color: '#818cf8' }}>
            {formatCurrency(stats.avgTicket, currencySymbol)}
          </div>
          <div className="kpi-subtitle">
            {stats.totalUnits} total units sold
          </div>
        </div>

        <div className="kpi-card" style={{ '--kpi-accent': '#f59e0b' }}>
          <div className="kpi-title">Top Selling Market</div>
          <div className="kpi-value" style={{ fontSize: '1.25rem', color: '#fbbf24', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {stats.topMarket ? stats.topMarket.name : 'None'}
          </div>
          <div className="kpi-subtitle">
            {stats.topMarket ? `${formatCurrency(stats.topMarket.revenue, currencySymbol)} in sales` : 'No sales yet'}
          </div>
        </div>

        <div className="kpi-card" style={{ '--kpi-accent': '#ec4899' }}>
          <div className="kpi-title">Top Selling Product</div>
          <div className="kpi-value" style={{ fontSize: '1.25rem', color: '#f472b6', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {stats.topProduct ? stats.topProduct.name : 'None'}
          </div>
          <div className="kpi-subtitle">
            {stats.topProduct ? `${stats.topProduct.units} units (${formatCurrency(stats.topProduct.revenue, currencySymbol)})` : 'No sales yet'}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Chart 1: Income Trend */}
        <div className="chart-card">
          <div className="chart-card-title">
            <TrendingUp size={18} color="var(--primary)" />
            <span>Income Trend Over Time</span>
          </div>
          <div style={{ height: '260px' }}>
            {timelineChartData.labels.length > 0 ? (
              <Line data={timelineChartData} options={chartOptions} />
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No sales recorded in this period
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Sales by Market */}
        <div className="chart-card">
          <div className="chart-card-title">
            <MapPin size={18} color="#6366f1" />
            <span>Sales by Market (Where I Sold the Most)</span>
          </div>
          <div style={{ height: '260px' }}>
            {marketChartData.labels.length > 0 ? (
              <Bar data={marketChartData} options={chartOptions} />
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No market data available
              </div>
            )}
          </div>
        </div>

        {/* Chart 3: Top Products Sold */}
        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div className="chart-card-title" style={{ marginBottom: 0 }}>
              <Package size={18} color="#f59e0b" />
              <span>Top Products (What I Sold the Most)</span>
            </div>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                className={`btn btn-secondary ${metricMode === 'revenue' ? 'active' : ''}`}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                onClick={() => setMetricMode('revenue')}
              >
                By Revenue
              </button>
              <button
                className={`btn btn-secondary ${metricMode === 'units' ? 'active' : ''}`}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                onClick={() => setMetricMode('units')}
              >
                By Units
              </button>
            </div>
          </div>
          <div style={{ height: '260px' }}>
            {productChartData.labels.length > 0 ? (
              <Bar data={productChartData} options={horizontalBarOptions} />
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No product data available
              </div>
            )}
          </div>
        </div>

        {/* Chart 4: Sales by Category */}
        <div className="chart-card">
          <div className="chart-card-title">
            <PieIcon size={18} color="#ec4899" />
            <span>Category Revenue Distribution</span>
          </div>
          <div style={{ height: '260px' }}>
            {categoryChartData.labels.length > 0 ? (
              <Doughnut data={categoryChartData} options={doughnutOptions} />
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No category data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Market Performance Table */}
      <div className="pos-card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={18} color="var(--primary)" />
          <span>Market Location Performance Summary</span>
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Market / Location</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Total Orders</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Units Sold</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Total Income</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Avg Order</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.marketMap)
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .map(([marketName, data]) => (
                  <tr key={marketName} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MapPin size={14} color="var(--primary)" />
                        {marketName}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                      {data.orders}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                      {data.units}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                      {formatCurrency(data.revenue, currencySymbol)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {formatCurrency(data.orders > 0 ? data.revenue / data.orders : 0, currencySymbol)}
                    </td>
                  </tr>
                ))}

              {Object.keys(stats.marketMap).length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No sales recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
