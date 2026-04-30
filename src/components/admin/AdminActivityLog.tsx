'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Activity, Edit, Trash2, Key, UserPlus, CreditCard,
  ChevronLeft, ChevronRight, RefreshCw, Shield, UserMinus,
  Search, FileDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ActivityLog {
  id: string; adminId: string; action: string;
  target?: string | null; details?: string | null;
  createdAt: string;
}

interface Pagination {
  page: number; limit: number; total: number; totalPages: number;
}

const actionConfig: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  update_user: { label: 'User Updated', icon: Edit, color: '#03DAC6', bgColor: '#03DAC6' },
  delete_user: { label: 'User Deleted', icon: Trash2, color: '#CF6679', bgColor: '#CF6679' },
  reset_password: { label: 'Password Reset', icon: Key, color: '#FFD700', bgColor: '#FFD700' },
  create_invite: { label: 'Invite Created', icon: UserPlus, color: '#BB86FC', bgColor: '#BB86FC' },
  revoke_invite: { label: 'Invite Revoked', icon: UserMinus, color: '#CF6679', bgColor: '#CF6679' },
  assign_subscription: { label: 'Subscription Assigned', icon: CreditCard, color: '#03DAC6', bgColor: '#03DAC6' },
  create_user: { label: 'User Created', icon: UserPlus, color: '#03DAC6', bgColor: '#03DAC6' },
  change_role: { label: 'Role Changed', icon: Shield, color: '#BB86FC', bgColor: '#BB86FC' },
};

