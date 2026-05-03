'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart, Search, Eye, Printer, X, Package } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';

interface Sale {
  id: string;
  receiptNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  saleType: string;
  amountPaid: number;
  customerName: string | null;
  customerPhone: string | null;
  saleStatus: string;
  isPaid: boolean;
  isInstallment: boolean;
  installmentPaid: number | null;
  installmentDue: number | null;
  createdAt: string;
  cashier: { name: string };
  items: { id: string; product: { name: string }; quantity: number; unitPrice: number; total: number }[];
}

export default function SalesPage() {
  const { shop } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  useEffect(() => { fetchSales(); }, [shop]);

  async function fetchSales() {
    try {
      const res = await fetch('/api/sales', {
        headers: { 'x-shop-id': shop?.id || '' }
      });
      const data = await res.json();
      setSales(data.sales || []);
    } catch (error) {
      console.error('Failed to fetch sales:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredSales = sales.filter(s => 
    !search || 
    s.receiptNumber.toLowerCase().includes(search.toLowerCase()) ||
    s.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    s.customerPhone?.includes(search)
  );

  const totalSales = filteredSales.reduce((sum, s) => sum + s.total, 0);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Sales History</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>View all completed sales</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              className="input"
              placeholder="Search by receipt, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '34px', padding: '0.5rem', fontSize: '0.85rem' }}
            />
          </div>
          <div style={{ padding: '0.5rem 1rem', background: '#22c55e20', borderRadius: '0.5rem' }}>
            <span style={{ color: '#22c55e', fontWeight: '600' }}>Total: {formatCurrency(totalSales)}</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table className="table" style={{ fontSize: '0.8rem', width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1e293b' }}>
              <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>RECEIPT</th>
              <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>DATE</th>
              <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>CUSTOMER</th>
              <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>ITEMS</th>
              <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>TOTAL</th>
              <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>STATUS</th>
              <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid #334155', color: '#94a3b8', fontWeight: '600', fontSize: '0.7rem' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map((sale, index) => (
              <tr key={sale.id} style={{ background: index % 2 === 0 ? '#1e293b' : '#0f172a' }}>
                <td style={{ padding: '0.5rem' }}>
                  <div style={{ fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem' }}>{sale.receiptNumber}</div>
                </td>
                <td style={{ padding: '0.5rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                  {formatDate(sale.createdAt)}
                </td>
                <td style={{ padding: '0.5rem' }}>
                  <div style={{ color: '#f1f5f9', fontSize: '0.75rem' }}>{sale.customerName || '-'}</div>
                  {sale.customerPhone && <div style={{ color: '#64748b', fontSize: '0.7rem' }}>{sale.customerPhone}</div>}
                </td>
                <td style={{ padding: '0.5rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                  {sale.items.length} item(s)
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', color: '#22c55e', fontSize: '0.75rem' }}>
                  {formatCurrency(sale.total)}
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                  <span style={{ 
                    padding: '0.2rem 0.5rem', 
                    background: sale.saleStatus === 'COMPLETE' ? '#22c55e20' : '#f59e0b20', 
                    color: sale.saleStatus === 'COMPLETE' ? '#22c55e' : '#f59e0b', 
                    borderRadius: '0.25rem', 
                    fontSize: '0.65rem', 
                    fontWeight: '600' 
                  }}>
                    {sale.saleStatus === 'COMPLETE' ? 'Complete' : 'Installment'}
                  </span>
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                  <button 
                    onClick={() => setSelectedSale(sale)} 
                    className="btn btn-secondary"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                  >
                    <Eye size={14} /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredSales.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            <ShoppingCart size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>No sales found</p>
          </div>
        )}
      </div>

      {selectedSale && (
        <div className="modal-overlay" onClick={() => setSelectedSale(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Sale Receipt</h2>
              <button onClick={() => setSelectedSale(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#94a3b8' }}>Receipt:</span>
                <span style={{ fontWeight: '600' }}>{selectedSale.receiptNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#94a3b8' }}>Date:</span>
                <span>{formatDate(selectedSale.createdAt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#94a3b8' }}>Cashier:</span>
                <span>{selectedSale.cashier.name}</span>
              </div>
              {selectedSale.customerName && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#94a3b8' }}>Customer:</span>
                  <span>{selectedSale.customerName}</span>
                </div>
              )}
              {selectedSale.customerPhone && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#94a3b8' }}>Phone:</span>
                  <span>{selectedSale.customerPhone}</span>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Items</h3>
              {selectedSale.items.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #334155' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem' }}>{item.product.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.quantity} x {formatCurrency(item.unitPrice)}</div>
                  </div>
                  <div style={{ fontWeight: '600' }}>{formatCurrency(item.total)}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#94a3b8' }}>Subtotal:</span>
                <span>{formatCurrency(selectedSale.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#94a3b8' }}>Discount:</span>
                <span>-{formatCurrency(selectedSale.discount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid #334155', fontWeight: '600', fontSize: '1.1rem' }}>
                <span>Total:</span>
                <span style={{ color: '#22c55e' }}>{formatCurrency(selectedSale.total)}</span>
              </div>
              {selectedSale.isInstallment && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', color: '#f59e0b' }}>
                    <span>Paid:</span>
                    <span>{formatCurrency(selectedSale.installmentPaid || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                    <span>Due:</span>
                    <span>{formatCurrency(selectedSale.installmentDue || 0)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
