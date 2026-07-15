'use client';

import { useEffect, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'sales' | 'returns' | 'inventory'>('sales');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [search, setSearch] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const { shop } = useAuth();

  function exportToExcel() {
    if (!reportData) return;
    let csv = '';
    if (reportType === 'sales') {
      csv = 'Date,Receipt #,Product,IMEI,Qty,Subtotal,Discount,Total,Payment Method\n';
      reportData.sales?.forEach((sale: any) => {
        sale.items.forEach((item: any, i: number) => {
          const imei = item.product.electronicsFields?.imei || '';
          csv += i === 0
            ? `"${formatDate(sale.createdAt)}","${sale.receiptNumber}","${item.product.name}","${imei}",${item.quantity},${sale.subtotal},${sale.discount},${sale.total},${sale.paymentMethod}\n`
            : `"","","${item.product.name}","${imei}",${item.quantity},,,,\n`;
        });
      });
    } else if (reportType === 'returns') {
      csv = 'Date,Return #,Reason,Items,Total Refund\n';
      reportData.returns?.forEach((ret: any) => {
        const itemCount = ret.items.length;
        const totalRefund = ret.items.reduce((sum: number, i: any) => sum + i.refundAmount, 0);
        csv += `"${formatDate(ret.createdAt)}","${ret.returnNumber}","${ret.reason}",${itemCount},${totalRefund}\n`;
      });
    } else if (reportType === 'inventory') {
      csv = 'Product,Category,Stock,Cost,Price,Value\n';
      reportData.products?.forEach((p: any) => { csv += `"${p.name}","${p.category?.name}",${p.stockQuantity},${p.purchaseCost},${p.sellingPrice},${p.sellingPrice * p.stockQuantity}\n`; });
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`; a.click();
  }

  async function fetchReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: reportType });
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      if (search.trim()) params.append('search', search.trim());
      const res = await fetch(`/api/reports?${params}`, { headers: { 'x-shop-id': shop?.id || '' } });
      const data = await res.json();
      setReportData(data.report);
    } catch (error) { console.error('Failed to fetch report:', error); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchReport(); }, [reportType, dateRange.startDate, dateRange.endDate, search]);

  return (
    <div className="reports-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div><h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Reports & Analytics</h1><p style={{ color: 'var(--muted-foreground)' }}>Financial insights and business performance</p></div>
        <button onClick={exportToExcel} className="btn btn-secondary" disabled={!reportData}><Download size={18} /> Export CSV</button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div><label className="label">Report Type</label><select className="select" style={{ width: '200px' }} value={reportType} onChange={(e) => setReportType(e.target.value as any)}><option value="sales">Sales Report</option><option value="returns">Returns Report</option><option value="inventory">Inventory Report</option></select></div>
          <div style={{ flex: 1, minWidth: '200px' }}><label className="label">Search Product / Keyword</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
              <input type="text" className="input" placeholder="Search by product name..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ padding: '0.5rem', paddingLeft: '34px', width: '100%' }} />
            </div>
          </div>
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
          <div className="card table-responsive" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead><tr><th>Date</th><th>Receipt #</th><th>Products</th><th>IMEI</th><th>Qty</th><th>Subtotal</th><th>Discount</th><th>Total</th><th>Profit</th><th>Payment</th></tr></thead>
              <tbody>{reportData.sales?.slice(0, 50).map((sale: any) => { const profit = sale.items.reduce((sum: number, i: any) => sum + (i.unitPrice - i.product.purchaseCost) * i.quantity, 0); return (<tr key={sale.id}><td>{formatDate(sale.createdAt)}</td><td style={{ fontWeight: '600' }}>{sale.receiptNumber}</td><td style={{ maxWidth: '180px' }}>{sale.items.map((item: any, i: number) => (<div key={i} style={{ lineHeight: '1.4' }}>{item.product.name}</div>))}</td><td style={{ maxWidth: '120px' }}>{sale.items.map((item: any, i: number) => (<div key={i} style={{ lineHeight: '1.4' }}>{item.product.electronicsFields?.imei ? <span style={{ color: 'var(--warning)', fontFamily: 'monospace' }}>{item.product.electronicsFields.imei}</span> : '-'}</div>))}</td><td>{sale.items.reduce((s: number, i: any) => s + i.quantity, 0)}</td><td>{formatCurrency(sale.subtotal)}</td><td style={{ color: '#ef4444' }}>-{formatCurrency(sale.discount)}</td><td style={{ fontWeight: '600' }}>{formatCurrency(sale.total)}</td><td style={{ color: '#22c55e' }}>{formatCurrency(profit)}</td><td><span className="badge badge-info">{sale.paymentMethod}</span></td></tr>); })}</tbody>
            </table>
          </div>
        </div>
      ) : reportType === 'returns' && reportData ? (
        <div>
          <div className="grid-cols-2" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card"><div className="stat-value">{reportData.returns?.length || 0}</div><div className="stat-label">Total Returns</div></div>
            <div className="stat-card"><div className="stat-value" style={{ color: '#ef4444' }}>{formatCurrency(reportData.totalRefunds || 0)}</div><div className="stat-label">Total Refunds</div></div>
          </div>
          <div className="card"><h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>Loss from Faulty Items</h3><div style={{ fontWeight: '700', color: '#ef4444' }}>{formatCurrency(reportData.faultyLoss || 0)}</div></div>
        </div>
      ) : reportType === 'inventory' && reportData ? (
        <div>
          <div className="grid-cols-3" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card"><div className="stat-value">{reportData.products?.length || 0}</div><div className="stat-label">Total Products</div></div>
            <div className="stat-card"><div className="stat-value">{formatCurrency(reportData.totalValue || 0)}</div><div className="stat-label">Total Stock Value</div></div>
            <div className="stat-card"><div className="stat-value" style={{ color: '#22c55e' }}>{formatCurrency(reportData.totalProfit || 0)}</div><div className="stat-label">Potential Profit</div></div>
          </div>
          <div className="card table-responsive" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead><tr><th>Product</th><th>Category</th><th>Stock</th><th>Cost</th><th>Price</th><th>Value</th><th>Status</th></tr></thead>
              <tbody>{reportData.products?.map((product: any) => (<tr key={product.id}><td style={{ fontWeight: '500' }}>{product.name}</td><td>{product.category?.name}</td><td style={{ color: product.stockQuantity <= product.lowStockThreshold ? '#f59e0b' : undefined }}>{product.stockQuantity}</td><td>{formatCurrency(product.purchaseCost)}</td><td>{formatCurrency(product.sellingPrice)}</td><td style={{ fontWeight: '600' }}>{formatCurrency(product.sellingPrice * product.stockQuantity)}</td><td>{product.isFaulty ? <span className="badge badge-danger">Faulty</span> : product.stockQuantity <= product.lowStockThreshold ? <span className="badge badge-warning">Low Stock</span> : <span className="badge badge-success">OK</span>}</td></tr>))}</tbody>
            </table>
          </div>
        </div>
      ) : <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>No data available.</div>}
    </div>
  );
}
