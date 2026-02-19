'use client';

import { useEffect, useState } from 'react';
import { ClipboardCheck, Plus, Play, Pause, CheckCircle, XCircle, Search, Package, AlertTriangle, RotateCcw } from 'lucide-react';

interface StockCount {
  id: string;
  countNumber: string;
  status: string;
  notes: string | null;
  startedAt: string;
  completedAt: string | null;
  itemCount: number;
  varianceCount: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  stockQuantity: number;
}

export default function StockCountPage() {
  const [stockCounts, setStockCounts] = useState<StockCount[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCountModal, setShowCountModal] = useState(false);
  const [activeCount, setActiveCount] = useState<StockCount | null>(null);
  const [countedItems, setCountedItems] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({ notes: '' });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [countsRes, productsRes] = await Promise.all([
        fetch('/api/stock-counts'),
        fetch('/api/inventory')
      ]);
      const countsData = await countsRes.json();
      const productsData = await productsRes.json();
      setStockCounts(countsData.stockCounts || []);
      setProducts(productsData.products || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function startCount() {
    const countNumber = 'SC' + Date.now().toString(36).toUpperCase();
    const newCount: StockCount = {
      id: Date.now().toString(),
      countNumber,
      status: 'IN_PROGRESS',
      notes: formData.notes,
      startedAt: new Date().toISOString(),
      completedAt: null,
      itemCount: products.length,
      varianceCount: 0
    };
    setStockCounts([newCount, ...stockCounts]);
    setActiveCount(newCount);
    setCountedItems({});
    setShowModal(false);
    setShowCountModal(true);
  }

  function updateCount(productId: string, qty: number) {
    setCountedItems(prev => ({ ...prev, [productId]: qty }));
  }

  function completeCount() {
    if (!activeCount) return;
    
    let varianceCount = 0;
    products.forEach(p => {
      const counted = countedItems[p.id] ?? p.stockQuantity;
      if (counted !== p.stockQuantity) varianceCount++;
    });

    const updated = stockCounts.map(sc => 
      sc.id === activeCount.id 
        ? { ...sc, status: 'COMPLETED' as const, completedAt: new Date().toISOString(), varianceCount }
        : sc
    );
    setStockCounts(updated);
    setActiveCount(null);
    setCountedItems({});
    setShowCountModal(false);
  }

  function cancelCount() {
    setActiveCount(null);
    setCountedItems({});
    setShowCountModal(false);
  }

  const inProgress = stockCounts.find(sc => sc.status === 'IN_PROGRESS');
  const completed = stockCounts.filter(sc => sc.status === 'COMPLETED');

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Stock Count / Audit</h1>
          <p style={{ color: '#64748b' }}>Perform inventory audits and reconcile stock</p>
        </div>
        {!inProgress && (
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus size={18} /> Start Stock Count
          </button>
        )}
      </div>

      {inProgress && (
        <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid #3b82f6', background: '#eff6ff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RotateCcw size={20} color="#3b82f6" />
                Stock Count In Progress
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{inProgress.countNumber}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => { setActiveCount(inProgress); setShowCountModal(true); }} className="btn btn-primary">
                Continue
              </button>
              <button onClick={cancelCount} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid-cols-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClipboardCheck size={20} color="#3b82f6" />
            <div>
              <div className="stat-value">{stockCounts.length}</div>
              <div className="stat-label">Total Counts</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={20} color="#22c55e" />
            <div>
              <div className="stat-value">{completed.length}</div>
              <div className="stat-label">Completed</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} color="#f59e0b" />
            <div>
              <div className="stat-value">{completed.reduce((sum, sc) => sum + sc.varianceCount, 0)}</div>
              <div className="stat-label">Total Variances</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ fontWeight: '600' }}>Stock Count History</h3>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Count #</th>
              <th>Status</th>
              <th>Started</th>
              <th>Completed</th>
              <th>Items</th>
              <th>Variances</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {stockCounts.map(sc => (
              <tr key={sc.id}>
                <td style={{ fontWeight: '600' }}>{sc.countNumber}</td>
                <td>
                  {sc.status === 'IN_PROGRESS' ? (
                    <span className="badge badge-info">In Progress</span>
                  ) : sc.status === 'COMPLETED' ? (
                    <span className="badge badge-success">Completed</span>
                  ) : (
                    <span className="badge badge-danger">Cancelled</span>
                  )}
                </td>
                <td>{new Date(sc.startedAt).toLocaleDateString()}</td>
                <td>{sc.completedAt ? new Date(sc.completedAt).toLocaleDateString() : '-'}</td>
                <td>{sc.itemCount}</td>
                <td>
                  <span style={{ fontWeight: '600', color: sc.varianceCount > 0 ? '#f59e0b' : '#22c55e' }}>
                    {sc.varianceCount}
                  </span>
                </td>
                <td>{sc.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {stockCounts.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <ClipboardCheck size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>No stock counts performed yet.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Start Stock Count</h2>
            <p style={{ marginBottom: '1rem', color: '#64748b' }}>
              This will count all {products.length} products in inventory. You'll be able to enter counted quantities and identify variances.
            </p>
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="label">Notes (optional)</label>
              <textarea className="input" rows={3} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Reason for stock count..." />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={startCount} className="btn btn-primary">
                <Play size={16} /> Start Count
              </button>
            </div>
          </div>
        </div>
      )}

      {showCountModal && activeCount && (
        <div className="modal-overlay" onClick={cancelCount}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{activeCount.countNumber}</h2>
              <button onClick={cancelCount} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><XCircle size={20} /></button>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                className="input"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div style={{ maxHeight: '400px', overflow: 'auto', marginBottom: '1rem' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>System Qty</th>
                    <th>Counted Qty</th>
                    <th>Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())).map(product => {
                    const counted = countedItems[product.id] ?? product.stockQuantity;
                    const variance = counted - product.stockQuantity;
                    return (
                      <tr key={product.id} style={{ background: variance !== 0 ? '#fef3c7' : undefined }}>
                        <td>{product.name}</td>
                        <td>{product.sku}</td>
                        <td>{product.stockQuantity}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={counted}
                            onChange={(e) => updateCount(product.id, parseInt(e.target.value) || 0)}
                            style={{ width: '80px', padding: '0.25rem', border: '1px solid #e2e8f0', borderRadius: '0.25rem' }}
                          />
                        </td>
                        <td style={{ fontWeight: '600', color: variance > 0 ? '#22c55e' : variance < 0 ? '#ef4444' : '#64748b' }}>
                          {variance > 0 ? '+' : ''}{variance}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={cancelCount} className="btn btn-secondary">Cancel</button>
              <button onClick={completeCount} className="btn btn-success">
                <CheckCircle size={16} /> Complete Count
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
