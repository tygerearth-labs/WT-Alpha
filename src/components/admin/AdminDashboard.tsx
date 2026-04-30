'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users, UserPlus, Shield, CreditCard, AlertTriangle,
  Activity, TrendingUp, TrendingDown, UserCheck, UserX, Crown, Sparkles,
  RefreshCw, ArrowUpRight, ArrowDownRight, Zap, Database, Wallet,
  Clock, BarChart3, Star, Target, Bell, FileText, Link,
  ChevronRight, Loader2, History, Building2, Briefcase, TrendingUp as TrendUpIcon,
  PieChart, DollarSign,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import type { AdminPage } from './AdminLayout';
import { ExportDialog } from './ExportDialog';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  proUsers: number;
  basicUsers: number;
  activeInvites: number;
  usedInvites: number;
  recentUsers: {
    id: string; email: string; username: string; plan: string;
    status: string; createdAt: string;
  }[];
  usersExpiringSoon: number;
  dailyRegistrations: { date: string; count: number }[];
  planDistribution: { plan: string; count: number; percentage: number }[];
  topUsers: { id: string; username: string; email: string; plan: string; _count: { transactions: number } }[];
  systemHealth: { databaseSize: string; uptime: number; activeSessions: number };
  // Business stats
  totalBusinesses: number;
  activeBusinesses: number;
  totalBusinessSales: number;
  // Investment stats
  totalPortfolios: number;
  openPositions: number;
  totalInvestmentValue: number;
}

interface ActivityLogEntry {
  id: string;
  action: string;
  details?: string | null;
  createdAt: string;
  adminId?: string;
}

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (target === 0) return;
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - (startTimeRef.current ?? now);
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return target === 0 ? 0 : count;
}

function getActivityIcon(action: string) {
  const a = action?.toLowerCase() || '';
  if (a.includes('user') || a.includes('create')) return { icon: UserPlus, color: '#03DAC6' };
  if (a.includes('suspend') || a.includes('ban')) return { icon: Shield, color: '#CF6679' };
  if (a.includes('invite') || a.includes('token')) return { icon: Link, color: '#BB86FC' };
  if (a.includes('subscri') || a.includes('plan') || a.includes('upgrade')) return { icon: Crown, color: '#FFD700' };
  if (a.includes('login') || a.includes('auth')) return { icon: UserCheck, color: '#03DAC6' };
  if (a.includes('delete') || a.includes('remove')) return { icon: AlertTriangle, color: '#CF6679' };
  return { icon: Activity, color: '#03DAC6' };
}

function formatTimeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCurrency(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

interface AdminDashboardProps {
  onNavigate?: (page: AdminPage) => void;
}

const springTransition = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 25,
};

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recentActivity, setRecentActivity] = useState<ActivityLogEntry[]>([]);
  const [reportGenerating, setReportGenerating] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'overview' | 'charts' | 'platform' | 'activity'>('overview');

  const fetchStats = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setError(null);
        setLastRefresh(new Date());
      } else {
        const errorData = await res.json().catch(() => null);
        const errorMsg = errorData?.error || `Server error (${res.status})`;
        console.error('Admin stats API error:', res.status, errorMsg);
        setError(errorMsg);
        if (res.status === 401 || res.status === 403) {
          setError('Session expired or unauthorized. Please log in again.');
        }
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e);
      setError('Network error — could not reach the server.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const fetchRecentActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/activity-log?limit=5');
      if (res.ok) {
        const data = await res.json();
        setRecentActivity(data.logs || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchStats();
    fetchRecentActivity();
  }, [fetchStats, fetchRecentActivity]);

  useEffect(() => {
    if (!autoRefresh) {
      setCountdown(30);
      return;
    }
    setCountdown(30);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) return 30;
        return prev - 1;
      });
    }, 1000);
    const refreshInterval = setInterval(() => {
      fetchStats();
      fetchRecentActivity();
    }, 30000);
    return () => {
      clearInterval(countdownInterval);
      clearInterval(refreshInterval);
    };
  }, [autoRefresh, fetchStats, fetchRecentActivity]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const handleGenerateReport = async (reportType: string) => {
    const typeMap: Record<string, string> = {
      'user-report': 'users',
      'financial-summary': 'activity',
      'activity-report': 'activity',
    };
    const labels: Record<string, string> = {
      'user-report': 'User Report',
      'financial-summary': 'Financial Summary',
      'activity-report': 'Activity Report',
    };
    const exportType = typeMap[reportType] || 'users';
    setReportGenerating(reportType);
    try {
      const res = await fetch('/api/admin/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: exportType, format: 'csv' }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${labels[reportType].replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${labels[reportType]} downloaded`);
    } catch {
      toast.error(`Failed to generate ${labels[reportType]}`);
    } finally {
      setReportGenerating(null);
    }
  };

  // Counter animation hooks
  const animTotal = useCountUp(stats?.totalUsers ?? 0);
  const animPro = useCountUp(stats?.proUsers ?? 0);
  const animInvites = useCountUp(stats?.activeInvites ?? 0);
  const animSuspended = useCountUp(stats?.suspendedUsers ?? 0);
  const animBusinesses = useCountUp(stats?.totalBusinesses ?? 0);
  const animPortfolios = useCountUp(stats?.totalPortfolios ?? 0);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Hero skeleton */}
        <div className="relative h-40 rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
          <div className="absolute inset-0 animate-shimmer"
            style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)', backgroundSize: '200% 100%' }} />
        </div>
        {/* Stat card skeletons */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="relative h-28 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
              <div className="absolute inset-0 animate-shimmer"
                style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)', backgroundSize: '200% 100%' }} />
            </div>
          ))}
        </div>
        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="relative h-52 lg:col-span-2 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
            <div className="absolute inset-0 animate-shimmer"
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)', backgroundSize: '200% 100%' }} />
          </div>
          <div className="relative h-52 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
            <div className="absolute inset-0 animate-shimmer"
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)', backgroundSize: '200% 100%' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-14 h-14 rounded-full bg-[#CF6679]/10 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-[#CF6679]/60" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-white/50 font-medium">Failed to load dashboard</p>
          {error && (
            <p className="text-[12px] text-white/25">{error}</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-[11px] rounded-lg bg-white/[0.02] border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.04]"
          onClick={() => { setLoading(true); setError(null); fetchStats(); fetchRecentActivity(); }}
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </Button>
      </div>
    );
  }

  const notificationCount = stats.usersExpiringSoon + (stats.suspendedUsers > 0 ? 1 : 0);
  const maxDailyCount = Math.max(...stats.dailyRegistrations.map(d => d.count), 1);

  const computeTrend = (daily: { date: string; count: number }[]): string => {
    if (daily.length < 2) return '—';
    const last = daily[daily.length - 1]?.count || 0;
    const prev = daily[daily.length - 2]?.count || 0;
    if (prev === 0) return last > 0 ? `+${last}` : '0';
    const pct = Math.round(((last - prev) / prev) * 100);
    return `${pct > 0 ? '+' : ''}${pct}%`;
  };
  const computeTrendDir = (daily: { date: string; count: number }[]): boolean => {
    if (daily.length < 2) return true;
    return (daily[daily.length - 1]?.count || 0) >= (daily[daily.length - 2]?.count || 0);
  };

  const trendLabel = stats.dailyRegistrations.length > 1 ? computeTrend(stats.dailyRegistrations) : '—';
  const trendUp = stats.dailyRegistrations.length > 1 && computeTrendDir(stats.dailyRegistrations);

  // Chart data for Recharts
  const chartData = stats.dailyRegistrations.map((d) => ({
    ...d,
    day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3),
  }));

  // 6 Stat cards
  const statCards = [
    { label: 'Total Users', value: animTotal, icon: Users, color: '#03DAC6', sub: `${stats.activeUsers} active`, trend: trendLabel, trendUp, gradient: 'linear-gradient(135deg, rgba(3,218,198,0.10) 0%, rgba(13,13,13,0.95) 50%, rgba(3,218,198,0.03) 100%)' },
    { label: 'Pro Plans', value: animPro, icon: Crown, color: '#FFD700', sub: `${stats.basicUsers} basic`, trend: stats.totalUsers > 0 ? `${Math.round((stats.proUsers / stats.totalUsers) * 100)}%` : '—', trendUp: stats.proUsers > 0, gradient: 'linear-gradient(135deg, rgba(255,215,0,0.10) 0%, rgba(13,13,13,0.95) 50%, rgba(255,215,0,0.03) 100%)' },
    { label: 'Businesses', value: animBusinesses, icon: Building2, color: '#BB86FC', sub: `${stats.activeBusinesses} active`, trend: `${stats.totalBusinessSales > 0 ? formatCurrency(stats.totalBusinessSales) : '0'} sales`, trendUp: stats.activeBusinesses > 0, gradient: 'linear-gradient(135deg, rgba(187,134,252,0.10) 0%, rgba(13,13,13,0.95) 50%, rgba(187,134,252,0.03) 100%)' },
    { label: 'Portfolios', value: animPortfolios, icon: Briefcase, color: '#03DAC6', sub: `${stats.openPositions} open`, trend: stats.totalInvestmentValue > 0 ? formatCurrency(stats.totalInvestmentValue) : '—', trendUp: stats.openPositions > 0, gradient: 'linear-gradient(135deg, rgba(3,218,198,0.07) 0%, rgba(13,13,13,0.95) 50%, rgba(3,218,198,0.02) 100%)' },
    { label: 'Active Invites', value: animInvites, icon: Link, color: '#BB86FC', sub: `${stats.usedInvites} used`, trend: stats.activeInvites > 0 ? `${stats.activeInvites} open` : 'none', trendUp: stats.activeInvites > 0, gradient: 'linear-gradient(135deg, rgba(187,134,252,0.08) 0%, rgba(13,13,13,0.95) 50%, rgba(187,134,252,0.03) 100%)' },
    { label: 'Suspended', value: animSuspended, icon: UserX, color: '#CF6679', sub: `${stats.usersExpiringSoon} expiring`, trend: `${stats.suspendedUsers}`, trendUp: false, gradient: 'linear-gradient(135deg, rgba(207,102,121,0.08) 0%, rgba(13,13,13,0.95) 50%, rgba(207,102,121,0.03) 100%)' },
  ];

  const quickActions = [
    { label: 'Create User', icon: UserPlus, color: '#03DAC6', page: 'users' as AdminPage },
    { label: 'Create Invite', icon: Link, color: '#BB86FC', page: 'invites' as AdminPage },
    { label: 'Export Report', icon: FileText, color: '#FFD700', action: () => handleGenerateReport('user-report') },
  ];

  return (
    <div className="space-y-5">
      {/* ═══════════════════ HERO SECTION ═══════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0 }}
      >
        <div className="adm-hero-card relative overflow-hidden p-5 sm:p-6">
          {/* Ambient glows */}
          <div className="adm-ambient-glow adm-ambient-glow-teal pointer-events-none" style={{ top: '-40%', left: '-10%' }} />
          <div className="adm-ambient-glow adm-ambient-glow-purple pointer-events-none" style={{ top: '-20%', right: '-5%' }} />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">👋</span>
                <h2 className="text-xl sm:text-2xl font-bold adm-gradient-text">{getGreeting()}, Admin!</h2>
              </div>
              <p className="text-[13px] text-white/40">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="hidden sm:block"><ExportDialog /></div>

              <div className="hidden sm:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 text-[11px] rounded-lg bg-white/[0.02] border border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.04] transition-all"
                  >
                    {reportGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                    {t('admin.dashboard.quickReport')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-52 bg-[#0D0D0D]/95 backdrop-blur-xl border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                  <DropdownMenuItem onClick={() => handleGenerateReport('user-report')} disabled={!!reportGenerating}
                    className="text-white/60 focus:text-white focus:bg-white/[0.05] rounded-lg mx-1 my-0.5 cursor-pointer">
                    <Users className="mr-2.5 h-4 w-4 text-[#03DAC6]" /><span className="text-[13px]">User Report</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleGenerateReport('financial-summary')} disabled={!!reportGenerating}
                    className="text-white/60 focus:text-white focus:bg-white/[0.05] rounded-lg mx-1 my-0.5 cursor-pointer">
                    <CreditCard className="mr-2.5 h-4 w-4 text-[#FFD700]" /><span className="text-[13px]">Financial Summary</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleGenerateReport('activity-report')} disabled={!!reportGenerating}
                    className="text-white/60 focus:text-white focus:bg-white/[0.05] rounded-lg mx-1 my-0.5 cursor-pointer">
                    <Activity className="mr-2.5 h-4 w-4 text-[#BB86FC]" /><span className="text-[13px]">Activity Report</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-white/25 px-2.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <Clock className="h-3 w-3" />
                {lastRefresh.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </div>

              {autoRefresh && (
                <div className="flex items-center gap-1.5 text-[10px] text-[#03DAC6]/70 px-2.5 py-1.5 rounded-lg bg-[#03DAC6]/5 border border-[#03DAC6]/10">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#03DAC6] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#03DAC6]" />
                  </span>
                  <span className="font-medium">Live</span>
                  <span className="text-white/20">·</span>
                  <span className="text-[#03DAC6]/50 tabular-nums">{countdown}s</span>
                </div>
              )}

              <Button variant="ghost" size="sm"
                className={cn('h-8 w-8 p-0 rounded-lg', autoRefresh ? 'text-[#03DAC6] bg-[#03DAC6]/10' : 'text-white/30 hover:text-white/50 hover:bg-white/[0.04]')}
                onClick={() => setAutoRefresh(!autoRefresh)} title={autoRefresh ? 'Auto-refresh ON (30s)' : 'Auto-refresh OFF'}>
                <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
              </Button>
              <Button variant="outline" size="sm"
                className="h-8 gap-1.5 text-[11px] rounded-lg bg-white/[0.02] border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.04]"
                onClick={() => fetchStats(true)}>
                <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Hero metric chips */}
          <div className="relative z-10 mt-5 flex flex-wrap gap-3">
            <div className="adm-metric-chip">
              <div className="adm-metric-chip-icon" style={{ backgroundColor: 'rgba(3,218,198,0.12)' }}>
                <Users className="h-4 w-4 text-[#03DAC6]" />
              </div>
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Users</p>
                <p className="text-lg font-bold text-white/90 tabular-nums">{stats.totalUsers}</p>
              </div>
            </div>
            <div className="adm-metric-chip">
              <div className="adm-metric-chip-icon" style={{ backgroundColor: 'rgba(187,134,252,0.12)' }}>
                <Building2 className="h-4 w-4 text-[#BB86FC]" />
              </div>
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Businesses</p>
                <p className="text-lg font-bold text-white/90 tabular-nums">{stats.totalBusinesses}</p>
              </div>
            </div>
            <div className="adm-metric-chip">
              <div className="adm-metric-chip-icon" style={{ backgroundColor: 'rgba(255,215,0,0.12)' }}>
                <Briefcase className="h-4 w-4 text-[#FFD700]" />
              </div>
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Investments</p>
                <p className="text-lg font-bold text-white/90 tabular-nums">{stats.totalPortfolios}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════ MOBILE SECTION TABS ═══════════════════ */}
      <div className="lg:hidden sticky top-0 z-20 -mx-4 px-4 pt-1 pb-3 bg-[#0A0A0A]/95 backdrop-blur-xl">
        <div className="flex gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
          {([
            { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
            { id: 'charts' as const, label: 'Charts', icon: PieChart },
            { id: 'platform' as const, label: 'Platform', icon: Building2 },
            { id: 'activity' as const, label: 'Activity', icon: Activity },
          ]).map(tab => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setMobileTab(tab.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-semibold transition-all duration-200',
                  mobileTab === tab.id
                    ? 'bg-[#03DAC6]/10 text-[#03DAC6] shadow-[0_0_16px_rgba(3,218,198,0.12)]'
                    : 'text-white/30 active:text-white/50'
                )}
              >
                <TabIcon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════ OVERVIEW TAB: Notification + Stats ═══════════════════ */}
      <div className={cn(mobileTab !== 'overview' && 'hidden', 'lg:block', 'space-y-5')}>

      {/* ═══════════════════ NOTIFICATION ALERT BAR ═══════════════════ */}
      {notificationCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.05 }}
        >
          <div className="adm-alert-banner flex items-center gap-3 p-3 rounded-xl bg-[#FFD700]/[0.04] border border-[#FFD700]/10">
            <div className="relative">
              <Bell className="h-4 w-4 text-[#FFD700]" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#CF6679] animate-ping" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#CF6679]" />
            </div>
            <p className="text-[12px] text-[#FFD700]/70 font-medium">
              {stats.usersExpiringSoon > 0 && `${stats.usersExpiringSoon} subscription(s) expiring soon`}
              {stats.usersExpiringSoon > 0 && stats.suspendedUsers > 0 && ' · '}
              {stats.suspendedUsers > 0 && `${stats.suspendedUsers} suspended user(s)`}
            </p>
          </div>
        </motion.div>
      )}

      {/* ═══════════════════ STATS GRID (6 cards) ═══════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-tour="dashboard-stats">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div key={card.label}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.08 + idx * 0.05, type: 'spring', stiffness: 380, damping: 22 }}
              whileHover={{ y: -3, scale: 1.02 }}
              className="group relative"
            >
              {/* Gradient border hover effect */}
              <div className="absolute -inset-[1px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(135deg, ${card.color}35, transparent 50%, ${card.color}15)` }} />
              <Card
                className="adm-stat-card relative overflow-hidden p-3 sm:p-4 border-white/[0.06]"
                style={{ background: card.gradient, '--biz-accent': `${card.color}50` } as React.CSSProperties}
              >
                {/* Top glow */}
                <div className="absolute top-0 left-0 right-0 h-12 pointer-events-none"
                  style={{ background: `linear-gradient(180deg, ${card.color}08 0%, transparent 100%)` }} />

                <div className="relative flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${card.color}20, ${card.color}10)`, boxShadow: `0 2px 8px ${card.color}15` }}>
                      <Icon className="h-4 w-4" style={{ color: card.color }} />
                    </div>
                    <div className={cn(
                      'flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-md',
                      card.trendUp ? 'text-[#03DAC6] bg-[#03DAC6]/10' : 'text-[#CF6679] bg-[#CF6679]/10'
                    )}>
                      {card.trendUp ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                      {card.trend}
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white/90 tracking-tight tabular-nums">{card.value}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mt-0.5">{card.label}</p>
                  </div>
                  <p className="text-[10px] text-white/25">{card.sub}</p>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
      </div>{/* end overview tab */}

      {/* ═══════════════════ CHARTS TAB: Registrations + Distribution ═══════════════════ */}
      <div className={cn(mobileTab !== 'charts' && 'hidden', 'lg:block')}>

      {/* ═══════════════════ CHARTS SECTION ═══════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily Registrations — Recharts Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="adm-content-card bg-[#0D0D0D] border-white/[0.06]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="adm-section-header text-sm font-semibold text-white/70 flex items-center gap-2">
                  <div className="adm-section-header-icon" style={{ backgroundColor: 'rgba(3,218,198,0.1)' }}><BarChart3 className="h-4 w-4 text-[#03DAC6]" /></div>
                  User Registrations
                  <Badge variant="outline" className="text-[9px] font-semibold px-1.5 py-0 bg-white/[0.02] border-white/[0.06] text-white/30">
                    Last 7 days
                  </Badge>
                </CardTitle>
                <span className="text-[11px] text-white/20 font-medium">
                  Total: {stats.dailyRegistrations.reduce((s, d) => s + d.count, 0)} new users
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-40 sm:h-48 lg:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barCategoryGap="20%">
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: 500 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(13,13,13,0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px',
                        fontSize: '12px',
                        color: 'rgba(255,255,255,0.8)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(12px)',
                      }}
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      labelStyle={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: 4 }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={entry.date}
                          fill={index === chartData.length - 1 ? '#03DAC6' : 'rgba(3,218,198,0.25)'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Plan Distribution Donut */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.45 }}
        >
          <Card className="adm-content-card bg-[#0D0D0D] border-white/[0.06]">
            <CardHeader className="pb-3">
              <CardTitle className="adm-section-header text-sm font-semibold text-white/70 flex items-center gap-2">
                <div className="adm-section-header-icon" style={{ backgroundColor: 'rgba(187,134,252,0.1)' }}><PieChart className="h-4 w-4 text-[#BB86FC]" /></div>
                Plan Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex justify-center mb-5">
                <div className="relative w-28 h-28">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="12" />
                    {stats.planDistribution.map((p, i) => {
                      const circumference = 2 * Math.PI * 40;
                      const segmentLength = (p.percentage / 100) * circumference;
                      const offset = i === 0 ? 0 : stats.planDistribution.slice(0, i).reduce((s, pp) => s + (pp.percentage / 100) * circumference, 0);
                      const color = p.plan === 'pro' ? '#FFD700' : p.plan === 'ultimate' ? '#BB86FC' : p.plan === 'admin' ? '#03DAC6' : '#555';
                      return (
                        <circle
                          key={p.plan}
                          cx="50" cy="50" r="40"
                          fill="none"
                          stroke={color}
                          strokeWidth="12"
                          strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                          strokeDashoffset={-offset}
                          strokeLinecap="round"
                          className="transition-all duration-700"
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-lg font-bold text-white/90 tabular-nums">{stats.totalUsers}</p>
                    <p className="text-[9px] text-white/30 uppercase tracking-wider">Total</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2.5">
                {stats.planDistribution.map((p) => {
                  const color = p.plan === 'pro' ? '#FFD700' : p.plan === 'ultimate' ? '#BB86FC' : p.plan === 'admin' ? '#03DAC6' : '#555';
                  const Icon = p.plan === 'pro' ? Crown : p.plan === 'ultimate' ? Sparkles : p.plan === 'admin' ? Shield : Users;
                  return (
                    <div key={p.plan} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: `${color}15` }}>
                          <Icon className="h-3.5 w-3.5" style={{ color }} />
                        </div>
                        <span className="text-[12px] font-medium text-white/60 capitalize">{p.plan}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.percentage}%`, backgroundColor: color }} />
                        </div>
                        <span className="text-[11px] font-semibold text-white/40 w-12 text-right">{p.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      </div>{/* end charts tab */}

      {/* ═══════════════════ PLATFORM TAB: Business & Investment ═══════════════════ */}
      <div className={cn(mobileTab !== 'platform' && 'hidden', 'lg:block')}>

      {/* ═══════════════════ BUSINESS & INVESTMENT SECTION ═══════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.5 }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Business Card */}
          <Card className="adm-content-card bg-[#0D0D0D] border-white/[0.06] p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(187,134,252,0.18), rgba(187,134,252,0.08))' }}>
                <Building2 className="h-5 w-5 text-[#BB86FC]" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Businesses</p>
                <p className="text-xl font-bold text-white/90 tabular-nums">{stats.totalBusinesses}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/35">Active</span>
                <span className="text-white/60 font-semibold tabular-nums">{stats.activeBusinesses}</span>
              </div>
              <div className="adm-progress-track">
                <div className="adm-progress-fill adm-progress-glow" style={{ width: `${stats.totalBusinesses > 0 ? (stats.activeBusinesses / stats.totalBusinesses) * 100 : 0}%`, backgroundColor: '#BB86FC', '--biz-progress-color': 'rgba(187,134,252,0.3)' } as React.CSSProperties} />
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-white/35">Total Sales</span>
                <span className="text-[#BB86FC] font-semibold tabular-nums">{formatCurrency(stats.totalBusinessSales)}</span>
              </div>
            </div>
          </Card>

          {/* Investment Card */}
          <Card className="adm-content-card bg-[#0D0D0D] border-white/[0.06] p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(3,218,198,0.18), rgba(3,218,198,0.08))' }}>
                <Briefcase className="h-5 w-5 text-[#03DAC6]" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Portfolios</p>
                <p className="text-xl font-bold text-white/90 tabular-nums">{stats.totalPortfolios}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/35">Open Positions</span>
                <span className="text-white/60 font-semibold tabular-nums">{stats.openPositions}</span>
              </div>
              <div className="adm-progress-track">
                <div className="adm-progress-fill adm-progress-glow" style={{ width: `${stats.totalPortfolios > 0 ? (stats.openPositions / stats.totalPortfolios) * 100 : 0}%`, backgroundColor: '#03DAC6', '--biz-progress-color': 'rgba(3,218,198,0.3)' } as React.CSSProperties} />
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-white/35">Total Value</span>
                <span className="text-[#03DAC6] font-semibold tabular-nums">{formatCurrency(stats.totalInvestmentValue)}</span>
              </div>
            </div>
          </Card>

          {/* Platform Health */}
          <Card className="adm-content-card bg-[#0D0D0D] border-white/[0.06] p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.18), rgba(255,215,0,0.08))' }}>
                <Zap className="h-5 w-5 text-[#FFD700]" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Health</p>
                <p className="text-xl font-bold text-white/90">Online</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/35">DB Size</span>
                <span className="text-white/60 font-semibold">{stats.systemHealth?.databaseSize || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/35">Uptime</span>
                <span className="text-white/60 font-semibold">{formatUptime(stats.systemHealth?.uptime || 0)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/35">Sessions</span>
                <span className="text-white/60 font-semibold tabular-nums">{stats.systemHealth?.activeSessions}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-white/35">Conversion</span>
                <span className="text-[#FFD700] font-semibold tabular-nums">
                  {stats.totalUsers > 0 ? `${Math.round((stats.proUsers / stats.totalUsers) * 100)}%` : '0%'}
                </span>
              </div>
            </div>
          </Card>

          {/* Quick Stats — Expiring + Active */}
          <Card className="adm-content-card bg-[#0D0D0D] border-white/[0.06] p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(207,102,121,0.18), rgba(207,102,121,0.08))' }}>
                <AlertTriangle className="h-5 w-5 text-[#CF6679]" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Alerts</p>
                <p className="text-xl font-bold text-white/90 tabular-nums">{notificationCount}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/35">Expiring Soon</span>
                <span className={cn('font-semibold tabular-nums', stats.usersExpiringSoon > 0 ? 'text-[#FFD700]' : 'text-white/40')}>{stats.usersExpiringSoon}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/35">Suspended</span>
                <span className={cn('font-semibold tabular-nums', stats.suspendedUsers > 0 ? 'text-[#CF6679]' : 'text-white/40')}>{stats.suspendedUsers}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/35">Active Users</span>
                <span className="text-[#03DAC6] font-semibold tabular-nums">{stats.activeUsers}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-white/35">Active %</span>
                <span className="text-[#03DAC6] font-semibold tabular-nums">
                  {stats.totalUsers > 0 ? `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}%` : '0%'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </motion.div>

      </div>{/* end platform tab */}

      {/* ═══════════════════ ACTIVITY TAB: Quick Actions + Activity + Top Users ═══════════════════ */}
      <div className={cn(mobileTab !== 'activity' && 'hidden', 'lg:block', 'space-y-4')}>

      {/* ═══════════════════ QUICK ACTIONS + RECENT ACTIVITY ═══════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions Row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.55 }}
        >
          <Card className="adm-content-card bg-[#0D0D0D] border-white/[0.06]" data-tour="quick-actions">
            <CardHeader className="pb-3">
              <CardTitle className="adm-section-header text-sm font-semibold text-white/70 flex items-center gap-2">
                <div className="adm-section-header-icon" style={{ backgroundColor: 'rgba(255,215,0,0.1)' }}><Zap className="h-4 w-4 text-[#FFD700]" /></div>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-row gap-2 overflow-x-auto pb-1 lg:grid lg:grid-cols-1 lg:overflow-visible lg:pb-0">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      onClick={() => action.page ? onNavigate?.(action.page) : action.action?.()}
                      className="group flex items-center gap-3 p-3.5 rounded-xl text-left min-w-[180px] lg:w-full hover:bg-white/[0.03] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200 active:scale-[0.97]"
                    >
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
                        style={{ background: `linear-gradient(135deg, ${action.color}18, ${action.color}08)` }}>
                        <Icon className="h-4 w-4" style={{ color: action.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-white/70 group-hover:text-white/90 transition-colors">{action.label}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-white/15 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.6 }}
          className="lg:col-span-2"
        >
          <Card className="adm-content-card bg-[#0D0D0D] border-white/[0.06]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="adm-section-header text-sm font-semibold text-white/70 flex items-center gap-2">
                  <div className="adm-section-header-icon" style={{ backgroundColor: 'rgba(3,218,198,0.1)' }}><Activity className="h-4 w-4 text-[#03DAC6]" /></div>
                  Recent Activity
                  <Badge variant="outline" className="text-[9px] font-semibold px-1.5 py-0 bg-[#03DAC6]/5 border-[#03DAC6]/15 text-[#03DAC6]/50">
                    Last 5
                  </Badge>
                </CardTitle>
                <button
                  onClick={() => onNavigate?.('activity-log')}
                  className="flex items-center gap-1 text-[11px] text-[#03DAC6]/60 hover:text-[#03DAC6] transition-colors"
                >
                  View All
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-white/20 text-[12px]">
                  <History className="h-8 w-8 mx-auto mb-2 text-white/10" />
                  No recent activity
                </div>
              ) : (
                <div className="space-y-1">
                  {recentActivity.map((log, idx) => {
                    const { icon: LogIcon, color } = getActivityIcon(log.action);
                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.65 + idx * 0.04, type: 'spring', stiffness: 300, damping: 20 }}
                        className={cn(
                          'adm-list-item rounded-xl',
                          idx === 0 ? 'bg-white/[0.02] border border-white/[0.04]' : ''
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${color}12` }}>
                          <LogIcon className="h-3.5 w-3.5" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[12px] font-semibold text-white/70 capitalize">{log.action}</p>
                            {idx === 0 && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#03DAC6] animate-pulse" />
                            )}
                          </div>
                          <p className="text-[11px] text-white/30 truncate mt-0.5">{log.details || '—'}</p>
                        </div>
                        <span className="text-[10px] text-white/20 shrink-0">{formatTimeAgo(log.createdAt)}</span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ═══════════════════ BOTTOM ROW: TOP USERS ═══════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.7 }}
      >
        <Card className="adm-content-card bg-[#0D0D0D] border-white/[0.06]">
          <CardHeader className="pb-3">
            <CardTitle className="adm-section-header text-sm font-semibold text-white/70 flex items-center gap-2">
              <div className="adm-section-header-icon" style={{ backgroundColor: 'rgba(255,215,0,0.1)' }}><Star className="h-4 w-4 text-[#FFD700]" /></div>
              Top Active Users
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.topUsers.length === 0 ? (
              <div className="text-center py-6 text-white/20 text-[12px]">No user activity yet</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {stats.topUsers.map((user, idx) => (
                  <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0',
                      idx === 0 ? 'bg-[#FFD700]/15 text-[#FFD700]' :
                      idx === 1 ? 'bg-white/[0.08] text-white/50' :
                      'bg-[#CD7F32]/15 text-[#CD7F32]'
                    )}>
                      #{idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-white/70 truncate">{user.username}</p>
                      <p className="text-[10px] text-white/25 truncate">{user.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[12px] font-semibold text-white/50 tabular-nums">{user._count.transactions}</p>
                      <p className="text-[9px] text-white/20">txns</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      </div>{/* end activity tab */}
    </div>
  );
}
