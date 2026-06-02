'use client';

import { useEffect, useState } from 'react';
import { FileText, DollarSign, Phone, User, Calendar, CheckCircle, Clock, AlertTriangle, X, Plus, CreditCard, Eye, Trash2, Search, Filter, Check, Printer } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';

interface InstallmentPayment {
  id: string;
  amount: number;
  amountPaid: number;
  balance: number;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
}

interface InstallmentSale {
  id: string;
  receiptNumber: string;
  total: number;
  paymentMethod: string;
  saleType: string;
  amountPaid: number;
  isInstallment: boolean;
  installmentTotal: number;
  installmentPaid: number;
  installmentDue: number;
  customerName: string | null;
  customerPhone: string | null;
  nextPaymentDate: string | null;
  createdAt: string;
  cashier: { name: string };
  items: { id: string; product: { name: string }; quantity: number; total: number }[];
  payments: InstallmentPayment[];
}

export default function InstallmentsPage() {
  const { shop } = useAuth();
  const [sales, setSales] = useState<InstallmentSale[]>([]);
  const [completedSales, setCompletedSales] = useState<InstallmentSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<InstallmentSale | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastPayment, setLastPayment] = useState<{ amount: number; date: string; balance: number } | null>(null);
  const [filter, setFilter] = useState<'active' | 'completed'>('active');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { fetchInstallments(); }, [shop]);

  async function fetchInstallments() {
    try {
      const res = await fetch('/api/sales?installment=true', {
        headers: { 'x-shop-id': shop?.id || '' }
      });
      const data = await res.json();
      const allSales = data.sales || [];
      
      const active = allSales.filter((s: InstallmentSale) => (s.installmentDue || 0) > 0);
      const completed = allSales.filter((s: InstallmentSale) => (s.installmentDue || 0) <= 0);
      
      setSales(active);
      setCompletedSales(completed);
    } catch (error) {
      console.error('Failed to fetch installments:', error);
    } finally {
      setLoading(false);
    }
  }

  function showNotification(message: string, type: 'success' | 'error') {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }

  async function recordPayment() {
    if (!selectedSale || !paymentAmount) return;
    try {
      const res = await fetch('/api/sales', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shop?.id || '' },
        body: JSON.stringify({
          id: selectedSale.id,
          amount: parseFloat(paymentAmount),
          notes: paymentNotes,
        }),
      });
      if (res.ok) {
        const paymentAmountNum = parseFloat(paymentAmount);
        const newBalance = (selectedSale.installmentDue || 0) - paymentAmountNum;
        setLastPayment({
          amount: paymentAmountNum,
          date: new Date().toISOString(),
          balance: newBalance,
        });
        showNotification('Payment recorded successfully!', 'success');
        setShowPaymentModal(false);
        setShowReceiptModal(true);
        setPaymentAmount('');
        setPaymentNotes('');
        fetchInstallments();
      }
    } catch (error) {
      showNotification('Failed to record payment', 'error');
    }
  }

  function printReceipt() {
    if (!selectedSale || !lastPayment) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const remainingBalance = lastPayment.balance;
    const payments = selectedSale.payments || [];

    const itemsHtml = selectedSale.items.map(item => {
      return '<div class="item-row"><span>' + item.product.name + '</span><span>' + item.quantity + '</span><span>' + formatCurrency(item.total) + '</span></div>';
    }).join('');

    const historyHtml = payments.length > 0 ? '<div class="history"><h3>Payment History</h3>' + 
      payments.slice(0, 5).map(p => '<div class="history-item"><span>' + (p.paidAt ? formatDate(p.paidAt) : '-') + '</span><span>' + formatCurrency(p.amount) + '</span></div>').join('') + 
      '</div>' : '';

    let html = '<!DOCTYPE html><html><head><title>Payment Receipt - ' + selectedSale.receiptNumber + '</title><style>' +
      '* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: "Segoe UI", Tahoma, sans-serif; padding: 20px; color: #333; } ' +
      '.receipt { max-width: 300px; margin: 0 auto; border: 1px solid #ddd; padding: 15px; } ' +
      '.header { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #333; padding-bottom: 10px; } ' +
      '.header h1 { font-size: 18px; margin-bottom: 5px; } .header p { font-size: 12px; color: #666; } ' +
      '.info { margin-bottom: 15px; } .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px; } ' +
      '.info-row span:first-child { font-weight: bold; } .items { border-top: 1px dashed #333; border-bottom: 1px dashed #333; padding: 10px 0; margin: 10px 0; } ' +
      '.item-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; } ' +
      '.payment-section { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 4px; } ' +
      '.payment-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px; } ' +
      '.payment-row.total { font-weight: bold; font-size: 14px; border-top: 1px solid #ddd; padding-top: 5px; margin-top: 5px; } ' +
      '.payment-row.due { color: #e74c3c; } .payment-row.paid { color: #27ae60; } ' +
      '.history { margin-top: 15px; } .history h3 { font-size: 13px; margin-bottom: 8px; } ' +
      '.history-item { font-size: 11px; display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dotted #eee; } ' +
      '.footer { text-align: center; margin-top: 15px; font-size: 10px; color: #666; } ' +
      '@media print { body { padding: 0; } .receipt { border: none; } }' +
      '</style></head><body>' +
      '<div class="receipt">' +
      '<div class="header"><h1>Payment Receipt</h1><p>' + selectedSale.receiptNumber + '</p></div>' +
      '<div class="info">' +
      '<div class="info-row"><span>Date:</span><span>' + formatDate(new Date().toISOString()) + '</span></div>' +
      '<div class="info-row"><span>Customer:</span><span>' + (selectedSale.customerName || 'N/A') + '</span></div>' +
      (selectedSale.customerPhone ? '<div class="info-row"><span>Phone:</span><span>' + selectedSale.customerPhone + '</span></div>' : '') +
      '<div class="info-row"><span>Cashier:</span><span>' + selectedSale.cashier.name + '</span></div>' +
      '</div>' +
      '<div class="items"><div class="item-row" style="font-weight:bold;"><span>Items</span><span>Qty</span><span>Price</span></div>' + itemsHtml + '</div>' +
      '<div class="payment-section">' +
      '<div class="payment-row"><span>Total Amount:</span><span>' + formatCurrency(selectedSale.installmentTotal || selectedSale.total) + '</span></div>' +
      '<div class="payment-row"><span>Previous Paid:</span><span>' + formatCurrency(selectedSale.installmentPaid || 0) + '</span></div>' +
      '<div class="payment-row paid"><span>Amount Paid:</span><span>' + formatCurrency(lastPayment.amount) + '</span></div>' +
      '<div class="payment-row total ' + (remainingBalance > 0 ? 'due' : 'paid') + '"><span>Balance Due:</span><span>' + formatCurrency(remainingBalance) + '</span></div>' +
      '</div>' +
      historyHtml +
      '<div class="footer"><p>Thank you for your payment!</p><p>Please keep this receipt for your records</p></div>' +
      '</div></body></html>';

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }

  async function callCustomer(phone: string) {
    window.location.href = `tel:${phone}`;
  }

  const displaySales = filter === 'active' ? sales : completedSales;
  const filteredSales = displaySales.filter(s => 
    s.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.customerPhone?.includes(searchTerm)
  );

  const totalDue = sales.reduce((sum, s) => sum + (s.installmentDue || 0), 0);
  const totalPaid = sales.reduce((sum, s) => sum + (s.installmentPaid || 0), 0);
  const overdueCount = sales.filter(s => s.nextPaymentDate && new Date(s.nextPaymentDate) < new Date()).length;

  if (loading) return <div style={styles.loading}>Loading...</div>;

  return (
    <div style={styles.container} className="page-container installments-page">
      {notification && (
        <div style={{ ...styles.notification, background: notification.type === 'success' ? '#22c55e' : '#ef4444' }}>
          {notification.message}
        </div>
      )}

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}><CreditCard size={28} /> Installments / Credit Sales</h1>
          <p style={styles.subtitle}>Track and manage credit sales and payments</p>
        </div>
      </div>

      <div style={styles.statsGrid} className="stats-grid">
        <div style={styles.statCard}>
          <div style={styles.statIcon} className="stat-icon"><FileText size={24} /></div>
          <div>
            <div style={styles.statValue} className="stat-value">{sales.length}</div>
            <div style={styles.statLabel} className="stat-label">Active Credits</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #f59e0b, #d97706)' }} className="stat-icon"><DollarSign size={24} /></div>
          <div>
            <div style={{ ...styles.statValue, color: 'var(--warning)' }} className="stat-value">{formatCurrency(totalDue)}</div>
            <div style={styles.statLabel} className="stat-label">Total Due</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #22c55e, #16a34a)' }} className="stat-icon"><CheckCircle size={24} /></div>
          <div>
            <div style={{ ...styles.statValue, color: 'var(--success)' }} className="stat-value">{formatCurrency(totalPaid)}</div>
            <div style={styles.statLabel} className="stat-label">Total Paid</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #ef4444, #dc2626)' }} className="stat-icon"><AlertTriangle size={24} /></div>
          <div>
            <div style={{ ...styles.statValue, color: 'var(--destructive)' }} className="stat-value">{overdueCount}</div>
            <div style={styles.statLabel} className="stat-label">Overdue</div>
          </div>
        </div>
      </div>

      <div style={styles.filtersRow}>
        <div style={styles.filterTabs}>
          <button
            onClick={() => setFilter('active')}
            style={{ ...styles.filterTab, ...(filter === 'active' ? styles.filterTabActive : {}) }}
            className="filter-tab"
          >
            <Clock size={16} /> Active ({sales.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            style={{ ...styles.filterTab, ...(filter === 'completed' ? styles.filterTabActive : {}) }}
            className="filter-tab"
          >
            <CheckCircle size={16} /> Completed ({completedSales.length})
          </button>
        </div>
        <div style={styles.searchBox} className="search-box">
          <Search size={18} style={{ color: 'var(--muted-foreground)' }} />
          <input
            type="text"
            placeholder="Search by name, phone, receipt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </div>

      <div style={styles.tableCard} className="installments-table-wrap">
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Receipt #</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Due</th>
              <th>Next Payment</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map(sale => (
              <tr key={sale.id}>
                <td style={{ fontWeight: '600' }}>{sale.receiptNumber}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={14} />
                    <div>
                      <div>{sale.customerName || 'N/A'}</div>
                      {sale.customerPhone && <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{sale.customerPhone}</div>}
                    </div>
                  </div>
                </td>
                <td style={{ fontWeight: '600' }}>{formatCurrency(sale.installmentTotal || sale.total)}</td>
                <td style={{ color: 'var(--success)' }}>{formatCurrency(sale.installmentPaid || 0)}</td>
                <td style={{ fontWeight: '600', color: (sale.installmentDue || 0) > 0 ? '#f59e0b' : '#22c55e' }}>
                  {formatCurrency(sale.installmentDue || 0)}
                </td>
                <td>
                  {sale.nextPaymentDate ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar size={14} />
                      {formatDate(sale.nextPaymentDate)}
                    </div>
                  ) : '-'}
                </td>
                <td>
                  {(sale.installmentDue || 0) <= 0 ? (
                    <span style={styles.paidBadge}>Paid Off</span>
                  ) : new Date(sale.nextPaymentDate || '') < new Date() ? (
                    <span style={styles.overdueBadge}>Overdue</span>
                  ) : (
                    <span style={styles.activeBadge}>Active</span>
                  )}
                </td>
                <td>
                  <div style={styles.actionButtons}>
                    {filter === 'active' && (
                      <>
                        <button
                          onClick={() => { setSelectedSale(sale); setShowPaymentModal(true); }}
                          style={styles.payBtn}
                          title="Record Payment"
                          className="pay-btn"
                        >
                          <DollarSign size={14} />
                        </button>
                        {sale.customerPhone && (
                          <button
                            onClick={() => callCustomer(sale.customerPhone!)}
                            style={styles.callBtn}
                            title="Call Customer"
                            className="call-btn"
                          >
                            <Phone size={14} />
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => { setSelectedSale(sale); setShowDetailsModal(true); }}
                      style={styles.viewBtn}
                      title="View Details"
                      className="view-btn"
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredSales.length === 0 && (
          <div style={styles.emptyState}>
            <CreditCard size={48} style={{ opacity: 0.3 }} />
            <p>{filter === 'active' ? 'No active installments' : 'No completed installments yet'}</p>
          </div>
        )}
      </div>

      {showPaymentModal && selectedSale && (
        <div style={styles.modalOverlay} onClick={() => setShowPaymentModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2><DollarSign size={20} /> Record Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} style={styles.closeBtn}><X size={20} /></button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.saleInfo}>
                <div><strong>Receipt:</strong> {selectedSale.receiptNumber}</div>
                <div><strong>Customer:</strong> {selectedSale.customerName || 'N/A'}</div>
                <div><strong>Total:</strong> {formatCurrency(selectedSale.installmentTotal || selectedSale.total)}</div>
                <div><strong>Already Paid:</strong> {formatCurrency(selectedSale.installmentPaid || 0)}</div>
                <div><strong>Due:</strong> {formatCurrency(selectedSale.installmentDue || 0)}</div>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Payment Amount</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  style={styles.input}
                  min="0"
                  step="0.01"
                  max={selectedSale.installmentDue || undefined}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Notes (optional)</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Payment notes"
                  style={styles.input}
                />
              </div>
              <button onClick={recordPayment} style={styles.submitBtn}>
                <CheckCircle size={18} /> Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && selectedSale && (
        <div style={styles.modalOverlay} onClick={() => setShowDetailsModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2><Eye size={20} /> Sale Details</h2>
              <button onClick={() => setShowDetailsModal(false)} style={styles.closeBtn}><X size={20} /></button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.saleInfo}>
                <div><strong>Receipt:</strong> {selectedSale.receiptNumber}</div>
                <div><strong>Date:</strong> {formatDate(selectedSale.createdAt)}</div>
                <div><strong>Customer:</strong> {selectedSale.customerName || 'N/A'}</div>
                {selectedSale.customerPhone && <div><strong>Phone:</strong> {selectedSale.customerPhone}</div>}
                <div><strong>Cashier:</strong> {selectedSale.cashier.name}</div>
              </div>
              <div style={styles.itemsList}>
                <h4 style={{ marginBottom: '0.5rem', color: 'var(--muted-foreground)' }}>Items Purchased</h4>
                {selectedSale.items.map(item => (
                  <div key={item.id} style={styles.itemRow}>
                    <span>{item.product.name} x{item.quantity}</span>
                    <span style={{ fontWeight: '600' }}>{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
              <div style={styles.paymentSummary}>
                <div style={styles.summaryRow}><span>Total</span><span>{formatCurrency(selectedSale.installmentTotal || selectedSale.total)}</span></div>
                <div style={styles.summaryRow}><span>Paid</span><span style={{ color: 'var(--success)' }}>{formatCurrency(selectedSale.installmentPaid || 0)}</span></div>
                <div style={{ ...styles.summaryRow, borderTop: '1px solid #334155', paddingTop: '0.5rem' }}>
                  <span>Balance</span>
                  <span style={{ fontWeight: '700', color: (selectedSale.installmentDue || 0) > 0 ? '#f59e0b' : '#22c55e' }}>
                    {formatCurrency(selectedSale.installmentDue || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReceiptModal && selectedSale && lastPayment && (
        <div style={styles.modalOverlay} onClick={() => setShowReceiptModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2><FileText size={20} /> Payment Receipt</h2>
              <button onClick={() => setShowReceiptModal(false)} style={styles.closeBtn}><X size={20} /></button>
            </div>
            <div style={styles.modalBody}>
              <div style={{ ...styles.saleInfo, textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem' }}>{selectedSale.receiptNumber}</div>
                <div><strong>Customer:</strong> {selectedSale.customerName || 'N/A'}</div>
                <div><strong>Date:</strong> {formatDate(new Date().toISOString())}</div>
              </div>
              
              <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '0.5rem', margin: '1rem 0' }}>
                <div style={styles.summaryRow}>
                  <span>Total Amount</span>
                  <span>{formatCurrency(selectedSale.installmentTotal || selectedSale.total)}</span>
                </div>
                <div style={styles.summaryRow}>
                  <span>Previous Paid</span>
                  <span>{formatCurrency(selectedSale.installmentPaid || 0)}</span>
                </div>
                <div style={{ ...styles.summaryRow, color: 'var(--success)', fontWeight: '600' }}>
                  <span>Amount Paid Now</span>
                  <span>+ {formatCurrency(lastPayment.amount)}</span>
                </div>
                <div style={{ ...styles.summaryRow, borderTop: '1px solid #334155', paddingTop: '0.5rem', marginTop: '0.5rem', fontWeight: '700' }}>
                  <span>Balance Due</span>
                  <span style={{ color: lastPayment.balance > 0 ? '#f59e0b' : '#22c55e' }}>
                    {formatCurrency(lastPayment.balance)}
                  </span>
                </div>
              </div>

              {(selectedSale.payments || []).length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--muted-foreground)' }}>Payment History</div>
                  <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    {(selectedSale.payments || []).slice(0, 5).map((payment, idx) => (
                      <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--muted-foreground)' }}>{payment.paidAt ? formatDate(payment.paidAt) : '-'}</span>
                        <span style={{ color: 'var(--success)' }}>{formatCurrency(payment.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={printReceipt} style={{ ...styles.submitBtn, marginTop: '1rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                <Printer size={18} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', padding: '1.5rem', color: 'var(--foreground)' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontSize: '1.25rem', color: 'var(--muted-foreground)' },
  notification: { position: 'fixed', top: '1rem', right: '1rem', padding: '1rem 1.5rem', borderRadius: '0.5rem', color: 'white', fontWeight: '600', zIndex: 1000 },
  header: { marginBottom: '1.5rem' },
  title: { fontSize: '1.75rem', fontWeight: '700', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.75rem' },
  subtitle: { color: 'var(--muted-foreground)', fontSize: '0.875rem', marginTop: '0.25rem' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' },
  statCard: { background: 'var(--card)', borderRadius: '0.75rem', border: '1px solid var(--border)', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' },
  statIcon: { width: '48px', height: '48px', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' },
  statValue: { fontSize: '1.5rem', fontWeight: '700', color: 'var(--foreground)' },
  statLabel: { fontSize: '0.875rem', color: 'var(--muted-foreground)' },
  filtersRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' },
  filterTabs: { display: 'flex', gap: '0.5rem' },
  filterTab: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: 'var(--card)', border: '1px solid #334155', borderRadius: '0.5rem', color: 'var(--muted-foreground)', cursor: 'pointer', fontWeight: '500' },
  filterTabActive: { background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: '1px solid #3b82f6', color: 'white' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--card)', border: '1px solid #334155', borderRadius: '0.5rem', minWidth: '250px' },
  searchInput: { background: 'transparent', border: 'none', color: 'var(--foreground)', fontSize: '0.9rem', outline: 'none', width: '100%' },
  tableCard: { background: 'var(--card)', borderRadius: '1rem', border: '1px solid #334155', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  emptyState: { padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' },
  paidBadge: { padding: '0.25rem 0.75rem', background: 'rgba(34, 197, 94, 0.2)', color: 'var(--success)', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600' },
  overdueBadge: { padding: '0.25rem 0.75rem', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--destructive)', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600' },
  activeBadge: { padding: '0.25rem 0.75rem', background: 'rgba(59, 130, 246, 0.2)', color: 'var(--primary)', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600' },
  actionButtons: { display: 'flex', gap: '0.5rem' },
  payBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: '0.375rem', color: 'white', cursor: 'pointer' },
  callBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', border: 'none', borderRadius: '0.375rem', color: 'white', cursor: 'pointer' },
  viewBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'var(--secondary)', border: 'none', borderRadius: '0.375rem', color: 'white', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: 'var(--card)', borderRadius: '1rem', padding: '1.5rem', maxWidth: '500px', width: '90%', border: '1px solid #334155' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', color: 'var(--foreground)' },
  closeBtn: { background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' },
  modalBody: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  saleInfo: { padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem', fontSize: '0.9rem', color: 'var(--muted-foreground)', display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontSize: '0.875rem', color: 'var(--muted-foreground)' },
  input: { padding: '0.75rem', background: 'var(--background)', border: '1px solid #334155', borderRadius: '0.5rem', color: 'var(--foreground)', fontSize: '1rem' },
  submitBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem', background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: '0.5rem', color: 'white', fontWeight: '600', cursor: 'pointer', marginTop: '0.5rem' },
  itemsList: { padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem' },
  itemRow: { display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' },
  paymentSummary: { padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.9rem' },
};
