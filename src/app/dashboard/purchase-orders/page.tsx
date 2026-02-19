'use client';

import { useEffect, useState } from 'react';
import { FileText, Plus, Eye, X, Truck, CheckCircle, Clock, Package, DollarSign, Calendar, Search, UserPlus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContext';

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierName: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  expectedDelivery: string | null;
  createdAt: string;
  items: any[];
}

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  purchaseCost: number;
  stockQuantity: number;
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [search, setSearch] = useState('');
  const { settings } = useSettings();
  const formatCurr = (amount: number) => formatCurrency(amount, settings.currency);

  const [formData, setFormData] = useState({
    supplierId: '',
    expectedDelivery: '',
    items: [] as any[]
  });

  const [newSupplier, setNewSupplier] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [ordersRes, suppliersRes, productsRes] = await Promise.all([
        fetch('/api/purchase-orders'),
        fetch('/api/suppliers'),
        fetch('/api/inventory')
      ]);
      const ordersData = await ordersRes.json();
      const suppliersData = await suppliersRes.json();
      const productsData = await productsRes.json();
      setOrders(ordersData.orders || []);
      setSuppliers(suppliersData.suppliers || []);
      setProducts(productsData.products || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  function addItem() {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', quantity: 1, unitCost: 0 }]
    });
  }

  function updateItem(index: number, field: string, value: any) {
    const items = [...formData.items];
    items[index] = { ...items[index], [field]: value };
    
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        items[index].unitCost = product.purchaseCost;
        items[index].productName = product.name;
      }
    }
    
    setFormData({ ...formData, items });
  }

  function removeItem(index: number) {
    const items = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items });
  }

  async function handleCreateSupplier() {
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSupplier)
      });
      if (res.ok) {
        const data = await res.json();
        setSuppliers([...suppliers, data.supplier]);
        setFormData({ ...formData, supplierId: data.supplier.id });
        setShowAddSupplier(false);
        setNewSupplier({ name: '', email: '', phone: '', address: '' });
      }
    } catch (error) {
      console.error('Failed to create supplier:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.supplierId || formData.items.length === 0) {
      alert('Please select a supplier and add at least one item');
      return;
    }

    try {
      const supplier = suppliers.find(s => s.id === formData.supplierId);
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: formData.supplierId,
          supplierName: supplier?.name,
          expectedDelivery: formData.expectedDelivery || null,
          items: formData.items
        })
      });
      if (res.ok) {
        setShowModal(false);
        setFormData({ supplierId: '', expectedDelivery: '', items: [] });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to create order:', error);
    }
  }

  async function updateOrderStatus(orderId: string, status: string) {
    try {
      await fetch('/api/purchase-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status })
      });
      fetchData();
    } catch (error) {
      console.error('Failed to update order:', error);
    }
  }

  async function deleteOrder(orderId: string) {
    if (!confirm('Are you sure you want to delete this order?')) return;
    try {
      await fetch(`/api/purchase-orders?id=${orderId}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Failed to delete order:', error);
    }
  }

  const filteredOrders = orders.filter(o => 
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.supplierName.toLowerCase().includes(search.toLowerCase())
  );

  const pendingOrders = filteredOrders.filter(o => o.status === 'PENDING');
  const orderedOrders = filteredOrders.filter(o => o.status === 'ORDERED');
  const receivedOrders = filteredOrders.filter(o => o.status === 'RECEIVED');

  function getStatusBadge(status: string) {
    switch (status) {
      case 'PENDING': return <span className="badge badge-warning">Pending</span>;
      case 'ORDERED': return <span className="badge badge-info">Ordered</span>;
      case 'RECEIVED': return <span className="badge badge-success">Received</span>;
      case 'CANCELLED': return <span className="badge badge-danger">Cancelled</span>;
      default: return <span>{status}</span>;
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Purchase Orders</h1>
          <p style={{ color: '#64748b' }}>Manage supplier orders and restocking</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={18} /> New Order
        </button>
      </div>

      <div className="grid-cols-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={20} color="#f59e0b" />
            <div>
              <div className="stat-value">{pendingOrders.length}</div>
              <div className="stat-label">Pending</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Truck size={20} color="#3b82f6" />
            <div>
              <div className="stat-value">{orderedOrders.length}</div>
              <div className="stat-label">Ordered</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={20} color="#22c55e" />
            <div>
              <div className="stat-value">{receivedOrders.length}</div>
              <div className="stat-label">Received</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={20} color="#8b5cf6" />
            <div>
              <div className="stat-value">{formatCurr(filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0))}</div>
              <div className="stat-label">Total Value</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            className="input"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Supplier</th>
              <th>Status</th>
              <th>Expected</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => (
              <tr key={order.id}>
                <td style={{ fontWeight: '600' }}>{order.orderNumber}</td>
                <td>{order.supplierName}</td>
                <td>{getStatusBadge(order.status)}</td>
                <td>{order.expectedDelivery ? new Date(order.expectedDelivery).toLocaleDateString() : '-'}</td>
                <td>{formatCurr(order.totalAmount)}</td>
                <td>{formatCurr(order.paidAmount)}</td>
                <td style={{ fontWeight: '600', color: order.totalAmount - order.paidAmount > 0 ? '#ef4444' : '#22c55e' }}>
                  {formatCurr(order.totalAmount - order.paidAmount)}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button onClick={() => setSelectedOrder(order)} className="btn btn-secondary" style={{ padding: '0.25rem' }} title="View Details">
                      <Eye size={14} />
                    </button>
                    {order.status === 'PENDING' && (
                      <button onClick={() => updateOrderStatus(order.id, 'ORDERED')} className="btn btn-primary" style={{ padding: '0.25rem' }} title="Mark as Ordered">
                        <Truck size={14} />
                      </button>
                    )}
                    {order.status === 'ORDERED' && (
                      <button onClick={() => updateOrderStatus(order.id, 'RECEIVED')} className="btn btn-success" style={{ padding: '0.25rem', background: '#22c55e' }} title="Mark as Received">
                        <CheckCircle size={14} />
                      </button>
                    )}
                    {order.status !== 'RECEIVED' && order.status !== 'CANCELLED' && (
                      <button onClick={() => updateOrderStatus(order.id, 'CANCELLED')} className="btn btn-danger" style={{ padding: '0.25rem' }} title="Cancel Order">
                        <X size={14} />
                      </button>
                    )}
                    {order.status === 'PENDING' && (
                      <button onClick={() => deleteOrder(order.id)} className="btn btn-danger" style={{ padding: '0.25rem' }} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredOrders.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p>No purchase orders found.</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Create Purchase Order</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {suppliers.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                <Package size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>No suppliers found. Please add a supplier first.</p>
                <button onClick={() => { setShowModal(false); window.location.href = '/dashboard/suppliers'; }} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  Go to Suppliers
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="label">Supplier *</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <select 
                        className="select" 
                        style={{ flex: 1 }}
                        value={formData.supplierId} 
                        onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                        required
                      >
                        <option value="">Select Supplier</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => setShowAddSupplier(true)} className="btn btn-secondary" title="Add Supplier">
                        <UserPlus size={18} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="label">Expected Delivery</label>
                    <input 
                      type="date" 
                      className="input" 
                      value={formData.expectedDelivery}
                      onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className="label" style={{ margin: 0 }}>Order Items *</label>
                    <button type="button" onClick={addItem} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                      <Plus size={14} /> Add Item
                    </button>
                  </div>
                  
                  {formData.items.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '0.5rem' }}>
                      Click "Add Item" to add products
                    </div>
                  ) : (
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Qty</th>
                            <th>Unit Cost</th>
                            <th>Total</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.items.map((item, index) => (
                            <tr key={index}>
                              <td>
                                <select 
                                  className="select" 
                                  style={{ width: '100%' }}
                                  value={item.productId}
                                  onChange={(e) => updateItem(index, 'productId', e.target.value)}
                                >
                                  <option value="">Select</option>
                                  {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input 
                                  type="number" 
                                  className="input" 
                                  style={{ width: '70px' }}
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                />
                              </td>
                              <td>
                                <input 
                                  type="number" 
                                  className="input" 
                                  style={{ width: '100px' }}
                                  step="0.01"
                                  value={item.unitCost}
                                  onChange={(e) => updateItem(index, 'unitCost', parseFloat(e.target.value) || 0)}
                                />
                              </td>
                              <td style={{ fontWeight: '600' }}>{formatCurr(item.quantity * item.unitCost)}</td>
                              <td>
                                <button type="button" onClick={() => removeItem(index)} className="btn btn-danger" style={{ padding: '0.25rem' }}>
                                  <X size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                  <span style={{ fontWeight: '600' }}>Total:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#3b82f6' }}>
                    {formatCurr(formData.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0))}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">Create Order</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showAddSupplier && (
        <div className="modal-overlay" onClick={() => setShowAddSupplier(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Add New Supplier</h2>
              <button onClick={() => setShowAddSupplier(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="label">Name *</label>
                <input type="text" className="input" value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={newSupplier.email} onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input type="text" className="input" value={newSupplier.phone} onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">Address</label>
                <input type="text" className="input" value={newSupplier.address} onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddSupplier(false)} className="btn btn-secondary">Cancel</button>
                <button type="button" onClick={handleCreateSupplier} className="btn btn-primary">Add Supplier</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Order Details</h2>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <p><strong>Order #:</strong> {selectedOrder.orderNumber}</p>
              <p><strong>Supplier:</strong> {selectedOrder.supplierName}</p>
              <p><strong>Status:</strong> {getStatusBadge(selectedOrder.status)}</p>
              <p><strong>Created:</strong> {new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Items</h3>
              {selectedOrder.items?.length > 0 ? (
                <table className="table">
                  <thead><tr><th>Product</th><th>Qty</th><th>Cost</th><th>Total</th></tr></thead>
                  <tbody>
                    {selectedOrder.items.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td>{item.productName}</td>
                        <td>{item.quantityOrdered}</td>
                        <td>{formatCurr(item.unitCost)}</td>
                        <td>{formatCurr(item.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: '#64748b' }}>No items</p>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedOrder(null)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
