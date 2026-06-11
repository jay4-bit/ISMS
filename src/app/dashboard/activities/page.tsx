'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowLeft, User, LogIn, ShoppingCart, RotateCcw, BadgeDollarSign, Package, Download, BarChart3, List, ChevronDown, ChevronUp, Calendar, Filter, X } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

interface ActivityItem {
  id: string;
  userId?: string;
  userName?: string;
  action: string;
  details?: string;
  createdAt: string;
}

interface DetailItem {
  date: string;
  productName?: string;
  productSku?: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
  refundAmount?: number;
  reason?: string;
  status?: string;
  details?: string;
  action?: string;
}

interface UserDetails {
  sales: DetailItem[];
  returns: DetailItem[];
  expenses: DetailItem[];
  logins: { date: string }[];
  other: DetailItem[];
}

interface UserKPI {
  userId: string;
  userName: string;
  email: string;
  role: string;
  joinedAt: string;
  totalSales: number;
  totalRevenue: number;
  totalDiscounts: number;
  totalReturns: number;
  totalExpenses: number;
  logins: number;
  otherActions: number;
  details: UserDetails;
}

const actionIcons: Record<string, any> = {
  LOGIN: LogIn,
  SALE_CREATED: ShoppingCart,
  SALE_RETURNED: RotateCcw,
  EXPENSE_ADDED: BadgeDollarSign,
  PRODUCT_CREATED: Package,
  USER_CREATED: User,
};

const PAGE_SIZE = 20;
type RangePreset = 'day' | 'week' | 'month' | '3months' | 'all';

function getRangeDates(preset: RangePreset): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  let start: Date;
  switch (preset) {
    case 'day': start = new Date(now); start.setDate(start.getDate() - 1); break;
    case 'week': start = new Date(now); start.setDate(start.getDate() - 7); break;
    case 'month': start = new Date(now); start.setMonth(start.getMonth() - 1); break;
    case '3months': start = new Date(now); start.setMonth(start.getMonth() - 3); break;
    default: return { start: '', end: '' };
  }
  return { start: start.toISOString().slice(0, 10), end };
}

const detailLabels: Record<keyof UserDetails, string> = {
  sales: 'Products Sold',
  returns: 'Products Returned',
  expenses: 'Expenses Made',
  logins: 'Login History',
  other: 'Other Actions',
};

