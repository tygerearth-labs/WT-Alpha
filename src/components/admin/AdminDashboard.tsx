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
  ChevronRight, Loader2, History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
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

interface AdminDashboardProps {
  onNavigate?: (page: AdminPage) => void;
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tiltCard, setTiltCard] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityLogEntry[]>([]);
  const [reportGenerating, setReportGenerating] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);

  const [error, setError] = useState<string | null>(null);

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
        // If unauthorized, the session may have expired
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

  // Auto-refresh every 30 seconds
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

  const handleTiltMouseMove = (e: React.MouseEvent<HTMLDivElement>, cardLabel: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTiltCard(`${cardLabel}-${x.toFixed(3)}-${y.toFixed(3)}`);
  };

  const handleTiltMouseLeave = () => {
    setTiltCard(null);
  };

  const getTiltStyle = (cardLabel: string): React.CSSProperties => {
    if (!tiltCard?.startsWith(cardLabel)) return {};
    const parts = tiltCard.split('-');
    const x = parseFloat(parts[parts.length - 2]);
    const y = parseFloat(parts[parts.length - 1]);
    return {
      transform: `perspective(600px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg)`,
      transition: 'transform 0.15s ease-out',
    };
  };

  const handleGenerateReport = (reportType: string) => {
    const labels: Record<string, string> = {
      'user-report': 'User Report',
      'financial-summary': 'Financial Summary',
      'activity-report': 'Activity Report',
    };
    setReportGenerating(reportType);
    toast.success('Report generation started', {
      description: `${labels[reportType]} is being generated...`,
    });
    setTimeout(() => {
      setReportGenerating(null);
      toast.success('Report ready for download', {
        description: `${labels[reportType]} has been generated successfully.`,
        action: {
          label: 'Download',
          onClick: () => {
            toast.info('Download started', {
              description: 'This is a demo — no file was actually downloaded.',
            });
          },
        },
        duration: 6000,
      });
    }, 2000);
  };

  // Counter animation hooks
  const animTotal = useCountUp(stats?.totalUsers ?? 0);
  const animPro = useCountUp(stats?.proUsers ?? 0);
  const animInvites = useCountUp(stats?.activeInvites ?? 0);
  const animSuspended = useCountUp(stats?.suspendedUsers ?? 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 rounded-xl bg-white/[0.03] animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="relative h-32 rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
              <div className="absolute inset-0 animate-shimmer"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)',
                  backgroundSize: '200% 100%',
                }} />
            </div>
          ))}
        </div>
        <div className="relative h-48 rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
          <div className="absolute inset-0 animate-shimmer"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
            }} />
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

  const maxDailyCount = Math.max(...stats.dailyRegistrations.map(d => d.count), 1);
  const notificationCount = stats.usersExpiringSoon + (stats.suspendedUsers > 0 ? 1 : 0);

  const statCards = [
    { label: 'Total Users', value: animTotal, icon: Users, color: '#03DAC6', sub: `${stats.activeUsers} active`, trend: '+12%', trendUp: true, gradient: 'linear-gradient(135deg, rgba(3,218,198,0.08) 0%, rgba(13,13,13,0.95) 50%, rgba(3,218,198,0.03) 100%)' },
    { label: 'Pro Users', value: animPro, icon: Crown, color: '#FFD700', sub: `${stats.basicUsers} basic`, trend: '+8%', trendUp: true, gradient: 'linear-gradient(135deg, rgba(255,215,0,0.08) 0%, rgba(13,13,13,0.95) 50%, rgba(255,215,0,0.03) 100%)' },
    { label: 'Active Invites', value: animInvites, icon: UserPlus, color: '#BB86FC', sub: `${stats.usedInvites} used`, trend: '-3%', trendUp: false, gradient: 'linear-gradient(135deg, rgba(187,134,252,0.08) 0%, rgba(13,13,13,0.95) 50%, rgba(187,134,252,0.03) 100%)' },
    { label: 'Suspended', value: animSuspended, icon: UserX, color: '#CF6679', sub: `${stats.usersExpiringSoon} expiring`, trend: stats.suspendedUsers > 0 ? '+1' : '0', trendUp: stats.suspendedUsers > 0, gradient: 'linear-gradient(135deg, rgba(207,102,121,0.08) 0%, rgba(13,13,13,0.95) 50%, rgba(207,102,121,0.03) 100%)' },
  ];

  const quickActions = [
    { label: 'Create User', icon: UserPlus, color: '#03DAC6', page: 'users' as AdminPage },
    { label: 'Create Invite', icon: Link, color: '#BB86FC', page: 'invites' as AdminPage },
    { label: 'View Activity Log', icon: History, color: '#FFD700', page: 'activity-log' as AdminPage },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">👋</span>
            <h2 className="text-xl font-bold text-white/90">{getGreeting()}, Admin!</h2>
          </div>
          <p className="text-sm text-white/40">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Export Data Dialog */}
          <ExportDialog />

          {/* Generate Report Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="h-8 gap-1.5 text-[11px] rounded-lg bg-white/[0.02] border border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.04] transition-all"
              >
                {reportGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                Quick Report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-52 bg-[#0D0D0D]/95 backdrop-blur-xl border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
            >
              <DropdownMenuItem
                onClick={() => handleGenerateReport('user-report')}
                disabled={!!reportGenerating}
                className="text-white/60 focus:text-white focus:bg-white/[0.05] rounded-lg mx-1 my-0.5 cursor-pointer"
              >
                <Users className="mr-2.5 h-4 w-4 text-[#03DAC6]" />
                <span className="text-[13px]">User Report</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleGenerateReport('financial-summary')}
                disabled={!!reportGenerating}
                className="text-white/60 focus:text-white focus:bg-white/[0.05] rounded-lg mx-1 my-0.5 cursor-pointer"
              >
                <CreditCard className="mr-2.5 h-4 w-4 text-[#FFD700]" />
                <span className="text-[13px]">Financial Summary</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleGenerateReport('activity-report')}
                disabled={!!reportGenerating}
                className="text-white/60 focus:text-white focus:bg-white/[0.05] rounded-lg mx-1 my-0.5 cursor-pointer"
              >
                <Activity className="mr-2.5 h-4 w-4 text-[#BB86FC]" />
                <span className="text-[13px]">Activity Report</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-1.5 text-[10px] text-white/25 px-2.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <Clock className="h-3 w-3" />
            Updated {lastRefresh.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </div>
          {/* Live Pulse Indicator + Auto-refresh toggle */}
          {autoRefresh && (
            <div className="flex items-center gap-1.5 text-[10px] text-[#03DAC6]/70 px-2.5 py-1.5 rounded-lg bg-[#03DAC6]/5 border border-[#03DAC6]/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#03DAC6] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#03DAC6]" />
              </span>
              <span className="font-medium">Live</span>
              <span className="text-white/20">·</span>
              <span className="text-[#03DAC6]/50 tabular-nums">Refreshing in {countdown}s</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 w-8 p-0 rounded-lg',
              autoRefresh ? 'text-[#03DAC6] bg-[#03DAC6]/10' : 'text-white/30 hover:text-white/50 hover:bg-white/[0.04]'
            )}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? 'Auto-refresh ON (30s)' : 'Auto-refresh OFF'}
          >
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

      {/* Notification Alert Bar */}
      {notificationCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FFD700]/[0.04] border border-[#FFD700]/10 animate-in fade-in-0 slide-in-from-bottom-3 duration-500 [animation-delay:150ms]">
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
      )}

      {/* Stat Cards with Gradient Backgrounds + Staggered Entrance + Hover Tilt */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-tour="dashboard-stats">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="group relative animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${100 + idx * 80}ms`, animationFillMode: 'backwards' }}>
              {/* Gradient border effect */}
              <div className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(135deg, ${card.color}30, transparent 50%, ${card.color}15)` }} />
              <Card
                className="relative border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
                style={{ ...getTiltStyle(card.label), background: card.gradient }}
                onMouseMove={(e) => handleTiltMouseMove(e, card.label)}
                onMouseLeave={handleTiltMouseLeave}
              >
                {/* Subtle gradient glow at top */}
                <div className="absolute top-0 left-0 right-0 h-16 pointer-events-none"
                  style={{ background: `linear-gradient(180deg, ${card.color}06 0%, transparent 100%)` }} />
                {/* Corner accent glow */}
                <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 100% 0%, ${card.color}10 0%, transparent 70%)` }} />
                <CardContent className="relative p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">{card.label}</p>
                      </div>
                      <div className="flex items-end gap-2">
                        <p className="text-3xl font-bold text-white/90 tracking-tight tabular-nums">{card.value}</p>
                        <div className={cn(
                          'flex items-center gap-0.5 text-[10px] font-semibold mb-1 px-1.5 py-0.5 rounded-md',
                          card.trendUp ? 'text-[#03DAC6] bg-[#03DAC6]/10' : 'text-[#CF6679] bg-[#CF6679]/10'
                        )}>
                          {card.trendUp ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                          {card.trend}
                        </div>
                      </div>
                      <p className="text-[11px] text-white/30">{card.sub}</p>
                    </div>
                    <div className="relative">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
                        style={{ background: `linear-gradient(135deg, ${card.color}20, ${card.color}10)`, boxShadow: `0 4px 12px ${card.color}15` }}>
                        <Icon className="h-5 w-5" style={{ color: card.color }} />
                      </div>
                      <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0D0D0D]"
                        style={{ backgroundColor: idx < 2 ? '#03DAC6' : '#666' }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Quick Actions Row */}
      <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '350ms', animationFillMode: 'backwards' }} data-tour="quick-actions">
        <Card className="bg-[#0D0D0D] border-white/[0.06]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white/70 flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#FFD700]" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={() => onNavigate?.(action.page)}
                    className="group flex items-center gap-3 p-4 rounded-xl border border-white/[0.04] bg-white/[0.015] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-200 active:scale-[0.98] text-left"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
                      style={{ background: `linear-gradient(135deg, ${action.color}15, ${action.color}08)`, boxShadow: `0 2px 8px ${action.color}10` }}>
                      <Icon className="h-4.5 w-4.5" style={{ color: action.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white/70 group-hover:text-white/90 transition-colors">{action.label}</p>
                      <p className="text-[10px] text-white/25 mt-0.5">Click to navigate</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-white/15 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '500ms', animationFillMode: 'backwards' }}>
        {/* Daily Registrations Chart */}
        <Card className="lg:col-span-2 bg-[#0D0D0D] border-white/[0.06]">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-white/70 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#03DAC6]" />
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
            <div className="flex items-end gap-2 h-40 px-1">
              {stats.dailyRegistrations.map((day, idx) => {
                const height = maxDailyCount > 0 ? (day.count / maxDailyCount) * 100 : 0;
                const isToday = idx === stats.dailyRegistrations.length - 1;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col items-center justify-end" style={{ height: '120px' }}>
                      <span className="text-[10px] font-semibold text-white/40 mb-1">
                        {day.count > 0 ? day.count : ''}
                      </span>
                      <div className="w-full max-w-[36px] rounded-lg relative overflow-hidden transition-all duration-500 group/bar"
                        style={{
                          height: `${Math.max(height, 4)}%`,
                          background: isToday
                            ? 'linear-gradient(to top, #03DAC6, #03DAC680)'
                            : 'linear-gradient(to top, rgba(3,218,198,0.3), rgba(3,218,198,0.1))',
                        }}>
                        <div className="absolute inset-0 opacity-0 group-hover/bar:opacity-100 transition-opacity"
                          style={{ background: isToday ? 'linear-gradient(to top, #03DAC6, #03DAC6CC)' : 'linear-gradient(to top, rgba(3,218,198,0.5), rgba(3,218,198,0.2))' }} />
                      </div>
                    </div>
                    <span className={cn(
                      'text-[9px] font-medium',
                      isToday ? 'text-[#03DAC6]' : 'text-white/20'
                    )}>
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card className="bg-[#0D0D0D] border-white/[0.06]">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-white/70 flex items-center gap-2">
              <Target className="h-4 w-4 text-[#BB86FC]" />
              Plan Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex justify-center mb-6">
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="12" />
                  {stats.planDistribution.map((p, i) => {
                    const circumference = 2 * Math.PI * 40;
                    const segmentLength = (p.percentage / 100) * circumference;
                    const offset = i === 0 ? 0 : stats.planDistribution.slice(0, i).reduce((s, pp) => s + (pp.percentage / 100) * circumference, 0);
                    const color = p.plan === 'pro' ? '#FFD700' : p.plan === 'admin' ? '#03DAC6' : '#666';
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
            <div className="space-y-3">
              {stats.planDistribution.map((p) => {
                const color = p.plan === 'pro' ? '#FFD700' : p.plan === 'admin' ? '#03DAC6' : '#666';
                const Icon = p.plan === 'pro' ? Crown : p.plan === 'admin' ? Shield : Sparkles;
                return (
                  <div key={p.plan} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center"
                        style={{ background: `${color}15` }}>
                        <Icon className="h-3.5 w-3.5" style={{ color }} />
                      </div>
                      <span className="text-[12px] font-medium text-white/60 capitalize">{p.plan}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${p.percentage}%`, backgroundColor: color }} />
                      </div>
                      <span className="text-[11px] font-semibold text-white/40 w-12 text-right">{p.count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row: Recent Activity + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '600ms', animationFillMode: 'backwards' }}>
        {/* Recent Activity Feed */}
        <Card className="lg:col-span-2 bg-[#0D0D0D] border-white/[0.06]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-white/70 flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#03DAC6]" />
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
                    <div
                      key={log.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl transition-colors',
                        idx === 0 ? 'bg-white/[0.02] border border-white/[0.04]' : 'hover:bg-white/[0.015]'
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
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform Health */}
        <Card className="bg-[#0D0D0D] border-white/[0.06]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white/70 flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#03DAC6]" />
              Platform Health
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="w-9 h-9 rounded-lg bg-[#03DAC6]/10 flex items-center justify-center">
                  <UserCheck className="h-4 w-4 text-[#03DAC6]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white/80">{stats.activeUsers}</p>
                  <p className="text-[10px] text-white/30">Active Users</p>
                </div>
                <Badge variant="outline" className="text-[9px] font-semibold border-[#03DAC6]/20 text-[#03DAC6] bg-[#03DAC6]/5">
                  {stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%
                </Badge>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="w-9 h-9 rounded-lg bg-[#FFD700]/10 flex items-center justify-center">
                  <Crown className="h-4 w-4 text-[#FFD700]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white/80">{stats.proUsers}</p>
                  <p className="text-[10px] text-white/30">Pro Subscribers</p>
                </div>
                <Badge variant="outline" className="text-[9px] font-semibold border-[#FFD700]/20 text-[#FFD700] bg-[#FFD700]/5">
                  {stats.totalUsers > 0 ? Math.round((stats.proUsers / stats.totalUsers) * 100) : 0}%
                </Badge>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="w-9 h-9 rounded-lg bg-[#BB86FC]/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-[#BB86FC]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white/80">
                    {stats.totalUsers > 0 ? Math.round((stats.proUsers / stats.totalUsers) * 100) : 0}%
                  </p>
                  <p className="text-[10px] text-white/30">Conversion Rate</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.015]">
                  <Database className="h-3.5 w-3.5 text-white/20" />
                  <div>
                    <p className="text-[10px] font-semibold text-white/50">{stats.systemHealth?.databaseSize || 'N/A'}</p>
                    <p className="text-[8px] text-white/15 uppercase">DB Size</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.015]">
                  <Zap className="h-3.5 w-3.5 text-white/20" />
                  <div>
                    <p className="text-[10px] font-semibold text-white/50">{formatUptime(stats.systemHealth?.uptime || 0)}</p>
                    <p className="text-[8px] text-white/15 uppercase">Uptime</p>
                  </div>
                </div>
              </div>
            </div>

            {stats.usersExpiringSoon > 0 && (
              <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-[#FFD700]/5 border border-[#FFD700]/15">
                <div className="w-8 h-8 rounded-lg bg-[#FFD700]/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-[#FFD700]" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-[#FFD700]/80">
                    {stats.usersExpiringSoon} subscription(s) expiring soon
                  </p>
                  <p className="text-[10px] text-[#FFD700]/40">Within the next 7 days</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '750ms', animationFillMode: 'backwards' }}>
        {/* Top Active Users */}
        <Card className="bg-[#0D0D0D] border-white/[0.06]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white/70 flex items-center gap-2">
              <Star className="h-4 w-4 text-[#FFD700]" />
              Top Active Users
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.topUsers.length === 0 ? (
              <div className="text-center py-6 text-white/20 text-[12px]">No user activity yet</div>
            ) : (
              <div className="space-y-2.5">
                {stats.topUsers.map((user, idx) => (
                  <div key={user.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
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

        {/* Recent Users */}
        <Card className="bg-[#0D0D0D] border-white/[0.06]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-white/70 flex items-center gap-2">
                <Users className="h-4 w-4 text-[#03DAC6]" />
                Recent Users
              </CardTitle>
              <button
                onClick={() => onNavigate?.('users')}
                className="flex items-center gap-1 text-[11px] text-[#03DAC6]/60 hover:text-[#03DAC6] transition-colors"
              >
                View All
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.recentUsers.length === 0 ? (
              <div className="text-center py-6 text-white/20 text-[12px]">No users yet</div>
            ) : (
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto custom-scrollbar">
                {stats.recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors group/user">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{
                          background: u.plan === 'pro' ? 'linear-gradient(135deg, #FFD70020, #FFD70010)' : 'rgba(255,255,255,0.04)',
                          color: u.plan === 'pro' ? '#FFD700' : 'rgba(255,255,255,0.4)',
                          border: `1px solid ${u.plan === 'pro' ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.06)'}`,
                        }}>
                        {u.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-white/70 truncate">{u.username}</p>
                        <p className="text-[10px] text-white/25 truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={cn(
                        'text-[8px] font-bold uppercase px-1.5 py-0.5',
                        u.plan === 'pro' ? 'border-[#FFD700]/20 text-[#FFD700] bg-[#FFD700]/5' : 'border-white/10 text-white/30 bg-white/[0.02]',
                      )}>
                        {u.plan === 'pro' ? <><Crown className="h-2 w-2 mr-0.5 inline" />PRO</> : <><Sparkles className="h-2 w-2 mr-0.5 inline" />BASIC</>}
                      </Badge>
                      <span className="text-[10px] text-white/15 hidden sm:inline">
                        {new Date(u.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform Financial Analytics */}
      <PlatformAnalytics />
    </div>
  );
}

// ── Platform Analytics Inline Widget ─────────────────────────────
function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function PlatformAnalytics() {
  const [data, setData] = useState<{
    financials: { totalIncome: number; totalExpense: number; netFlow: number; incomeTxnCount: number; expenseTxnCount: number };
    topCategories: { name: string; icon: string; total: number; count: number }[];
    engagement: { totalUsers: number; activeUsersThisMonth: number; engagementRate: number };
    platformHealth: { savingsTargets: number; activeSavingsTargets: number; categories: number; activeInvites: number };
    monthlyAggregates: { month: string; income: number; expense: number; savings: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchAnalytics = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const res = await fetch('/api/admin/analytics');
      if (res.ok) setData(await res.json());
    } catch {}
    finally { setLoading(false); setIsRefreshing(false); }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const totalCat = data ? Math.max(...data.topCategories.map(c => c.total), 1) : 1;
  const colors = ['#BB86FC', '#03DAC6', '#CF6679', '#F9A825', '#64B5F6', '#81C784', '#FFB74D', '#E57373'];

  return (
    <Card className="bg-[#0D0D0D] border-white/[0.06] animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: '850ms', animationFillMode: 'backwards' }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-white/70 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#BB86FC]" />
            Platform Financial Analytics
            <Badge variant="outline" className="text-[9px] font-semibold px-1.5 py-0 bg-[#BB86FC]/5 border-[#BB86FC]/15 text-[#BB86FC]/50">
              Live Data
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm"
              className={cn('h-8 gap-1.5 text-[11px] rounded-lg border transition-all', expanded ? 'bg-white/[0.04] border-white/[0.08] text-white/60' : 'bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/[0.04]')}
              onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Collapse' : 'Expand'}
              <ChevronRight className={cn('h-3 w-3 transition-transform', expanded && 'rotate-90')} />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/30 hover:text-white/60 hover:bg-white/[0.04] rounded-lg" onClick={() => fetchAnalytics(true)}>
              <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 py-2">
            {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl bg-white/[0.02] animate-pulse" />)}
          </div>
        ) : !data ? (
          <div className="text-center py-8 text-white/15 text-[12px]">Failed to load analytics</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Platform Income', value: fmt(data.financials.totalIncome), icon: TrendingUp, color: '#03DAC6', sub: `${data.financials.incomeTxnCount} txns` },
                { label: 'Platform Expenses', value: fmt(data.financials.totalExpense), icon: TrendingDown, color: '#CF6679', sub: `${data.financials.expenseTxnCount} txns` },
                { label: 'Net Cash Flow', value: `${data.financials.netFlow >= 0 ? '+' : ''}${fmt(data.financials.netFlow)}`, icon: Wallet, color: data.financials.netFlow >= 0 ? '#03DAC6' : '#CF6679', sub: data.financials.netFlow >= 0 ? 'Profitable' : 'Deficit' },
                { label: 'Engagement', value: `${data.engagement.engagementRate}%`, icon: Users, color: '#FFD700', sub: `${data.engagement.activeUsersThisMonth}/${data.engagement.totalUsers} active` },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.03] transition-all duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${card.color}15` }}><Icon className="h-4 w-4" style={{ color: card.color }} /></div>
                      {data.financials.netFlow !== 0 && card.label === 'Net Cash Flow' && (
                        <span className={cn('text-[10px]', data.financials.netFlow >= 0 ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                          {data.financials.netFlow >= 0 ? <ArrowUpRight className="h-3 w-3 inline" /> : <ArrowDownRight className="h-3 w-3 inline" />}
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-bold text-white/85 tabular-nums">{card.value}</p>
                    <p className="text-[10px] text-white/25">{card.sub}</p>
                  </div>
                );
              })}
            </div>
            {expanded && (
              <>
                {data.monthlyAggregates.length > 0 && (
                  <div className="p-4 rounded-xl bg-white/[0.015] border border-white/[0.04]">
                    <h4 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5"><TrendingUp className="h-3 w-3" /> Monthly Revenue (6 months)</h4>
                    <div className="flex items-end gap-2 h-36 px-2">
                      {data.monthlyAggregates.map((m) => {
                        const maxVal = Math.max(...data.monthlyAggregates.map(d => Math.max(d.income, d.expense)), 1);
                        return (
                          <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full flex items-end justify-center gap-[2px]" style={{ height: '100px' }}>
                              <div className="w-[40%] max-w-[24px] rounded-t-md transition-all duration-500" style={{ height: `${Math.max((m.income / maxVal) * 100, 2)}%`, background: 'linear-gradient(to top, #03DAC6, #03DAC680)' }} />
                              <div className="w-[40%] max-w-[24px] rounded-t-md transition-all duration-500" style={{ height: `${Math.max((m.expense / maxVal) * 100, 2)}%`, background: 'linear-gradient(to top, #CF6679, #CF667980)' }} />
                            </div>
                            <span className="text-[8px] text-white/15">{new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short' })}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-4 mt-2 justify-center">
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#03DAC6]" /><span className="text-[9px] text-white/25">Income</span></div>
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#CF6679]" /><span className="text-[9px] text-white/25">Expense</span></div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {data.topCategories.length > 0 && (
                    <div className="p-4 rounded-xl bg-white/[0.015] border border-white/[0.04]">
                      <h4 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Target className="h-3 w-3" /> Top Platform Categories</h4>
                      <div className="space-y-2">{data.topCategories.slice(0, 5).map((cat, idx) => (
                        <div key={cat.name}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] text-white/50 truncate max-w-[140px]">{cat.name}</span>
                            <span className="text-[10px] font-semibold text-white/35 tabular-nums">{fmt(cat.total)}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${(cat.total / totalCat) * 100}%`, background: colors[idx % colors.length] }} /></div>
                        </div>
                      ))}</div>
                    </div>
                  )}
                  <div className="p-4 rounded-xl bg-white/[0.015] border border-white/[0.04]">
                    <h4 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Zap className="h-3 w-3" /> Platform Health</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Savings Targets', value: data.platformHealth.savingsTargets, sub: `${data.platformHealth.activeSavingsTargets} active` },
                        { label: 'Categories', value: data.platformHealth.categories, sub: 'total created' },
                        { label: 'Active Invites', value: data.platformHealth.activeInvites, sub: 'available' },
                        { label: 'Users', value: data.engagement.totalUsers, sub: `${data.engagement.engagementRate}% engaged` },
                      ].map((item) => (
                        <div key={item.label} className="p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.03] transition-colors">
                          <p className="text-sm font-bold text-white/70 tabular-nums">{item.value}</p>
                          <p className="text-[9px] text-white/20">{item.label} · {item.sub}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {data.monthlyAggregates.length === 0 && data.topCategories.length === 0 && (
                  <div className="text-center py-8 text-white/15 text-[12px]"><BarChart3 className="h-8 w-8 mx-auto mb-2 text-white/8" />No transaction data available yet</div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
