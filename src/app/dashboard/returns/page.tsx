'use client';

import { useEffect, useState } from 'react';
import { Undo2, Plus, X, AlertTriangle, RefreshCw, DollarSign, Wrench, FileText, Package, ArrowUpDown, Eye, Pencil, Trash2, CheckCircle } from 'lucide-react';
import { formatCurrency, formatDate, getCurrencySymbol } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/components/AuthProvider';

interface Product {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  stockQuantity: number;
  supplier?: { id: string; name: string };
  electronicsFields?: { imei?: string | null } | null;
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
  replacementProduct?: { electronicsFields?: { imei?: string | null } | null } | null;
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
  const [soldProducts, setSoldProducts] = useState<Product[]>([]);
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
  const { shop } = useAuth();

  useEffect(() => { fetchData(); }, [shop]);

  async function fetchData() {
    try {
      const headers = { 'x-shop-id': shop?.id || '' };
      const [productsRes, returnsRes, suppliersRes, soldRes] = await Promise.all([
        fetch('/api/inventory', { headers }),
        fetch('/api/returns', { headers }),
        fetch('/api/suppliers', { headers }),
        fetch('/api/returns?soldOnly=true', { headers })
      ]);
      const productsData = await productsRes.json();
      const returnsData = await returnsRes.json();
      const suppliersData = await suppliersRes.json();
      const soldData = await soldRes.json();
      setProducts(productsData.products || []);
      setReturns(returnsData.returns || []);
      setSuppliers(suppliersData.suppliers || []);
      setSoldProducts(soldData.products || []);
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
            updated.refundAmount = updated.product.sellingPrice * updated.quantity;
            updated.replacementProductId = '';
            updated.replacementProductName = '';
            updated.replacementProductPrice = 0;
            updated.priceDifference = 0;
          } else if (value === 'REPLACEMENT') {
            updated.awardedAmount = 0;
            updated.refundAmount = 0;
          } else if (value === 'REPAIR') {
            updated.awardedAmount = 0;
            updated.refundAmount = 0;
            updated.replacementProductId = '';
            updated.replacementProductName = '';
          } else if (value === 'STORE_CREDIT') {
            updated.awardedAmount = updated.product.sellingPrice * updated.quantity;
            updated.refundAmount = 0;
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
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' }, 
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
      const res = await fetch(`/api/returns?id=${returnId}`, { 
        method: 'DELETE',
        headers: { 'x-shop-id': shop?.id || '' }
      });
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

  const q = search.toLowerCase();
  const filteredReturns = !search ? returns : returns.filter(r =>
    r.returnNumber.toLowerCase().includes(q) ||
    r.reason.toLowerCase().includes(q) ||
    r.items.some(i =>
      i.product?.name.toLowerCase().includes(q) ||
      i.replacementProductName?.toLowerCase().includes(q) ||
      i.supplierName?.toLowerCase().includes(q)
    )
  );

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div><h1 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Returns & Faulty Items</h1><p style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>Track returns, replacements, and price differences</p></div>
        <button onClick={() => setShowModal(true)} style={styles.primaryBtn}><Plus size={15} /> Process Return</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={styles.statCard}><div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Undo2 size={16} color="#3b82f6" /><div><div style={styles.statValue}>{returns.length}</div><div style={styles.statLabel}>Total Returns</div></div></div></div>
        <div style={styles.statCard}><div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><DollarSign size={16} color="#22c55e" /><div><div style={{ ...styles.statValue, color: 'var(--success)' }}>{formatCurr(totalAwarded)}</div><div style={styles.statLabel}>Total Refunded</div></div></div></div>
        <div style={styles.statCard}><div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Wrench size={16} color="#f59e0b" /><div><div style={{ ...styles.statValue, color: 'var(--warning)' }}>{formatCurr(totalRepairCosts)}</div><div style={styles.statLabel}>Repair Costs</div></div></div></div>
        <div style={styles.statCard}><div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><ArrowUpDown size={16} color="#ec4899" /><div><div style={{ ...styles.statValue, color: clientPaidDiff > 0 ? '#22c55e' : '#ef4444' }}>{formatCurr(Math.abs(clientPaidDiff))}</div><div style={styles.statLabel}>{clientPaidDiff >= 0 ? 'Extra from Client' : 'Extra to Client'}</div></div></div></div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search returns by number, product, reason..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', maxWidth: '400px', padding: '0.5rem 0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.4rem', color: 'var(--foreground)', fontSize: '0.8rem' }}
        />
      </div>

      <div style={styles.tableCard}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
          <thead>
            <tr style={{ background: 'var(--background)' }}>
              <th style={{ padding: '0.5rem 0.4rem', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: '600', whiteSpace: 'nowrap' }}>Return #</th>
              <th style={{ padding: '0.5rem 0.4rem', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: '600', whiteSpace: 'nowrap' }}>Date</th>
              <th style={{ padding: '0.5rem 0.4rem', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: '600' }}>Item</th>
              <th style={{ padding: '0.5rem 0.4rem', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: '600' }}>Replacement</th>
              <th style={{ padding: '0.5rem 0.4rem', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: '600', whiteSpace: 'nowrap' }}>Awarded</th>
              <th style={{ padding: '0.5rem 0.4rem', textAlign: 'right', color: 'var(--muted-foreground)', fontWeight: '600', whiteSpace: 'nowrap' }}>Refund</th>
              <th style={{ padding: '0.5rem 0.4rem', textAlign: 'right', color: 'var(--muted-foreground)', fontWeight: '600', whiteSpace: 'nowrap' }}>Diff</th>
              <th style={{ padding: '0.5rem 0.4rem', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: '600', whiteSpace: 'nowrap' }}>Paid By</th>
              <th style={{ padding: '0.5rem 0.4rem', textAlign: 'right', color: 'var(--muted-foreground)', fontWeight: '600', whiteSpace: 'nowrap' }}>Repair</th>
              <th style={{ padding: '0.5rem 0.4rem', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: '600' }}>Supplier</th>
              <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', color: 'var(--muted-foreground)', fontWeight: '600', whiteSpace: 'nowrap' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredReturns.map(returnRecord => {
              const priceDiff = returnRecord.items.reduce((s, i) => s + (i.priceDifference || 0), 0);
              const diffPaidBy = returnRecord.items.find(i => i.priceDifference && i.priceDifference > 0)?.differencePaidBy;
              return (
                <tr key={returnRecord.id} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '0.5rem 0.4rem', fontWeight: '600', whiteSpace: 'nowrap' }}>{returnRecord.returnNumber}</td>
                  <td style={{ padding: '0.5rem 0.4rem', whiteSpace: 'nowrap' }}>{formatDate(returnRecord.createdAt)}</td>
                  <td style={{ padding: '0.5rem 0.4rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {returnRecord.items.map((item: ReturnItem) => (
                      <div key={item.id} style={{ fontSize: '0.7rem', marginBottom: '0.15rem', display: 'flex', gap: '0.2rem', flexWrap: 'nowrap' }}>
                        <span style={{ color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px', whiteSpace: 'nowrap' }}>{item.product?.name}</span>
                        {item.product?.electronicsFields?.imei && (
                          <span style={{ color: 'var(--warning)', fontSize: '0.6rem', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>IMEI: {item.product.electronicsFields.imei}</span>
                        )}
                        <span style={{ color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>x{item.quantity}</span>
                      </div>
                    ))}
                  </td>
                  <td style={{ padding: '0.5rem 0.4rem', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {returnRecord.items.filter((i: ReturnItem) => i.awardedType === 'REPLACEMENT').map((item: ReturnItem) => (
                      <div key={item.id} style={{ fontSize: '0.7rem', marginBottom: '0.15rem' }}>
                        <span style={{ color: 'var(--primary)', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px', whiteSpace: 'nowrap', display: 'inline-block' }}>{item.replacementProductName || 'N/A'}</span>
                        {item.replacementProduct?.electronicsFields?.imei && <span style={{ color: 'var(--warning)', fontSize: '0.6rem', fontFamily: 'monospace', display: 'block' }}>IMEI: {item.replacementProduct.electronicsFields.imei}</span>}
                        {item.replacementProductPrice ? <div style={{ fontSize: '0.6rem', color: 'var(--muted-foreground)' }}>{formatCurr(item.replacementProductPrice * item.quantity)}</div> : null}
                      </div>
                    ))}
                    {returnRecord.items.every((i: ReturnItem) => i.awardedType !== 'REPLACEMENT') && (
                      <span style={{ color: 'var(--muted-foreground)', fontSize: '0.7rem' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '0.5rem 0.4rem' }}>
                    {[...new Set(returnRecord.items.map((i: ReturnItem) => i.awardedType))].map((type: string) => (
                      <span key={type} style={{ 
                        display: 'inline-block', 
                        padding: '0.1rem 0.35rem', 
                        borderRadius: '1rem', 
                        fontSize: '0.6rem', 
                        fontWeight: '600',
                        background: `${awardedTypeColors[type]}20`,
                        color: awardedTypeColors[type],
                        marginRight: '0.2rem',
                        marginBottom: '0.15rem'
                      }}>
                        {awardedTypeLabels[type]}
                      </span>
                    ))}
                  </td>
                  <td style={{ padding: '0.5rem 0.4rem', textAlign: 'right', fontWeight: '600', color: 'var(--success)', whiteSpace: 'nowrap' }}>{formatCurr(returnRecord.items.reduce((s: number, i: ReturnItem) => s + (i.awardedAmount || 0), 0))}</td>
                  <td style={{ padding: '0.5rem 0.4rem', textAlign: 'right', fontWeight: '600', whiteSpace: 'nowrap', color: priceDiff > 0 ? '#22c55e' : priceDiff < 0 ? '#ef4444' : '#94a3b8' }}>
                    {priceDiff !== 0 ? `${priceDiff > 0 ? '+' : ''}${formatCurr(priceDiff)}` : '-'}
                  </td>
                  <td style={{ padding: '0.5rem 0.4rem' }}>
                    {priceDiff !== 0 && diffPaidBy ? (
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.15rem',
                        padding: '0.1rem 0.35rem', 
                        borderRadius: '1rem', 
                        fontSize: '0.6rem', 
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                        background: diffPaidBy === 'CLIENT' ? '#22c55e20' : '#ef444420',
                        color: diffPaidBy === 'CLIENT' ? '#22c55e' : '#ef4444'
                      }}>
                        {diffPaidBy === 'CLIENT' ? 'Client' : 'Business'}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--muted-foreground)', fontSize: '0.7rem' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '0.5rem 0.4rem', textAlign: 'right', fontWeight: '600', color: 'var(--warning)', whiteSpace: 'nowrap' }}>{formatCurr(returnRecord.items.reduce((s: number, i: ReturnItem) => s + (i.repairCost || 0), 0))}</td>
                  <td style={{ padding: '0.5rem 0.4rem', color: 'var(--muted-foreground)', fontSize: '0.7rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[...new Set(returnRecord.items.map((i: ReturnItem) => i.supplierName).filter(Boolean))].join(', ') || '-'}</td>
                  <td style={{ padding: '0.5rem 0.4rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                      <button onClick={() => viewReturn(returnRecord)} style={{ ...actionBtn, background: '#3b82f620', color: 'var(--primary)' }} title="View Details">
                        <Eye size={12} />
                      </button>
                      {deleteConfirm === returnRecord.id ? (
                        <>
                          <button onClick={() => deleteReturn(returnRecord.id)} style={{ ...actionBtn, background: '#ef444420', color: 'var(--destructive)' }} title="Confirm Delete">
                            <CheckCircle size={12} />
                          </button>
                          <button onClick={() => setDeleteConfirm(null)} style={{ ...actionBtn, background: '#64748b20', color: 'var(--muted-foreground)' }} title="Cancel">
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setDeleteConfirm(returnRecord.id)} style={{ ...actionBtn, background: '#ef444420', color: 'var(--destructive)' }} title="Delete">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredReturns.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>{search ? 'No returns match your search.' : 'No returns recorded yet.'}</div>}
      </div>

      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--foreground)' }}>Process Return</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}><X size={18} /></button>
            </div>
            
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={styles.label}>Add Product</label>
              <select 
                value="" 
                onChange={(e) => {
                  const product = products.find(p => p.id === e.target.value);
                  if (product) addReturnItem(product);
                }}
                style={{ ...styles.input }}
              >
                <option value="">-- Select a product --</option>
                {soldProducts.filter(p => !returnItems.find(item => item.productId === p.id)).map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku}){p.electronicsFields?.imei ? ` [IMEI: ${p.electronicsFields.imei}]` : ''}</option>
                ))}
              </select>
            </div>

            {returnItems.length > 0 && (
              <div style={{ marginBottom: '0.75rem', maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '0.4rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--background)' }}>
                      <th style={{ padding: '0.35rem 0.3rem', textAlign: 'left', color: 'var(--muted-foreground)' }}>Product</th>
                      <th style={{ padding: '0.35rem 0.3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>Qty</th>
                      <th style={{ padding: '0.35rem 0.3rem', textAlign: 'left', color: 'var(--muted-foreground)' }}>Awarded</th>
                      <th style={{ padding: '0.35rem 0.3rem', textAlign: 'left', color: 'var(--muted-foreground)' }}>Replacement</th>
                      <th style={{ padding: '0.35rem 0.3rem', textAlign: 'right', color: 'var(--muted-foreground)' }}>Price Diff</th>
                      <th style={{ padding: '0.35rem 0.3rem', textAlign: 'left', color: 'var(--muted-foreground)' }}>Supplier</th>
                      <th style={{ padding: '0.35rem 0.3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnItems.map(item => {
                      const isReplacement = item.awardedType === 'REPLACEMENT';
                      return (
                        <tr key={item.productId} style={{ borderBottom: '1px solid #334155' }}>
                          <td style={{ padding: '0.35rem 0.3rem' }}>
                            <div style={{ fontWeight: '500', color: 'var(--foreground)', fontSize: '0.7rem' }}>{item.product.name}</div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--muted-foreground)' }}>{item.product.sku}</div>
                            {item.product.electronicsFields?.imei && (
                              <div style={{ fontSize: '0.55rem', color: 'var(--warning)', fontFamily: 'monospace' }}>IMEI: {item.product.electronicsFields.imei}</div>
                            )}
                          </td>
                          <td style={{ padding: '0.35rem 0.3rem', textAlign: 'center' }}>
                            <input type="number" min="1" value={item.quantity} onChange={(e) => updateReturnItem(item.productId, 'quantity', parseInt(e.target.value))} style={{ width: '38px', padding: '0.2rem', border: '1px solid var(--border)', borderRadius: '0.2rem', background: 'var(--card)', color: 'var(--foreground)', textAlign: 'center', fontSize: '0.7rem' }} />
                          </td>
                          <td style={{ padding: '0.35rem 0.3rem' }}>
                            <select value={item.awardedType} onChange={(e) => updateReturnItem(item.productId, 'awardedType', e.target.value)} style={{ width: '100%', minWidth: '80px', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '0.2rem', background: 'var(--card)', color: awardedTypeColors[item.awardedType], fontWeight: '500', fontSize: '0.65rem' }}>
                              <option value="REFUND">💰 Money Back</option>
                              <option value="REPLACEMENT">📦 New Product</option>
                              <option value="REPAIR">🔧 Repair Cost</option>
                              <option value="STORE_CREDIT">🎫 Store Credit</option>
                            </select>
                          </td>
                          <td style={{ padding: '0.35rem 0.3rem' }}>
                            {isReplacement ? (
                              <>
                                <select value={item.replacementProductId || ''} onChange={(e) => updateReturnItem(item.productId, 'replacementProductId', e.target.value)} style={{ width: '100%', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '0.2rem', background: 'var(--card)', color: 'var(--foreground)', fontSize: '0.65rem', marginBottom: '0.2rem' }}>
                                  <option value="">Select replacement</option>
                                  {products.filter(p => p.id !== item.productId && p.stockQuantity >= 1).map(p => (
                                      <option key={p.id} value={p.id}>{p.name}{p.electronicsFields?.imei ? ` [IMEI: ${p.electronicsFields.imei}]` : ''} (Stock: {p.stockQuantity})</option>
                                  ))}
                                </select>
                                {item.replacementProductPrice > 0 && (
                                  <div style={{ fontSize: '0.55rem', color: 'var(--muted-foreground)' }}>
                                    <div style={{ color: item.priceDifference > 0 ? '#22c55e' : item.priceDifference < 0 ? '#ef4444' : '#94a3b8', fontWeight: '600' }}>
                                      {item.priceDifference > 0 ? `+${formatCurr(item.priceDifference)}` : item.priceDifference < 0 ? `${formatCurr(item.priceDifference)}` : 'Equal'}
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : item.awardedType === 'REPAIR' ? (
                              <input type="number" placeholder="0.00" value={item.repairCost || ''} onChange={(e) => updateReturnItem(item.productId, 'repairCost', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '0.2rem', background: 'var(--card)', color: 'var(--warning)', fontSize: '0.65rem' }} min="0" step="0.01" />
                            ) : (
                              <input type="number" placeholder="0.00" value={item.awardedAmount || ''} onChange={(e) => updateReturnItem(item.productId, 'awardedAmount', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '0.2rem', background: 'var(--card)', color: 'var(--foreground)', fontSize: '0.65rem' }} min="0" step="0.01" />
                            )}
                          </td>
                          <td style={{ padding: '0.35rem 0.3rem', textAlign: 'right', fontSize: '0.65rem', fontWeight: '600', color: item.priceDifference > 0 ? '#22c55e' : item.priceDifference < 0 ? '#ef4444' : '#64748b' }}>
                            {isReplacement && item.priceDifference !== 0 ? (
                              <>
                                {item.priceDifference > 0 ? '+' : ''}{formatCurr(item.priceDifference)}
                                <div style={{ fontSize: '0.55rem', color: item.differencePaidBy === 'CLIENT' ? '#22c55e' : '#f59e0b' }}>
                                  {item.differencePaidBy === 'CLIENT' ? 'Client' : 'Business'}
                                </div>
                              </>
                            ) : '-'}
                          </td>
                          <td style={{ padding: '0.35rem 0.3rem' }}>
                            <select value={item.supplierId || ''} onChange={(e) => updateReturnItem(item.productId, 'supplierId', e.target.value)} style={{ width: '100%', minWidth: '80px', padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '0.2rem', background: 'var(--card)', color: 'var(--foreground)', fontSize: '0.65rem' }}>
                              <option value="">Select</option>
                              {[...suppliers].sort((a, b) => a.name.localeCompare(b.name)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '0.35rem 0.3rem', textAlign: 'center' }}>
                            <button onClick={() => removeReturnItem(item.productId)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.2rem', padding: '0.15rem 0.4rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.7rem' }}>×</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={styles.label}>Return Reason</label>
              <input type="text" placeholder="Enter reason..." value={reason} onChange={(e) => setReason(e.target.value)} style={styles.input} required />
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={styles.secondaryBtn}>Cancel</button>
              <button onClick={handleSubmit} disabled={returnItems.length === 0 || !reason} style={{ ...styles.primaryBtn, opacity: returnItems.length === 0 || !reason ? 0.5 : 1 }}>Process Return</button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedReturn && (
        <div style={styles.modalOverlay} onClick={() => setShowViewModal(false)}>
          <div style={{ ...styles.modal, maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--foreground)' }}>Return Details</h2>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>{selectedReturn.returnNumber} • {formatDate(selectedReturn.createdAt)}</p>
              </div>
              <button onClick={() => setShowViewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}><X size={18} /></button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={styles.label}>Return Reason</label>
              <p style={{ color: 'var(--foreground)', fontSize: '0.8rem' }}>{selectedReturn.reason}</p>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={styles.label}>Items</label>
              <div style={{ border: '1px solid var(--border)', borderRadius: '0.4rem', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--background)' }}>
                      <th style={{ padding: '0.35rem 0.3rem', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: '500' }}>Product</th>
                      <th style={{ padding: '0.35rem 0.3rem', textAlign: 'center', color: 'var(--muted-foreground)', fontWeight: '500' }}>Qty</th>
                      <th style={{ padding: '0.35rem 0.3rem', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: '500' }}>Status</th>
                      <th style={{ padding: '0.35rem 0.3rem', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: '500' }}>Replacement</th>
                      <th style={{ padding: '0.35rem 0.3rem', textAlign: 'right', color: 'var(--muted-foreground)', fontWeight: '500' }}>Refund</th>
                      <th style={{ padding: '0.35rem 0.3rem', textAlign: 'right', color: 'var(--muted-foreground)', fontWeight: '500' }}>Diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReturn.items.map((item: ReturnItem) => {
                      const isReplacement = item.awardedType === 'REPLACEMENT';
                      return (
                        <tr key={item.id} style={{ borderTop: '1px solid #334155' }}>
                          <td style={{ padding: '0.35rem 0.3rem' }}>
                            <div style={{ fontWeight: '500', color: 'var(--foreground)', fontSize: '0.75rem' }}>{item.product?.name}</div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--muted-foreground)' }}>{item.product?.sku}</div>
                            {item.product?.electronicsFields?.imei && (
                              <div style={{ fontSize: '0.55rem', color: 'var(--warning)', fontFamily: 'monospace' }}>IMEI: {item.product.electronicsFields.imei}</div>
                            )}
                          </td>
                          <td style={{ padding: '0.35rem 0.3rem', textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ padding: '0.35rem 0.3rem' }}>
                            <span style={{ 
                              padding: '0.1rem 0.3rem', 
                              borderRadius: '1rem', 
                              fontSize: '0.6rem', 
                              fontWeight: '500',
                              background: item.status === 'FAULTY' ? '#ef444420' : item.status === 'RESELLABLE' ? '#22c55e20' : '#f59e0b20',
                              color: item.status === 'FAULTY' ? '#ef4444' : item.status === 'RESELLABLE' ? '#22c55e' : '#f59e0b'
                            }}>
                              {item.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.35rem 0.3rem' }}>
                            {isReplacement ? (
                              <div>
                                <div style={{ color: 'var(--primary)', fontWeight: '500', fontSize: '0.7rem' }}>{item.replacementProductName || 'N/A'}</div>
                                {item.replacementProduct?.electronicsFields?.imei && <div style={{ fontSize: '0.6rem', color: 'var(--warning)', fontFamily: 'monospace' }}>IMEI: {item.replacementProduct.electronicsFields.imei}</div>}
                                {item.priceDifference !== undefined && item.priceDifference > 0 && (
                                  <div style={{ fontSize: '0.55rem', color: item.differencePaidBy === 'CLIENT' ? '#22c55e' : '#ef4444' }}>
                                    {item.differencePaidBy === 'CLIENT' ? 'Client paid' : 'Given to client'}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--muted-foreground)', fontSize: '0.7rem' }}>-</span>
                            )}
                          </td>
                          <td style={{ padding: '0.35rem 0.3rem', textAlign: 'right', fontWeight: '600', color: 'var(--success)', fontSize: '0.75rem' }}>{formatCurr(item.awardedAmount || 0)}</td>
                          <td style={{ padding: '0.35rem 0.3rem', textAlign: 'right', fontWeight: '600', fontSize: '0.75rem', color: (item.priceDifference || 0) > 0 ? '#22c55e' : (item.priceDifference || 0) < 0 ? '#ef4444' : '#64748b' }}>
                            {(item.priceDifference || 0) !== 0 ? formatCurr(item.priceDifference || 0) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: 'var(--background)', padding: '0.75rem', borderRadius: '0.4rem' }}>
                <div style={{ color: 'var(--muted-foreground)', fontSize: '0.65rem', marginBottom: '0.15rem' }}>Total Refunded</div>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--success)' }}>
                  {formatCurr(selectedReturn.items.reduce((s: number, i: ReturnItem) => s + (i.awardedAmount || 0), 0))}
                </div>
              </div>
              <div style={{ background: 'var(--background)', padding: '0.75rem', borderRadius: '0.4rem' }}>
                <div style={{ color: 'var(--muted-foreground)', fontSize: '0.65rem', marginBottom: '0.15rem' }}>Total Price Diff</div>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: selectedReturn.items.reduce((s: number, i: ReturnItem) => s + (i.priceDifference || 0), 0) > 0 ? '#22c55e' : '#ef4444' }}>
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
  statCard: { background: 'var(--card)', borderRadius: '0.5rem', border: '1px solid var(--border)', padding: '0.65rem 0.75rem' },
  statValue: { fontSize: '1rem', fontWeight: '700', color: 'var(--foreground)' },
  statLabel: { fontSize: '0.65rem', color: 'var(--muted-foreground)' },
  tableCard: { background: 'var(--card)', borderRadius: '0.75rem', border: '1px solid var(--border)', padding: 0, overflow: 'auto' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: 'var(--card)', borderRadius: '0.75rem', padding: '1.25rem', maxWidth: '800px', width: '92%', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' },
  input: { width: '100%', padding: '0.5rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.35rem', color: 'var(--foreground)', fontSize: '0.8rem' },
  label: { display: 'block', marginBottom: '0.35rem', color: 'var(--muted-foreground)', fontSize: '0.8rem', fontWeight: '500' },
  primaryBtn: { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.8rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '0.4rem', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' },
  secondaryBtn: { padding: '0.5rem 0.8rem', background: 'var(--secondary)', border: 'none', borderRadius: '0.4rem', color: 'white', cursor: 'pointer', fontWeight: '500', fontSize: '0.8rem' },
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