export default function ActivitiesPage() {
  const { shop } = useAuth();
  const [tab, setTab] = useState<'feed' | 'kpi'>('kpi');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [userIdFilter, setUserIdFilter] = useState('');
  const [userNameFilter, setUserNameFilter] = useState('');
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [kpiData, setKpiData] = useState<UserKPI[]>([]);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [rangePreset, setRangePreset] = useState<RangePreset>('all');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [expandedWidget, setExpandedWidget] = useState<{ userId: string; widget: keyof UserDetails } | null>(null);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [userReportUser, setUserReportUser] = useState<string | null>(null);
  const [userReportStart, setUserReportStart] = useState('');
  const [userReportEnd, setUserReportEnd] = useState('');
  const [widgetPage, setWidgetPage] = useState<Record<string, number>>({});

  const kpiRange = rangePreset === 'all' && !exportStartDate && !exportEndDate
    ? { start: '', end: '' }
    : { start: exportStartDate || getRangeDates(rangePreset).start, end: exportEndDate || getRangeDates(rangePreset).end };

  useEffect(() => {
    if (shop?.id) fetchActivities();
  }, [shop?.id, page, userIdFilter, userNameFilter]);

  useEffect(() => {
    if (shop?.id) fetchUsers();
  }, [shop?.id]);

  useEffect(() => {
    if (shop?.id && tab === 'kpi') fetchKpi();
  }, [shop?.id, tab, rangePreset]);

  async function fetchActivities() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
      if (userIdFilter) params.set('userId', userIdFilter);
      if (userNameFilter) params.set('userName', userNameFilter);
      const res = await fetch(`/api/activities?${params}`, { headers: { 'x-shop-id': shop?.id || '' } });
      const data = await res.json();
      setActivities(data.activities || []);
      setTotal(data.total || 0);
    } catch {} finally { setLoading(false); }
  }

  async function fetchKpi() {
    setKpiLoading(true);
    try {
      const params = new URLSearchParams();
      if (kpiRange.start) params.set('startDate', kpiRange.start);
      if (kpiRange.end) params.set('endDate', kpiRange.end);
      const qs = params.toString();
      const res = await fetch(`/api/activities/kpi${qs ? '?' + qs : ''}`, { headers: { 'x-shop-id': shop?.id || '' } });
      const data = await res.json();
      setKpiData(data.kpi || []);
    } catch {} finally { setKpiLoading(false); }
  }

  async function fetchUsers() {
    try {
      const res = await fetch('/api/users', { headers: { 'x-shop-id': shop?.id || '' } });
      const data = await res.json();
      setUsers(data.users || []);
    } catch {}
  }

  async function handleExportFeed() {
    try {
      const res = await fetch(`/api/activities?limit=10000`, { headers: { 'x-shop-id': shop?.id || '' } });
      const data = await res.json();
      const rows = (data.activities || []).map((a: any) =>
        `${a.createdAt},${a.userName || 'System'},${a.action},${a.details || ''}`
      );
      const csv = 'Date,User,Action,Details\n' + rows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'user-activities.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch {}
  }

  async function handleExportKpi() {
    const rows = kpiData.map(k =>
      `${k.userName},${k.role},${k.totalSales},${k.totalRevenue},${k.totalDiscounts},${k.totalReturns},${k.totalExpenses},${k.logins},${k.otherActions}`
    );
    const header = 'User,Role,Sales,Revenue,Discounts,Returns,Expenses,Logins,Other Actions';
    const csv = header + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'user-kpi.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExportUserReport(k: UserKPI, startDate?: string, endDate?: string) {
    const hasCustom = startDate || endDate;
    const periodStr = hasCustom ? `${startDate || '...'} to ${endDate || '...'}` : rangeLabel;

    let details = k.details;
    let sales = k.totalSales;
    let revenue = k.totalRevenue;
    let discounts = k.totalDiscounts;
    let returns = k.totalReturns;
    let expenses = k.totalExpenses;
    let logins = k.logins;
    let other = k.otherActions;

    if (hasCustom) {
      try {
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        const res = await fetch(`/api/activities/kpi?${params}`, { headers: { 'x-shop-id': shop?.id || '' } });
        const data = await res.json();
        const fresh = (data.kpi || []).find((u: any) => u.userId === k.userId);
        if (fresh) {
          details = fresh.details;
          sales = fresh.totalSales;
          revenue = fresh.totalRevenue;
          discounts = fresh.totalDiscounts;
          returns = fresh.totalReturns;
          expenses = fresh.totalExpenses;
          logins = fresh.logins;
          other = fresh.otherActions;
        }
      } catch {}
    }
    const lines: string[] = [];
    lines.push(`User Report: ${k.userName}`);
    lines.push(`Role: ${k.role} · Email: ${k.email} · Joined: ${new Date(k.joinedAt).toLocaleDateString()}`);
    lines.push(`Period: ${periodStr}`);
    lines.push('');
    lines.push('=== Summary ===');
    lines.push(`Total Sales,${sales}`);
    lines.push(`Total Revenue,${revenue.toLocaleString()}`);
    lines.push(`Total Discounts,${discounts.toLocaleString()}`);
    lines.push(`Returns,${returns}`);
    lines.push(`Expenses,${expenses}`);
    lines.push(`Logins,${logins}`);
    lines.push(`Other Actions,${other}`);
    lines.push('');
    lines.push('=== Products Sold ===');
    lines.push('Date,Product,SKU,Qty,Unit Price,Total');
    for (const s of details.sales) {
      lines.push(`${new Date(s.date).toLocaleDateString()},${s.productName},${s.productSku || ''},${s.quantity},${s.unitPrice},${s.total}`);
    }
    lines.push('');
    lines.push('=== Products Returned ===');
    lines.push('Date,Product,SKU,Qty,Refund,Reason,Status');
    for (const r of details.returns) {
      lines.push(`${new Date(r.date).toLocaleDateString()},${r.productName},${r.productSku || ''},${r.quantity},${r.refundAmount},${r.reason || ''},${r.status || ''}`);
    }
    lines.push('');
    lines.push('=== Expenses ===');
    lines.push('Date,Details');
    for (const e of details.expenses) {
      lines.push(`${new Date(e.date).toLocaleDateString()},"${e.details || ''}"`);
    }
    lines.push('');
    lines.push('=== Logins ===');
    lines.push('Date');
    for (const l of details.logins) {
      lines.push(new Date(l.date).toLocaleString());
    }
    lines.push('');
    lines.push('=== Other Actions ===');
    lines.push('Date,Action,Details');
    for (const o of details.other) {
      lines.push(`${new Date(o.date).toLocaleDateString()},${o.action},"${o.details || ''}"`);
    }
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `user-report-${k.userName.toLowerCase().replace(/\s+/g, '-')}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const tabStyle = (active: boolean) => ({
    display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem',
    borderRadius: '0.5rem 0.5rem 0 0', border: '1px solid var(--border)',
    borderBottom: active ? '2px solid var(--foreground)' : '1px solid transparent',
    background: active ? 'var(--card)' : 'transparent',
    color: 'var(--foreground)', cursor: 'pointer', fontWeight: active ? '600' : '400' as const,
    fontSize: '0.85rem', marginBottom: '-1px',
  });

  const btnRange = (preset: RangePreset) => ({
    padding: '0.4rem 0.85rem', borderRadius: '0.375rem', border: '1px solid var(--border)',
    background: rangePreset === preset ? 'var(--foreground)' : 'var(--card)',
    color: rangePreset === preset ? 'var(--background)' : 'var(--foreground)',
    cursor: 'pointer', fontWeight: rangePreset === preset ? '600' as const : '400' as const,
    fontSize: '0.8rem',
  });

  const rangeLabel = exportStartDate || exportEndDate
    ? `${exportStartDate || '...'} to ${exportEndDate || '...'}`
    : rangePreset === 'all' ? 'All Time'
    : rangePreset === 'day' ? 'Last 24h'
    : rangePreset === 'week' ? 'Last 7 Days'
    : rangePreset === 'month' ? 'Last 30 Days' : 'Last 3 Months';

  const widgetMeta: { key: keyof UserDetails; label: string; color: string; bg: string }[] = [
    { key: 'sales', label: 'Sales', color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
    { key: 'returns', label: 'Returns', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
    { key: 'expenses', label: 'Expenses', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
    { key: 'logins', label: 'Logins', color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
    { key: 'other', label: 'Other', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
  ];

  return (
    <div style={{ padding: '1.5rem', color: 'var(--foreground)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--muted-foreground)', textDecoration: 'none', marginBottom: '0.5rem' }}>
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity size={28} /> User Activities & KPIs
          </h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>Monitor user performance and interactions</p>
        </div>
        <button onClick={tab === 'kpi' ? handleExportKpi : handleExportFeed} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--foreground)', cursor: 'pointer', fontWeight: '500' }}>
          <Download size={16} /> Export {tab === 'kpi' ? 'KPI' : 'CSV'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
        <button onClick={() => setTab('feed')} style={tabStyle(tab === 'feed')}>
          <List size={16} /> Activity Feed
        </button>
        <button onClick={() => setTab('kpi')} style={tabStyle(tab === 'kpi')}>
          <BarChart3 size={16} /> User KPIs
        </button>
      </div>

      {tab === 'feed' && (
        <>
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={userIdFilter} onChange={(e) => { setUserIdFilter(e.target.value); setPage(0); }} style={{ padding: '0.5rem 0.75rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--foreground)', fontSize: '0.85rem' }}>
              <option value="">All Users</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <input type="text" placeholder="Filter by user name..." value={userNameFilter} onChange={(e) => { setUserNameFilter(e.target.value); setPage(0); }} style={{ padding: '0.5rem 0.75rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--foreground)', fontSize: '0.85rem', width: '220px' }} />
          </div>
          <div style={{ background: 'var(--card)', borderRadius: '0.75rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>Loading...</div>
            ) : activities.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>No activities recorded yet</div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '170px 110px 1fr 80px', gap: '0', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--muted)', fontWeight: '600', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                  <div>Date & Time</div><div>User</div><div>Action / Details</div><div style={{ textAlign: 'center' }}>Type</div>
                </div>
                {activities.map((a) => {
                  const Icon = actionIcons[a.action] || Activity;
                  return (
                    <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '170px 110px 1fr 80px', gap: '0', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', fontSize: '0.85rem', alignItems: 'center' }}>
                      <div style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>{new Date(a.createdAt).toLocaleString()}</div>
                      <div style={{ fontWeight: '500' }}>{a.userName || 'System'}</div>
                      <div style={{ color: 'var(--muted-foreground)' }}>{a.details || a.action.replace(/_/g, ' ').toLowerCase()}</div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '0.375rem', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontSize: '0.7rem', fontWeight: '500' }}>
                          <Icon size={12} /> {a.action.replace(/_/g, ' ').toLowerCase()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ padding: '0.5rem 1rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: page === 0 ? 'var(--muted-foreground)' : 'var(--foreground)', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.5 : 1 }}>Previous</button>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Page {page + 1} of {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={{ padding: '0.5rem 1rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: page >= totalPages - 1 ? 'var(--muted-foreground)' : 'var(--foreground)', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.5 : 1 }}>Next</button>
            </div>
          )}
        </>
      )}

      {tab === 'kpi' && (
        <>
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Filter size={16} style={{ color: 'var(--muted-foreground)', marginRight: '0.25rem' }} />
            <button onClick={() => setRangePreset('day')} style={btnRange('day')}>Day</button>
            <button onClick={() => setRangePreset('week')} style={btnRange('week')}>Week</button>
            <button onClick={() => setRangePreset('month')} style={btnRange('month')}>Month</button>
            <button onClick={() => setRangePreset('3months')} style={btnRange('3months')}>3 Months</button>
            <button onClick={() => { setRangePreset('all'); setExportStartDate(''); setExportEndDate(''); }} style={btnRange('all')}>All Time</button>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginLeft: '0.5rem' }}><Calendar size={12} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />{rangeLabel}</span>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: '0.75rem', borderLeft: '1px solid var(--border)', paddingLeft: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Custom:</span>
              <input type="date" value={exportStartDate} onChange={(e) => { setExportStartDate(e.target.value); setRangePreset('all'); }} style={{ padding: '0.3rem 0.5rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.375rem', color: 'var(--foreground)', fontSize: '0.8rem' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>to</span>
              <input type="date" value={exportEndDate} onChange={(e) => { setExportEndDate(e.target.value); setRangePreset('all'); }} style={{ padding: '0.3rem 0.5rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.375rem', color: 'var(--foreground)', fontSize: '0.8rem' }} />
            </div>
          </div>
          {kpiLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>Loading KPIs...</div>
          ) : kpiData.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>No KPI data available for this period</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {kpiData.map((k) => {
                const isExpanded = expandedUser === k.userId;
                const totalActions = k.totalSales + k.totalReturns + k.totalExpenses + k.logins + k.otherActions;
                return (
                  <div key={k.userId} style={{ background: 'var(--card)', borderRadius: '0.75rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div onClick={() => setExpandedUser(isExpanded ? null : k.userId)} style={{ padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontWeight: '700', fontSize: '1rem' }}>
                          {k.userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '1rem' }}>{k.userName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{k.role} · {totalActions} actions · {k.totalRevenue.toLocaleString()} revenue</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ position: 'relative' }}>
                          <button onClick={(e) => { e.stopPropagation(); setUserReportUser(userReportUser === k.userId ? null : k.userId); }} title="Export user report" style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.3rem 0.6rem', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Download size={14} /> Report
                          </button>
                          {userReportUser === k.userId && (
                            <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '100%', right: '0', marginTop: '0.35rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '280px' }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>Export Report: {k.userName}</div>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input type="date" value={userReportStart} onChange={(e) => setUserReportStart(e.target.value)} style={{ flex: 1, padding: '0.3rem 0.5rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.375rem', color: 'var(--foreground)', fontSize: '0.8rem' }} />
                                <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>to</span>
                                <input type="date" value={userReportEnd} onChange={(e) => setUserReportEnd(e.target.value)} style={{ flex: 1, padding: '0.3rem 0.5rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.375rem', color: 'var(--foreground)', fontSize: '0.8rem' }} />
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button onClick={() => { setUserReportUser(null); handleExportUserReport(k, userReportStart, userReportEnd); }} style={{ padding: '0.35rem 0.85rem', background: 'var(--foreground)', color: 'var(--background)', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>Download</button>
                                <button onClick={() => setUserReportUser(null)} style={{ padding: '0.35rem 0.85rem', background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', color: 'var(--foreground)', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
                              </div>
                            </div>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp size={20} style={{ color: 'var(--muted-foreground)' }} /> : <ChevronDown size={20} style={{ color: 'var(--muted-foreground)' }} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '0 1.25rem 1.25rem 1.25rem' }}>
                        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                          {(() => {
                            const counts: Record<keyof UserDetails, number> = {
                              sales: k.totalSales,
                              returns: k.totalReturns,
                              expenses: k.totalExpenses,
                              logins: k.logins,
                              other: k.otherActions,
                            };
                            return widgetMeta.map(w => (
                              <div
                                key={w.key}
                                onClick={() => setExpandedWidget(
                                  expandedWidget?.userId === k.userId && expandedWidget?.widget === w.key
                                    ? null : { userId: k.userId, widget: w.key }
                                )}
                                style={{
                                  padding: '0.75rem 1rem', borderRadius: '0.5rem', background: w.bg,
                                  border: expandedWidget?.userId === k.userId && expandedWidget?.widget === w.key
                                    ? `2px solid ${w.color}` : '1px solid var(--border)',
                                  flex: '1', minWidth: '120px', cursor: 'pointer',
                                  transition: 'border 0.15s',
                                }}
                              >
                                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted-foreground)', marginBottom: '0.15rem' }}>{w.label}</div>
                                <div style={{ fontSize: '1.3rem', fontWeight: '700', color: w.color }}>{counts[w.key]}</div>
                              </div>
                            ));
                          })()}
                        </div>

                        {widgetMeta.map(w => {
                          const ew = expandedWidget?.userId === k.userId && expandedWidget?.widget === w.key;
                          if (!ew) return null;
                          const allItems = k.details[w.key];
                          const wpKey = `${k.userId}-${w.key}`;
                          const page = widgetPage[wpKey] || 0;
                          const perPage = 20;
                          const totalPages = Math.ceil(allItems.length / perPage);
                          const items = allItems.slice(page * perPage, (page + 1) * perPage);
                          return (
                            <div key={w.key} style={{ border: '1px solid var(--border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1rem', background: w.bg, borderBottom: '1px solid var(--border)', fontSize: '0.85rem', fontWeight: '600' }}>
                                <span style={{ color: w.color }}>
                                  {w.key === 'sales' ? `${detailLabels[w.key]} — Total: ${k.totalRevenue.toLocaleString()}` : detailLabels[w.key]}
                                </span>
                                <button onClick={() => setExpandedWidget(null)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: '0' }}>
                                  <X size={16} />
                                </button>
                              </div>
                              {items.length === 0 ? (
                                <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>No data for this period</div>
                              ) : w.key === 'logins' ? (
                                <div>
                                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    {(items as { date: string }[]).map((item, i) => (
                                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 1rem', borderBottom: '1px solid var(--border)', fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--muted-foreground)' }}>Login</span>
                                        <span>{new Date(item.date).toLocaleString()}</span>
                                      </div>
                                    ))}
                                  </div>
                                  {totalPages > 1 && (
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '0.5rem', borderTop: '1px solid var(--border)', fontSize: '0.8rem' }}>
                                      <button disabled={page === 0} onClick={() => setWidgetPage(p => ({ ...p, [wpKey]: page - 1 }))} style={{ padding: '0.25rem 0.6rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.25rem', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.4 : 1, color: 'var(--foreground)' }}>Prev</button>
                                      <span style={{ display: 'flex', alignItems: 'center', color: 'var(--muted-foreground)' }}>{page + 1} / {totalPages}</span>
                                      <button disabled={page >= totalPages - 1} onClick={() => setWidgetPage(p => ({ ...p, [wpKey]: page + 1 }))} style={{ padding: '0.25rem 0.6rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.25rem', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1, color: 'var(--foreground)' }}>Next</button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                    {items.map((item: DetailItem, i: number) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 1rem', borderBottom: '1px solid var(--border)', fontSize: '0.8rem', gap: '0.5rem' }}>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {item.productName || item.details || item.action?.replace(/_/g, ' ') || '-'}
                                        </div>
                                        <div style={{ color: 'var(--muted-foreground)', fontSize: '0.7rem' }}>
                                          {item.quantity && `Qty: ${item.quantity}`}
                                          {item.reason && `Reason: ${item.reason}`}
                                          {item.status && `Status: ${item.status}`}
                                        </div>
                                      </div>
                                      <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        <div>{item.total ? item.total.toLocaleString() : item.refundAmount ? item.refundAmount.toLocaleString() : item.unitPrice ? item.unitPrice.toLocaleString() : ''}</div>
                                        <div style={{ color: 'var(--muted-foreground)', fontSize: '0.7rem' }}>{new Date(item.date).toLocaleDateString()}</div>
                                      </div>
                                    </div>
                                  ))}
                                  </div>
                                  {totalPages > 1 && (
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '0.5rem', borderTop: '1px solid var(--border)', fontSize: '0.8rem' }}>
                                      <button disabled={page === 0} onClick={() => setWidgetPage(p => ({ ...p, [wpKey]: page - 1 }))} style={{ padding: '0.25rem 0.6rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.25rem', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.4 : 1, color: 'var(--foreground)' }}>Prev</button>
                                      <span style={{ display: 'flex', alignItems: 'center', color: 'var(--muted-foreground)' }}>{page + 1} / {totalPages}</span>
                                      <button disabled={page >= totalPages - 1} onClick={() => setWidgetPage(p => ({ ...p, [wpKey]: page + 1 }))} style={{ padding: '0.25rem 0.6rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.25rem', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1, color: 'var(--foreground)' }}>Next</button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
