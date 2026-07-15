'use client';

import { useEffect, useState } from 'react';
import { Package, Search, Truck, CheckCircle, Clock, XCircle, MapPin, Phone, Edit, RefreshCw, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';

interface Sale {
  id: string;
  receiptNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  amountPaid: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  orderStatus: string;
  shippingStatus: string;
  trackingNumber?: string;
  shippingCost: number;
  shippedAt?: string;
  deliveredAt?: string;
  notes?: string;
  createdAt: string;
  cashier: { name: string };
  items: { id: string; product: { name: string }; quantity: number; unitPrice: number; total: number }[];
}

const ORDER_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: '#f59e0b', icon: Clock },
  { value: 'CONFIRMED', label: 'Confirmed', color: '#3b82f6', icon: CheckCircle },
  { value: 'PROCESSING', label: 'Processing', color: '#8b5cf6', icon: Package },
  { value: 'SHIPPED', label: 'Shipped', color: '#06b6d4', icon: Truck },
  { value: 'DELIVERED', label: 'Delivered', color: '#22c55e', icon: CheckCircle },
  { value: 'CANCELLED', label: 'Cancelled', color: '#ef4444', icon: XCircle },
  { value: 'REFUNDED', label: 'Refunded', color: '#6b7280', icon: XCircle },
];

