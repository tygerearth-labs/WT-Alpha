'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  CreditCard, Clock, AlertTriangle, CheckCircle, Plus,
  Search, RefreshCw, Crown, Sparkles, ChevronLeft, ChevronRight,
  Calendar, Zap, Timer, TrendingUp, Megaphone, Gem,
} from 'lucide-react';
import { toast } from 'sonner';
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

export function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [filterPlan, setFilterPlan] = useState('');
  const [showAssign, setShowAssign] = useState(false);
  const [assignEmail, setAssignEmail] = useState('');
  const [assignPlan, setAssignPlan] = useState('pro');
  const [assignDuration, setAssignDuration] = useState('30');
  const [assigning, setAssigning] = useState(false);
  const [extendSub, setExtendSub] = useState<SubscriptionRecord | null>(null);
  const [extendDuration, setExtendDuration] = useState('30');

  const fetchSubscriptions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filterPlan) params.set('plan', filterPlan);
      const res = await fetch(`/api/admin/subscriptions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data.subscriptions);
        setPagination(data.pagination);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterPlan]);

  useEffect(() => { fetchSubscriptions(); }, [fetchSubscriptions]);

  const handleAssign = async () => {
    if (!assignEmail) { toast.error('Email is required'); return; }
    setAssigning(true);
    try {
      const userRes = await fetch(`/api/admin/users?search=${encodeURIComponent(assignEmail)}&limit=5`);
      if (!userRes.ok) throw new Error('Failed to search');
      const userData = await userRes.json();
      const foundUser = userData.users.find((u: any) => u.email === assignEmail);
      if (!foundUser) { toast.error('User not found with this email'); setAssigning(false); return; }

      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: foundUser.id, plan: assignPlan, durationDays: parseInt(assignDuration) })
      });
      if (res.ok) {
        toast.success(`Subscription assigned to ${foundUser.username}`);
        setShowAssign(false);
        setAssignEmail('');
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
        fetchSubscriptions(pagination.page);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to extend');
      }
    } catch { toast.error('Failed to extend subscription'); }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  const quickDurations = [
    { label: '7 Days', value: '7', icon: Timer },
    { label: '30 Days', value: '30', icon: Calendar },
    { label: '90 Days', value: '90', icon: Zap },
    { label: '365 Days', value: '365', icon: Crown },
  ];

  const statsData = [
    { label: 'Total Users', value: pagination.total, color: '#03DAC6', icon: CreditCard },
    { label: 'Pro Plans', value: subscriptions.filter(s => s.plan === 'pro').length, color: '#FFD700', icon: Crown },
    { label: 'Ultimate', value: subscriptions.filter(s => s.plan === 'ultimate').length, color: '#03DAC6', icon: Gem },
    { label: 'Expiring Soon', value: subscriptions.filter(s => s.daysRemaining !== null && s.daysRemaining >= 0 && s.daysRemaining <= 7).length, color: '#FFD700', icon: AlertTriangle },
  ];

  const getSubscriptionProgress = (sub: SubscriptionRecord) => {
    if (!sub.subscriptionEnd || sub.isExpired) return 0;
    // Assume max 365 days for a subscription
    const endDate = new Date(sub.subscriptionEnd);
    const createdDate = new Date(sub.createdAt);
    const totalDays = Math.max((endDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24), 1);
    const elapsedDays = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    const progress = Math.max(0, Math.min(100, ((totalDays - elapsedDays) / totalDays) * 100));
    return progress;
  };

  const getProgressGradient = (progress: number, isExpired: boolean) => {
    if (isExpired) return 'linear-gradient(90deg, #CF6679, #CF667980)';
    if (progress > 60) return 'linear-gradient(90deg, #03DAC6, #03DAC680)';
    if (progress > 30) return 'linear-gradient(90deg, #FFD700, #FFA50080)';
    return 'linear-gradient(90deg, #CF6679, #FFD70080)';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white/90">Subscription Management</h2>
          <p className="text-sm text-white/40 mt-1">Control user subscriptions and payment periods</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-white/[0.02] border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.04]"
            onClick={() => fetchSubscriptions(pagination.page)}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button className="gap-2 bg-[#03DAC6] text-black font-semibold hover:bg-[#03DAC6]/90 text-[12px]"
            onClick={() => setShowAssign(true)}>
            <Plus className="h-4 w-4" /> Assign Subscription
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statsData.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="bg-[#0D0D0D] border-white/[0.06] hover:border-white/[0.12] transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-white/25 uppercase tracking-wider font-semibold">{stat.label}</p>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${stat.color}12` }}>
                    <Icon className="h-3.5 w-3.5" style={{ color: stat.color }} />
                  </div>
                </div>
                <p className="text-2xl font-bold" style={{ color: stat.color === '#FFD700' ? `${stat.color}CC` : 'rgba(255,255,255,0.8)' }}>
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['', 'pro', 'ultimate', 'basic'].map(plan => (
          <Button key={plan} variant="outline" size="sm"
            className={cn(
              'text-[11px] rounded-lg h-8',
              filterPlan === plan ? 'bg-[#FFD700]/10 border-[#FFD700]/20 text-[#FFD700]' : 'bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white/60',
            )}
            onClick={() => setFilterPlan(plan)}>
            {plan === '' ? 'All Plans' : plan.toUpperCase()}
          </Button>
        ))}
      </div>

      {/* Pro & Basic User Lists */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pro Users */}
        <Card className="bg-[#0D0D0D] border-white/[0.06]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="h-4 w-4 text-[#FFD700]" />
              <h3 className="text-sm font-bold text-white/80">Pro Users</h3>
              <Badge variant="outline" className="ml-auto text-[9px] font-bold border-[#FFD700]/20 text-[#FFD700] bg-[#FFD700]/5">
                {subscriptions.filter(s => s.plan === 'pro').length}
              </Badge>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin">
              {subscriptions.filter(s => s.plan === 'pro').length === 0 ? (
                <p className="text-[11px] text-white/20 text-center py-4">No pro users</p>
              ) : (
                subscriptions.filter(s => s.plan === 'pro').map(sub => (
                  <div key={sub.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                    <div className="w-6 h-6 rounded-full bg-[#FFD700]/10 flex items-center justify-center text-[8px] font-bold text-[#FFD700] shrink-0">
                      {sub.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-white/70 truncate">{sub.username}</p>
                      <p className="text-[9px] text-white/25 truncate">{sub.email}</p>
                    </div>
                    {sub.isExpired ? (
                      <Badge variant="outline" className="text-[8px] px-1 py-0 border-[#CF6679]/15 text-[#CF6679]/60 bg-[#CF6679]/5">Expired</Badge>
                    ) : sub.daysRemaining !== null ? (
                      <span className="text-[9px] text-[#03DAC6]/60 tabular-nums">{sub.daysRemaining}d</span>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        {/* Ultimate Users */}
        <Card className="bg-[#0D0D0D] border-white/[0.06]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Gem className="h-4 w-4 text-[#03DAC6]" />
              <h3 className="text-sm font-bold text-white/80">Ultimate</h3>
              <Badge variant="outline" className="ml-auto text-[9px] font-bold border-[#03DAC6]/20 text-[#03DAC6] bg-[#03DAC6]/5">
                {subscriptions.filter(s => s.plan === 'ultimate').length}
              </Badge>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin">
              {subscriptions.filter(s => s.plan === 'ultimate').length === 0 ? (
                <p className="text-[11px] text-white/20 text-center py-4">No ultimate users</p>
              ) : (
                subscriptions.filter(s => s.plan === 'ultimate').map(sub => (
                  <div key={sub.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                    <div className="w-6 h-6 rounded-full bg-[#03DAC6]/10 flex items-center justify-center text-[8px] font-bold text-[#03DAC6] shrink-0">
                      {sub.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-white/70 truncate">{sub.username}</p>
                      <p className="text-[9px] text-white/25 truncate">{sub.email}</p>
                    </div>
                    {sub.isExpired ? (
                      <Badge variant="outline" className="text-[8px] px-1 py-0 border-[#CF6679]/15 text-[#CF6679]/60 bg-[#CF6679]/5">Expired</Badge>
                    ) : sub.daysRemaining !== null ? (
                      <span className="text-[9px] text-[#03DAC6]/60 tabular-nums">{sub.daysRemaining}d</span>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        {/* Basic Users */}
        <Card className="bg-[#0D0D0D] border-white/[0.06]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-[#BB86FC]" />
              <h3 className="text-sm font-bold text-white/80">Basic Users</h3>
              <Badge variant="outline" className="ml-auto text-[9px] font-bold border-[#BB86FC]/20 text-[#BB86FC] bg-[#BB86FC]/5">
                {subscriptions.filter(s => s.plan === 'basic').length}
              </Badge>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin">
              {subscriptions.filter(s => s.plan === 'basic').length === 0 ? (
                <p className="text-[11px] text-white/20 text-center py-4">No basic users</p>
              ) : (
                subscriptions.filter(s => s.plan === 'basic').map(sub => (
                  <div key={sub.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                    <div className="w-6 h-6 rounded-full bg-[#BB86FC]/10 flex items-center justify-center text-[8px] font-bold text-[#BB86FC] shrink-0">
                      {sub.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-white/70 truncate">{sub.username}</p>
                      <p className="text-[9px] text-white/25 truncate">{sub.email}</p>
                    </div>
                    {sub.isExpired ? (
                      <Badge variant="outline" className="text-[8px] px-1 py-0 border-[#CF6679]/15 text-[#CF6679]/60 bg-[#CF6679]/5">Expired</Badge>
                    ) : sub.daysRemaining !== null ? (
                      <span className="text-[9px] text-[#03DAC6]/60 tabular-nums">{sub.daysRemaining}d</span>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card className="bg-[#0D0D0D] border-white/[0.06]">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="relative h-16 rounded-xl overflow-hidden">
                  <div className="absolute inset-0 bg-white/[0.02]" />
                  <div className="absolute inset-0 animate-shimmer"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)',
                      backgroundSize: '200% 100%',
                    }} />
                </div>
              ))}
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-20 relative overflow-hidden">
              <div className="absolute inset-0 animate-empty-gradient" />
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mx-auto mb-5"
                  style={{ animation: 'emptyPulse 4s ease-in-out infinite' }}>
                  <CreditCard className="h-9 w-9 text-white/[0.06]" />
                </div>
                <p className="text-white/30 text-sm font-medium">No active subscriptions</p>
                <p className="text-white/15 text-[11px] mt-1.5">Assign a subscription to get started</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
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
                      <tr
                        key={sub.id}
                        className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
                        style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'backwards' }}
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
                          <Badge variant="outline" className={cn(
                            'text-[9px] font-bold uppercase px-2 py-0.5',
                            sub.plan === 'ultimate' ? 'border-[#03DAC6]/20 text-[#03DAC6] bg-[#03DAC6]/5' : sub.plan === 'pro' ? 'border-[#FFD700]/20 text-[#FFD700] bg-[#FFD700]/5' : 'border-white/10 text-white/40 bg-white/[0.02]',
                          )}>
                            {sub.plan === 'ultimate' ? <><Gem className="h-2 w-2 mr-0.5 inline" />ULTIMATE</> : sub.plan === 'pro' ? <><Crown className="h-2 w-2 mr-0.5 inline" />PRO</> : <><Sparkles className="h-2 w-2 mr-0.5 inline" />BASIC</>}
                          </Badge>
                        </td>
                        {/* Gradient Progress Bar */}
                        <td className="py-3 px-4">
                          {sub.subscriptionEnd ? (
                            <div className="space-y-1.5">
                              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{
                                    width: `${progress}%`,
                                    background: getProgressGradient(progress, sub.isExpired),
                                  }}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-white/25">{formatDate(sub.subscriptionEnd)}</span>
                                {sub.daysRemaining !== null && !sub.isExpired && (
                                  <span className="text-[10px] font-semibold tabular-nums" style={{
                                    color: sub.daysRemaining <= 7 ? '#FFD700' : '#03DAC6',
                                  }}>
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
                            <Badge variant="outline" className="text-[9px] font-bold px-2 py-0.5 border-[#CF6679]/20 text-[#CF6679] bg-[#CF6679]/5">
                              <AlertTriangle className="h-2.5 w-2.5 mr-0.5 inline" />Expired
                            </Badge>
                          ) : sub.daysRemaining !== null && sub.daysRemaining <= 7 ? (
                            <Badge variant="outline" className="text-[9px] font-bold px-2 py-0.5 border-[#FFD700]/20 text-[#FFD700] bg-[#FFD700]/5">
                              <Clock className="h-2.5 w-2.5 mr-0.5 inline" />{sub.daysRemaining}d left
                            </Badge>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <CheckCircle className="h-3 w-3 text-[#03DAC6]" />
                              <span className="text-[11px] text-[#03DAC6]/70">{sub.daysRemaining}d</span>
                            </div>
                          )}
                          {sub.status === 'suspended' && (
                            <Badge variant="outline" className="text-[8px] font-bold px-1.5 py-0 border-[#CF6679]/15 text-[#CF6679]/60 bg-[#CF6679]/5">
                              Suspended
                            </Badge>
                          )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button size="sm" variant="ghost" className="h-7 text-[11px] text-[#03DAC6] hover:text-[#03DAC6] hover:bg-[#03DAC6]/10"
                            onClick={() => { setExtendSub(sub); setExtendDuration('30'); }}>
                            <Plus className="h-3 w-3 mr-1" /> Extend
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.04]">
            <p className="text-[11px] text-white/25">Page {pagination.page} of {pagination.totalPages}</p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/40"
                disabled={pagination.page <= 1} onClick={() => fetchSubscriptions(pagination.page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/40"
                disabled={pagination.page >= pagination.totalPages} onClick={() => fetchSubscriptions(pagination.page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Assign Subscription Dialog */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent className="bg-[#0D0D0D] border-white/[0.08] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white/90 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#03DAC6]" />
              Assign Subscription
            </DialogTitle>
            <DialogDescription className="text-white/40">
              Assign or extend a subscription for a user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[11px] text-white/50">User Email</Label>
              <Input type="email" placeholder="user@example.com"
                value={assignEmail} onChange={(e) => setAssignEmail(e.target.value)}
                className="bg-white/[0.03] border-white/[0.06] text-white/70" />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] text-white/50">Plan</Label>
              <Select value={assignPlan} onValueChange={setAssignPlan}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white/70">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0D0D0D] border-white/[0.08]">
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="ultimate">Ultimate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] text-white/50">Duration</Label>
              <div className="grid grid-cols-2 gap-2">
                {quickDurations.map(d => (
                  <Button key={d.value} variant="outline" size="sm"
                    className={cn(
                      'justify-start gap-2 text-[11px] h-8',
                      assignDuration === d.value ? 'bg-[#03DAC6]/10 border-[#03DAC6]/20 text-[#03DAC6]' : 'bg-white/[0.02] border-white/[0.06] text-white/40',
                    )}
                    onClick={() => setAssignDuration(d.value)}>
                    <d.icon className="h-3.5 w-3.5" /> {d.label}
                  </Button>
                ))}
              </div>
              <Input type="number" min="1" placeholder="Or enter custom days"
                value={assignDuration} onChange={(e) => setAssignDuration(e.target.value)}
                className="bg-white/[0.03] border-white/[0.06] text-white/70" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="bg-white/[0.03] border-white/[0.06] text-white/50"
              onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button className="bg-[#03DAC6] text-black font-semibold hover:bg-[#03DAC6]/90"
              onClick={handleAssign} disabled={assigning}>
              {assigning ? 'Assigning...' : 'Assign Subscription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Dialog */}
      <Dialog open={!!extendSub} onOpenChange={() => setExtendSub(null)}>
        <DialogContent className="bg-[#0D0D0D] border-white/[0.08] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white/90">Extend Subscription</DialogTitle>
            <DialogDescription className="text-white/40">
              Extend subscription for {extendSub?.username} ({extendSub?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/30">Current expiry</span>
                <span className="text-sm text-white/70">{extendSub?.subscriptionEnd ? formatDate(extendSub.subscriptionEnd) : 'None'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] text-white/50">Add Duration</Label>
              <div className="grid grid-cols-2 gap-2">
                {quickDurations.map(d => (
                  <Button key={d.value} variant="outline" size="sm"
                    className={cn(
                      'justify-start gap-2 text-[11px] h-8',
                      extendDuration === d.value ? 'bg-[#03DAC6]/10 border-[#03DAC6]/20 text-[#03DAC6]' : 'bg-white/[0.02] border-white/[0.06] text-white/40',
                    )}
                    onClick={() => setExtendDuration(d.value)}>
                    <d.icon className="h-3.5 w-3.5" /> +{d.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="bg-white/[0.03] border-white/[0.06] text-white/50"
              onClick={() => setExtendSub(null)}>Cancel</Button>
            <Button className="bg-[#03DAC6] text-black font-semibold hover:bg-[#03DAC6]/90"
              onClick={handleExtend}>Extend</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
