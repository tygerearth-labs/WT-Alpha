'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CreditCard, Clock, AlertTriangle, CheckCircle, Plus,
  RefreshCw, Crown, Sparkles, Calendar, Zap, Timer, Gem,
  Search, ArrowRight, ChevronDown, Loader2, Shield,
  TrendingUp, Users, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SubscriptionRecord {
  id: string; email: string; username: string; plan: string;
  subscriptionEnd: string | null; createdAt: string;
  isExpired: boolean; daysRemaining: number | null;
  status?: string;
}

interface Pagination {
  page: number; limit: number; total: number; totalPages: number;
}

interface PlanOverview {
  plan: string;
  icon: typeof Crown;
  color: string;
  bgColor: string;
  borderColor: string;
  price: string;
  features: string[];
}

const planOverviews: PlanOverview[] = [
  {
    plan: 'basic',
    icon: Sparkles,
    color: 'rgba(255,255,255,0.5)',
    bgColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.06)',
    price: 'Free',
    features: ['Basic Dashboard', '10 Categories', '3 Savings', 'Export Reports'],
  },
  {
    plan: 'pro',
    icon: Crown,
    color: '#FFD700',
    bgColor: 'rgba(255,215,0,0.03)',
    borderColor: 'rgba(255,215,0,0.12)',
    price: '$9.99/mo',
    features: ['All Basic Features', '50 Categories', '20 Savings', 'AI Consultant', 'Priority Support'],
  },
  {
    plan: 'ultimate',
    icon: Gem,
    color: '#03DAC6',
    bgColor: 'rgba(3,218,198,0.03)',
    borderColor: 'rgba(3,218,198,0.12)',
    price: '$24.99/mo',
    features: ['All Pro Features', '100 Categories', '50 Savings', 'Business Module', 'Live Charts', 'Invoice Branding'],
  },
];

const quickDurations = [
  { label: '7 Days', value: '7', icon: Timer },
  { label: '30 Days', value: '30', icon: Calendar },
  { label: '90 Days', value: '90', icon: Zap },
  { label: '365 Days', value: '365', icon: Crown },
];

function getPlanBadgeStyle(plan: string) {
  if (plan === 'ultimate') return 'border-[#03DAC6]/20 text-[#03DAC6] bg-[#03DAC6]/5';
  if (plan === 'pro') return 'border-[#FFD700]/20 text-[#FFD700] bg-[#FFD700]/5';
  return 'border-white/10 text-white/40 bg-white/[0.02]';
}

function getProgressGradient(progress: number, isExpired: boolean) {
  if (isExpired) return 'linear-gradient(90deg, #CF6679, #CF667980)';
  if (progress > 60) return 'linear-gradient(90deg, #03DAC6, #03DAC680)';
  if (progress > 30) return 'linear-gradient(90deg, #FFD700, #FFA50080)';
  return 'linear-gradient(90deg, #CF6679, #FFD70080)';
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
  }),
};

