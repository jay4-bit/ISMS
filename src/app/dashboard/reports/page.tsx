'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'sales' | 'returns' | 'inventory'>('sales');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => { fetchReport(); }, [reportType, dateRange.startDate, dateRange.endDate]);

  async function fetchReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: reportType });
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      const res = await fetch(`/api/reports?${params}`);
      const data = await res.json();
      setReportData(data.report);
    } catch (error) { console.error('Failed to fetch report:', error); }
    finally { setLoading(false); }
  }

  function exportToExcel() {
    if (!reportData) return;
    let csv = '';
    if (reportType === 'sales') {
      csv = 'Date,Receipt #,Items,Subtotal,Discount,Total,Payment Method\n';
      reportData.sales?.forEach((sale: any) => {
        const itemCount = sale.items.reduce((sum: number, i: any) => sum + i.quantity, 0);
        csv += `"${formatDate(sale.createdAt)}","${sale.receiptNumber}",${itemCount},${sale.subtotal},${sale.discount},${sale.total},${sale.paymentMethod}\n`;
      });
    } else if (reportType === 'returns') {
      csv = 'Date,Return #,Reason,Items,Total Refund\n';
      reportData.returns?.forEach((ret: any) => {
        const itemCount = ret.items.length;
        const totalRefund = ret.items.reduce((sum: number, i: any) => sum + i.refundAmount, 0);
        csv += `"${formatDate(ret.createdAt)}","${ret.returnNumber}","${ret.reason}",${itemCount},${totalRefund}\n`;
      });
    } else if (reportType === 'inventory') {
      csv = 'Product,SKU,Category,Stock,Cost,Price,Value\n';
      reportData.products?.forEach((p: any) => { csv += `"${p.name}","${p.sku}","${p.category?.name}",${p.stockQuantity},${p.purchaseCost},${p.sellingPrice},${p.sellingPrice * p.stockQuantity}\n`; });
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`; a.click();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div><h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Reports & Analytics</h1><p style={{ color: '#64748b' }}>Financial insights and business performance</p></div>
        <button onClick={exportToExcel} className="btn btn-secondary" disabled={!reportData}><Download size={18} /> Export CSV</button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div><label className="label">Report Type</label><select className="select" style={{ width: '200px' }} value={reportType} onChange={(e) => setReportType(e.target.value as any)}><option value="sales">Sales Report</option><option value="returns">Returns Report</option><option value="inventory">Inventory Report</option></select></div>
          <div><label className="label">Start Date</label><input type="date" className="input" style={{ width: '180px' }} value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} /></div>
          <div><label className="label">End Date</label><input type="date" className="input" style={{ width: '180px' }} value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} /></div>
        </div>
      </div>

      {loading ? <div style={{ padding: '3rem', textAlign: 'center' }}>Loading report...</div> : reportType === 'sales' && reportData ? (
        <div>
          <div className="grid-cols-4" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card"><div className="stat-value">{formatCurrency(reportData.totalRevenue || 0)}</div><div className="stat-label">Total Revenue</div></div>
            <div className="stat-card"><div className="stat-value" style={{ color: '#22c55e' }}>{formatCurrency(reportData.totalProfit || 0)}</div><div className="stat-label">Total Profit</div></div>
            <div className="stat-card"><div className="stat-value">{reportData.itemsSold || 0}</div><div className="stat-label">Items Sold</div></div>
            <div className="stat-card"><div className="stat-value">{reportData.sales?.length || 0}</div><div className="stat-label">Total Transactions</div></div>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead><tr><th>Date</th><th>Receipt #</th><th>Items</th><th>Subtotal</th><th>Discount</th><th>Total</th><th>Profit</th><th>Payment</th></tr></thead>
              <tbody>{reportData.sales?.slice(0, 50).map((sale: any) => { const profit = sale.items.reduce((sum: number, i: any) => sum + (i.unitPrice - i.product.purchaseCost) * i.quantity, 0); return (<tr key={sale.id}><td>{formatDate(sale.createdAt)}</td><td style={{ fontWeight: '600' }}>{sale.receiptNumber}</td><td>{sale.items.reduce((s: number, i: any) => s + i.quantity, 0)}</td><td>{formatCurrency(sale.subtotal)}</td><td style={{ color: '#ef4444' }}>-{formatCurrency(sale.discount)}</td><td style={{ fontWeight: '600' }}>{formatCurrency(sale.total)}</td><td style={{ color: '#22c55e' }}>{formatCurrency(profit)}</td><td><span className="badge badge-info">{sale.paymentMethod}</span></td></tr>); })}</tbody>
            </table>
          </div>
        </div>
      ) : reportType === 'returns' && reportData ? (
        <div>
          <div className="grid-cols-2" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card"><div className="stat-value">{reportData.returns?.length || 0}</div><div className="stat-label">Total Returns</div></div>
            <div className="stat-card"><div className="stat-value" style={{ color: '#ef4444' }}>{formatCurrency(reportData.totalRefunds || 0)}</div><div className="stat-label">Total Refunds</div></div>
          </div>
          <div className="card"><h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Loss from Faulty Items</h3><div style={{ fontSize: '2rem', fontWeight: '700', color: '#ef4444' }}>{formatCurrency(reportData.faultyLoss || 0)}</div></div>
        </div>
      ) : reportType === 'inventory' && reportData ? (
        <div>
          <div className="grid-cols-3" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card"><div className="stat-value">{reportData.products?.length || 0}</div><div className="stat-label">Total Products</div></div>
            <div className="stat-card"><div className="stat-value">{formatCurrency(reportData.totalValue || 0)}</div><div className="stat-label">Total Stock Value</div></div>
            <div className="stat-card"><div className="stat-value" style={{ color: '#22c55e' }}>{formatCurrency(reportData.totalProfit || 0)}</div><div className="stat-label">Potential Profit</div></div>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Stock</th><th>Cost</th><th>Price</th><th>Value</th><th>Status</th></tr></thead>
              <tbody>{reportData.products?.map((product: any) => (<tr key={product.id}><td style={{ fontWeight: '500' }}>{product.name}</td><td>{product.sku}</td><td>{product.category?.name}</td><td style={{ color: product.stockQuantity <= product.lowStockThreshold ? '#f59e0b' : undefined }}>{product.stockQuantity}</td><td>{formatCurrency(product.purchaseCost)}</td><td>{formatCurrency(product.sellingPrice)}</td><td style={{ fontWeight: '600' }}>{formatCurrency(product.sellingPrice * product.stockQuantity)}</td><td>{product.isFaulty ? <span className="badge badge-danger">Faulty</span> : product.stockQuantity <= product.lowStockThreshold ? <span className="badge badge-warning">Low Stock</span> : <span className="badge badge-success">OK</span>}</td></tr>))}</tbody>
            </table>
          </div>
        </div>
      ) : <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No data available.</div>}
    </div>
  );
}
