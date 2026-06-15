'use client';

import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Smartphone, Banknote, Building2, Users, Receipt, Undo2, Wrench, Truck, ChevronDown, ChevronUp, Calendar, ArrowUpRight, ArrowDownRight, HandCoins, Landmark, BookOpen, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/components/AuthProvider';

interface PaymentMethodData {
  method: string;
  count: number;
  totalAmount: number;
  totalPaid: number;
  totalChange: number;
}

interface ExpenseCategoryData {
  category: string;
  amount: number;
}

interface CreditCustomer {
  id: string;
  name: string;
  phone: string | null;
  creditBalance: number;
  totalPurchases: number;
}

interface InstallmentDetail {
  id: string;
  receiptNumber?: string;
  customerName: string;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  nextPaymentDate?: string | null;
  createdAt: string;
  payments: { id: string; amountPaid: number; balance: number; paidAt: string | null }[];
}

interface RefundMethodData {
  method: string;
  count: number;
  totalAmount: number;
}

interface AccountingData {
  period: string;
  paymentMethods: PaymentMethodData[];
  expenseCategories: ExpenseCategoryData[];
  totalExpenses: number;
  totalChangeGiven: number;
  totalRefundsGiven: number;
  totalRepairCosts: number;
  totalReturnCosts: number;
  totalSupplierPayments: number;
  totalDebits: number;
  totalCustomerCredit: number;
  totalInstallmentDue: number;
  totalReplacementInstallmentDue: number;
  totalReceivables: number;
  totalCashInflow: number;
  totalCashOutflow: number;
  netCashFlow: number;
  salesCount: number;
  returnsCount: number;
  customersWithCredit: number;
  installmentSales: InstallmentDetail[];
  replacementInstallments: InstallmentDetail[];
  refundMethods: RefundMethodData[];
  customers: CreditCustomer[];
}

const methodColors: Record<string, string> = {
  CASH: '#22c55e',
  CARD: '#3b82f6',
  MOBILE: '#f59e0b',
  CREDIT: '#8b5cf6',
};

const methodIcons: Record<string, any> = {
  CASH: Banknote,
  CARD: CreditCard,
  MOBILE: Smartphone,
  CREDIT: Building2,
};

const methodLabels: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  MOBILE: 'Mobile Money',
  CREDIT: 'Credit',
};

const expenseCategoryLabels: Record<string, string> = {
  RENT: 'Rent',
  UTILITIES: 'Utilities',
  SALARIES: 'Salaries',
  SUPPLIES: 'Supplies',
  MAINTENANCE: 'Maintenance',
  MARKETING: 'Marketing',
  TRANSPORT: 'Transport',
  MEDICAL_WASTE: 'Medical Waste',
  SECURITY: 'Security',
  INSURANCE: 'Insurance',
  OTHER: 'Other',
};