export function AdminActivityLog() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (filterAction) params.set('action', filterAction);
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/admin/activity-log?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setPagination(data.pagination);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterAction, searchQuery]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchLogs(pagination.page).finally(() => setIsRefreshing(false));
  };

  const exportLogs = () => {
    const headers = ['Time', 'Action', 'Target', 'Details'];
    const rows = logs.map(l => [
      new Date(l.createdAt).toISOString(),
      actionConfig[l.action]?.label || l.action,
      l.target || '',
      l.details || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Activity log exported');
  };

  const getRelativeTime = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Client-side search filter
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(l =>
      (l.target?.toLowerCase() ?? '').includes(q) ||
      (l.details?.toLowerCase() ?? '').includes(q) ||
      (actionConfig[l.action]?.label ?? '').toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  // Group logs by date
  const groupedLogs = filteredLogs.reduce((acc, log) => {
    const date = new Date(log.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {} as Record<string, ActivityLog[]>);

  // Flatten for global entry index (for staggered animation)
  let globalIdx = 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="adm-section-header text-xl font-bold text-white/90">Activity Log</h2>
          <p className="text-sm text-white/40 mt-1">Track all admin actions and changes</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterAction} onValueChange={(v) => setFilterAction(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-8 w-[160px] rounded-lg bg-white/[0.03] border-white/[0.06] text-white/60 text-xs">
              <SelectValue placeholder="Filter action" />
            </SelectTrigger>
            <SelectContent className="bg-white/[0.03] border-white/[0.08]">
              <SelectItem value="all">All Actions</SelectItem>
              {Object.entries(actionConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="adm-badge adm-badge-info text-[10px] font-medium px-2.5 py-1 bg-white/[0.02] border-white/[0.06] text-white/30">
            {pagination.total} events
          </Badge>
          <Button variant="outline" size="sm" className="adm-action-btn h-8 gap-1.5 bg-white/[0.02] border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.04]"
            onClick={exportLogs} disabled={logs.length === 0}>
            <FileDown className="h-3.5 w-3.5" /> Export
          </Button>
          <Button variant="ghost" size="sm"
            className={cn(
              'adm-action-btn h-8 w-8 p-0 hover:bg-white/[0.04]',
              isRefreshing ? 'text-[#03DAC6]' : 'text-white/40 hover:text-white',
            )}
            onClick={handleRefresh}>
            <RefreshCw className={cn(
              'h-3.5 w-3.5 transition-all',
              isRefreshing ? 'animate-spin' : '',
            )} />
            {isRefreshing && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#03DAC6] animate-ping" />
            )}
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
        <Input
          placeholder="Search by target, details, or action..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="adm-search-input pl-9 h-10 rounded-xl bg-white/[0.03] border-white/[0.06] text-white/80 text-sm placeholder:text-white/20"
        />
        {searchQuery && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            onClick={() => setSearchQuery('')}
          >
            ×
          </button>
        )}
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(actionConfig).slice(0, 4).map(([key, config], idx) => {
          const Icon = config.icon;
          const count = logs.filter(l => l.action === key).length;
          return (
            <motion.div key={key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, type: 'spring', stiffness: 400, damping: 25 }}
              whileHover={{ y: -2 }}
              className="adm-stat-card flex items-center gap-2.5 p-3 rounded-xl bg-[#0D0D0D] border border-white/[0.06]"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${config.bgColor}12` }}>
                <Icon className="h-3.5 w-3.5" style={{ color: config.bgColor }} />
              </div>
              <div>
                <p className="text-sm font-bold text-white/70 tabular-nums">{count}</p>
                <p className="text-[9px] text-white/25 uppercase tracking-wider">{config.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Card className="adm-content-card bg-[#0D0D0D] border-white/[0.06]">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="relative h-14 rounded-xl bg-white/[0.02] overflow-hidden">
                  <div className="absolute inset-0 animate-shimmer"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)',
                      backgroundSize: '200% 100%',
                    }} />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="adm-empty-state text-center py-20 relative overflow-hidden">
              {/* Animated gradient background */}
              <div className="absolute inset-0"
                style={{
                  background: 'radial-gradient(ellipse at 50% 30%, rgba(187,134,252,0.04) 0%, rgba(3,218,198,0.02) 40%, transparent 70%)',
                  animation: 'emptyPulse 4s ease-in-out infinite',
                }} />
              <div className="relative">
                <div className="adm-empty-state-icon w-20 h-20 rounded-3xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mx-auto mb-5">
                  <Activity className="h-9 w-9 text-white/[0.06]" />
                </div>
                <p className="text-white/25 text-sm font-medium">No activity recorded yet</p>
                <p className="text-white/15 text-[11px] mt-1.5">Admin actions will appear here</p>
              </div>
            </div>
          ) : filteredLogs.length === 0 && searchQuery ? (
            <div className="adm-empty-state text-center py-16">
              <div className="adm-empty-state-icon w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mx-auto mb-4">
                <Search className="h-7 w-7 text-white/[0.06]" />
              </div>
              <p className="text-white/25 text-sm font-medium">No matching entries</p>
              <p className="text-white/15 text-[11px] mt-1.5">Try a different search term</p>
            </div>
          ) : (
            <div className="adm-scroll-mobile max-h-[600px] overflow-y-auto custom-scrollbar">
              {Object.entries(groupedLogs).map(([date, dateLogs]) => (
                <div key={date}>
                  {/* Date separator */}
                  <div className="adm-table-header sticky top-0 z-10 flex items-center gap-3 px-4 py-2 bg-[#0D0D0D]/95 backdrop-blur-sm border-b border-white/[0.04]">
                    <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">{date}</span>
                    <div className="flex-1 h-px bg-white/[0.04]" />
                    <span className="text-[9px] text-white/15">{dateLogs.length} events</span>
                  </div>
                  {/* Events with timeline line */}
                  <div className="relative">
                    {/* Vertical connecting line */}
                    <div className="absolute left-[26px] top-0 bottom-0 w-px bg-white/[0.04]" />
                    <div className="divide-y divide-white/[0.03]">
                      {dateLogs.map((log) => {
                        globalIdx++;
                        const entryIdx = globalIdx;
                        const config = actionConfig[log.action] || { label: log.action, icon: Activity, color: '#666', bgColor: '#666' };
                        const Icon = config.icon;
                        return (
                          <motion.div
                            key={log.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: entryIdx * 0.03, type: 'spring', stiffness: 400, damping: 25 }}
                            whileHover={{ x: 2 }}
                            className="adm-list-item flex items-start gap-3 p-3.5 hover:bg-white/[0.02] transition-all duration-200 group/log"
                          >
                            {/* Timeline icon with connecting line */}
                            <div className="relative flex flex-col items-center shrink-0 z-[1]">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 group-hover/log:scale-110"
                                style={{
                                  background: `${config.color}12`,
                                  boxShadow: 'none',
                                }}>
                                <Icon className="h-3.5 w-3.5" style={{ color: config.color }} />
                              </div>
                            </div>

                            {/* Left border glow on hover */}
                            <div className="adm-list-item-accent absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full opacity-0 group-hover/log:opacity-100 transition-opacity duration-300"
                              style={{ background: `${config.color}30`, boxShadow: `0 0 8px ${config.color}15` }} />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[12px] font-semibold text-white/70">{config.label}</span>
                                {log.target && (
                                  <code className="text-[10px] text-white/35 bg-white/[0.03] px-1.5 py-0.5 rounded font-mono max-w-[200px] truncate">{log.target}</code>
                                )}
                              </div>
                              {log.details && (
                                <p className="text-[11px] text-white/25 mt-0.5 truncate">{log.details}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <p className="text-[10px] text-white/30">{getRelativeTime(log.createdAt)}</p>
                              <p className="text-[9px] text-white/15">{new Date(log.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.04]">
            <p className="text-[11px] text-white/25">Page {pagination.page} of {pagination.totalPages}</p>
            <div className="flex items-center gap-1">
              <button className="h-7 w-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors disabled:opacity-30"
                disabled={pagination.page <= 1} onClick={() => fetchLogs(pagination.page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="h-7 w-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors disabled:opacity-30"
                disabled={pagination.page >= pagination.totalPages} onClick={() => fetchLogs(pagination.page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