export function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAssign, setShowAssign] = useState(false);
  const [assignEmail, setAssignEmail] = useState('');
  const [assignCurrentPlan, setAssignCurrentPlan] = useState<string | null>(null);
  const [assignFoundUser, setAssignFoundUser] = useState<{ id: string; username: string; plan: string } | null>(null);
  const [assignPlan, setAssignPlan] = useState('pro');
  const [assignDuration, setAssignDuration] = useState('30');
  const [assigning, setAssigning] = useState(false);
  const [showUpgradeConfirm, setShowUpgradeConfirm] = useState(false);
  const [extendSub, setExtendSub] = useState<SubscriptionRecord | null>(null);
  const [extendDuration, setExtendDuration] = useState('30');

  const fetchSubscriptions = useCallback(async (page = 1, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filterPlan) params.set('plan', filterPlan);
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/admin/subscriptions?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (append) {
          setSubscriptions(prev => [...prev, ...data.subscriptions]);
        } else {
          setSubscriptions(data.subscriptions);
        }
        setPagination(data.pagination);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [filterPlan, searchQuery]);

  useEffect(() => { fetchSubscriptions(); }, [fetchSubscriptions]);

  const handleLoadMore = () => {
    const nextPage = pagination.page + 1;
    if (nextPage <= pagination.totalPages) {
      fetchSubscriptions(nextPage, true);
    }
  };

  const handleSearchUser = async () => {
    if (!assignEmail.trim()) { setAssignFoundUser(null); setAssignCurrentPlan(null); return; }
    try {
      const userRes = await fetch(`/api/admin/users?search=${encodeURIComponent(assignEmail)}&limit=5`);
      if (!userRes.ok) return;
      const userData = await userRes.json();
      const foundUser = userData.users.find((u: { email: string; id: string; username: string; plan: string }) => u.email === assignEmail);
      if (foundUser) {
        setAssignFoundUser({ id: foundUser.id, username: foundUser.username, plan: foundUser.plan });
        setAssignCurrentPlan(foundUser.plan);
      } else {
        setAssignFoundUser(null);
        setAssignCurrentPlan(null);
      }
    } catch {
      setAssignFoundUser(null);
      setAssignCurrentPlan(null);
    }
  };

  const handleAssign = async () => {
    if (!assignEmail) { toast.error('Email is required'); return; }
    if (!assignFoundUser) { toast.error('User not found with this email'); return; }
    setAssigning(true);
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: assignFoundUser.id, plan: assignPlan, durationDays: parseInt(assignDuration) })
      });
      if (res.ok) {
        toast.success(`Subscription upgraded for ${assignFoundUser.username}`);
        setShowAssign(false);
        setAssignEmail('');
        setAssignFoundUser(null);
        setAssignCurrentPlan(null);
        fetchSubscriptions(1);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to assign');
      }
    } catch { toast.error('Failed to assign subscription'); }
    finally { setAssigning(false); }
  };

  const handleExtend = async () => {
    if (!extendSub) return;
    try {
      const userRes = await fetch(`/api/admin/users?search=${encodeURIComponent(extendSub.email)}&limit=1`);
      const userData = await userRes.json();
      const foundUser = userData.users[0];
      if (!foundUser) { toast.error('User not found'); return; }

      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: foundUser.id, plan: extendSub.plan, durationDays: parseInt(extendDuration) })
      });
      if (res.ok) {
        toast.success(`Subscription extended for ${extendSub.username}`);
        setExtendSub(null);
        fetchSubscriptions(1);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to extend');
      }
    } catch { toast.error('Failed to extend subscription'); }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  const getSubscriptionProgress = (sub: SubscriptionRecord) => {
    if (!sub.subscriptionEnd || sub.isExpired) return 0;
    const endDate = new Date(sub.subscriptionEnd);
    const createdDate = new Date(sub.createdAt);
    const totalDays = Math.max((endDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24), 1);
    const elapsedDays = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.min(100, ((totalDays - elapsedDays) / totalDays) * 100));
  };

  const getPreviewDate = (sub: SubscriptionRecord | null, days: string) => {
    if (!sub?.subscriptionEnd && !sub?.createdAt) return null;
    const baseDate = (sub?.subscriptionEnd && !sub?.isExpired) ? new Date(sub.subscriptionEnd) : new Date();
    baseDate.setDate(baseDate.getDate() + parseInt(days));
    return formatDate(baseDate.toISOString());
  };

  // Stats from current subscriptions
  const basicCount = subscriptions.filter(s => s.plan === 'basic').length;
  const proCount = subscriptions.filter(s => s.plan === 'pro').length;
  const ultimateCount = subscriptions.filter(s => s.plan === 'ultimate').length;
  const activeCount = subscriptions.filter(s => !s.isExpired && s.daysRemaining !== null && s.daysRemaining > 0).length;
  const expiringCount = subscriptions.filter(s => s.daysRemaining !== null && s.daysRemaining >= 0 && s.daysRemaining <= 7 && !s.isExpired).length;
  const expiredCount = subscriptions.filter(s => s.isExpired).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white/90 adm-section-header">Subscription Management</h2>
          <p className="text-sm text-white/40 mt-1">Control user subscriptions and payment periods</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-1.5 bg-white/[0.02] border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.04] adm-quick-action"
            onClick={() => fetchSubscriptions(1)}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button className="gap-2 bg-[#03DAC6] text-black font-semibold hover:bg-[#03DAC6]/90 text-[12px] h-9 adm-action-btn adm-action-btn-primary"
            onClick={() => { setShowAssign(true); setAssignFoundUser(null); setAssignCurrentPlan(null); }}>
            <ArrowRight className="h-4 w-4" /> Upgrade User
          </Button>
        </div>
      </motion.div>

      {/* Plan Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {planOverviews.map((planData, idx) => {
          const Icon = planData.icon;
          const planUsers = subscriptions.filter(s => s.plan === planData.plan);
          const planActive = planUsers.filter(s => !s.isExpired).length;
          const planExpiring = planUsers.filter(s => s.daysRemaining !== null && s.daysRemaining >= 0 && s.daysRemaining <= 7 && !s.isExpired).length;
          const planExpired = planUsers.filter(s => s.isExpired).length;

          return (
            <motion.div
              key={planData.plan}
              custom={idx}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <Card className="adm-content-card overflow-hidden"
                style={{ borderColor: planData.borderColor }}>
                <CardContent className="p-0">
                  {/* Plan Header */}
                  <div className="p-4 pb-3" style={{ background: planData.bgColor }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${planData.color}15` }}>
                        <Icon className="h-4 w-4" style={{ color: planData.color }} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-white/80 capitalize adm-section-header">{planData.plan}</h3>
                        <p className="text-[10px] text-white/30">{planData.price}</p>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 adm-badge"
                        style={{ borderColor: `${planData.color}30`, color: planData.color, backgroundColor: `${planData.color}08` }}>
                        {planUsers.length}
                      </Badge>
                    </div>
                    {/* Features */}
                    <div className="space-y-1">
                      {planData.features.slice(0, 3).map(f => (
                        <div key={f} className="flex items-center gap-1.5">
                          <CheckCircle className="h-3 w-3 shrink-0" style={{ color: `${planData.color}60` }} />
                          <span className="text-[10px] text-white/35">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Status Progress Bars */}
                  <div className="p-4 pt-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#03DAC6]/60 font-medium">Active</span>
                      <span className="text-[10px] text-white/25 tabular-nums">{planActive}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden adm-progress-track">
                      <div className="h-full rounded-full transition-all duration-500 adm-progress-fill"
                        style={{ width: `${planUsers.length ? (planActive / planUsers.length) * 100 : 0}%`, background: 'linear-gradient(90deg, #03DAC6, #03DAC680)' }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#FFD700]/60 font-medium">Expiring</span>
                      <span className="text-[10px] text-white/25 tabular-nums">{planExpiring}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden adm-progress-track">
                      <div className="h-full rounded-full transition-all duration-500 adm-progress-fill"
                        style={{ width: `${planUsers.length ? (planExpiring / planUsers.length) * 100 : 0}%`, background: 'linear-gradient(90deg, #FFD700, #FFD70080)' }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#CF6679]/60 font-medium">Expired</span>
                      <span className="text-[10px] text-white/25 tabular-nums">{planExpired}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden adm-progress-track">
                      <div className="h-full rounded-full transition-all duration-500 adm-progress-fill"
                        style={{ width: `${planUsers.length ? (planExpired / planUsers.length) * 100 : 0}%`, background: 'linear-gradient(90deg, #CF6679, #CF667980)' }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Search + Filter */}
      <Card className="bg-[#0D0D0D] border-white/[0.06] adm-content-card">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
              <Input
                placeholder="Search by email or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 rounded-xl bg-white/[0.03] border-white/[0.06] text-white/80 text-sm placeholder:text-white/20 adm-search-input"
                onKeyDown={(e) => e.key === 'Enter' && fetchSubscriptions(1)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {[{ label: 'All Plans', value: '' }, { label: 'Basic', value: 'basic' }, { label: 'Pro', value: 'pro' }, { label: 'Ultimate', value: 'ultimate' }].map(chip => (
                <Button key={chip.value} variant="outline" size="sm"
                  className={cn(
                    'text-[11px] rounded-lg h-8 adm-filter-chip',
                    filterPlan === chip.value
                      ? chip.value === 'pro' ? 'bg-[#FFD700]/10 border-[#FFD700]/20 text-[#FFD700] adm-filter-chip-active'
                        : chip.value === 'ultimate' ? 'bg-[#03DAC6]/10 border-[#03DAC6]/20 text-[#03DAC6] adm-filter-chip-active'
                        : 'bg-white/[0.08] border-white/[0.15] text-white/70 adm-filter-chip-active'
                      : 'bg-white/[0.02] border-white/[0.06] text-white/40',
                  )}
                  onClick={() => { setFilterPlan(chip.value); fetchSubscriptions(1); }}>
                  {chip.label}
                </Button>
              ))}
              <div className="w-px bg-white/[0.06] mx-1" />
              {[{ label: 'All', value: '' }, { label: 'Active', value: 'active' }, { label: 'Expiring', value: 'expiring' }, { label: 'Expired', value: 'expired' }].map(chip => (
                <Button key={chip.value} variant="outline" size="sm"
                  className={cn(
                    'text-[11px] rounded-lg h-8 adm-filter-chip',
                    filterStatus === chip.value
                      ? chip.value === 'active' ? 'bg-[#03DAC6]/10 border-[#03DAC6]/20 text-[#03DAC6] adm-filter-chip-active'
                        : chip.value === 'expired' ? 'bg-[#CF6679]/10 border-[#CF6679]/20 text-[#CF6679] adm-filter-chip-active'
                        : 'bg-[#FFD700]/10 border-[#FFD700]/20 text-[#FFD700] adm-filter-chip-active'
                      : 'bg-white/[0.02] border-white/[0.06] text-white/40',
                  )}
                  onClick={() => setFilterStatus(chip.value)}>
                  {chip.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription List */}
      <Card className="bg-[#0D0D0D] border-white/[0.06] adm-content-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="relative h-16 rounded-xl overflow-hidden">
                  <div className="absolute inset-0 bg-white/[0.02]" />
                  <div className="absolute inset-0 animate-shimmer"
                    style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)', backgroundSize: '200% 100%' }} />
                </div>
              ))}
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-20 relative overflow-hidden adm-empty-state">
              <div className="absolute inset-0 animate-empty-gradient" />
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mx-auto mb-5 adm-empty-state-icon"
                  style={{ animation: 'emptyPulse 4s ease-in-out infinite' }}>
                  <CreditCard className="h-9 w-9 text-white/[0.06]" />
                </div>
                <p className="text-white/30 text-sm font-medium">No active subscriptions</p>
                <p className="text-white/15 text-[11px] mt-1.5">Assign a subscription to get started</p>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="md:hidden divide-y divide-white/[0.04]">
                {subscriptions.map((sub, idx) => {
                  const progress = getSubscriptionProgress(sub);
                  const avatarColors = [
                    { bg: 'rgba(3,218,198,0.08)', border: 'rgba(3,218,198,0.15)', text: '#03DAC6' },
                    { bg: 'rgba(255,215,0,0.08)', border: 'rgba(255,215,0,0.15)', text: '#FFD700' },
                    { bg: 'rgba(187,134,252,0.08)', border: 'rgba(187,134,252,0.15)', text: '#BB86FC' },
                  ];
                  const ac = avatarColors[sub.id.charCodeAt(0) % 3];
                  return (
                    <motion.div
                      key={sub.id}
                      custom={idx % 20}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      className="p-4 adm-list-item"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{ background: ac.bg, border: `1px solid ${ac.border}`, color: ac.text }}>
                          {sub.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-[13px] font-semibold text-white/80 truncate">{sub.username}</p>
                            <Badge variant="outline" className={cn('text-[8px] font-bold uppercase px-1.5 py-0 adm-badge', getPlanBadgeStyle(sub.plan))}>
                              {sub.plan === 'ultimate' ? <><Gem className="h-2 w-2 mr-0.5 inline" />ULT</> : sub.plan === 'pro' ? <><Crown className="h-2 w-2 mr-0.5 inline" />PRO</> : 'BASIC'}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-white/30 truncate">{sub.email}</p>
                        </div>
                      </div>
                      {/* Progress */}
                      {sub.subscriptionEnd ? (
                        <div className="space-y-1.5 mb-3">
                          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden adm-progress-track">
                            <div
                              className="h-full rounded-full transition-all duration-700 adm-progress-fill"
                              style={{ width: `${progress}%`, background: getProgressGradient(progress, sub.isExpired) }}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-white/25">{formatDate(sub.subscriptionEnd)}</span>
                            {sub.isExpired ? (
                              <Badge variant="outline" className="text-[8px] font-bold px-1.5 py-0 border-[#CF6679]/15 text-[#CF6679] bg-[#CF6679]/5 adm-badge adm-badge-expired">Expired</Badge>
                            ) : sub.daysRemaining !== null && sub.daysRemaining <= 7 ? (
                              <Badge variant="outline" className="text-[8px] font-bold px-1.5 py-0 border-[#FFD700]/15 text-[#FFD700] bg-[#FFD700]/5 adm-badge">{sub.daysRemaining}d left</Badge>
                            ) : sub.daysRemaining !== null ? (
                              <span className="text-[10px] font-semibold text-[#03DAC6] tabular-nums">{sub.daysRemaining}d</span>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-white/25 mb-3">No subscription end date</p>
                      )}
                      {/* Actions */}
                      <div className="flex gap-2">
                        <button onClick={() => { setExtendSub(sub); setExtendDuration('30'); }}
                          className="h-8 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[#03DAC6] text-[10px] font-medium flex items-center gap-1 hover:bg-[#03DAC6]/10 transition-colors adm-quick-action touch-target">
                          <Plus className="h-3 w-3" /> Extend
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden md:block overflow-x-auto adm-scroll-mobile">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] adm-table-header">
                      <th className="text-left py-3 px-4 text-[10px] font-semibold text-white/25 uppercase tracking-wider">User</th>
                      <th className="text-center py-3 px-4 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Plan</th>
                      <th className="text-left py-3 px-4 text-[10px] font-semibold text-white/25 uppercase tracking-wider min-w-[140px]">Time Remaining</th>
                      <th className="text-center py-3 px-4 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Status</th>
                      <th className="text-right py-3 px-4 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((sub, idx) => {
                      const progress = getSubscriptionProgress(sub);
                      return (
                        <motion.tr
                          key={sub.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: (idx % 20) * 0.02, duration: 0.3 }}
                          className={cn(
                            'border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors adm-table-row',
                            idx % 2 === 0 && 'adm-table-row-alt',
                          )}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 text-[10px] font-semibold shrink-0">
                                {sub.username.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[12px] font-medium text-white/70 truncate max-w-[180px]">{sub.username}</p>
                                <p className="text-[10px] text-white/25 truncate max-w-[180px]">{sub.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant="outline" className={cn('text-[9px] font-bold uppercase px-2 py-0.5 adm-badge', getPlanBadgeStyle(sub.plan))}>
                              {sub.plan === 'ultimate' ? <><Gem className="h-2 w-2 mr-0.5 inline" />ULTIMATE</> : sub.plan === 'pro' ? <><Crown className="h-2 w-2 mr-0.5 inline" />PRO</> : <><Sparkles className="h-2 w-2 mr-0.5 inline" />BASIC</>}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            {sub.subscriptionEnd ? (
                              <div className="space-y-1.5">
                                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden adm-progress-track">
                                  <div
                                    className="h-full rounded-full transition-all duration-700 adm-progress-fill"
                                    style={{ width: `${progress}%`, background: getProgressGradient(progress, sub.isExpired) }}
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-white/25">{formatDate(sub.subscriptionEnd)}</span>
                                  {sub.daysRemaining !== null && !sub.isExpired && (
                                    <span className="text-[10px] font-semibold tabular-nums" style={{ color: sub.daysRemaining <= 7 ? '#FFD700' : '#03DAC6' }}>
                                      {sub.daysRemaining}d
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[12px] text-white/30">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              {sub.isExpired ? (
                                <Badge variant="outline" className="text-[9px] font-bold px-2 py-0.5 border-[#CF6679]/20 text-[#CF6679] bg-[#CF6679]/5 adm-badge adm-badge-expired">
                                  <AlertTriangle className="h-2.5 w-2.5 mr-0.5 inline" />Expired
                                </Badge>
                              ) : sub.daysRemaining !== null && sub.daysRemaining <= 7 ? (
                                <Badge variant="outline" className="text-[9px] font-bold px-2 py-0.5 border-[#FFD700]/20 text-[#FFD700] bg-[#FFD700]/5 adm-badge">
                                  <Clock className="h-2.5 w-2.5 mr-0.5 inline" />{sub.daysRemaining}d left
                                </Badge>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <CheckCircle className="h-3 w-3 text-[#03DAC6]" />
                                  <span className="text-[11px] text-[#03DAC6]/70">{sub.daysRemaining}d</span>
                                </div>
                              )}
                              {sub.status === 'suspended' && (
                                <Badge variant="outline" className="text-[8px] font-bold px-1.5 py-0 border-[#CF6679]/15 text-[#CF6679]/60 bg-[#CF6679]/5 adm-badge">Suspended</Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button size="sm" variant="ghost" className="h-8 text-[11px] text-[#03DAC6] hover:text-[#03DAC6] hover:bg-[#03DAC6]/10 adm-quick-action"
                              onClick={() => { setExtendSub(sub); setExtendDuration('30'); }}>
                              <Plus className="h-3 w-3 mr-1" /> Extend
                            </Button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>

        {/* Load More Button */}
        {!loading && subscriptions.length > 0 && pagination.page < pagination.totalPages && (
          <div className="flex flex-col items-center gap-2 py-5 border-t border-white/[0.04]">
            <p className="text-[11px] text-white/25 tabular-nums">
              Showing {subscriptions.length} of {pagination.total} subscriptions
            </p>
            <Button variant="outline" className="adm-action-btn adm-action-btn-primary mx-auto gap-2"
              onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading...</> : <><ChevronDown className="h-4 w-4" /> Load More</>}
            </Button>
          </div>
        )}
        {!loading && subscriptions.length > 0 && pagination.page >= pagination.totalPages && (
          <div className="flex justify-center py-4 border-t border-white/[0.04]">
            <p className="text-[11px] text-white/20">All {pagination.total} subscriptions loaded</p>
          </div>
        )}
      </Card>

      {/* Upgrade User Dialog (Assign Subscription) */}
      <Dialog open={showAssign} onOpenChange={(open) => {
        if (!open) {
          setShowAssign(false);
          setAssignEmail('');
          setAssignFoundUser(null);
          setAssignCurrentPlan(null);
        }
      }}>
        <DialogContent className="bg-[#141414] border-white/[0.08] rounded-2xl p-0 overflow-hidden max-w-md adm-dialog-content">
          <div className="p-5">
            <DialogHeader>
              <DialogTitle className="text-white/90 flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-[#03DAC6]" />
                Upgrade User Plan
              </DialogTitle>
              <DialogDescription className="text-white/40">
                Search for a user and upgrade their subscription plan
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* User Search */}
              <div className="space-y-2">
                <Label className="text-[11px] text-white/50">User Email</Label>
                <div className="flex gap-2">
                  <Input type="email" placeholder="user@example.com"
                    value={assignEmail} onChange={(e) => { setAssignEmail(e.target.value); setAssignFoundUser(null); setAssignCurrentPlan(null); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                    className="flex-1 bg-white/[0.03] border-white/[0.06] text-white/70 adm-form-input" />
                  <Button variant="outline" size="sm" className="h-[44px] md:h-10 px-4 bg-white/[0.03] border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.06] shrink-0"
                    onClick={handleSearchUser}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Found User Info */}
              <AnimatePresence>
                {assignFoundUser && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-3 rounded-xl border border-[#03DAC6]/15 bg-[#03DAC6]/5 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-[#03DAC6]" />
                      <span className="text-[12px] font-medium text-white/70">{assignFoundUser.username}</span>
                    </div>
                    {assignCurrentPlan && (
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-white/40">Current plan:</span>
                        <Badge variant="outline" className={cn('text-[9px] font-bold uppercase px-1.5 py-0 adm-badge', getPlanBadgeStyle(assignCurrentPlan))}>
                          {assignCurrentPlan}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-white/20" />
                        <Badge variant="outline" className={cn('text-[9px] font-bold uppercase px-1.5 py-0 adm-badge', getPlanBadgeStyle(assignPlan))}>
                          {assignPlan}
                        </Badge>
                      </div>
                    )}
                  </motion.div>
                )}
                {assignEmail && !assignFoundUser && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-[#CF6679]/5 border border-[#CF6679]/10"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-[#CF6679]" />
                    <span className="text-[11px] text-[#CF6679]/70">No user found with this email</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Plan Selection */}
              <div className="space-y-2">
                <Label className="text-[11px] text-white/50">New Plan</Label>
                <Select value={assignPlan} onValueChange={setAssignPlan}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white/70 adm-form-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0D0D0D] border-white/[0.08]">
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="ultimate">Ultimate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label className="text-[11px] text-white/50">Duration</Label>
                <div className="grid grid-cols-2 gap-2">
                  {quickDurations.map(d => (
                    <Button key={d.value} variant="outline" size="sm"
                      className={cn(
                        'justify-start gap-2 text-[11px] h-9 adm-filter-chip',
                        assignDuration === d.value ? 'bg-[#03DAC6]/10 border-[#03DAC6]/20 text-[#03DAC6] adm-filter-chip-active' : 'bg-white/[0.02] border-white/[0.06] text-white/40',
                      )}
                      onClick={() => setAssignDuration(d.value)}>
                      <d.icon className="h-3.5 w-3.5" /> {d.label}
                    </Button>
                  ))}
                </div>
                <Input type="number" min="1" placeholder="Or enter custom days"
                  value={assignDuration} onChange={(e) => setAssignDuration(e.target.value)}
                  className="bg-white/[0.03] border-white/[0.06] text-white/70 adm-form-input" />
              </div>
            </div>
            <DialogFooter className="gap-2 mt-4">
              <Button variant="outline" className="bg-white/[0.03] border-white/[0.06] text-white/50"
                onClick={() => setShowAssign(false)}>Cancel</Button>
              <Button className="bg-[#03DAC6] text-black font-semibold hover:bg-[#03DAC6]/90 adm-action-btn adm-action-btn-primary"
                onClick={() => setShowUpgradeConfirm(true)} disabled={!assignFoundUser || assigning}>
                {assigning ? 'Processing...' : 'Upgrade'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Confirmation Dialog */}
      <AlertDialog open={showUpgradeConfirm} onOpenChange={setShowUpgradeConfirm}>
        <AlertDialogContent className="bg-[#141414] border-white/[0.08] rounded-2xl p-0 overflow-hidden">
          <div className="p-5">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white/90 flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#FFD700]" />
                Confirm Plan Upgrade
              </AlertDialogTitle>
              <AlertDialogDescription className="text-white/40">
                You are about to upgrade <span className="text-white/70 font-medium">{assignFoundUser?.username}</span>
                {assignCurrentPlan && (
                  <> from <span className="capitalize text-white/50">{assignCurrentPlan}</span></>
                )}
                {' '}to <span className="capitalize font-semibold" style={{
                  color: assignPlan === 'ultimate' ? '#03DAC6' : assignPlan === 'pro' ? '#FFD700' : 'rgba(255,255,255,0.6)'
                }}>{assignPlan}</span> for <span className="text-white/70 font-medium">{assignDuration} days</span>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 mt-4">
              <AlertDialogCancel className="bg-white/[0.03] border-white/[0.06] text-white/50">Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-[#03DAC6] text-black hover:bg-[#03DAC6]/90 font-semibold" onClick={handleAssign}>
                Confirm Upgrade
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Extend Dialog */}
      <Dialog open={!!extendSub} onOpenChange={() => setExtendSub(null)}>
        <DialogContent className="bg-[#141414] border-white/[0.08] rounded-2xl p-0 overflow-hidden max-w-md adm-dialog-content">
          <div className="p-5">
            <DialogHeader>
              <DialogTitle className="text-white/90 flex items-center gap-2">
                <Plus className="h-5 w-5 text-[#03DAC6]" />
                Extend Subscription
              </DialogTitle>
              <DialogDescription className="text-white/40">
                Extend subscription for {extendSub?.username} ({extendSub?.email})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Current Info */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/30">Current expiry</span>
                  <span className="text-sm text-white/70">{extendSub?.subscriptionEnd ? formatDate(extendSub.subscriptionEnd) : 'None'}</span>
                </div>
              </div>

              {/* Duration selector */}
              <div className="space-y-2">
                <Label className="text-[11px] text-white/50">Add Duration</Label>
                <div className="grid grid-cols-2 gap-2">
                  {quickDurations.map(d => (
                    <Button key={d.value} variant="outline" size="sm"
                      className={cn(
                        'justify-start gap-2 text-[11px] h-9 adm-filter-chip',
                        extendDuration === d.value ? 'bg-[#03DAC6]/10 border-[#03DAC6]/20 text-[#03DAC6] adm-filter-chip-active' : 'bg-white/[0.02] border-white/[0.06] text-white/40',
                      )}
                      onClick={() => setExtendDuration(d.value)}>
                      <d.icon className="h-3.5 w-3.5" /> +{d.label}
                    </Button>
                  ))}
                </div>
                <Input type="number" min="1" placeholder="Or enter custom days"
                  value={extendDuration} onChange={(e) => setExtendDuration(e.target.value)}
                  className="bg-white/[0.03] border-white/[0.06] text-white/70 adm-form-input" />
              </div>

              {/* Preview new expiry date */}
              {extendSub && extendDuration && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-[#03DAC6]/5 border border-[#03DAC6]/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#03DAC6]/70 font-medium">New expiry date</span>
                    <span className="text-sm text-[#03DAC6] font-semibold">{getPreviewDate(extendSub, extendDuration)}</span>
                  </div>
                </motion.div>
              )}
            </div>
            <DialogFooter className="gap-2 mt-4">
              <Button variant="outline" className="bg-white/[0.03] border-white/[0.06] text-white/50"
                onClick={() => setExtendSub(null)}>Cancel</Button>
              <Button className="bg-[#03DAC6] text-black font-semibold hover:bg-[#03DAC6]/90 adm-action-btn adm-action-btn-primary"
                onClick={handleExtend}>Extend</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