export default function AccountingsPage() {
  const [data, setData] = useState<AccountingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30days');
  const [showExpenses, setShowExpenses] = useState(true);
  const [showInstallments, setShowInstallments] = useState(true);
  const [showCreditors, setShowCreditors] = useState(true);
  const [showRefunds, setShowRefunds] = useState(true);
  const { settings } = useSettings();
  const { shop } = useAuth();

  useEffect(() => {
    fetchData();
  }, [period]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/accountings?period=${period}`, {
        headers: { 'x-shop-id': shop?.id || '' },
      });
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error('Failed to fetch accounting data:', error);
    } finally {
      setLoading(false);
    }
  }

  const periodOptions = [
    { value: 'today', label: 'Today' },
    { value: '7days', label: '7 Days' },
    { value: '30days', label: '30 Days' },
    { value: '3months', label: '3 Months' },
    { value: '6months', label: '6 Months' },
    { value: '12months', label: '12 Months' },
    { value: 'all', label: 'All Time' },
  ];

  const formatCurr = (amount: number) => formatCurrency(amount, settings.currency);

  if (loading) return <div style={styles.loading}>Loading...</div>;

  const totalPaymentAmount = data?.paymentMethods.reduce((sum, m) => sum + m.totalAmount, 0) || 1;

  return (
    <div className="profit-loss-page" style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}><BookOpen size={28} /> Accountings</h1>
          <p style={styles.subtitle}>Payment analysis, debits, creditors & financial records</p>
        </div>
        <div style={styles.periodSelector} className="period-selector">
          {periodOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className="filter-tab period-btn"
              style={{
                ...styles.periodBtn,
                ...(period === opt.value ? styles.periodBtnActive : {}),
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.mainCard} className="main-card">
        {/* Cash Flow Summary */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitleInline}><TrendingUp size={18} /> Cash Flow Summary</h3>
          <div className="stats-grid" style={styles.statsGrid}>
            <div style={{ ...styles.statBox, borderLeft: '4px solid #22c55e' }}>
              <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}><ArrowUpRight size={20} /></div>
              <div>
                <div className="stat-label" style={styles.statLabel}>Cash Inflow</div>
                <div className="stat-value" style={{ ...styles.statValue, color: '#22c55e' }}>{formatCurr(data?.totalCashInflow || 0)}</div>
              </div>
            </div>
            <div style={{ ...styles.statBox, borderLeft: '4px solid #ef4444' }}>
              <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}><ArrowDownRight size={20} /></div>
              <div>
                <div className="stat-label" style={styles.statLabel}>Cash Outflow</div>
                <div className="stat-value" style={{ ...styles.statValue, color: '#ef4444' }}>{formatCurr(data?.totalCashOutflow || 0)}</div>
              </div>
            </div>
            <div style={{ ...styles.statBox, borderLeft: `4px solid ${(data?.netCashFlow || 0) >= 0 ? '#22c55e' : '#ef4444'}` }}>
              <div style={{ ...styles.statIcon, background: (data?.netCashFlow || 0) >= 0 ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                {(data?.netCashFlow || 0) >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
              </div>
              <div>
                <div className="stat-label" style={styles.statLabel}>Net Cash Flow</div>
                <div className="stat-value" style={{ ...styles.statValue, color: (data?.netCashFlow || 0) >= 0 ? '#22c55e' : '#ef4444' }}>{formatCurr(data?.netCashFlow || 0)}</div>
              </div>
            </div>
            <div style={styles.statBox}>
              <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}><Users size={20} /></div>
              <div>
                <div className="stat-label" style={styles.statLabel}>Sales / Returns</div>
                <div className="stat-value" style={styles.statValue}>{data?.salesCount || 0} / {data?.returnsCount || 0}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.divider}></div>

        {/* Payment Method Analysis */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitleInline}><Landmark size={18} /> Payment Method Analysis</h3>
          <div className="stats-grid" style={styles.statsGrid}>
            {data?.paymentMethods.map(pm => {
              const Icon = methodIcons[pm.method] || DollarSign;
              const pct = ((pm.totalAmount / totalPaymentAmount) * 100).toFixed(1);
              const color = methodColors[pm.method] || '#3b82f6';
              return (
                <div key={pm.method} style={{ ...styles.statBox, borderLeft: `4px solid ${color}` }}>
                  <div style={{ ...styles.statIcon, background: `linear-gradient(135deg, ${color}, ${color}dd)` }}>
                    <Icon size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="stat-label" style={styles.statLabel}>{methodLabels[pm.method] || pm.method}</div>
                    <div className="stat-value" style={{ ...styles.statValue, color }}>{formatCurr(pm.totalAmount)}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', marginTop: '0.15rem' }}>
                      {pm.count} transactions &middot; {pct}% of total
                    </div>
                  </div>
                </div>
              );
            })}
            {(!data?.paymentMethods || data.paymentMethods.length === 0) && (
              <div style={styles.emptyState}>No sales in this period</div>
            )}
          </div>
        </div>

        <div style={styles.divider}></div>

        {/* Debits (Money Out) */}
        <div style={styles.section}>
          <h3 style={{ ...styles.sectionTitleInline, color: '#ef4444' }}><ArrowDownRight size={18} /> Debits &mdash; Money Out</h3>
          <div className="stats-grid" style={styles.statsGrid}>
            <div style={styles.statBox}>
              <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #64748b, #475569)' }}><Receipt size={20} /></div>
              <div>
                <div className="stat-label" style={styles.statLabel}>Total Expenses</div>
                <div className="stat-value" style={{ ...styles.statValue, color: '#ef4444' }}>{formatCurr(data?.totalExpenses || 0)}</div>
              </div>
            </div>
            <div style={styles.statBox}>
              <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #64748b, #475569)' }}><Undo2 size={20} /></div>
              <div>
                <div className="stat-label" style={styles.statLabel}>Refunds Given</div>
                <div className="stat-value" style={{ ...styles.statValue, color: '#ef4444' }}>{formatCurr(data?.totalRefundsGiven || 0)}</div>
              </div>
            </div>
            <div style={styles.statBox}>
              <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #64748b, #475569)' }}><Wrench size={20} /></div>
              <div>
                <div className="stat-label" style={styles.statLabel}>Repair Costs</div>
                <div className="stat-value" style={{ ...styles.statValue, color: '#ef4444' }}>{formatCurr(data?.totalRepairCosts || 0)}</div>
              </div>
            </div>
            <div style={styles.statBox}>
              <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #64748b, #475569)' }}><HandCoins size={20} /></div>
              <div>
                <div className="stat-label" style={styles.statLabel}>Return Costs</div>
                <div className="stat-value" style={{ ...styles.statValue, color: '#ef4444' }}>{formatCurr(data?.totalReturnCosts || 0)}</div>
              </div>
            </div>
            <div style={styles.statBox}>
              <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #64748b, #475569)' }}><Truck size={20} /></div>
              <div>
                <div className="stat-label" style={styles.statLabel}>Supplier Payments</div>
                <div className="stat-value" style={{ ...styles.statValue, color: '#ef4444' }}>{formatCurr(data?.totalSupplierPayments || 0)}</div>
              </div>
            </div>
            <div style={styles.statBox}>
              <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #64748b, #475569)' }}><DollarSign size={20} /></div>
              <div>
                <div className="stat-label" style={styles.statLabel}>Change Given</div>
                <div className="stat-value" style={{ ...styles.statValue, color: '#ef4444' }}>{formatCurr(data?.totalChangeGiven || 0)}</div>
              </div>
            </div>
          </div>
          <div style={{ ...styles.statBox, marginTop: '0.5rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <div style={{ fontWeight: '700', color: '#ef4444', fontSize: '0.9rem' }}>Total Debits</div>
            <div style={{ fontWeight: '700', color: '#ef4444', fontSize: '1.1rem', marginLeft: 'auto' }}>{formatCurr(data?.totalDebits || 0)}</div>
          </div>
        </div>

        <div style={styles.divider}></div>

        {/* Creditors (Money Owed to Business) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '0.5rem 0' }} onClick={() => setShowCreditors(!showCreditors)}>
            <h3 style={{ ...styles.sectionTitleInline, color: '#22c55e', margin: 0 }}><ArrowUpRight size={18} /> Creditors &mdash; Money Owed to Business</h3>
            {showCreditors ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          {showCreditors && (
            <>
              <div className="stats-grid" style={styles.statsGrid}>
                <div style={styles.statBox}>
                  <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}><Users size={20} /></div>
                  <div>
                    <div className="stat-label" style={styles.statLabel}>Customer Credits</div>
                    <div className="stat-value" style={{ ...styles.statValue, color: '#22c55e' }}>{formatCurr(data?.totalCustomerCredit || 0)}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', marginTop: '0.15rem' }}>{data?.customersWithCredit || 0} customers</div>
                  </div>
                </div>
                <div style={styles.statBox}>
                  <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}><Building2 size={20} /></div>
                  <div>
                    <div className="stat-label" style={styles.statLabel}>Installment Due</div>
                    <div className="stat-value" style={{ ...styles.statValue, color: '#22c55e' }}>{formatCurr(data?.totalInstallmentDue || 0)}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', marginTop: '0.15rem' }}>{data?.installmentSales.length || 0} active installments</div>
                  </div>
                </div>
                <div style={styles.statBox}>
                  <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}><RefreshCw size={20} /></div>
                  <div>
                    <div className="stat-label" style={styles.statLabel}>Replacement Installments</div>
                    <div className="stat-value" style={{ ...styles.statValue, color: '#22c55e' }}>{formatCurr(data?.totalReplacementInstallmentDue || 0)}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', marginTop: '0.15rem' }}>{data?.replacementInstallments.length || 0} active</div>
                  </div>
                </div>
              </div>
              <div style={{ ...styles.statBox, marginTop: '0.5rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <div style={{ fontWeight: '700', color: '#22c55e', fontSize: '0.9rem' }}>Total Receivables</div>
                <div style={{ fontWeight: '700', color: '#22c55e', fontSize: '1.1rem', marginLeft: 'auto' }}>{formatCurr(data?.totalReceivables || 0)}</div>
              </div>
            </>
          )}
        </div>

        <div style={styles.divider}></div>

        {/* Expense Breakdown */}
        <div style={styles.section}>
          <button onClick={() => setShowExpenses(!showExpenses)} style={styles.sectionHeader} className="section-header">
            <h3 style={styles.sectionTitle} className="section-title">
              <Receipt size={18} /> Expenses Breakdown ({data?.expenseCategories.length || 0} categories)
            </h3>
            {showExpenses ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          {showExpenses && (
            data?.expenseCategories && data.expenseCategories.length > 0 ? (
              <div className="table-responsive">
                <table style={styles.table}>
                  <thead>
                    <tr style={{ background: 'var(--background)' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Category</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem' }}>Amount</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem' }}>% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expenseCategories.map((exp, idx) => (
                      <tr key={exp.category} style={{ borderBottom: '1px solid #334155', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '0.5rem', fontWeight: '500' }}>{expenseCategoryLabels[exp.category] || exp.category}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', color: '#ef4444' }}>{formatCurr(exp.amount)}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--muted-foreground)' }}>
                          {((exp.amount / (data.totalExpenses || 1)) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={styles.emptyState}>No expenses in this period</div>
            )
          )}
        </div>

        <div style={styles.divider}></div>

        {/* Refund Method Breakdown */}
        <div style={styles.section}>
          <button onClick={() => setShowRefunds(!showRefunds)} style={styles.sectionHeader} className="section-header">
            <h3 style={styles.sectionTitle} className="section-title">
              <Undo2 size={18} /> Refunds by Method ({data?.refundMethods.reduce((sum, r) => sum + r.count, 0) || 0} refunds)
            </h3>
            {showRefunds ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          {showRefunds && (
            data?.refundMethods && data.refundMethods.length > 0 ? (
              <div className="table-responsive">
                <table style={styles.table}>
                  <thead>
                    <tr style={{ background: 'var(--background)' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Method</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem' }}>Count</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem' }}>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.refundMethods.map((rf, idx) => (
                      <tr key={rf.method} style={{ borderBottom: '1px solid #334155', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '0.5rem', fontWeight: '500' }}>{rf.method}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>{rf.count}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', color: '#ef4444' }}>{formatCurr(rf.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={styles.emptyState}>No refunds in this period</div>
            )
          )}
        </div>

        <div style={styles.divider}></div>

        {/* Installment Details */}
        <div style={styles.section}>
          <button onClick={() => setShowInstallments(!showInstallments)} style={styles.sectionHeader} className="section-header">
            <h3 style={styles.sectionTitle} className="section-title">
              <Building2 size={18} /> Installment Details
            </h3>
            {showInstallments ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          {showInstallments && (
            <>
              {data?.installmentSales && data.installmentSales.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--foreground)' }}>Sale Installments ({data.installmentSales.length})</h4>
                  <div className="table-responsive">
                    <table style={styles.table}>
                      <thead>
                        <tr style={{ background: 'var(--background)' }}>
                          <th style={{ textAlign: 'left', padding: '0.5rem' }}>Receipt</th>
                          <th style={{ textAlign: 'left', padding: '0.5rem' }}>Customer</th>
                          <th style={{ textAlign: 'right', padding: '0.5rem' }}>Total</th>
                          <th style={{ textAlign: 'right', padding: '0.5rem' }}>Paid</th>
                          <th style={{ textAlign: 'right', padding: '0.5rem' }}>Due</th>
                          <th style={{ textAlign: 'center', padding: '0.5rem' }}>Next Payment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.installmentSales.map((inst, idx) => (
                          <tr key={inst.id} style={{ borderBottom: '1px solid #334155', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '0.5rem', fontWeight: '500' }}>{inst.receiptNumber || '—'}</td>
                            <td style={{ padding: '0.5rem' }}>{inst.customerName}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatCurr(inst.totalAmount)}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', color: '#22c55e' }}>{formatCurr(inst.amountPaid)}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', color: '#ef4444', fontWeight: '600' }}>{formatCurr(inst.amountDue)}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.75rem' }}>
                              {inst.nextPaymentDate ? new Date(inst.nextPaymentDate).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {data?.replacementInstallments && data.replacementInstallments.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--foreground)' }}>Replacement Installments ({data.replacementInstallments.length})</h4>
                  <div className="table-responsive">
                    <table style={styles.table}>
                      <thead>
                        <tr style={{ background: 'var(--background)' }}>
                          <th style={{ textAlign: 'left', padding: '0.5rem' }}>Customer</th>
                          <th style={{ textAlign: 'right', padding: '0.5rem' }}>Total</th>
                          <th style={{ textAlign: 'right', padding: '0.5rem' }}>Paid</th>
                          <th style={{ textAlign: 'right', padding: '0.5rem' }}>Due</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.replacementInstallments.map((inst, idx) => (
                          <tr key={inst.id} style={{ borderBottom: '1px solid #334155', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '0.5rem', fontWeight: '500' }}>{inst.customerName}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatCurr(inst.totalAmount)}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', color: '#22c55e' }}>{formatCurr(inst.amountPaid)}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', color: '#ef4444', fontWeight: '600' }}>{formatCurr(inst.amountDue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {(!data?.installmentSales || data.installmentSales.length === 0) &&
               (!data?.replacementInstallments || data.replacementInstallments.length === 0) && (
                <div style={styles.emptyState}>No active installments</div>
              )}
            </>
          )}
        </div>

        <div style={styles.divider}></div>

        {/* Summary Box */}
        <div style={styles.summaryBox} className="summary-box">
          <div className="summary-row" style={styles.summaryRow}>
            <span>Cash Inflow (Sales)</span>
            <span style={{ color: '#22c55e' }}>{formatCurr(data?.totalCashInflow || 0)}</span>
          </div>
          <div className="summary-row" style={styles.summaryRow}>
            <span>Cash Outflow (Debits)</span>
            <span style={{ color: '#ef4444' }}>- {formatCurr(data?.totalCashOutflow || 0)}</span>
          </div>
          <div className="summary-row" style={{ ...styles.summaryRow, borderTop: '2px solid #334155', paddingTop: '0.75rem', marginTop: '0.5rem', fontWeight: '700', fontSize: '1.1rem' }}>
            <span>Net Cash Flow</span>
            <span style={{ color: (data?.netCashFlow || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
              {formatCurr(data?.netCashFlow || 0)}
            </span>
          </div>
          <div className="summary-row" style={{ ...styles.summaryRow, paddingTop: '0.75rem', fontWeight: '600' }}>
            <span>Total Receivables</span>
            <span style={{ color: '#22c55e' }}>{formatCurr(data?.totalReceivables || 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', padding: '1.5rem', color: 'var(--foreground)' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontSize: '1.25rem', color: 'var(--muted-foreground)' },
  header: { marginBottom: '1.5rem' },
  title: { fontSize: '1.75rem', fontWeight: '700', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.75rem' },
  subtitle: { color: 'var(--muted-foreground)', fontSize: '0.875rem', marginTop: '0.25rem' },
  periodSelector: { display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' },
  periodBtn: { padding: '0.5rem 1rem', background: 'var(--card)', border: '1px solid #334155', borderRadius: '0.5rem', color: 'var(--muted-foreground)', cursor: 'pointer', fontWeight: '500' },
  periodBtnActive: { background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: '1px solid #3b82f6', color: 'white' },
  mainCard: { background: 'var(--card)', borderRadius: '1rem', border: '1px solid var(--border)', padding: '1.5rem' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '0.75rem' },
  statBox: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--background)', borderRadius: '0.75rem' },
  statIcon: { width: '40px', height: '40px', borderRadius: '0.5rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 },
  statValue: { fontSize: '1.1rem', fontWeight: '700', color: 'var(--foreground)' },
  statLabel: { fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.15rem' },
  divider: { height: '1px', background: 'var(--border)', marginBottom: '1.5rem', marginTop: '1.5rem' },
  section: { marginBottom: '1rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 0', color: 'var(--foreground)' },
  sectionTitle: { fontSize: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 },
  sectionTitleInline: { fontSize: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
  emptyState: { padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' },
  summaryBox: { padding: '1rem', background: 'var(--background)', borderRadius: '0.75rem' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.9rem' },
};