const SHIPPING_STATUSES = [
  { value: 'NOT_SHIPPED', label: 'Not Shipped', color: '#6b7280' },
  { value: 'PENDING', label: 'Shipment Pending', color: '#f59e0b' },
  { value: 'IN_TRANSIT', label: 'In Transit', color: '#3b82f6' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', color: '#8b5cf6' },
  { value: 'DELIVERED', label: 'Delivered', color: '#22c55e' },
  { value: 'FAILED', label: 'Delivery Failed', color: '#ef4444' },
];

export default function OrdersPage() {
  const { user: _user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showDetails, setShowDetails] = useState<Sale | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => { fetchSales(); const interval = setInterval(fetchSales, 30000); return () => clearInterval(interval); }, []);

  async function fetchSales() {
    try {
      const res = await fetch('/api/sales');
      const data = await res.json();
      setSales(data.sales || []);
    } catch (error) {
      console.error('Failed to fetch sales:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(saleId: string, orderStatus?: string, shippingStatus?: string, trackingNumber?: string, notes?: string) {
    setUpdating(true);
    try {
      const res = await fetch('/api/sales', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: saleId,
          action: 'updateStatus',
          orderStatus,
          shippingStatus,
          trackingNumber,
          notes
        })
      });
      
      if (res.ok) {
        fetchSales();
        setShowDetails(null);
      }
    } catch (error) {
      console.error('Failed to update:', error);
    } finally {
      setUpdating(false);
    }
  }

  const filteredSales = sales.filter(s => {
    const matchesSearch = !search || 
      s.receiptNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      s.customerPhone?.includes(search) ||
      s.trackingNumber?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
      s.orderStatus === filterStatus || 
      s.shippingStatus === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusInfo = (status: string, statuses: any[]) => {
    return statuses.find(s => s.value === status) || statuses[0];
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="orders-page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Order Management</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>Track and manage orders</p>
        </div>
        <button onClick={fetchSales} className="btn btn-secondary refresh-btn" style={{ padding: '0.4rem 0.75rem' }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-box" style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
            <input
              type="text"
              className="input"
              placeholder="Search by receipt, customer, phone, tracking..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '0.5rem', paddingLeft: '34px', fontSize: '0.85rem' }}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="select filter-tab"
            style={{ padding: '0.5rem', fontSize: '0.85rem' }}
          >
            <option value="all">All Statuses</option>
            <optgroup label="Order Status">
              {ORDER_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </optgroup>
            <optgroup label="Shipping Status">
              {SHIPPING_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      <div className="card table-responsive orders-table" style={{ padding: 0, overflow: 'auto' }}>
        <table className="table" style={{ fontSize: '0.8rem', width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--card)' }}>
              <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>RECEIPT</th>
              <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>DATE</th>
              <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>CUSTOMER</th>
              <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>TOTAL</th>
              <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>ORDER STATUS</th>
              <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>SHIPPING</th>
              <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: '600', fontSize: '0.7rem' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map((sale, index) => {
              const orderStatus = getStatusInfo(sale.orderStatus, ORDER_STATUSES);
              const shippingStatus = getStatusInfo(sale.shippingStatus, SHIPPING_STATUSES);
              
              return (
                <tr key={sale.id} style={{ background: index % 2 === 0 ? 'var(--card)' : 'var(--background)' }}>
                  <td style={{ padding: '0.5rem' }}>
                    <div style={{ fontWeight: '600', color: 'var(--foreground)', fontSize: '0.75rem' }}>{sale.receiptNumber}</div>
                  </td>
                  <td style={{ padding: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>
                    {formatDate(sale.createdAt)}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <div style={{ color: 'var(--foreground)', fontSize: '0.75rem' }}>{sale.customerName || '-'}</div>
                    {sale.customerPhone && <div style={{ color: 'var(--muted-foreground)', fontSize: '0.7rem' }}>{sale.customerPhone}</div>}
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', color: '#22c55e', fontSize: '0.75rem' }}>
                    {formatCurrency(sale.total)}
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '0.2rem 0.5rem', 
                      background: `${orderStatus.color}20`, 
                      color: orderStatus.color, 
                      borderRadius: '0.25rem', 
                      fontSize: '0.65rem', 
                      fontWeight: '600' 
                    }}>
                      {orderStatus.label}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '0.2rem 0.5rem', 
                      background: `${shippingStatus.color}20`, 
                      color: shippingStatus.color, 
                      borderRadius: '0.25rem', 
                      fontSize: '0.65rem', 
                      fontWeight: '600' 
                    }}>
                      {shippingStatus.label}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <button 
                      onClick={() => setShowDetails(sale)} 
                      className="edit-btn" 
                      style={{ padding: '0.3rem 0.5rem', background: '#3b82f6', border: 'none', borderRadius: '0.25rem', color: 'white', cursor: 'pointer', fontSize: '0.7rem' }}
                    >
                      <Edit size={12} /> Manage
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredSales.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            <Package size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>No orders found</p>
          </div>
        )}
      </div>

      {showDetails && (
        <div className="modal-overlay" onClick={() => setShowDetails(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Order Details</h2>
              <button onClick={() => setShowDetails(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem' }}>
              <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{showDetails.receiptNumber}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Created: {formatDate(showDetails.createdAt)}</div>
              {showDetails.trackingNumber && (
                <div style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                  Tracking: <span style={{ color: '#3b82f6' }}>{showDetails.trackingNumber}</span>
                </div>
              )}
            </div>

            {showDetails.customerName && (
              <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem' }}>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Customer Information</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>{showDetails.customerName}</div>
                {showDetails.customerPhone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                    <Phone size={14} /> {showDetails.customerPhone}
                  </div>
                )}
                {showDetails.customerAddress && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                    <MapPin size={14} /> {showDetails.customerAddress}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Order Status</label>
              <select 
                className="select"
                value={showDetails.orderStatus}
                onChange={(e) => setShowDetails({ ...showDetails, orderStatus: e.target.value })}
                style={{ width: '100%' }}
              >
                {ORDER_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Shipping Status</label>
              <select 
                className="select"
                value={showDetails.shippingStatus}
                onChange={(e) => setShowDetails({ ...showDetails, shippingStatus: e.target.value })}
                style={{ width: '100%' }}
              >
                {SHIPPING_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Tracking Number</label>
              <input
                type="text"
                className="input"
                value={showDetails.trackingNumber || ''}
                onChange={(e) => setShowDetails({ ...showDetails, trackingNumber: e.target.value })}
                placeholder="Enter tracking number"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Notes</label>
              <textarea
                className="input"
                value={showDetails.notes || ''}
                onChange={(e) => setShowDetails({ ...showDetails, notes: e.target.value })}
                placeholder="Add notes..."
                rows={3}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem' }}>
              <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Order Items</div>
              {showDetails.items.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--muted-foreground)', padding: '0.25rem 0' }}>
                  <span>{item.product.name} x {item.quantity}</span>
                  <span>{formatCurrency(item.total)}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #334155', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                <span>Total</span>
                <span style={{ color: '#22c55e' }}>{formatCurrency(showDetails.total)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDetails(null)} className="btn btn-secondary">Cancel</button>
              <button 
                onClick={() => updateStatus(
                  showDetails.id, 
                  showDetails.orderStatus, 
                  showDetails.shippingStatus, 
                  showDetails.trackingNumber,
                  showDetails.notes
                )} 
                className="btn btn-primary"
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Update Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
