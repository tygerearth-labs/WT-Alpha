'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3,
  PieChart as PieChartIcon, Target, Activity,
  RefreshCw, ArrowUpRight, ArrowDownRight,
  Percent, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface AnalyticsData {
  financials: {
    totalIncome: number;
    totalExpense: number;
    netFlow: number;
    incomeTxnCount: number;
    expenseTxnCount: number;
  };
  dailyStats: { date: string; type: string; total: number; count: number }[];
  topCategories: { name: string; icon: string; total: number; count: number }[];
  monthlyAggregates: { month: string; income: number; expense: number; savings: number }[];
  engagement: { totalUsers: number; activeUsersThisMonth: number; engagementRate: number };
  platformHealth: { savingsTargets: number; activeSavingsTargets: number; categories: number; activeInvites: number };
  recentActivity: { id: string; action: string; target: string; details: string; createdAt: string }[];
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/analytics');
      if (res.ok) {
        setData(await res.json());
      } else {
        setError('Failed to load analytics data. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally { setLoading(false); setIsRefreshing(false); }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  const maxDaily = useMemo(() => {
    if (!data) return 1;
    return Math.max(...data.dailyStats.map(d => d.total), 1);
  }, [data]);

  const totalCatAmount = useMemo(() => {
    if (!data) return 1;
    return Math.max(...data.topCategories.map(c => c.total), 1);
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
        <div className="h-10 w-64 rounded-xl bg-white/[0.03] animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 rounded-xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-52 rounded-xl bg-white/[0.03] animate-pulse" />
          <div className="h-52 rounded-xl bg-white/[0.03] animate-pulse" />
        </div>
      </div>
    );
  }

  if (!data && error) {
    return (
      <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="adm-section-header-icon" style={{ backgroundColor: 'rgba(187,134,252,0.1)' }}><BarChart3 className="h-4 w-4 text-[#BB86FC]" /></div>
            <h3 className="text-base font-bold text-white/80 adm-section-header">Financial Analytics</h3>
          </div>
          <Button variant="ghost" size="sm"
            className="h-8 gap-1.5 text-[11px] rounded-lg bg-white/[0.02] border border-white/[0.06] text-white/40 hover:text-white hover:bg-white/[0.04] adm-action-btn"
            onClick={() => { setLoading(true); fetchAnalytics(true); }}>
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        </div>
        <Card className="bg-[#0D0D0D] border-white/[0.06] adm-content-card">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#CF6679]/10 flex items-center justify-center mx-auto mb-3 adm-empty-state adm-empty-state-icon">
              <AlertCircle className="h-6 w-6 text-[#CF6679]/70" />
            </div>
            <p className="text-white/50 text-sm font-medium">Failed to load analytics</p>
            <p className="text-white/25 text-[12px] mt-1">{error}</p>
            <Button variant="outline" size="sm" className="mt-4 h-8 gap-1.5 bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white/70"
              onClick={() => { setLoading(true); fetchAnalytics(true); }}>
              <RefreshCw className="h-3 w-3" /> Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const finCards = [
    {
      label: 'Total Income', value: formatNumber(data.financials.totalIncome),
      icon: TrendingUp, color: '#03DAC6',
      sub: `${data.financials.incomeTxnCount} transactions`,
      gradient: 'linear-gradient(135deg, rgba(3,218,198,0.08) 0%, rgba(13,13,13,0.95) 50%, transparent 100%)',
    },
    {
      label: 'Total Expenses', value: formatNumber(data.financials.totalExpense),
      icon: TrendingDown, color: '#CF6679',
      sub: `${data.financials.expenseTxnCount} transactions`,
      gradient: 'linear-gradient(135deg, rgba(207,102,121,0.08) 0%, rgba(13,13,13,0.95) 50%, transparent 100%)',
    },
    {
      label: 'Net Cash Flow', value: `${data.financials.netFlow >= 0 ? '+' : ''}${formatNumber(data.financials.netFlow)}`,
      icon: DollarSign, color: data.financials.netFlow >= 0 ? '#03DAC6' : '#CF6679',
      sub: data.financials.netFlow >= 0 ? 'Platform is profitable' : 'Expenses exceed income',
      gradient: data.financials.netFlow >= 0
        ? 'linear-gradient(135deg, rgba(3,218,198,0.08) 0%, rgba(13,13,13,0.95) 50%, transparent 100%)'
        : 'linear-gradient(135deg, rgba(207,102,121,0.08) 0%, rgba(13,13,13,0.95) 50%, transparent 100%)',
    },
    {
      label: 'User Engagement', value: `${data.engagement.engagementRate}%`,
      icon: Percent, color: '#FFD700',
      sub: `${data.engagement.activeUsersThisMonth}/${data.engagement.totalUsers} active this month`,
      gradient: 'linear-gradient(135deg, rgba(255,215,0,0.08) 0%, rgba(13,13,13,0.95) 50%, transparent 100%)',
    },
  ];

  const catColors = ['#BB86FC', '#03DAC6', '#CF6679', '#F9A825', '#64B5F6', '#81C784', '#FFB74D', '#E57373'];

  return (
    <div className="space-y-4 relative">
      {/* Ambient glow backgrounds */}
      <div className="adm-ambient-glow adm-ambient-glow-purple absolute -top-20 -left-20 opacity-30 pointer-events-none" />
      <div className="adm-ambient-glow adm-ambient-glow-teal absolute top-60 -right-20 opacity-20 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="adm-section-header-icon" style={{ backgroundColor: 'rgba(187,134,252,0.1)' }}><BarChart3 className="h-4 w-4 text-[#BB86FC]" /></div>
          <h3 className="text-base font-bold text-white/80 adm-section-header">Financial Analytics</h3>
          <Badge variant="outline" className="text-[9px] font-semibold px-1.5 py-0 bg-[#BB86FC]/5 border-[#BB86FC]/15 text-[#BB86FC]/50 adm-badge adm-badge-info">
            Platform-wide
          </Badge>
        </div>
        <Button variant="ghost" size="sm"
          className="h-8 gap-1.5 text-[11px] rounded-lg bg-white/[0.02] border border-white/[0.06] text-white/40 hover:text-white hover:bg-white/[0.04] adm-action-btn"
          onClick={() => fetchAnalytics(true)}>
          <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {finCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div key={card.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, type: 'spring', stiffness: 400, damping: 25 }}
              whileHover={{ y: -2 }}
            >
              <Card className="border-white/[0.06] hover:border-white/[0.1] transition-all duration-300 hover:-translate-y-0.5 overflow-hidden adm-stat-card"
                style={{ background: card.gradient }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">{card.label}</p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xl font-bold text-white/90 tabular-nums">{card.value}</p>
                        {data.financials.netFlow !== 0 && card.label === 'Net Cash Flow' && (
                          <span className={cn('text-[10px]', data.financials.netFlow >= 0 ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                            {data.financials.netFlow >= 0 ? <ArrowUpRight className="h-3 w-3 inline" /> : <ArrowDownRight className="h-3 w-3 inline" />}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-white/25">{card.sub}</p>
                    </div>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: `${card.color}15` }}>
                      <Icon className="h-4 w-4" style={{ color: card.color }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Trends */}
        <Card className="lg:col-span-2 bg-[#0D0D0D] border-white/[0.06] adm-content-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="adm-section-header-icon" style={{ backgroundColor: 'rgba(3,218,198,0.1)' }}><BarChart3 className="h-4 w-4 text-[#03DAC6]" /></div>
              <CardTitle className="text-sm font-semibold text-white/70 adm-section-header">Monthly Revenue Trends</CardTitle>
              <Badge variant="outline" className="text-[9px] font-semibold px-1.5 py-0 bg-white/[0.02] border-white/[0.06] text-white/25 adm-badge adm-badge-info">
                6 months
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {data.monthlyAggregates.length === 0 ? (
              <div className="text-center py-10 text-white/15 text-[12px] adm-empty-state">No transaction data yet</div>
            ) : (
              <div className="flex items-end gap-3 h-44 px-2">
                {data.monthlyAggregates.map((m) => {
                  const maxVal = Math.max(...data.monthlyAggregates.map(d => Math.max(d.income, d.expense)), 1);
                  const incomeH = (m.income / maxVal) * 100;
                  const expenseH = (m.expense / maxVal) * 100;
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                      <div className="w-full flex items-end justify-center gap-[2px]" style={{ height: '140px' }}>
                        <div className="w-[40%] max-w-[28px] rounded-t-md transition-all duration-500"
                          style={{ height: `${Math.max(incomeH, 2)}%`, background: 'linear-gradient(to top, #03DAC6, #03DAC680)' }}
                          title={`Income: ${formatNumber(m.income)}`} />
                        <div className="w-[40%] max-w-[28px] rounded-t-md transition-all duration-500"
                          style={{ height: `${Math.max(expenseH, 2)}%`, background: 'linear-gradient(to top, #CF6679, #CF667980)' }}
                          title={`Expense: ${formatNumber(m.expense)}`} />
                      </div>
                      <span className="text-[9px] text-white/20 font-medium">
                        {new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 justify-center">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#03DAC6]" />
                <span className="text-[10px] text-white/30">Income</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#CF6679]" />
                <span className="text-[10px] text-white/30">Expense</span>
              </div>
              {data.monthlyAggregates.length > 0 && (
                <span className="text-[9px] text-white/15 ml-auto">
                  Savings: {formatNumber(data.monthlyAggregates.reduce((s, m) => s + m.savings, 0))}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Platform Categories */}
        <Card className="bg-[#0D0D0D] border-white/[0.06] adm-content-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white/70 flex items-center gap-2 adm-section-header">
              <div className="adm-section-header-icon" style={{ backgroundColor: 'rgba(187,134,252,0.1)' }}><PieChartIcon className="h-4 w-4 text-[#BB86FC]" /></div>
              Top Spending Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {data.topCategories.length === 0 ? (
              <div className="text-center py-10 text-white/15 text-[12px] adm-empty-state">No expense data yet</div>
            ) : (
              <div className="space-y-2.5">
                {data.topCategories.map((cat, idx) => (
                  <div key={cat.name} className="space-y-1.5 animate-in fade-in-0 slide-in-from-left-1 duration-300"
                    style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'backwards' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-white/60 truncate max-w-[120px]">{cat.name}</span>
                      <span className="text-[10px] font-semibold text-white/40 tabular-nums">{formatNumber(cat.total)}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden adm-progress-track">
                      <div className="h-full rounded-full transition-all duration-700 adm-progress-fill"
                        style={{ width: `${(cat.total / totalCatAmount) * 100}%`, background: catColors[idx % catColors.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform Health & Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Platform Health */}
        <Card className="bg-[#0D0D0D] border-white/[0.06] adm-content-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white/70 flex items-center gap-2 adm-section-header">
              <div className="adm-section-header-icon" style={{ backgroundColor: 'rgba(255,215,0,0.1)' }}><Target className="h-4 w-4 text-[#FFD700]" /></div>
              Platform Health
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Savings Targets', value: data.platformHealth.savingsTargets, sub: `${data.platformHealth.activeSavingsTargets} active`, color: '#03DAC6' },
                { label: 'Categories Created', value: data.platformHealth.categories, sub: 'across all users', color: '#BB86FC' },
                { label: 'Active Invites', value: data.platformHealth.activeInvites, sub: 'not yet used', color: '#FFD700' },
                { label: 'Total Users', value: data.engagement.totalUsers, sub: `${data.engagement.activeUsersThisMonth} active`, color: '#64B5F6' },
              ].map((item, idx) => (
                <motion.div key={item.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, type: 'spring', stiffness: 400, damping: 25 }}
                  whileHover={{ y: -2 }}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.03] transition-colors adm-metric-chip"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] text-white/25 uppercase tracking-wide">{item.label}</span>
                  </div>
                  <p className="text-lg font-bold text-white/80 tabular-nums">{item.value}</p>
                  <p className="text-[9px] text-white/20 mt-0.5">{item.sub}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Platform Activity */}
        <Card className="bg-[#0D0D0D] border-white/[0.06] adm-content-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white/70 flex items-center gap-2 adm-section-header">
              <div className="adm-section-header-icon" style={{ backgroundColor: 'rgba(3,218,198,0.1)' }}><Activity className="h-4 w-4 text-[#03DAC6]" /></div>
              Recent Platform Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {data.recentActivity.length === 0 ? (
              <div className="text-center py-8 text-white/15 text-[12px] adm-empty-state">No activity yet</div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar adm-scroll-mobile">
                {data.recentActivity.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.02] transition-colors adm-list-item">
                    <div className="w-7 h-7 rounded-lg bg-[#03DAC6]/10 flex items-center justify-center shrink-0 adm-list-item-accent">
                      <Activity className="h-3 w-3 text-[#03DAC6]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-white/55 capitalize">{log.action.replace(/_/g, ' ')}</p>
                      <p className="text-[10px] text-white/20 truncate">{log.details || log.target || '—'}</p>
                    </div>
                    <span className="text-[9px] text-white/15 shrink-0">
                      {new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
