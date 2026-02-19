'use client';

import { useEffect, useState } from 'react';
import { Undo2, Plus, X, AlertTriangle, RefreshCw, DollarSign, Wrench, FileText, Package, ArrowUpDown, Eye, Pencil, Trash2, CheckCircle } from 'lucide-react';
import { formatCurrency, formatDate, getCurrencySymbol } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContext';

interface Product {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  stockQuantity: number;
  supplier?: { id: string; name: string };
}

interface Supplier {
  id: string;
  name: string;
}

interface ReturnItem {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  reason: string;
  status: string;
  refundAmount: number;
  supplierId?: string;
  supplierName?: string;
  awardedType: string;
  awardedAmount: number;
  repairCost: number;
  replacementProductId?: string;
  replacementProductName?: string;
  replacementProductPrice?: number;
  originalProductValue?: number;
  priceDifference?: number;
  differencePaidBy?: string;
  notes?: string;
}

interface ReturnRecord {
  id: string;
  returnNumber: string;
  reason: string;
  createdAt: string;
  items: ReturnItem[];
}

export default function ReturnsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRecord | null>(null);
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { settings } = useSettings();

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [productsRes, returnsRes, suppliersRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/returns'),
        fetch('/api/suppliers')
      ]);
      const productsData = await productsRes.json();
      const returnsData = await returnsRes.json();
      const suppliersData = await suppliersRes.json();
      setProducts(productsData.products || []);
      setReturns(returnsData.returns || []);
      setSuppliers(suppliersData.suppliers || []);
    } catch (error) { console.error('Failed to fetch data:', error); }
    finally { setLoading(false); }
  }

  function addReturnItem(product: Product) {
    if (returnItems.find(item => item.productId === product.id)) return;
    setReturnItems([...returnItems, { 
      productId: product.id, 
      product, 
      quantity: 1, 
      reason: '', 
      status: 'PENDING', 
      refundAmount: product.sellingPrice,
      supplierId: product.supplier?.id || '',
      supplierName: product.supplier?.name || '',
      awardedType: 'REFUND',
      awardedAmount: product.sellingPrice,
      repairCost: 0,
      replacementProductId: '',
      replacementProductName: '',
      replacementProductPrice: 0,
      originalProductValue: product.sellingPrice,
      priceDifference: 0,
      differencePaidBy: 'CLIENT',
      notes: ''
    }]);
  }

  function updateReturnItem(productId: string, field: string, value: any) {
    setReturnItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const updated = { ...item, [field]: value };
        
        if (field === 'quantity') {
          updated.refundAmount = updated.product.sellingPrice * value;
          updated.originalProductValue = updated.product.sellingPrice * value;
        }
        
        if (field === 'awardedType') {
          if (value === 'REFUND') {
            updated.awardedAmount = updated.product.sellingPrice * updated.quantity;
            updated.replacementProductId = '';
            updated.replacementProductName = '';
            updated.replacementProductPrice = 0;
            updated.priceDifference = 0;
          } else if (value === 'REPLACEMENT') {
            updated.awardedAmount = 0;
          } else if (value === 'REPAIR') {
            updated.awardedAmount = 0;
            updated.replacementProductId = '';
            updated.replacementProductName = '';
          } else if (value === 'STORE_CREDIT') {
            updated.awardedAmount = updated.product.sellingPrice * updated.quantity;
            updated.replacementProductId = '';
            updated.replacementProductName = '';
          }
        }
        
        if (field === 'replacementProductId') {
          const replacementProduct = products.find(p => p.id === value);
          if (replacementProduct) {
            updated.replacementProductName = replacementProduct.name;
            updated.replacementProductPrice = replacementProduct.sellingPrice;
            updated.originalProductValue = updated.product.sellingPrice * updated.quantity;
            updated.priceDifference = (replacementProduct.sellingPrice * updated.quantity) - (updated.product.sellingPrice * updated.quantity);
          }
        }
        
        if (field === 'priceDifference') {
          if (value > 0) {
            updated.differencePaidBy = 'CLIENT';
          } else if (value < 0) {
            updated.differencePaidBy = 'BUSINESS';
          }
        }
        
        if (field === 'supplierId') {
          const supplier = suppliers.find(s => s.id === value);
          updated.supplierName = supplier?.name || '';
        }
        
        return updated;
      }
      return item;
    }));
  }

  function removeReturnItem(productId: string) {
    setReturnItems(prev => prev.filter(item => item.productId !== productId));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/returns', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ items: returnItems, reason }) 
      });
      if (res.ok) { setShowModal(false); setReturnItems([]); setReason(''); fetchData(); }
    } catch (error) { console.error('Return failed:', error); }
  }

  function viewReturn(returnRecord: ReturnRecord) {
    setSelectedReturn(returnRecord);
    setShowViewModal(true);
  }

  async function deleteReturn(returnId: string) {
    try {
      const res = await fetch(`/api/returns?id=${returnId}`, { method: 'DELETE' });
      if (res.ok) { setDeleteConfirm(null); fetchData(); }
    } catch (error) { console.error('Delete failed:', error); }
  }

  const totalRefunds = returns.reduce((sum, r) => sum + r.items.reduce((s, i) => s + i.refundAmount, 0), 0);
  const totalRepairCosts = returns.reduce((sum, r) => sum + r.items.reduce((s, i) => s + (i.repairCost || 0), 0), 0);
  const totalAwarded = returns.reduce((sum, r) => sum + r.items.reduce((s, i) => s + (i.awardedAmount || 0), 0), 0);
  const replacements = returns.reduce((sum, r) => sum + r.items.filter((i: ReturnItem) => i.awardedType === 'REPLACEMENT').length, 0);
  const totalPriceDiff = returns.reduce((sum, r) => sum + r.items.reduce((s, i) => s + (i.priceDifference || 0), 0), 0);
  const clientPaidDiff = returns.reduce((sum, r) => sum + r.items.filter((i: ReturnItem) => i.differencePaidBy === 'CLIENT').reduce((s, i) => s + (i.priceDifference || 0), 0), 0);
  const businessPaidDiff = returns.reduce((sum, r) => sum + r.items.filter((i: ReturnItem) => i.differencePaidBy === 'BUSINESS').reduce((s, i) => s + Math.abs(i.priceDifference || 0), 0), 0);

  const formatCurr = (amount: number) => formatCurrency(amount, settings.currency);

  const awardedTypeColors: Record<string, string> = {
    REFUND: '#22c55e',
    REPLACEMENT: '#3b82f6',
    REPAIR: '#f59e0b',
    STORE_CREDIT: '#8b5cf6'
  };

  const awardedTypeLabels: Record<string, string> = {
    REFUND: 'Money Back',
    REPLACEMENT: 'New Product',
    REPAIR: 'Repair Cost',
    STORE_CREDIT: 'Store Credit'
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div><h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Returns & Faulty Items</h1><p style={{ color: '#64748b' }}>Track returns, replacements, and price differences</p></div>
        <button onClick={() => setShowModal(true)} style={styles.primaryBtn}><Plus size={18} /> Process Return</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={styles.statCard}><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Undo2 size={20} color="#3b82f6" /><div><div style={styles.statValue}>{returns.length}</div><div style={styles.statLabel}>Total Returns</div></div></div></div>
        <div style={styles.statCard}><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><DollarSign size={20} color="#22c55e" /><div><div style={{ ...styles.statValue, color: '#22c55e' }}>{formatCurr(totalAwarded)}</div><div style={styles.statLabel}>Total Refunded</div></div></div></div>
        <div style={styles.statCard}><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Wrench size={20} color="#f59e0b" /><div><div style={{ ...styles.statValue, color: '#f59e0b' }}>{formatCurr(totalRepairCosts)}</div><div style={styles.statLabel}>Repair Costs</div></div></div></div>
        <div style={styles.statCard}><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowUpDown size={20} color="#ec4899" /><div><div style={{ ...styles.statValue, color: clientPaidDiff > 0 ? '#22c55e' : '#ef4444' }}>{formatCurr(Math.abs(clientPaidDiff))}</div><div style={styles.statLabel}>{clientPaidDiff >= 0 ? 'Extra from Client' : 'Extra to Client'}</div></div></div></div>
      </div>

      <div style={styles.tableCard}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '1400px' }}>
          <thead>
            <tr style={{ background: '#0f172a' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8', fontWeight: '600' }}>Return #</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8', fontWeight: '600' }}>Date</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8', fontWeight: '600' }}>Returned Item</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8', fontWeight: '600' }}>Replacement Product</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8', fontWeight: '600' }}>Awarded</th>
              <th style={{ padding: '0.75rem', textAlign: 'right', color: '#94a3b8', fontWeight: '600' }}>Refund</th>
              <th style={{ padding: '0.75rem', textAlign: 'right', color: '#94a3b8', fontWeight: '600' }}>Price Diff</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8', fontWeight: '600' }}>Diff. Paid By</th>
              <th style={{ padding: '0.75rem', textAlign: 'right', color: '#94a3b8', fontWeight: '600' }}>Repair</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', color: '#94a3b8', fontWeight: '600' }}>Supplier</th>
              <th style={{ padding: '0.75rem', textAlign: 'center', color: '#94a3b8', fontWeight: '600' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {returns.map(returnRecord => {
              const priceDiff = returnRecord.items.reduce((s, i) => s + (i.priceDifference || 0), 0);
              const diffPaidBy = returnRecord.items.find(i => i.priceDifference && i.priceDifference > 0)?.differencePaidBy;
              return (
                <tr key={returnRecord.id} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '0.75rem', fontWeight: '600' }}>{returnRecord.returnNumber}</td>
                  <td style={{ padding: '0.75rem' }}>{formatDate(returnRecord.createdAt)}</td>
                  <td style={{ padding: '0.75rem' }}>
                    {returnRecord.items.map((item: ReturnItem) => (
                      <div key={item.id} style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: '#f1f5f9' }}>{item.product?.name}</span>
                        <span style={{ color: '#64748b' }}> x{item.quantity}</span>
                      </div>
                    ))}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {returnRecord.items.filter((i: ReturnItem) => i.awardedType === 'REPLACEMENT').map((item: ReturnItem) => (
                      <div key={item.id} style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: '#3b82f6', fontWeight: '500' }}>{item.replacementProductName || 'N/A'}</span>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {item.replacementProductPrice ? formatCurr(item.replacementProductPrice * item.quantity) : '-'}
                        </div>
                      </div>
                    ))}
                    {returnRecord.items.every((i: ReturnItem) => i.awardedType !== 'REPLACEMENT') && (
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {[...new Set(returnRecord.items.map((i: ReturnItem) => i.awardedType))].map((type: string) => (
                      <span key={type} style={{ 
                        display: 'inline-block', 
                        padding: '0.15rem 0.5rem', 
                        borderRadius: '1rem', 
                        fontSize: '0.7rem', 
                        fontWeight: '600',
                        background: `${awardedTypeColors[type]}20`,
                        color: awardedTypeColors[type],
                        marginRight: '0.25rem',
                        marginBottom: '0.25rem'
                      }}>
                        {awardedTypeLabels[type]}
                      </span>
                    ))}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#22c55e' }}>{formatCurr(returnRecord.items.reduce((s: number, i: ReturnItem) => s + (i.awardedAmount || 0), 0))}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: priceDiff > 0 ? '#22c55e' : priceDiff < 0 ? '#ef4444' : '#94a3b8' }}>
                    {priceDiff !== 0 ? `${priceDiff > 0 ? '+' : ''}${formatCurr(priceDiff)}` : '-'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {priceDiff !== 0 && diffPaidBy ? (
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.25rem',
                        padding: '0.15rem 0.5rem', 
                        borderRadius: '1rem', 
                        fontSize: '0.7rem', 
                        fontWeight: '600',
                        background: diffPaidBy === 'CLIENT' ? '#22c55e20' : '#ef444420',
                        color: diffPaidBy === 'CLIENT' ? '#22c55e' : '#ef4444'
                      }}>
                        {diffPaidBy === 'CLIENT' ? '↓ Paid by Client' : '↑ Given to Client'}
                      </span>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#f59e0b' }}>{formatCurr(returnRecord.items.reduce((s: number, i: ReturnItem) => s + (i.repairCost || 0), 0))}</td>
                  <td style={{ padding: '0.75rem', color: '#94a3b8' }}>{[...new Set(returnRecord.items.map((i: ReturnItem) => i.supplierName).filter(Boolean))].join(', ') || '-'}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button onClick={() => viewReturn(returnRecord)} style={{ ...actionBtn, background: '#3b82f620', color: '#3b82f6' }} title="View Details">
                        <Eye size={14} />
                      </button>
                      {deleteConfirm === returnRecord.id ? (
                        <>
                          <button onClick={() => deleteReturn(returnRecord.id)} style={{ ...actionBtn, background: '#ef444420', color: '#ef4444' }} title="Confirm Delete">
                            <CheckCircle size={14} />
                          </button>
                          <button onClick={() => setDeleteConfirm(null)} style={{ ...actionBtn, background: '#64748b20', color: '#64748b' }} title="Cancel">
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setDeleteConfirm(returnRecord.id)} style={{ ...actionBtn, background: '#ef444420', color: '#ef4444' }} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {returns.length === 0 && <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No returns recorded yet.</div>}
      </div>

      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#f1f5f9' }}>Process Return</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={styles.label}>Add Product</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" placeholder="Search product..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...styles.input, flex: 1 }} />
                <button onClick={() => { const product = products.find(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())); if (product) addReturnItem(product); }} style={styles.secondaryBtn}>Add</button>
              </div>
            </div>

            {returnItems.length > 0 && (
              <div style={{ marginBottom: '1rem', maxHeight: '400px', overflowY: 'auto', border: '1px solid #334155', borderRadius: '0.5rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#0f172a' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left', color: '#94a3b8' }}>Product</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', color: '#94a3b8' }}>Qty</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', color: '#94a3b8' }}>Awarded</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', color: '#94a3b8' }}>Replacement</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', color: '#94a3b8' }}>Price Diff</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', color: '#94a3b8' }}>Supplier</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', color: '#94a3b8' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnItems.map(item => {
                      const isReplacement = item.awardedType === 'REPLACEMENT';
                      return (
                        <tr key={item.productId} style={{ borderBottom: '1px solid #334155' }}>
                          <td style={{ padding: '0.5rem' }}>
                            <div style={{ fontWeight: '500', color: '#f1f5f9' }}>{item.product.name}</div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{item.product.sku}</div>
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <input type="number" min="1" value={item.quantity} onChange={(e) => updateReturnItem(item.productId, 'quantity', parseInt(e.target.value))} style={{ width: '45px', padding: '0.25rem', border: '1px solid #475569', borderRadius: '0.25rem', background: '#1e293b', color: '#f1f5f9', textAlign: 'center' }} />
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <select value={item.awardedType} onChange={(e) => updateReturnItem(item.productId, 'awardedType', e.target.value)} style={{ width: '100%', padding: '0.35rem', border: '1px solid #475569', borderRadius: '0.25rem', background: '#1e293b', color: awardedTypeColors[item.awardedType], fontWeight: '500', fontSize: '0.7rem' }}>
                              <option value="REFUND">💰 Money Back</option>
                              <option value="REPLACEMENT">📦 New Product</option>
                              <option value="REPAIR">🔧 Repair Cost</option>
                              <option value="STORE_CREDIT">🎫 Store Credit</option>
                            </select>
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            {isReplacement ? (
                              <>
                                <select value={item.replacementProductId || ''} onChange={(e) => updateReturnItem(item.productId, 'replacementProductId', e.target.value)} style={{ width: '100%', padding: '0.35rem', border: '1px solid #475569', borderRadius: '0.25rem', background: '#1e293b', color: '#f1f5f9', fontSize: '0.7rem', marginBottom: '0.25rem' }}>
                                  <option value="">Select replacement</option>
                                  {products.filter(p => p.id !== item.productId && p.stockQuantity > 0).map(p => (
                                    <option key={p.id} value={p.id}>{p.name} - {formatCurr(p.sellingPrice)}</option>
                                  ))}
                                </select>
                                {item.replacementProductPrice > 0 && (
                                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                                    Original: {formatCurr(item.originalProductValue)} → New: {formatCurr(item.replacementProductPrice * item.quantity)}
                                    <div style={{ color: item.priceDifference > 0 ? '#22c55e' : item.priceDifference < 0 ? '#ef4444' : '#94a3b8', fontWeight: '600' }}>
                                      {item.priceDifference > 0 ? `+${formatCurr(item.priceDifference)} (Client pays)` : item.priceDifference < 0 ? `${formatCurr(item.priceDifference)} (Business pays)` : 'Equal value'}
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : isReplacement || item.awardedType === 'REPAIR' ? (
                              <input type="number" placeholder="Cost" value={item.repairCost || ''} onChange={(e) => updateReturnItem(item.productId, 'repairCost', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '0.35rem', border: '1px solid #475569', borderRadius: '0.25rem', background: '#1e293b', color: '#f59e0b', fontSize: '0.7rem' }} />
                            ) : (
                              <input type="number" placeholder="Amount" value={item.awardedAmount || ''} onChange={(e) => updateReturnItem(item.productId, 'awardedAmount', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '0.35rem', border: '1px solid #475569', borderRadius: '0.25rem', background: '#1e293b', color: '#f1f5f9', fontSize: '0.7rem' }} />
                            )}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '600', color: item.priceDifference > 0 ? '#22c55e' : item.priceDifference < 0 ? '#ef4444' : '#64748b' }}>
                            {isReplacement && item.priceDifference !== 0 ? (
                              <>
                                {item.priceDifference > 0 ? '+' : ''}{formatCurr(item.priceDifference)}
                                <div style={{ fontSize: '0.6rem', color: item.differencePaidBy === 'CLIENT' ? '#22c55e' : '#f59e0b' }}>
                                  {item.differencePaidBy === 'CLIENT' ? 'Client pays' : 'Business pays'}
                                </div>
                              </>
                            ) : '-'}
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <select value={item.supplierId || ''} onChange={(e) => updateReturnItem(item.productId, 'supplierId', e.target.value)} style={{ width: '100%', padding: '0.35rem', border: '1px solid #475569', borderRadius: '0.25rem', background: '#1e293b', color: '#f1f5f9', fontSize: '0.7rem' }}>
                              <option value="">Select supplier</option>
                              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <button onClick={() => removeReturnItem(item.productId)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.25rem', padding: '0.25rem 0.5rem', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={styles.label}>Return Reason</label>
              <input type="text" placeholder="Enter reason..." value={reason} onChange={(e) => setReason(e.target.value)} style={styles.input} required />
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={styles.secondaryBtn}>Cancel</button>
              <button onClick={handleSubmit} disabled={returnItems.length === 0 || !reason} style={{ ...styles.primaryBtn, opacity: returnItems.length === 0 || !reason ? 0.5 : 1 }}>Process Return</button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedReturn && (
        <div style={styles.modalOverlay} onClick={() => setShowViewModal(false)}>
          <div style={{ ...styles.modal, maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#f1f5f9' }}>Return Details</h2>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>{selectedReturn.returnNumber} • {formatDate(selectedReturn.createdAt)}</p>
              </div>
              <button onClick={() => setShowViewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={styles.label}>Return Reason</label>
              <p style={{ color: '#f1f5f9', fontSize: '0.9rem' }}>{selectedReturn.reason}</p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={styles.label}>Items</label>
              <div style={{ border: '1px solid #334155', borderRadius: '0.5rem', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#0f172a' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left', color: '#94a3b8', fontWeight: '500' }}>Product</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', color: '#94a3b8', fontWeight: '500' }}>Qty</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', color: '#94a3b8', fontWeight: '500' }}>Status</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', color: '#94a3b8', fontWeight: '500' }}>Replacement</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', color: '#94a3b8', fontWeight: '500' }}>Refund</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', color: '#94a3b8', fontWeight: '500' }}>Diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReturn.items.map((item: ReturnItem) => {
                      const isReplacement = item.awardedType === 'REPLACEMENT';
                      return (
                        <tr key={item.id} style={{ borderTop: '1px solid #334155' }}>
                          <td style={{ padding: '0.5rem' }}>
                            <div style={{ fontWeight: '500', color: '#f1f5f9' }}>{item.product?.name}</div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{item.product?.sku}</div>
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ padding: '0.5rem' }}>
                            <span style={{ 
                              padding: '0.15rem 0.4rem', 
                              borderRadius: '1rem', 
                              fontSize: '0.7rem', 
                              fontWeight: '500',
                              background: item.status === 'FAULTY' ? '#ef444420' : item.status === 'RESELLABLE' ? '#22c55e20' : '#f59e0b20',
                              color: item.status === 'FAULTY' ? '#ef4444' : item.status === 'RESELLABLE' ? '#22c55e' : '#f59e0b'
                            }}>
                              {item.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            {isReplacement ? (
                              <div>
                                <div style={{ color: '#3b82f6', fontWeight: '500', fontSize: '0.8rem' }}>{item.replacementProductName || 'N/A'}</div>
                                {item.priceDifference !== undefined && item.priceDifference > 0 && (
                                  <div style={{ fontSize: '0.65rem', color: item.differencePaidBy === 'CLIENT' ? '#22c55e' : '#ef4444' }}>
                                    {item.differencePaidBy === 'CLIENT' ? 'Client paid extra' : 'Given to client'}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#64748b', fontSize: '0.8rem' }}>-</span>
                            )}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', color: '#22c55e' }}>{formatCurr(item.awardedAmount || 0)}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', color: (item.priceDifference || 0) > 0 ? '#22c55e' : (item.priceDifference || 0) < 0 ? '#ef4444' : '#64748b' }}>
                            {(item.priceDifference || 0) !== 0 ? formatCurr(item.priceDifference || 0) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '0.5rem' }}>
                <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Total Refunded</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#22c55e' }}>
                  {formatCurr(selectedReturn.items.reduce((s: number, i: ReturnItem) => s + (i.awardedAmount || 0), 0))}
                </div>
              </div>
              <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '0.5rem' }}>
                <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Total Price Diff</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: selectedReturn.items.reduce((s: number, i: ReturnItem) => s + (i.priceDifference || 0), 0) > 0 ? '#22c55e' : '#ef4444' }}>
                  {formatCurr(selectedReturn.items.reduce((s: number, i: ReturnItem) => s + (i.priceDifference || 0), 0))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowViewModal(false)} style={styles.primaryBtn}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  statCard: { background: '#1e293b', borderRadius: '0.75rem', border: '1px solid #334155', padding: '1rem' },
  statValue: { fontSize: '1.25rem', fontWeight: '700', color: '#f1f5f9' },
  statLabel: { fontSize: '0.75rem', color: '#64748b' },
  tableCard: { background: '#1e293b', borderRadius: '1rem', border: '1px solid #334155', padding: 0, overflow: 'auto' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#1e293b', borderRadius: '1rem', padding: '1.5rem', maxWidth: '900px', width: '90%', border: '1px solid #334155', maxHeight: '90vh', overflowY: 'auto' },
  input: { width: '100%', padding: '0.75rem', background: '#0f172a', border: '1px solid #475569', borderRadius: '0.5rem', color: '#f1f5f9', fontSize: '0.9rem' },
  label: { display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.875rem', fontWeight: '500' },
  primaryBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '0.5rem', color: 'white', cursor: 'pointer', fontWeight: '600' },
  secondaryBtn: { padding: '0.625rem 1rem', background: '#334155', border: 'none', borderRadius: '0.5rem', color: 'white', cursor: 'pointer', fontWeight: '500' },
};

const actionBtn: React.CSSProperties = {
  padding: '0.35rem',
  border: 'none',
  borderRadius: '0.25rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};
