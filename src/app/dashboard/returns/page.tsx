'use client';

import { useEffect, useState, useRef } from 'react';
import { Undo2, Plus, X, AlertTriangle, RefreshCw, DollarSign, Wrench, FileText, Package, ArrowUpDown, Eye, Pencil, Trash2, CheckCircle, Search, ChevronDown, ShoppingBag, RotateCcw, BadgeCheck } from 'lucide-react';
import { formatCurrency, formatDate, formatShortDate, getCurrencySymbol } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/components/AuthProvider';

interface Product {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  purchaseCost: number;
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
  returnCost: number;
  replacementProductId?: string;
  replacementProductName?: string;
  replacementProductPrice?: number;
  replacementProduct?: { electronicsFields?: { imei?: string | null } | null } | null;
  originalProductValue?: number;
  priceDifference?: number;
  differencePaidBy?: string;
  replacementPaymentMethod?: string;
  replacementPaidAmount?: number;
  replacementDiscount?: number;
  replacementIsInstallment?: boolean;
  replacementInstallmentTotal?: number;
  replacementInstallmentPaid?: number;
  replacementInstallmentCustomerName?: string;
  replacementInstallmentCustomerPhone?: string;
  replacementRefundGiven?: number;
  returnInstallmentPayments?: ReturnInstallmentPayment[];
  notes?: string;
}

interface ReturnInstallmentPayment {
  id: string;
  amount: number;
  amountPaid: number;
  balance: number;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
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
  const [payingItem, setPayingItem] = useState<ReturnItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const { settings } = useSettings();
  const { shop, user } = useAuth();

  useEffect(() => {
    const abortController = new AbortController();
    fetchData(abortController.signal);
    const interval = setInterval(() => fetchData(), 30000);
    return () => { abortController.abort(); clearInterval(interval); };
  }, [shop]);

  async function fetchData(signal?: AbortSignal) {
    try {
      const headers = { 'x-shop-id': shop?.id || '' };
      const [productsRes, returnsRes, suppliersRes, soldRes] = await Promise.all([
        fetch('/api/inventory', { headers, signal }),
        fetch('/api/returns', { headers, signal }),
        fetch('/api/suppliers', { headers, signal }),
        fetch('/api/returns?soldOnly=true', { headers, signal })
      ]);
      const productsData = await productsRes.json();
      const returnsData = await returnsRes.json();
      const suppliersData = await suppliersRes.json();
      const soldData = await soldRes.json();
      setProducts(productsData.products || []);
      setReturns(returnsData.returns || []);
      setSuppliers(suppliersData.suppliers || []);
      setSoldProducts(soldData.products || []);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Failed to fetch data:', error);
    }
    finally { setLoading(false); }
  }

  const returnedProductIds = new Set(returns.flatMap(r => r.items.map(i => i.productId)));

