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
  UserPlus, Copy, Trash2, Link, Clock, Mail,
  CheckCircle, XCircle, AlertTriangle, ChevronLeft, ChevronRight,
  Sparkles, Crown, QrCode, Zap, Gem,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Tooltip, TooltipTrigger, TooltipContent,
} from '@/components/ui/tooltip';

interface InviteRecord {
  id: string; token: string; createdBy: string; email?: string | null;
  plan: string; maxUses: number; usedCount: number; expiresAt?: string | null;
  usedBy?: string | null; isUsed: boolean; createdAt: string; updatedAt: string;
}

interface Pagination {
  page: number; limit: number; total: number; totalPages: number;
}

function StatusDot({ status }: { status: string }) {
  const config: Record<string, { color: string; dotClass: string }> = {
    active: { color: '#22C55E', dotClass: 'animate-pulse-green' },
    expiring: { color: '#F59E0B', dotClass: 'animate-pulse-amber' },
    expired: { color: '#CF6679', dotClass: '' },
    used: { color: '#666666', dotClass: '' },
  };
  const { color, dotClass } = config[status] || config.active;

  return (
    <span className="relative flex h-2 w-2">
      <span
        className={cn('relative inline-flex h-2 w-2 rounded-full', dotClass)}
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

export function AdminInvites() {
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPlan, setCreatePlan] = useState('basic');
  const [createMaxUses, setCreateMaxUses] = useState('1');
  const [createExpiry, setCreateExpiry] = useState('48');
  const [creating, setCreating] = useState(false);
  const [deleteInvite, setDeleteInvite] = useState<InviteRecord | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchInvites = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/admin/invites?${params}`);
      if (res.ok) {
        const data = await res.json();
        setInvites(data.invites);
        setPagination(data.pagination);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { fetchInvites(); }, [fetchInvites]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        plan: createPlan,
        maxUses: parseInt(createMaxUses),
        expiresInHours: parseInt(createExpiry),
      };
      if (createEmail) body.email = createEmail;

      const res = await fetch('/api/admin/invites', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      if (res.ok) {
        const data = await res.json();
        toast.success('Invite link created');
        setShowCreate(false);
        setCreateEmail('');
        setCreateExpiry('48');
        fetchInvites(1);

        if (data.invite?.token) {
          const fullUrl = `${window.location.origin}/?invite=${data.invite.token}`;
          navigator.clipboard.writeText(fullUrl).then(() => {
            toast.success('Link copied to clipboard!');
          }).catch(() => {
            toast(`Link: ${fullUrl}`);
          });
        }
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create invite');
      }
    } catch { toast.error('Failed to create invite'); }
    finally { setCreating(false); }
  };

  const handleDelete = async () => {
    if (!deleteInvite) return;
    try {
      const res = await fetch(`/api/admin/invites?id=${deleteInvite.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Invite revoked');
        setDeleteInvite(null);
        fetchInvites(pagination.page);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to revoke');
      }
    } catch { toast.error('Failed to revoke invite'); }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/?invite=${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedToken(token);
      setCopiedField('link');
      toast.success('Registration link copied!');
      setTimeout(() => { setCopiedToken(null); setCopiedField(null); }, 2000);
    }).catch(() => {
      toast.info(`Link: ${url}`);
    });
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token).then(() => {
      setCopiedToken(token);
      setCopiedField('token');
      toast.success('Token copied!');
      setTimeout(() => { setCopiedToken(null); setCopiedField(null); }, 2000);
    });
  };

  const getInviteStatus = (invite: InviteRecord) => {
    if (invite.isUsed) return 'used';
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) return 'expired';
    // Check if expiring within 24 hours
    if (invite.expiresAt) {
      const hoursLeft = (new Date(invite.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursLeft <= 24 && hoursLeft > 0) return 'expiring';
    }
    return 'active';
  };

  const getDotStatus = (invite: InviteRecord) => {
    const status = getInviteStatus(invite);
    if (status === 'used') return 'used';
    if (status === 'expired') return 'expired';
    if (status === 'expiring') return 'expiring';
    return 'active';
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const getDaysLeft = (expiresAt?: string | null) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const quickExpiryOptions = [
    { label: '24 Hours', value: '24', icon: Clock },
    { label: '48 Hours', value: '48', icon: Zap },
    { label: '7 Days', value: '168', icon: Clock },
    { label: '30 Days', value: '720', icon: Crown },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white/90 adm-section-header">Registration Invites</h2>
          <p className="text-sm text-white/40 mt-1">Generate temporary registration links for new users</p>
        </div>
        <Button className="gap-2 bg-[#03DAC6] text-black font-semibold hover:bg-[#03DAC6]/90 text-[12px] adm-quick-action"
          onClick={() => setShowCreate(true)}>
          <UserPlus className="h-4 w-4" /> Create Invite
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active', value: invites.filter(i => getInviteStatus(i) === 'active' || getInviteStatus(i) === 'expiring').length, icon: Link, color: '#03DAC6', gradient: 'from-[#03DAC6]/20' },
          { label: 'Used', value: invites.filter(i => getInviteStatus(i) === 'used').length, icon: CheckCircle, color: '#BB86FC', gradient: 'from-[#BB86FC]/20' },
          { label: 'Expired', value: invites.filter(i => getInviteStatus(i) === 'expired').length, icon: XCircle, color: '#CF6679', gradient: 'from-[#CF6679]/20' },
        ].map((stat) => (
          <div key={stat.label} className="group relative">
            <div className={cn(
              'absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500',
              `bg-gradient-to-br ${stat.gradient} to-transparent`,
            )} />
            <Card className="relative bg-[#0D0D0D] border-white/[0.06] adm-stat-card">
              <CardContent className="p-4 text-center">
                <div className="w-9 h-9 rounded-xl bg-[#03DAC6]/10 flex items-center justify-center mx-auto mb-2">
                  <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                </div>
                <p className="text-2xl font-bold text-white/80">{stat.value}</p>
                <p className="text-[10px] text-white/30 mt-1 font-medium uppercase tracking-wider">{stat.label}</p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['', 'active', 'used', 'expired'].map(status => (
          <Button key={status} variant="outline" size="sm"
            className={cn(
              'text-[11px] rounded-lg h-8 transition-all adm-filter-chip',
              filterStatus === status ? 'bg-[#03DAC6]/10 border-[#03DAC6]/25 text-[#03DAC6] adm-filter-chip-active' : 'bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/[0.04]',
            )}
            onClick={() => setFilterStatus(status)}>
            {status === '' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
        <div className="ml-auto">
          <Badge variant="outline" className="text-[10px] font-medium px-2.5 py-1 bg-white/[0.02] border-white/[0.06] text-white/30 adm-badge">
            {pagination.total} total
          </Badge>
        </div>
      </div>

      {/* Invites List */}
      <Card className="bg-[#0D0D0D] border-white/[0.06] adm-content-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="relative h-28 rounded-xl overflow-hidden">
                  <div className="absolute inset-0 bg-white/[0.02] rounded-xl" />
                  <div className="absolute inset-0 animate-shimmer-strong rounded-xl"
                    style={{
                      background: 'linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 75%)',
                      backgroundSize: '200% 100%',
                    }} />
                  <div className="absolute top-4 left-4 right-4 space-y-2">
                    <div className="h-5 w-32 rounded-lg bg-white/[0.04]" />
                    <div className="h-3 w-48 rounded bg-white/[0.03]" />
                    <div className="h-3 w-24 rounded bg-white/[0.02]" />
                  </div>
                </div>
              ))}
            </div>
          ) : invites.length === 0 ? (
            <div className="text-center py-16 adm-empty-state">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-3 adm-empty-state-icon">
                <UserPlus className="h-6 w-6 text-white/10" />
              </div>
              <p className="text-white/30 text-sm font-medium">No invites yet</p>
              <p className="text-white/15 text-[11px] mt-1">Create your first invite link to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {invites.map((invite) => {
                const status = getInviteStatus(invite);
                const dotStatus = getDotStatus(invite);
                const daysLeft = getDaysLeft(invite.expiresAt);
                const usagePercent = invite.maxUses > 0 ? (invite.usedCount / invite.maxUses) * 100 : 0;

                // Lifecycle timeline steps
                const lifecycleSteps = [
                  { label: 'Created', done: true, color: '#03DAC6' },
                  { label: 'Active', done: status !== 'expired' && status !== 'used', current: status === 'active' || status === 'expiring', color: status === 'active' ? '#03DAC6' : status === 'expiring' ? '#FFD700' : '#03DAC6' },
                  { label: status === 'used' ? 'Used' : 'Expired', done: status === 'used' || status === 'expired', current: status === 'used' || status === 'expired', color: status === 'used' ? '#BB86FC' : '#CF6679' },
                ];

                return (
                  <Tooltip key={invite.id}>
                  <TooltipTrigger asChild>
                  <div
                    className="p-4 hover:bg-white/[0.02] transition-all duration-200 group/invite hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)] cursor-default adm-list-item"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {/* Token & Status with dot */}
                        <div className="flex items-center gap-2.5 flex-wrap mb-2">
                          <StatusDot status={dotStatus} />
                          <code className="text-sm font-mono font-bold text-white/70 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">
                            {invite.token}
                          </code>
                          <Badge variant="outline" className={cn(
                            'text-[9px] font-bold uppercase px-2 py-0.5 adm-badge',
                            status === 'active' ? 'border-[#03DAC6]/20 text-[#03DAC6] bg-[#03DAC6]/5' :
                            status === 'expiring' ? 'border-[#FFD700]/20 text-[#FFD700] bg-[#FFD700]/5' :
                            status === 'used' ? 'border-[#BB86FC]/20 text-[#BB86FC] bg-[#BB86FC]/5' :
                            'border-[#CF6679]/20 text-[#CF6679] bg-[#CF6679]/5',
                          )}>
                            {status === 'active' && <><Clock className="h-2.5 w-2.5 mr-0.5 inline" />{daysLeft !== null ? `${daysLeft}d left` : 'No expiry'}</>}
                            {status === 'expiring' && <><AlertTriangle className="h-2.5 w-2.5 mr-0.5 inline" />Expiring soon</>}
                            {status === 'used' && <><CheckCircle className="h-2.5 w-2.5 mr-0.5 inline" />Used</>}
                            {status === 'expired' && <><XCircle className="h-2.5 w-2.5 mr-0.5 inline" />Expired</>}
                          </Badge>
                          <Badge variant="outline" className={cn(
                            'text-[9px] font-bold uppercase px-2 py-0.5 adm-badge',
                            invite.plan === 'ultimate' ? 'border-[#03DAC6]/20 text-[#03DAC6] bg-[#03DAC6]/5' : invite.plan === 'pro' ? 'border-[#FFD700]/20 text-[#FFD700] bg-[#FFD700]/5' : 'border-white/10 text-white/40 bg-white/[0.02]',
                          )}>
                            {invite.plan === 'ultimate' ? <><Gem className="h-2.5 w-2.5 mr-0.5 inline" />ULTIMATE</> : invite.plan === 'pro' ? <><Crown className="h-2.5 w-2.5 mr-0.5 inline" />PRO</> : <><Sparkles className="h-2.5 w-2.5 mr-0.5 inline" />BASIC</>}
                          </Badge>
                        </div>

                        {/* Registration Link — show full URL for easy sharing */}
                        {status === 'active' && (
                          <div className="flex items-center gap-2 mb-2">
                            <Link className="h-3 w-3 text-white/20 shrink-0" />
                            <code className="text-[10px] font-mono text-white/30 truncate max-w-[280px] sm:max-w-[400px]">
                              {typeof window !== 'undefined' ? `${window.location.origin}/?invite=${invite.token}` : `/?invite=${invite.token}`}
                            </code>
                          </div>
                        )}

                        {/* Lifecycle Timeline */}
                        <div className="flex items-center gap-1 mb-2.5">
                          {lifecycleSteps.map((step, idx) => (
                            <div key={step.label} className="flex items-center">
                              <div className="flex items-center gap-1.5">
                                <div className={cn(
                                  'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all',
                                  step.done ? 'bg-opacity-20' : 'bg-white/[0.04] text-white/20',
                                  step.current && 'ring-2 ring-offset-1 ring-offset-[#0D0D0D]',
                                )}
                                  style={{
                                    backgroundColor: step.done ? `${step.color}25` : undefined,
                                    color: step.done ? step.color : undefined,
                                    ringColor: step.current ? step.color : undefined,
                                  } as React.CSSProperties}>
                                  {step.done ? '✓' : idx + 1}
                                </div>
                                <span className={cn(
                                  'text-[9px] font-medium',
                                  step.done ? 'text-white/40' : 'text-white/15',
                                  step.current && 'text-white/60',
                                )}>
                                  {step.label}
                                </span>
                              </div>
                              {idx < lifecycleSteps.length - 1 && (
                                <div className={cn(
                                  'w-6 h-px mx-1.5',
                                  lifecycleSteps[idx + 1].done ? 'bg-white/15' : 'bg-white/[0.06]',
                                )} />
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Usage Progress */}
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex-1 max-w-[120px]">
                            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden adm-progress-track">
                              <div className="h-full rounded-full transition-all duration-500 adm-progress-fill"
                                style={{
                                  width: `${usagePercent}%`,
                                  background: status === 'active' ? 'linear-gradient(90deg, #03DAC6, #03DAC680)' : status === 'used' ? '#BB86FC' : status === 'expiring' ? 'linear-gradient(90deg, #FFD700, #FFA500)' : '#CF6679',
                                }} />
                            </div>
                          </div>
                          <span className="text-[10px] text-white/25 font-medium">
                            {invite.usedCount}/{invite.maxUses} uses
                          </span>
                        </div>

                        {/* Meta info */}
                        <div className="flex items-center gap-3 text-[10px] text-white/20">
                          <span>Created {formatDate(invite.createdAt)}</span>
                          {invite.email && (
                            <>
                              <span className="text-white/10">•</span>
                              <span className="flex items-center gap-1"><Mail className="h-2.5 w-2.5" />{invite.email}</span>
                            </>
                          )}
                          {invite.usedBy && (
                            <>
                              <span className="text-white/10">•</span>
                              <span>Used by: {invite.usedBy}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions with copy feedback */}
                      <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover/invite:opacity-100 transition-opacity">
                        {status === 'active' && (
                          <>
                            <Button variant="ghost" size="sm"
                              className="h-8 text-white/40 hover:text-[#03DAC6] hover:bg-[#03DAC6]/10 relative adm-action-btn"
                              onClick={(e) => { e.stopPropagation(); copyLink(invite.token); }} title="Copy registration link">
                              {copiedToken === invite.token && copiedField === 'link' ? (
                                <CheckCircle className="h-3.5 w-3.5 text-[#03DAC6] animate-checkmark-pop" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button variant="ghost" size="sm"
                              className="h-8 text-white/40 hover:text-[#03DAC6] hover:bg-[#03DAC6]/10 relative adm-action-btn"
                              onClick={(e) => { e.stopPropagation(); copyToken(invite.token); }} title="Copy token code">
                              {copiedToken === invite.token && copiedField === 'token' ? (
                                <CheckCircle className="h-3.5 w-3.5 text-[#03DAC6] animate-checkmark-pop" />
                              ) : (
                                <QrCode className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="sm" className="h-8 text-white/20 hover:text-[#CF6679] hover:bg-[#CF6679]/10 adm-action-btn"
                          onClick={(e) => { e.stopPropagation(); setDeleteInvite(invite); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="left"
                    align="start"
                    sideOffset={8}
                    className="bg-white/[0.03] border-white/[0.08] p-3 max-w-[260px] shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
                  >
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-white/70">{invite.token}</p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-[10px] text-white/30">Created</span>
                          <span className="text-[10px] text-white/60">{new Date(invite.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[10px] text-white/30">Expires</span>
                          <span className="text-[10px] text-white/60">{invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[10px] text-white/30">Usage</span>
                          <span className="text-[10px] text-white/60">{invite.usedCount} / {invite.maxUses}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[10px] text-white/30">Email</span>
                          <span className="text-[10px] text-white/60">{invite.email || 'Any (public)'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[10px] text-white/30">Plan</span>
                          <span className="text-[10px] font-semibold" style={{ color: invite.plan === 'ultimate' ? '#03DAC6' : invite.plan === 'pro' ? '#FFD700' : 'rgba(255,255,255,0.5)' }}>{invite.plan}</span>
                        </div>
                      </div>
                    </div>
                  </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}
        </CardContent>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.04]">
            <p className="text-[11px] text-white/25">Page {pagination.page} of {pagination.totalPages}</p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/40"
                disabled={pagination.page <= 1} onClick={() => fetchInvites(pagination.page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/40"
                disabled={pagination.page >= pagination.totalPages} onClick={() => fetchInvites(pagination.page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-[#141414] border-white/[0.08] rounded-2xl p-0 overflow-hidden max-w-md adm-dialog-content">
          <div className="p-5">
          <DialogHeader>
            <DialogTitle className="text-white/90 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#03DAC6]" />
              Create Invite Link
            </DialogTitle>
            <DialogDescription className="text-white/40">
              Generate a temporary registration link for new users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[11px] text-white/50 flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email (optional — restrict to specific email)
              </Label>
              <Input type="email" placeholder="user@example.com (leave empty for public)"
                value={createEmail} onChange={(e) => setCreateEmail(e.target.value)}
                className="bg-white/[0.03] border-white/[0.06] text-white/70 adm-form-input" />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] text-white/50">Assigned Plan</Label>
              <Select value={createPlan} onValueChange={setCreatePlan}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white/70 adm-form-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white/[0.03] border-white/[0.08]">
                  <SelectItem value="basic">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-white/40" />
                      <span>Basic — Default free plan</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="pro">
                    <div className="flex items-center gap-2">
                      <Crown className="h-3.5 w-3.5 text-[#FFD700]" />
                      <span>Pro — Full access</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="ultimate">
                    <div className="flex items-center gap-2">
                      <Gem className="h-3.5 w-3.5 text-[#03DAC6]" />
                      <span>Ultimate — All access</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[11px] text-white/50">Max Uses</Label>
                <Input type="number" min="1" value={createMaxUses} onChange={(e) => setCreateMaxUses(e.target.value)}
                  className="bg-white/[0.03] border-white/[0.06] text-white/70 adm-form-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] text-white/50">Expires In (hours)</Label>
                <Input type="number" min="1" value={createExpiry} onChange={(e) => setCreateExpiry(e.target.value)}
                  className="bg-white/[0.03] border-white/[0.06] text-white/70 adm-form-input" />
              </div>
            </div>

            {/* Quick expiry buttons */}
            <div className="space-y-2">
              <Label className="text-[11px] text-white/50">Quick Expiry</Label>
              <div className="grid grid-cols-4 gap-2">
                {quickExpiryOptions.map(opt => (
                  <Button key={opt.value} variant="outline" size="sm"
                    className={cn(
                      'justify-center gap-1 text-[10px] h-8',
                      createExpiry === opt.value ? 'bg-[#03DAC6]/10 border-[#03DAC6]/20 text-[#03DAC6]' : 'bg-white/[0.02] border-white/[0.06] text-white/40',
                    )}
                    onClick={() => setCreateExpiry(opt.value)}>
                    <opt.icon className="h-3 w-3" />
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#03DAC6]/5 border border-[#03DAC6]/10 adm-info-banner">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-[#03DAC6] shrink-0 mt-0.5" />
                <div className="text-[11px] text-[#03DAC6]/60 leading-relaxed">
                  The invite link will be automatically copied to your clipboard after creation. Share it with the intended user.
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="bg-white/[0.03] border-white/[0.06] text-white/50"
              onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button className="bg-[#03DAC6] text-black font-semibold hover:bg-[#03DAC6]/90"
              onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : 'Create & Copy Link'}
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteInvite} onOpenChange={() => setDeleteInvite(null)}>
        <AlertDialogContent className="bg-[#141414] border-white/[0.08] rounded-2xl p-0 overflow-hidden adm-dialog-content">
          <div className="p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white/90">Revoke Invite</AlertDialogTitle>
            <AlertDialogDescription className="text-white/40">
              Are you sure you want to revoke invite <code className="bg-white/[0.04] px-1.5 py-0.5 rounded text-white/70 font-mono">{deleteInvite?.token}</code>?
              {deleteInvite && getInviteStatus(deleteInvite) === 'active' && ' The link will no longer work.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-white/[0.03] border-white/[0.06] text-white/50">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-[#CF6679] text-white hover:bg-[#CF6679]/90" onClick={handleDelete}>
              Revoke Invite
            </AlertDialogAction>
          </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
