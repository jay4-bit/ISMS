'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, ArrowUpRight, ArrowDownRight, PieChart, ChevronDown, ChevronUp, Undo2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/components/AuthProvider';

interface ProductData {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
}

interface ExpenseData {
  category: string;
  amount: number;
}

interface ProfitData {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalPurchaseCost: number;
  totalExpenses: number;
  totalReturnLoss: number;
  totalReturnProfit: number;
  totalRefundsGiven: number;
  totalStoreCredits: number;
  totalRepairCosts: number;
  totalTopUpReceived: number;
  netProfit: number;
  salesCount: number;
  period: string;
  productList: ProductData[];
  expenseList: ExpenseData[];
  returnExpensesList: { type: string; amount: number; count: number; isLoss: boolean }[];
  returnItemsList: {
    returnNumber: string;
    returnDate: string;
    productName: string;
    awardedType: string;
    refundAmount: number;
    returnCost: number;
    repairCost: number;
    replacementProductName: string | null;
    priceDifference: number;
    differencePaidBy: string;
    status: string;
    quantity: number;
  }[];
}

export default function ProfitLossPage() {
  const [data, setData] = useState<ProfitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30days');
  const [showProducts, setShowProducts] = useState(true);
  const [showExpenses, setShowExpenses] = useState(true);
  const [showReturns, setShowReturns] = useState(true);
  const { settings } = useSettings();
  const { shop } = useAuth();

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/profit-loss?period=${period}`, {
        headers: { 'x-shop-id': shop?.id || '' }
      });
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [period]);

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

  const profitableProducts = data?.productList.filter(p => p.profit > 0) || [];
  const lossProducts = data?.productList.filter(p => p.profit < 0) || [];

  return (
    <div className="profit-loss-page" style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}><PieChart size={28} /> Profit & Loss Report</h1>
          <p style={styles.subtitle}>Track your business profitability</p>
        </div>
        <div style={styles.periodSelector} className="period-selector">
          {periodOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className="filter-tab period-btn"
              style={{
                ...styles.periodBtn,
                ...(period === opt.value ? styles.periodBtnActive : {})
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

        <div style={styles.mainCard} className="main-card">
        <div style={styles.profitHeader} className="profit-header">
          <div>
            <div style={styles.profitLabel}>Net Profit</div>
            <div className="profit-value" style={{
              ...styles.profitValue,
              color: (data?.netProfit || 0) >= 0 ? '#22c55e' : '#ef4444'
            }}>
              {data ? formatCurr(data.netProfit) : '-'}
            </div>
          </div>
          {(data?.netProfit || 0) >= 0 ? (
            <TrendingUp size={48} color="#22c55e" />
          ) : (
            <TrendingDown size={48} color="#ef4444" />
          )}
        </div>

        <div style={styles.divider}></div>

        {/* Stats Grid */}
        <div className="stats-grid" style={styles.statsGrid}>
          <div style={styles.statBox} className="stat-box">
            <div className="stat-icon" style={styles.statIcon}><ShoppingCart size={20} /></div>
            <div>
              <div className="stat-value" style={styles.statValue}>{data?.salesCount || 0}</div>
              <div className="stat-label" style={styles.statLabel}>Total Sales</div>
            </div>
          </div>
          <div style={styles.statBox} className="stat-box">
            <div className="stat-icon" style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}><DollarSign size={20} /></div>
            <div>
              <div className="stat-value" style={{ ...styles.statValue, color: '#22c55e' }}>{data ? formatCurr(data.totalRevenue) : '-'}</div>
              <div className="stat-label" style={styles.statLabel}>Total Revenue</div>
            </div>
          </div>
          <div style={styles.statBox} className="stat-box">
            <div className="stat-icon" style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><ArrowDownRight size={20} /></div>
            <div>
              <div className="stat-value" style={{ ...styles.statValue, color: '#f59e0b' }}>{data ? formatCurr(data.totalCost) : '-'}</div>
              <div className="stat-label" style={styles.statLabel}>Cost of Goods</div>
            </div>
          </div>
          <div style={styles.statBox} className="stat-box">
            <div className="stat-icon" style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}><ArrowUpRight size={20} /></div>
            <div>
              <div className="stat-value" style={{ ...styles.statValue, color: '#3b82f6' }}>{data ? formatCurr(data.totalProfit) : '-'}</div>
              <div className="stat-label" style={styles.statLabel}>Gross Profit</div>
            </div>
          </div>
          <div style={styles.statBox} className="stat-box">
            <div className="stat-icon" style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}><Undo2 size={20} /></div>
            <div>
              <div className="stat-value" style={{ ...styles.statValue, color: '#ef4444' }}>{data ? formatCurr(data.totalReturnLoss || 0) : '-'}</div>
              <div className="stat-label" style={styles.statLabel}>Returns (Loss)</div>
            </div>
          </div>
          <div style={styles.statBox} className="stat-box">
            <div className="stat-icon" style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}><TrendingUp size={20} /></div>
            <div>
              <div className="stat-value" style={{ ...styles.statValue, color: '#22c55e' }}>{data ? formatCurr(data.totalReturnProfit || 0) : '-'}</div>
              <div className="stat-label" style={styles.statLabel}>Returns (Profit)</div>
            </div>
          </div>
        </div>

        <div style={styles.divider}></div>

        {/* Returns Breakdown */}
        <div style={styles.section}>
          <button 
            onClick={() => setShowReturns(!showReturns)} 
            style={styles.sectionHeader}
            className="section-header"
          >
            <h3 style={styles.sectionTitle} className="section-title">
              <Undo2 size={18} /> Returns & Refunds ({data?.returnItemsList?.length || 0} items)
            </h3>
            {showReturns ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {showReturns && (
            <div>
              {data?.returnExpensesList && data.returnExpensesList.length > 0 ? (
                <>
                  <div className="returns-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ ...styles.statBox, padding: '1rem', border: '1px solid #ef4444' }}>
                      <div className="stat-label" style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>Total Loss from Returns</div>
                      <div className="stat-value" style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ef4444' }}>{formatCurr(data.totalReturnLoss || 0)}</div>
                    </div>
                    <div style={{ ...styles.statBox, padding: '1rem', border: '1px solid #22c55e' }}>
                      <div className="stat-label" style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>Total Profit from Returns</div>
                      <div className="stat-value" style={{ fontSize: '1.1rem', fontWeight: '700', color: '#22c55e' }}>{formatCurr(data.totalReturnProfit || 0)}</div>
                    </div>
                  </div>
                  <div className="returns-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ ...styles.statBox, padding: '1rem' }}>
                      <div className="stat-label" style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>Cash Refunds</div>
                      <div className="stat-value" style={{ fontSize: '1rem', fontWeight: '600', color: '#ef4444' }}>{formatCurr(data.totalRefundsGiven || 0)}</div>
                    </div>
                    <div style={{ ...styles.statBox, padding: '1rem' }}>
                      <div className="stat-label" style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>Repair Costs</div>
                      <div className="stat-value" style={{ fontSize: '1rem', fontWeight: '600', color: '#ef4444' }}>{formatCurr(data.totalRepairCosts || 0)}</div>
                    </div>
                    <div style={{ ...styles.statBox, padding: '1rem' }}>
                      <div className="stat-label" style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>Top-Up Received</div>
                      <div className="stat-value" style={{ fontSize: '1rem', fontWeight: '600', color: '#22c55e' }}>{formatCurr(data.totalTopUpReceived || 0)}</div>
                    </div>
                  </div>
                  <div className="table-responsive" style={{ overflowX: 'auto' }}>
                    <table style={{ ...styles.table, minWidth: '800px' }}>
                      <thead>
                        <tr style={{ background: 'var(--background)' }}>
                          <th style={{ textAlign: 'left', padding: '0.6rem 0.5rem' }}>Return #</th>
                          <th style={{ textAlign: 'left', padding: '0.6rem 0.5rem' }}>Product</th>
                          <th style={{ textAlign: 'center', padding: '0.6rem 0.5rem' }}>Qty</th>
                          <th style={{ textAlign: 'center', padding: '0.6rem 0.5rem' }}>Type</th>
                          <th style={{ textAlign: 'right', padding: '0.6rem 0.5rem' }}>Refund</th>
                          <th style={{ textAlign: 'right', padding: '0.6rem 0.5rem' }}>Return Cost</th>
                          <th style={{ textAlign: 'right', padding: '0.6rem 0.5rem' }}>Repair Cost</th>
                          <th style={{ textAlign: 'left', padding: '0.6rem 0.5rem' }}>Replacement</th>
                          <th style={{ textAlign: 'right', padding: '0.6rem 0.5rem' }}>Price Diff</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.returnItemsList.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #334155', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '0.5rem', fontWeight: '500', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{item.returnNumber}</td>
                            <td style={{ padding: '0.5rem', fontWeight: '500' }}>{item.productName}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>{item.quantity}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                              <span style={{
                                padding: '0.1rem 0.4rem', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: '600',
                                background: item.awardedType === 'REFUND' ? 'rgba(239,68,68,0.15)' : item.awardedType === 'REPLACEMENT' ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)',
                                color: item.awardedType === 'REFUND' ? '#ef4444' : item.awardedType === 'REPLACEMENT' ? '#3b82f6' : '#f59e0b',
                              }}>{item.awardedType}</span>
                            </td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', color: '#ef4444' }}>{item.refundAmount > 0 ? formatCurr(item.refundAmount) : '-'}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', color: '#f59e0b' }}>{item.returnCost > 0 ? formatCurr(item.returnCost) : '-'}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', color: '#f59e0b' }}>{item.repairCost > 0 ? formatCurr(item.repairCost) : '-'}</td>
                            <td style={{ padding: '0.5rem', fontSize: '0.75rem' }}>{item.replacementProductName || '-'}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', color: item.differencePaidBy === 'BUSINESS' ? '#ef4444' : '#22c55e', fontWeight: '600' }}>
                              {item.priceDifference > 0 ? formatCurr(item.priceDifference) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div style={styles.emptyState}>No returns in this period</div>
              )}
            </div>
          )}
        </div>

        <div style={styles.divider}></div>

        {/* Products Breakdown */}
        <div style={styles.section}>
          <button 
            onClick={() => setShowProducts(!showProducts)} 
            style={styles.sectionHeader}
            className="section-header"
          >
            <h3 style={styles.sectionTitle} className="section-title">
              <ShoppingCart size={18} /> Products Breakdown ({data?.productList.length || 0} products)
            </h3>
            {showProducts ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {showProducts && (
            <div>
              {/* Profitable Products */}
                  {profitableProducts.length > 0 && (
                <div style={styles.subSection} className="sub-section">
                  <div style={styles.subSectionHeader}>
                    <span style={{ color: '#22c55e', fontWeight: '600' }}>Profitable Products ({profitableProducts.length})</span>
                    <span style={{ color: '#22c55e' }}>{formatCurr(profitableProducts.reduce((sum, p) => sum + p.profit, 0))}</span>
                  </div>
                  <div className="table-responsive">
                    <table style={styles.table}>
                      <thead>
                        <tr style={{ background: 'var(--background)' }}>
                          <th style={{ textAlign: 'left', padding: '0.5rem' }}>Product</th>
                          <th style={{ textAlign: 'center', padding: '0.5rem' }}>Qty</th>
                          <th style={{ textAlign: 'right', padding: '0.5rem' }}>Revenue</th>
                          <th style={{ textAlign: 'right', padding: '0.5rem' }}>Cost</th>
                          <th style={{ textAlign: 'right', padding: '0.5rem' }}>Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profitableProducts.slice(0, 10).map((product, idx) => (
                          <tr key={product.id} style={{ borderBottom: '1px solid #334155', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '0.5rem', fontWeight: '500' }}>{product.name}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>{product.quantity}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', color: '#22c55e' }}>{formatCurr(product.revenue)}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', color: '#ef4444' }}>{formatCurr(product.cost)}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', color: '#22c55e', fontWeight: '600' }}>{formatCurr(product.profit)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {profitableProducts.length > 10 && (
                    <div style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>
                      ... and {profitableProducts.length - 10} more products
                    </div>
                  )}
                </div>
              )}

              {/* Loss Products */}
              {lossProducts.length > 0 && (
                <div style={styles.subSection} className="sub-section">
                  <div style={styles.subSectionHeader}>
                    <span style={{ color: '#ef4444', fontWeight: '600' }}>Products with Loss ({lossProducts.length})</span>
                    <span style={{ color: '#ef4444' }}>{formatCurr(lossProducts.reduce((sum, p) => sum + p.profit, 0))}</span>
                  </div>
                  <div className="table-responsive">
                    <table style={styles.table}>
                      <thead>
                        <tr style={{ background: 'var(--background)' }}>
                          <th style={{ textAlign: 'left', padding: '0.5rem' }}>Product</th>
                          <th style={{ textAlign: 'center', padding: '0.5rem' }}>Qty</th>
                          <th style={{ textAlign: 'right', padding: '0.5rem' }}>Revenue</th>
                          <th style={{ textAlign: 'right', padding: '0.5rem' }}>Cost</th>
                          <th style={{ textAlign: 'right', padding: '0.5rem' }}>Loss</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lossProducts.slice(0, 10).map((product, idx) => (
                          <tr key={product.id} style={{ borderBottom: '1px solid #334155', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '0.5rem', fontWeight: '500' }}>{product.name}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>{product.quantity}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--muted-foreground)' }}>{formatCurr(product.revenue)}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', color: '#ef4444' }}>{formatCurr(product.cost)}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', color: '#ef4444', fontWeight: '600' }}>{formatCurr(product.profit)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {data?.productList.length === 0 && (
                <div style={styles.emptyState}>No products sold in this period</div>
              )}
            </div>
          )}
        </div>

        <div style={styles.divider}></div>

        {/* Expenses Breakdown */}
        <div style={styles.section}>
          <button 
            onClick={() => setShowExpenses(!showExpenses)} 
            style={styles.sectionHeader}
            className="section-header"
          >
            <h3 style={styles.sectionTitle} className="section-title">
              <DollarSign size={18} /> Expenses Breakdown ({data?.expenseList.length || 0} categories)
            </h3>
            {showExpenses ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {showExpenses && (
            <div>
              {data?.expenseList && data.expenseList.length > 0 ? (
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
                      {data.expenseList.map((expense, idx) => (
                        <tr key={expense.category} style={{ borderBottom: '1px solid #334155', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '0.5rem', fontWeight: '500' }}>{expense.category}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', color: '#ef4444', fontWeight: '600' }}>{formatCurr(expense.amount)}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--muted-foreground)' }}>
                            {((expense.amount / (data.totalExpenses || 1)) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={styles.emptyState}>No expenses in this period</div>
              )}
            </div>
          )}
        </div>

        <div style={styles.divider}></div>

        {/* Summary Box */}
        <div style={styles.summaryBox} className="summary-box">
          <div style={styles.summaryRow} className="summary-row">
            <span>Total Revenue</span>
            <span style={{ color: '#22c55e' }}>{data ? formatCurr(data.totalRevenue) : '-'}</span>
          </div>
          <div style={styles.summaryRow} className="summary-row">
            <span>Cost of Goods Sold</span>
            <span style={{ color: '#ef4444' }}>- {data ? formatCurr(data.totalCost) : '-'}</span>
          </div>
          <div style={{ ...styles.summaryRow, borderTop: '1px solid #334155', marginTop: '0.5rem' }} className="summary-row">
            <span>Gross Profit</span>
            <span style={{ color: '#3b82f6' }}>{data ? formatCurr(data.totalProfit) : '-'}</span>
          </div>
          <div style={styles.summaryRow} className="summary-row">
            <span>Total Expenses</span>
            <span style={{ color: '#ef4444' }}>- {data ? formatCurr(data.totalExpenses) : '-'}</span>
          </div>
          <div style={styles.summaryRow} className="summary-row">
            <span>Returns (Loss)</span>
            <span style={{ color: '#ef4444' }}>- {data ? formatCurr(data.totalReturnLoss) : '-'}</span>
          </div>
          <div style={{ ...styles.summaryRow, borderTop: '2px solid #334155', padding: '0.75rem 0', marginTop: '0.5rem', fontWeight: '700', fontSize: '1.1rem' }} className="summary-row">
            <span>Net Profit</span>
            <span style={{ color: (data?.netProfit || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
              {data ? formatCurr(data.netProfit) : '-'}
            </span>
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
  profitHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '1rem', background: 'var(--background)', borderRadius: '0.75rem' },
  profitLabel: { fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' },
  profitValue: { fontSize: '2.5rem', fontWeight: '700' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' },
  statBox: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--background)', borderRadius: '0.75rem' },
  statIcon: { width: '40px', height: '40px', borderRadius: '0.5rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' },
  statValue: { fontSize: '1.25rem', fontWeight: '700', color: 'var(--foreground)' },
  statLabel: { fontSize: '0.75rem', color: 'var(--muted-foreground)' },
  divider: { height: '1px', background: 'var(--border)', marginBottom: '1.5rem' },
  section: { marginBottom: '1rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 0', color: 'var(--foreground)' },
  sectionTitle: { fontSize: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  subSection: { marginBottom: '1rem', padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem' },
  subSectionHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
  emptyState: { padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' },
  summaryBox: { padding: '1rem', background: 'var(--background)', borderRadius: '0.75rem' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.9rem' },
};