  function addReturnItem(product: Product) {
    if (returnItems.find(item => item.productId === product.id)) return;
    if (returnedProductIds.has(product.id) && product.electronicsFields?.imei) return;
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
      returnCost: 0,
      replacementProductId: '',
      replacementProductName: '',
      replacementProductPrice: 0,
      originalProductValue: product.sellingPrice,
      priceDifference: 0,
      differencePaidBy: 'CLIENT',
      replacementPaymentMethod: '',
      replacementPaidAmount: 0,
      replacementDiscount: 0,
      replacementIsInstallment: false,
      replacementInstallmentTotal: 0,
      replacementInstallmentPaid: 0,
      replacementInstallmentCustomerName: '',
      replacementInstallmentCustomerPhone: '',
      replacementRefundGiven: 0,
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
            updated.returnCost = 0;
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
            const diff = (replacementProduct.sellingPrice * updated.quantity) - (updated.product.sellingPrice * updated.quantity);
            updated.priceDifference = diff;
            if (diff > 0) {
              updated.differencePaidBy = 'CLIENT';
              updated.replacementPaidAmount = diff;
              updated.replacementDiscount = 0;
              updated.replacementPaymentMethod = 'CASH';
              updated.replacementInstallmentTotal = diff;
              updated.replacementInstallmentPaid = 0;
            } else if (diff < 0) {
              updated.differencePaidBy = 'BUSINESS';
              updated.replacementRefundGiven = Math.abs(diff);
            }
          }
        }
        
        if (field === 'priceDifference') {
          if (value > 0) {
            updated.differencePaidBy = 'CLIENT';
          } else if (value < 0) {
            updated.differencePaidBy = 'BUSINESS';
          }
        }
        
        if (field === 'replacementPaidAmount') {
          const diff = updated.priceDifference || 0;
          updated.replacementDiscount = Math.max(0, diff - value);
        }
        
        if (field === 'replacementDiscount') {
          const diff = updated.priceDifference || 0;
          updated.replacementPaidAmount = Math.max(0, diff - value);
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
    const missingRepairCost = returnItems.some(item => item.awardedType === 'REPAIR' && (!item.repairCost || item.repairCost <= 0));
    if (missingRepairCost) {
      alert('Repair cost is required for Repair items. Please fill in the Repair Cost field.');
      return;
    }
    try {
      const res = await fetch('/api/returns', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' }, 
        body: JSON.stringify({ items: returnItems, reason, userId: user?.id, userName: user?.name }) 
      });
      if (res.ok) { setShowModal(false); setReturnItems([]); setReason(''); fetchData(); } else {
        const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
        alert('Failed to save return: ' + (errData.error || res.statusText));
      }
    } catch (error) { console.error('Return failed:', error); alert('Return request failed: ' + (error instanceof Error ? error.message : 'Unknown error')); }
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

  async function recordReturnPayment() {
    if (!payingItem || !paymentAmount) return;
    try {
      const res = await fetch('/api/returns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify({ id: payingItem.id, amount: parseFloat(paymentAmount), notes: paymentNotes }),
      });
      if (res.ok) {
        setPayingItem(null);
        setPaymentAmount('');
        setPaymentNotes('');
        fetchData();
      }
    } catch (error) { console.error('Record payment failed:', error); }
  }

  const totalRefundedToClient = returns.reduce((sum, r) => sum + r.items.reduce((s, i) => s + i.refundAmount + (i.replacementRefundGiven || 0), 0), 0);
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
    <div className="returns-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div><h1 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Returns & Faulty Items</h1><p style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>Track returns, replacements, and price differences</p></div>
        <button onClick={() => setShowModal(true)} style={styles.primaryBtn}><Plus size={15} /> Process Return</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={styles.statCard}><div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Undo2 size={16} color="#3b82f6" /><div><div className="stat-value" style={styles.statValue}>{returns.length}</div><div className="stat-label" style={styles.statLabel}>Total Returns</div></div></div></div>
        <div style={styles.statCard}><div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><DollarSign size={16} color="#22c55e" /><div><div className="stat-value" style={{ ...styles.statValue, color: 'var(--success)' }}>{formatCurr(totalRefundedToClient)}</div><div className="stat-label" style={styles.statLabel}>Total Refunded</div></div></div></div>
        <div style={styles.statCard}><div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Wrench size={16} color="#f59e0b" /><div><div className="stat-value" style={{ ...styles.statValue, color: 'var(--warning)' }}>{formatCurr(totalRepairCosts)}</div><div className="stat-label" style={styles.statLabel}>Repair Costs</div></div></div></div>
        <div style={styles.statCard}><div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><ArrowUpDown size={16} color="#ec4899" /><div><div className="stat-value" style={{ ...styles.statValue, color: clientPaidDiff > 0 ? '#22c55e' : '#ef4444' }}>{formatCurr(Math.abs(clientPaidDiff))}</div><div className="stat-label" style={styles.statLabel}>{clientPaidDiff >= 0 ? 'Extra from Client' : 'Extra to Client'}</div></div></div></div>
      </div>

      <div className="search-box" style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search returns by number, product, reason..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', maxWidth: '400px', padding: '0.5rem 0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.4rem', color: 'var(--foreground)', fontSize: '0.8rem' }}
        />
      </div>

      <div className="table-responsive returns-table" style={styles.tableCard}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
          <thead>
            <tr style={{ background: 'var(--background)' }}>
              <th style={{ padding: '0.5rem 0.4rem', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: '600', whiteSpace: 'nowrap' }}>Return #</th>
              <th style={{ padding: '0.5rem 0.4rem', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: '600', whiteSpace: 'nowrap' }}>Date</th>
              <th style={{ padding: '0.5rem 0.4rem', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: '600' }}>Item</th>
              <th style={{ padding: '0.5rem 0.4rem', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: '600' }}>Replacement</th>
              <th style={{ padding: '0.5rem 0.4rem', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: '600', whiteSpace: 'nowrap' }}>Awarded</th>
              <th style={{ padding: '0.5rem 0.4rem', textAlign: 'right', color: 'var(--muted-foreground)', fontWeight: '600', whiteSpace: 'nowrap' }}>Ret Cost</th>
              <th style={{ padding: '0.5rem 0.4rem', textAlign: 'right', color: 'var(--muted-foreground)', fontWeight: '600', whiteSpace: 'nowrap' }}>Refund</th>
              <th style={{ padding: '0.5rem 0.4rem', textAlign: 'right', color: 'var(--muted-foreground)', fontWeight: '600', whiteSpace: 'nowrap' }}>Given</th>
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
                  <td style={{ padding: '0.5rem 0.4rem', whiteSpace: 'nowrap' }}>{formatShortDate(returnRecord.createdAt)}</td>
                  <td style={{ padding: '0.5rem 0.4rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {returnRecord.items.map((item: ReturnItem) => (
                      <div key={item.id} style={{ fontSize: '0.7rem', marginBottom: '0.25rem' }}>
                        <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'nowrap' }}>
                          <span style={{ color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px', whiteSpace: 'nowrap' }}>{item.product?.name}</span>
                          {item.product?.electronicsFields?.imei && (
                            <span style={{ color: 'var(--warning)', fontSize: '0.6rem', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>IMEI: {item.product.electronicsFields.imei}</span>
                          )}
                          <span style={{ color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>x{item.quantity}</span>
                        </div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--muted-foreground)' }}>{formatCurr((item.originalProductValue || item.product?.sellingPrice || 0) * item.quantity)}</div>
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
                  <td style={{ padding: '0.5rem 0.4rem', textAlign: 'right', fontWeight: '600', color: '#f59e0b', whiteSpace: 'nowrap' }}>{formatCurr(returnRecord.items.reduce((s: number, i: ReturnItem) => s + (i.returnCost || 0), 0))}</td>
                  <td style={{ padding: '0.5rem 0.4rem', textAlign: 'right', fontWeight: '600', color: 'var(--success)', whiteSpace: 'nowrap' }}>{formatCurr(returnRecord.items.reduce((s: number, i: ReturnItem) => s + (i.refundAmount || 0), 0))}</td>
                  <td style={{ padding: '0.5rem 0.4rem', textAlign: 'right', fontWeight: '600', color: '#3b82f6', whiteSpace: 'nowrap' }}>{formatCurr(returnRecord.items.reduce((s: number, i: ReturnItem) => s + (i.replacementRefundGiven || 0), 0))}</td>
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
                      <button onClick={() => viewReturn(returnRecord)} className="view-btn" style={{ ...actionBtn, background: '#3b82f620', color: 'var(--primary)' }} title="View Details">
                        <Eye size={12} />
                      </button>
                      {deleteConfirm === returnRecord.id ? (
                        <>
                          <button onClick={() => deleteReturn(returnRecord.id)} className="delete-btn" style={{ ...actionBtn, background: '#ef444420', color: 'var(--destructive)' }} title="Confirm Delete">
                            <CheckCircle size={12} />
                          </button>
                          <button onClick={() => setDeleteConfirm(null)} className="cancel-btn" style={{ ...actionBtn, background: '#64748b20', color: 'var(--muted-foreground)' }} title="Cancel">
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setDeleteConfirm(returnRecord.id)} className="delete-btn" style={{ ...actionBtn, background: '#ef444420', color: 'var(--destructive)' }} title="Delete">
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
          <div style={{ ...styles.modal, maxWidth: '860px', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 8%, transparent), transparent)' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--foreground)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RotateCcw size={16} color="white" />
                  </div>
                  Process Return
                </h2>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Add items and specify how each should be handled</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem', maxHeight: 'calc(90vh - 180px)', overflowY: 'auto' }}>
              {/* Step 1: Product Selector */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', fontSize: '0.6rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                  Select Product to Return
                </label>
                <ReturnProductSelector
                  products={soldProducts}
                  returnItems={returnItems}
                  returnedProductIds={returnedProductIds}
                  onSelect={addReturnItem}
                />
              </div>

              {/* Step 2: Return Items */}
              {returnItems.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.75rem' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: 'white', fontSize: '0.6rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
                    Return Items ({returnItems.length})
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {returnItems.map((item, idx) => {
                      const isReplacement = item.awardedType === 'REPLACEMENT';
                      const isRepair = item.awardedType === 'REPAIR';
                      const awardedTypeIcon = (type: string) => {
                        switch(type) {
                          case 'REFUND': return <DollarSign size={14} />;
                          case 'REPLACEMENT': return <ShoppingBag size={14} />;
                          case 'REPAIR': return <Wrench size={14} />;
                          default: return null;
                        }
                      };
                      return (
                        <div key={item.productId} style={{
                          background: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '0.75rem',
                          overflow: 'hidden',
                          transition: 'all 0.2s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }}>
                          {/* Item Header */}
                          <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb, var(--background) 60%, transparent)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.65rem', fontWeight: '700', flexShrink: 0 }}>
                                {idx + 1}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: '600', color: 'var(--foreground)', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product.name}</div>
                                {item.product.electronicsFields?.imei && (
                                  <div style={{ fontSize: '0.6rem', color: 'var(--warning)', fontFamily: 'monospace' }}>IMEI: {item.product.electronicsFields.imei}</div>
                                )}
                              </div>
                            </div>
                            <button onClick={() => removeReturnItem(item.productId)} style={{ width: '26px', height: '26px', borderRadius: '6px', border: 'none', background: '#ef444410', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <X size={14} />
                            </button>
                          </div>

                          {/* Item Body */}
                          <div style={{ padding: '0.75rem 1rem' }}>
                            {/* Controls Row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.6rem', color: 'var(--muted-foreground)', marginBottom: '0.2rem', fontWeight: '500' }}>Qty</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <button onClick={() => { const q = Math.max(1, (item.quantity || 1) - 1); updateReturnItem(item.productId, 'quantity', q); }} style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '600' }}>-</button>
                                  <input type="number" min="1" value={item.quantity} onChange={(e) => updateReturnItem(item.productId, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} style={{ width: '36px', padding: '0.3rem 0.15rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--background)', color: 'var(--foreground)', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600' }} />
                                  <button onClick={() => { updateReturnItem(item.productId, 'quantity', (item.quantity || 1) + 1); }} style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '600' }}>+</button>
                                </div>
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.6rem', color: 'var(--muted-foreground)', marginBottom: '0.2rem', fontWeight: '500' }}>
                                  Return Cost <span style={{ color: isRepair ? 'var(--muted-foreground)' : '#f59e0b', fontWeight: '400' }}>(loss)</span>
                                </label>
                                <input type="number" min="0" step="0.01" value={item.returnCost || ''} onChange={(e) => updateReturnItem(item.productId, 'returnCost', parseFloat(e.target.value) || 0)} disabled={isRepair} style={{ width: '100%', padding: '0.35rem 0.5rem', border: `1px solid ${isRepair ? 'var(--border)' : '#f59e0b'}`, borderRadius: '6px', background: isRepair ? 'transparent' : 'var(--background)', color: isRepair ? 'var(--muted-foreground)' : '#f59e0b', fontSize: '0.75rem', fontWeight: '600', opacity: isRepair ? 0.4 : 1 }} placeholder={isRepair ? 'N/A for Repair' : '0.00'} />
                              </div>
                            </div>

                            {/* Awarded Type Selector */}
                            <div style={{ marginBottom: '0.75rem' }}>
                              <label style={{ display: 'block', fontSize: '0.6rem', color: 'var(--muted-foreground)', marginBottom: '0.35rem', fontWeight: '500' }}>Awarded Type</label>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
                                {[
                                  { value: 'REFUND', label: 'Money Back', icon: DollarSign, color: '#22c55e', bg: '#22c55e10' },
                                  { value: 'REPLACEMENT', label: 'New Product', icon: ShoppingBag, color: '#3b82f6', bg: '#3b82f610' },
                                  { value: 'REPAIR', label: 'Repair Cost', icon: Wrench, color: '#f59e0b', bg: '#f59e0b10' },
                                ].map(opt => {
                                  const isActive = item.awardedType === opt.value;
                                  const Icon = opt.icon;
                                  return (
                                    <button key={opt.value} onClick={() => updateReturnItem(item.productId, 'awardedType', opt.value)} style={{
                                      padding: '0.5rem 0.4rem',
                                      borderRadius: '8px',
                                      border: `2px solid ${isActive ? opt.color : 'var(--border)'}`,
                                      background: isActive ? `${opt.color}15` : 'var(--background)',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '0.3rem',
                                      transition: 'all 0.15s',
                                      fontSize: '0.7rem',
                                      fontWeight: isActive ? '700' : '500',
                                      color: isActive ? opt.color : 'var(--muted-foreground)',
                                    }}>
                                      <Icon size={14} />
                                      {opt.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Supplier */}
                            <div style={{ marginBottom: '0.75rem' }}>
                              <label style={{ display: 'block', fontSize: '0.6rem', color: 'var(--muted-foreground)', marginBottom: '0.2rem', fontWeight: '500' }}>Supplier</label>
                              <select value={item.supplierId || ''} onChange={(e) => updateReturnItem(item.productId, 'supplierId', e.target.value)} style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.75rem' }}>
                                <option value="">Select supplier</option>
                                {[...suppliers].sort((a, b) => a.name.localeCompare(b.name)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                            </div>

                            {/* Replacement Details */}
                            {isReplacement && (
                              <div style={{ border: '1px dashed #3b82f6', borderRadius: '8px', padding: '0.75rem', background: '#3b82f605' }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: '600', color: '#3b82f6', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <ShoppingBag size={13} /> Replacement Product
                                </div>
                                <label style={{ display: 'block', fontSize: '0.6rem', color: 'var(--muted-foreground)', marginBottom: '0.2rem', fontWeight: '500' }}>Select Replacement Product</label>
                                <select value={item.replacementProductId || ''} onChange={(e) => updateReturnItem(item.productId, 'replacementProductId', e.target.value)} style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                                  <option value="">Select replacement product</option>
                                  {products.filter(p => {
                                    if (p.stockQuantity < 1) return false;
                                    if (p.id === item.productId && p.electronicsFields?.imei) return false;
                                    return true;
                                  }).map(p => (
                                    <option key={p.id} value={p.id}>{p.name}{p.electronicsFields?.imei ? ` [IMEI: ${p.electronicsFields.imei}]` : ''} (Stock: {p.stockQuantity})</option>
                                  ))}
                                </select>
                                {item.replacementProductPrice > 0 && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.5rem', background: 'var(--background)', borderRadius: '6px', fontSize: '0.7rem', marginBottom: '0.5rem' }}>
                                    <span style={{ color: 'var(--muted-foreground)' }}>Price diff:</span>
                                    <span style={{ fontWeight: '700', color: item.priceDifference > 0 ? '#22c55e' : item.priceDifference < 0 ? '#ef4444' : 'var(--muted-foreground)' }}>
                                      {item.priceDifference > 0 ? '+' : ''}{formatCurr(item.priceDifference)}
                                    </span>
                                    {item.priceDifference > 0 && <span style={{ fontSize: '0.6rem', color: '#22c55e', fontWeight: '600' }}>— Client pays extra</span>}
                                    {item.priceDifference < 0 && <span style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: '600' }}>— Business owes client</span>}
                                    {item.priceDifference === 0 && <span style={{ fontSize: '0.6rem', color: 'var(--muted-foreground)' }}>— Equal value</span>}
                                  </div>
                                )}
                                {item.priceDifference > 0 && item.differencePaidBy === 'CLIENT' && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                          <label style={{ fontSize: '0.6rem', color: 'var(--muted-foreground)', fontWeight: '500' }}>Payment Method</label>
                                          <select value={item.replacementPaymentMethod || 'CASH'} onChange={(e) => updateReturnItem(item.productId, 'replacementPaymentMethod', e.target.value)} style={{ width: '100%', padding: '0.3rem 0.4rem', border: '1px solid #22c55e', borderRadius: '6px', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.7rem' }}>
                                            <option value="CASH">Cash</option>
                                            <option value="CARD">Card</option>
                                            <option value="MOBILE">Mobile</option>
                                          </select>
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                          <label style={{ fontSize: '0.6rem', color: '#22c55e', fontWeight: '500' }}>Paid Amount</label>
                                          <input type="number" min="0" step="0.01" value={item.replacementPaidAmount ?? ''} onChange={(e) => updateReturnItem(item.productId, 'replacementPaidAmount', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '0.3rem 0.4rem', border: '1px solid #22c55e', borderRadius: '6px', background: 'var(--background)', color: '#22c55e', textAlign: 'right', fontSize: '0.7rem', fontWeight: '600' }} placeholder="0.00" />
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                          <label style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: '500' }}>Discount</label>
                                          <input type="number" min="0" step="0.01" value={item.replacementDiscount ?? ''} onChange={(e) => updateReturnItem(item.productId, 'replacementDiscount', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '0.3rem 0.4rem', border: '1px solid #ef4444', borderRadius: '6px', background: 'var(--background)', color: '#ef4444', textAlign: 'right', fontSize: '0.7rem', fontWeight: '600' }} placeholder="0.00" />
                                        </div>
                                      </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--muted-foreground)', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={item.replacementIsInstallment || false} onChange={(e) => updateReturnItem(item.productId, 'replacementIsInstallment', e.target.checked)} style={{ margin: 0 }} />
                                        Installment
                                      </label>
                                    </div>
                                    {item.replacementIsInstallment && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        <div style={{ fontSize: '0.6rem', fontWeight: '600', color: '#f59e0b', marginBottom: '0.15rem' }}>Installment Details</div>
                                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                          <div style={{ flex: 1, minWidth: '120px', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                            <label style={{ fontSize: '0.6rem', color: 'var(--muted-foreground)', fontWeight: '500' }}>Customer Name</label>
                                            <input type="text" value={item.replacementInstallmentCustomerName ?? ''} onChange={(e) => updateReturnItem(item.productId, 'replacementInstallmentCustomerName', e.target.value)} style={{ width: '100%', padding: '0.3rem 0.4rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.7rem' }} placeholder="Enter name" />
                                          </div>
                                          <div style={{ flex: 1, minWidth: '100px', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                            <label style={{ fontSize: '0.6rem', color: 'var(--muted-foreground)', fontWeight: '500' }}>Phone</label>
                                            <input type="text" value={item.replacementInstallmentCustomerPhone ?? ''} onChange={(e) => updateReturnItem(item.productId, 'replacementInstallmentCustomerPhone', e.target.value)} style={{ width: '100%', padding: '0.3rem 0.4rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.7rem' }} placeholder="Enter phone" />
                                          </div>
                                          <div style={{ width: '100px', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                            <label style={{ fontSize: '0.6rem', color: '#f59e0b', fontWeight: '500' }}>Upfront</label>
                                            <input type="number" min="0" step="0.01" value={item.replacementInstallmentPaid ?? ''} onChange={(e) => updateReturnItem(item.productId, 'replacementInstallmentPaid', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '0.3rem 0.4rem', border: '1px solid #f59e0b', borderRadius: '6px', background: 'var(--background)', color: '#f59e0b', textAlign: 'right', fontSize: '0.7rem', fontWeight: '600' }} placeholder="0.00" />
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  </div>
                                )}
                                {item.priceDifference < 0 && item.differencePaidBy === 'BUSINESS' && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', padding: '0.3rem 0.5rem', background: '#ef444405', borderRadius: '6px', border: '1px solid #ef444420' }}>
                                    <label style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: '500' }}>Refund to Client</label>
                                    <input type="number" min="0" step="0.01" value={item.replacementRefundGiven ?? Math.abs(item.priceDifference || 0)} onChange={(e) => updateReturnItem(item.productId, 'replacementRefundGiven', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '0.25rem 0.4rem', border: '1px solid #ef4444', borderRadius: '6px', background: 'var(--background)', color: '#ef4444', textAlign: 'right', fontSize: '0.7rem', fontWeight: '600' }} placeholder="0.00" />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Repair Details */}
                            {isRepair && (
                              <div style={{ border: '1px dashed #f59e0b', borderRadius: '8px', padding: '0.75rem', background: '#f59e0b05' }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: '600', color: '#f59e0b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <Wrench size={13} /> Repair Cost (required)
                                </div>
                                <input type="number" placeholder="Enter repair cost" value={item.repairCost || ''} onChange={(e) => updateReturnItem(item.productId, 'repairCost', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #f59e0b', borderRadius: '6px', background: 'var(--background)', color: '#f59e0b', fontSize: '0.75rem', fontWeight: '600' }} min="0" step="0.01" />
                              </div>
                            )}

                            {/* Refund Amount (for REFUND only) */}
                            {item.awardedType === 'REFUND' && (
                              <div style={{ padding: '0.4rem 0.5rem', background: '#22c55e08', borderRadius: '6px', border: '1px solid #22c55e20', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <DollarSign size={14} color="#22c55e" />
                                <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>Refund Amount:</span>
                                <input type="number" min="0" step="0.01" value={item.awardedAmount || ''} onChange={(e) => updateReturnItem(item.productId, 'awardedAmount', parseFloat(e.target.value) || 0)} style={{ flex: 1, padding: '0.25rem 0.4rem', border: '1px solid #22c55e', borderRadius: '6px', background: 'var(--background)', color: '#22c55e', textAlign: 'right', fontSize: '0.75rem', fontWeight: '700' }} placeholder="0.00" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Return Reason */}
              <div>
                <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', fontSize: '0.6rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
                  Return Reason
                </label>
                <textarea
                  placeholder="Describe why this product is being returned..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  rows={2}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--foreground)', fontSize: '0.8rem', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            {/* Bottom Bar */}
            <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'color-mix(in srgb, var(--background) 50%, transparent)' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                  Items: <strong style={{ color: 'var(--foreground)' }}>{returnItems.length}</strong>
                </span>
                {returnItems.length > 0 && (
                  <>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                      Total Refund: <strong style={{ color: '#22c55e' }}>{formatCurr(returnItems.reduce((s, i) => s + (i.awardedAmount || 0), 0))}</strong>
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                      Repair Costs: <strong style={{ color: '#f59e0b' }}>{formatCurr(returnItems.reduce((s, i) => s + (i.repairCost || 0), 0))}</strong>
                    </span>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setShowModal(false)} style={{ padding: '0.45rem 0.9rem', background: 'var(--secondary)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '0.75rem' }}>Cancel</button>
                <button onClick={handleSubmit} disabled={returnItems.length === 0 || !reason} style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1rem',
                  background: returnItems.length > 0 && reason ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'var(--border)',
                  border: 'none', borderRadius: '8px', color: 'white', cursor: returnItems.length > 0 && reason ? 'pointer' : 'not-allowed',
                  fontWeight: '600', fontSize: '0.75rem', opacity: returnItems.length > 0 && reason ? 1 : 0.5,
                  transition: 'all 0.15s',
                }}>
                  <BadgeCheck size={15} />
                  Process Return
                </button>
              </div>
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
                      <th style={{ padding: '0.35rem 0.3rem', textAlign: 'right', color: 'var(--muted-foreground)', fontWeight: '500' }}>Return Cost</th>
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
                            {item.product?.electronicsFields?.imei && (
                              <div style={{ fontSize: '0.55rem', color: 'var(--warning)', fontFamily: 'monospace' }}>IMEI: {item.product.electronicsFields.imei}</div>
                            )}
                          </td>
                          <td style={{ padding: '0.35rem 0.3rem', textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ padding: '0.35rem 0.3rem', textAlign: 'right', fontWeight: '600', color: item.awardedType === 'REPAIR' ? 'var(--muted-foreground)' : '#f59e0b', fontSize: '0.75rem', opacity: item.awardedType === 'REPAIR' ? 0.4 : 1, textDecoration: item.awardedType === 'REPAIR' ? 'line-through' : 'none' }}>{formatCurr(item.returnCost || 0)}</td>
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
                                {(item.priceDifference ?? 0) > 0 && item.differencePaidBy === 'CLIENT' && item.replacementPaidAmount !== undefined && (
                                  <div style={{ marginTop: '0.3rem', fontSize: '0.6rem', borderTop: '1px dashed #334155', paddingTop: '0.25rem' }}>
                                    <div style={{ color: '#22c55e' }}>Paid: {formatCurr(item.replacementPaidAmount)} {item.replacementPaymentMethod ? `(${item.replacementPaymentMethod})` : ''}</div>
                                    {(item.replacementDiscount || 0) > 0 && <div style={{ color: '#ef4444' }}>Discount: {formatCurr(item.replacementDiscount || 0)}</div>}
                                    {item.replacementIsInstallment && (
                                      <div>
                                        <div style={{ color: '#f59e0b' }}>Installment — Paid: {formatCurr(item.replacementInstallmentPaid || 0)} / Total: {formatCurr(item.replacementInstallmentTotal || 0)}</div>
                                        {item.replacementInstallmentCustomerName && <div style={{ color: 'var(--muted-foreground)' }}>Customer: {item.replacementInstallmentCustomerName}{item.replacementInstallmentCustomerPhone ? ` (${item.replacementInstallmentCustomerPhone})` : ''}</div>}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {(item.priceDifference ?? 0) < 0 && item.differencePaidBy === 'BUSINESS' && (
                                  <div style={{ marginTop: '0.3rem', fontSize: '0.6rem', borderTop: '1px dashed #334155', paddingTop: '0.25rem' }}>
                                    <div style={{ color: '#ef4444' }}>Refunded to client: {formatCurr(item.replacementRefundGiven || 0)}</div>
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

            {selectedReturn.items.filter((i: ReturnItem) => i.replacementIsInstallment).length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={styles.label}>Installment Payments</label>
                {selectedReturn.items.filter((i: ReturnItem) => i.replacementIsInstallment).map((item: ReturnItem) => (
                  <div key={item.id} style={{ background: 'var(--background)', borderRadius: '0.4rem', padding: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <div>
                        <span style={{ fontWeight: '600', fontSize: '0.75rem' }}>{item.product?.name}</span>
                        {item.replacementInstallmentCustomerName && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)', marginLeft: '0.5rem' }}>
                            {item.replacementInstallmentCustomerName}{item.replacementInstallmentCustomerPhone ? ` (${item.replacementInstallmentCustomerPhone})` : ''}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>
                        Paid: <strong style={{ color: '#22c55e' }}>{formatCurr(item.replacementInstallmentPaid || 0)}</strong>
                        {' / '}Total: <strong>{formatCurr(item.replacementInstallmentTotal || 0)}</strong>
                        {' — Due: '}<strong style={{ color: ((item.replacementInstallmentTotal || 0) - (item.replacementInstallmentPaid || 0)) > 0 ? '#f59e0b' : '#22c55e' }}>
                          {formatCurr(Math.max(0, (item.replacementInstallmentTotal || 0) - (item.replacementInstallmentPaid || 0)))}
                        </strong>
                      </span>
                    </div>
                    {(item.returnInstallmentPayments || []).length > 0 && (
                      <div style={{ marginTop: '0.3rem', fontSize: '0.65rem' }}>
                        <div style={{ color: 'var(--muted-foreground)', marginBottom: '0.15rem' }}>Payment History:</div>
                        {(item.returnInstallmentPayments || []).map((p: ReturnInstallmentPayment) => (
                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0', borderBottom: '1px solid #1e293b' }}>
                            <span style={{ color: 'var(--muted-foreground)' }}>{p.paidAt ? formatDate(p.paidAt) : '-'}</span>
                            <span style={{ color: '#22c55e' }}>+{formatCurr(p.amountPaid)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {((item.replacementInstallmentTotal || 0) - (item.replacementInstallmentPaid || 0)) > 0 && (
                      <button onClick={() => { setPayingItem(item); setPaymentAmount(''); setPaymentNotes(''); }} style={{ marginTop: '0.4rem', padding: '0.3rem 0.6rem', background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: '0.3rem', color: 'white', cursor: 'pointer', fontSize: '0.65rem', fontWeight: '600' }}>
                        Record Payment
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowViewModal(false)} style={styles.primaryBtn}>Close</button>
            </div>
          </div>
        </div>
      )}

      {payingItem && (
        <div style={styles.modalOverlay} onClick={() => setPayingItem(null)}>
          <div style={{ ...styles.modal, maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--foreground)' }}>Record Installment Payment</h2>
              <button onClick={() => setPayingItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: '0.75rem', padding: '0.5rem', background: 'var(--background)', borderRadius: '0.4rem', fontSize: '0.75rem' }}>
              <div><strong>{payingItem.product?.name}</strong></div>
              <div>Total: {formatCurr(payingItem.replacementInstallmentTotal || 0)}</div>
              <div>Paid: <span style={{ color: '#22c55e' }}>{formatCurr(payingItem.replacementInstallmentPaid || 0)}</span></div>
              <div>Due: <span style={{ color: '#f59e0b' }}>{formatCurr(Math.max(0, (payingItem.replacementInstallmentTotal || 0) - (payingItem.replacementInstallmentPaid || 0)))}</span></div>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={styles.label}>Payment Amount</label>
              <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" style={styles.input} />
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={styles.label}>Notes (optional)</label>
              <input type="text" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="Payment notes" style={styles.input} />
            </div>
            <button onClick={recordReturnPayment} disabled={!paymentAmount} style={{ ...styles.primaryBtn, width: '100%', justifyContent: 'center', opacity: !paymentAmount ? 0.5 : 1 }}>
              Record Payment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReturnProductSelector({ products, returnItems, returnedProductIds, onSelect }: {
  products: Product[];
  returnItems: any[];
  returnedProductIds: Set<string>;
  onSelect: (product: Product) => void;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = products.filter(p => {
    if (returnItems.find(item => item.productId === p.id)) return false;
    if (returnedProductIds.has(p.id) && !p.electronicsFields?.imei) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const a: any = p;
    const ef = a.electronicsFields;
    const cf = a.clothingFields;
    const lf = a.liquorFields;
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      (a.barcode && a.barcode.toLowerCase().includes(q)) ||
      (a.brand && a.brand.toLowerCase().includes(q)) ||
      (ef?.imei && ef.imei.toLowerCase().includes(q)) ||
      (ef?.brand && ef.brand.toLowerCase().includes(q)) ||
      (ef?.model && ef.model.toLowerCase().includes(q)) ||
      (ef?.color && ef.color.toLowerCase().includes(q)) ||
      (ef?.storage && ef.storage.toLowerCase().includes(q)) ||
      (ef?.serialNumber && ef.serialNumber.toLowerCase().includes(q)) ||
      (ef?.condition && ef.condition.toLowerCase().includes(q)) ||
      (cf?.size && cf.size.toLowerCase().includes(q)) ||
      (cf?.color && cf.color.toLowerCase().includes(q)) ||
      (cf?.brand && cf.brand.toLowerCase().includes(q)) ||
      (lf?.brand && lf.brand.toLowerCase().includes(q))
    );
  });

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.75rem', background: 'var(--background)', border: `1px solid ${open ? '#3b82f6' : 'var(--border)'}`, borderRadius: '8px', transition: 'border-color 0.15s', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <Search size={16} color="var(--muted-foreground)" />
        <input
          type="text"
          placeholder="Search product by name, barcode, or IMEI..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          style={{ flex: 1, border: 'none', background: 'transparent', color: 'var(--foreground)', fontSize: '0.8rem', outline: 'none' }}
        />
        <ChevronDown size={14} color="var(--muted-foreground)" style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.35rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', maxHeight: '220px', overflowY: 'auto', zIndex: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>{search ? 'No products match your search' : 'No available products'}</div>
          ) : filtered.slice(0, 20).map(p => (
            <button key={p.id} onClick={() => { onSelect(p); setSearch(''); setOpen(false); }} style={{ width: '100%', padding: '0.5rem 0.75rem', border: 'none', borderBottom: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', textAlign: 'left', color: 'var(--foreground)', fontSize: '0.75rem', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--primary) 8%, transparent)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Package size={13} color="white" />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--muted-foreground)' }}>
                  {p.electronicsFields?.imei ? `IMEI: ${p.electronicsFields.imei}` : `${formatCurrency(p.sellingPrice, 'TZS')} | Stock: ${p.stockQuantity}`}
                </div>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap', padding: '0.15rem 0.5rem', background: 'var(--background)', borderRadius: '4px' }}>
                Stock: {p.stockQuantity}
              </div>
            </button>
          ))}
          {filtered.length > 20 && <div style={{ padding: '0.4rem 0.75rem', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.65rem' }}>+{filtered.length - 20} more results. Type to narrow search.</div>}
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
