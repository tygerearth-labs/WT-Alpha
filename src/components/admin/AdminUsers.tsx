'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Search, MoreVertical, Edit, Trash2, Key, Shield,
  Crown, Sparkles, UserCheck, UserX, Users, ChevronLeft, ChevronRight,
  Filter, RefreshCw, Eye, Settings, FileDown, UserPlus, CheckSquare,
  Square, X, UserCircle, Activity, CreditCard, Target, TrendingUp,
  TrendingDown, ArrowUpRight, Clock, Wallet, Ban, UserCog, BarChart3,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UserRecord {
  id: string; email: string; username: string; image?: string | null;
  plan: string; status: string; locale: string; currency: string;
  subscriptionEnd?: string | null; maxCategories: number; maxSavings: number;
  role: string;
  createdAt: string; updatedAt: string;
  _count: { transactions: number; categories: number; savingsTargets: number };
}

interface Pagination {
  page: number; limit: number; total: number; totalPages: number;
}

interface AdminUsersProps {
  showAccessControl?: boolean;
}

const avatarColors = [
  { bg: 'linear-gradient(135deg, #03DAC630, #03DAC615)', border: 'rgba(3,218,198,0.2)', text: '#03DAC6' },
  { bg: 'linear-gradient(135deg, #FFD70030, #FFD70015)', border: 'rgba(255,215,0,0.2)', text: '#FFD700' },
  { bg: 'linear-gradient(135deg, #BB86FC30, #BB86FC15)', border: 'rgba(187,134,252,0.2)', text: '#BB86FC' },
  { bg: 'linear-gradient(135deg, #CF667930, #CF667915)', border: 'rgba(207,102,121,0.2)', text: '#CF6679' },
  { bg: 'linear-gradient(135deg, #64B5F630, #64B5F615)', border: 'rgba(100,181,246,0.2)', text: '#64B5F6' },
];

function getAvatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export function AdminUsers({ showAccessControl }: AdminUsersProps) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [editPlan, setEditPlan] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editMaxCats, setEditMaxCats] = useState('');
  const [editMaxSavings, setEditMaxSavings] = useState('');
  const [editSubEnd, setEditSubEnd] = useState('');
  const [resetPwUser, setResetPwUser] = useState<UserRecord | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [deleteUser, setDeleteUser] = useState<UserRecord | null>(null);
  const [detailUser, setDetailUser] = useState<UserRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', username: '', password: '', plan: 'basic' });
  const [creatingUser, setCreatingUser] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [detailStats, setDetailStats] = useState<{
    user: UserRecord;
    stats: {
      balance: number;
      totalTransactions: number;
      totalCategories: number;
      totalSavingsTargets: number;
      categoryUsagePercent: number;
      savingsUsagePercent: number;
    };
    subscription: { status: string; daysLeft: number; end: string | null };
    recentActivity: { id: string; action: string; details: string | null; createdAt: string }[];
    recentTransactions: { id: string; type: string; amount: number; description: string | null; date: string }[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetailProfile = async (user: UserRecord) => {
    setDetailUser(user);
    setDetailLoading(true);
    setDetailStats(null);
    try {
      const res = await fetch(`/api/admin/user-detail/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setDetailStats(data);
      }
    } catch {
      // Use fallback data from the list
    } finally {
      setDetailLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Username', 'Email', 'Plan', 'Status', 'Role', 'Categories', 'Savings', 'Transactions', 'Subscription End', 'Joined'];
    const rows = users.map(u => [
      u.username, u.email, u.plan, u.status, u.role,
      u._count.categories, u._count.savingsTargets, u._count.transactions,
      u.subscriptionEnd || 'None', new Date(u.createdAt).toISOString()
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Users exported to CSV');
  };

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (filterPlan) params.set('plan', filterPlan);
      if (filterStatus) params.set('status', filterStatus);

      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, filterPlan, filterStatus]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map(u => u.id)));
    }
  };

  const handleBulkAction = async () => {
    if (selectedIds.size === 0 || !bulkAction) return;
    try {
      if (bulkAction === 'suspend' || bulkAction === 'activate') {
        for (const id of selectedIds) {
          await fetch('/api/admin/users', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: id, status: bulkAction === 'suspend' ? 'suspended' : 'active' })
          });
        }
        toast.success(`${selectedIds.size} user(s) ${bulkAction === 'suspend' ? 'suspended' : 'activated'}`);
      }
      setSelectedIds(new Set());
      setBulkAction('');
      fetchUsers(pagination.page);
    } catch {
      toast.error('Bulk action failed');
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.username || !newUser.password) {
      toast.error('All fields are required');
      return;
    }
    if (newUser.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setCreatingUser(true);
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        toast.success(`User ${newUser.username} created successfully`);
        setShowCreateUser(false);
        setNewUser({ email: '', username: '', password: '', plan: 'basic' });
        fetchUsers(1);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create user');
      }
    } catch {
      toast.error('Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editUser) return;
    try {
      const body: Record<string, unknown> = { userId: editUser.id };
      if (editPlan) body.plan = editPlan;
      if (editStatus) body.status = editStatus;
      if (editRole) body.role = editRole;
      const parsedMaxCats = parseInt(editMaxCats);
      const parsedMaxSavings = parseInt(editMaxSavings);
      if (!isNaN(parsedMaxCats) && parsedMaxCats > 0) body.maxCategories = parsedMaxCats;
      if (!isNaN(parsedMaxSavings) && parsedMaxSavings > 0) body.maxSavings = parsedMaxSavings;
      if (editSubEnd) body.subscriptionEnd = editSubEnd;

      const res = await fetch('/api/admin/users', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      if (res.ok) {
        toast.success('User updated successfully');
        setEditUser(null);
        fetchUsers(pagination.page);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update');
      }
    } catch { toast.error('Failed to update user'); }
  };

  const handleResetPassword = async () => {
    if (!resetPwUser || !newPassword) return;
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetPwUser.id, newPassword })
      });
      if (res.ok) {
        toast.success(`Password reset for ${resetPwUser.username}`);
        setResetPwUser(null);
        setNewPassword('');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to reset');
      }
    } catch { toast.error('Failed to reset password'); }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    try {
      const res = await fetch(`/api/admin/users?userId=${deleteUser.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('User deleted');
        setDeleteUser(null);
        fetchUsers(pagination.page);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete');
      }
    } catch { toast.error('Failed to delete user'); }
  };

  const openEditDialog = (user: UserRecord) => {
    setEditUser(user);
    setEditPlan(user.plan);
    setEditStatus(user.status);
    setEditRole(user.role);
    setEditMaxCats(String(user.maxCategories));
    setEditMaxSavings(String(user.maxSavings));
    setEditSubEnd(user.subscriptionEnd ? new Date(user.subscriptionEnd).toISOString().split('T')[0] : '');
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  // Access Control view mode
  if (showAccessControl) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white/90">Access Control & Limits</h2>
          <p className="text-sm text-white/40 mt-1">Manage user access rights, feature limits, and permissions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plan Comparison */}
          <Card className="bg-[#0D0D0D] border-white/[0.06]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white/70 flex items-center gap-2">
                <Settings className="h-4 w-4 text-[#03DAC6]" />
                Plan Feature Limits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div />
                  <div className="flex items-center justify-center gap-1.5 py-2">
                    <Sparkles className="h-3.5 w-3.5 text-white/40" />
                    <span className="text-[11px] font-bold text-white/50">BASIC</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 py-2">
                    <Crown className="h-3.5 w-3.5 text-[#FFD700]" />
                    <span className="text-[11px] font-bold text-[#FFD700]">PRO</span>
                  </div>
                </div>
                {[
                  { feature: 'Max Categories', basic: '10', pro: '50' },
                  { feature: 'Max Savings Targets', basic: '3', pro: '20' },
                  { feature: 'Basic Dashboard', basic: true, pro: true },
                  { feature: 'AI Consultant', basic: false, pro: true },
                  { feature: 'Export Reports', basic: true, pro: true },
                  { feature: 'Priority Support', basic: false, pro: true },
                  { feature: 'Custom Currency', basic: false, pro: true },
                  { feature: 'Data Backup', basic: false, pro: true },
                ].map((row) => (
                  <div key={row.feature} className="grid grid-cols-3 gap-2 text-center items-center py-2.5 border-t border-white/[0.04]">
                    <span className="text-[12px] text-white/50 text-left">{row.feature}</span>
                    <span className="text-[12px] text-white/40">{typeof row.basic === 'boolean' ? (row.basic ? '✓' : '—') : row.basic}</span>
                    <span className="text-[12px] text-[#FFD700]/70">{typeof row.pro === 'boolean' ? (row.pro ? '✓' : '—') : row.pro}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-[#0D0D0D] border-white/[0.06]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white/70 flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#BB86FC]" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[12px] text-white/30 mb-4">
                Use the Users page to individually manage each user&apos;s access rights, limits, and permissions.
              </p>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-3 bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] text-white/60"
                  onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4" />
                  <span className="text-sm">Check Expired Subscriptions</span>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] text-white/60">
                  <UserX className="h-4 w-4" />
                  <span className="text-sm">Suspend All Free Trial Users</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Limits Table */}
        <Card className="bg-[#0D0D0D] border-white/[0.06]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white/70 flex items-center gap-2">
              <Users className="h-4 w-4 text-[#03DAC6]" />
              Current User Limits
              <Badge variant="outline" className="text-[9px] font-semibold px-1.5 py-0 bg-white/[0.02] border-white/[0.06] text-white/30">
                {pagination.total} users
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl bg-white/[0.02] animate-pulse" />)}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-white/25 text-sm">No users</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left py-3 px-3 text-[10px] font-semibold text-white/25 uppercase tracking-wider">User</th>
                      <th className="text-center py-3 px-3 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Plan</th>
                      <th className="text-center py-3 px-3 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Categories</th>
                      <th className="text-center py-3 px-3 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Savings</th>
                      <th className="text-center py-3 px-3 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Status</th>
                      <th className="text-right py-3 px-3 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const avatarColor = getAvatarColor(u.id);
                      return (
                        <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                                style={{ background: avatarColor.bg, border: `1px solid ${avatarColor.border}`, color: avatarColor.text }}>
                                {u.username.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[12px] font-medium text-white/70 truncate max-w-[150px]">{u.username}</p>
                                <p className="text-[10px] text-white/25 truncate max-w-[150px]">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge variant="outline" className={cn(
                              'text-[9px] font-bold uppercase px-2 py-0.5',
                              u.plan === 'pro' ? 'border-[#FFD700]/20 text-[#FFD700] bg-[#FFD700]/5' : 'border-white/10 text-white/40 bg-white/[0.02]',
                            )}>
                              {u.plan}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className="text-[12px] text-white/50">{u._count.categories}/{u.maxCategories}</span>
                              <div className="w-12 h-1 rounded-full bg-white/[0.06] mt-1 overflow-hidden">
                                <div className="h-full rounded-full bg-[#03DAC6]/50 transition-all"
                                  style={{ width: `${Math.min((u._count.categories / u.maxCategories) * 100, 100)}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className="text-[12px] text-white/50">{u._count.savingsTargets}/{u.maxSavings}</span>
                              <div className="w-12 h-1 rounded-full bg-white/[0.06] mt-1 overflow-hidden">
                                <div className="h-full rounded-full bg-[#BB86FC]/50 transition-all"
                                  style={{ width: `${Math.min((u._count.savingsTargets / u.maxSavings) * 100, 100)}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge variant="outline" className={cn(
                              'text-[9px] font-bold uppercase px-2 py-0.5',
                              u.status === 'active' ? 'border-[#03DAC6]/20 text-[#03DAC6] bg-[#03DAC6]/5' : 'border-[#CF6679]/20 text-[#CF6679] bg-[#CF6679]/5',
                            )}>
                              {u.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Button size="sm" variant="ghost" className="h-7 text-[11px] text-[#03DAC6] hover:text-[#03DAC6] hover:bg-[#03DAC6]/10"
                              onClick={() => openEditDialog(u)}>
                              <Edit className="h-3 w-3 mr-1" /> Edit
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
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white/90">User Management</h2>
          <p className="text-sm text-white/40 mt-1">{pagination.total} total users</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-white/[0.02] border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.04]"
            onClick={() => fetchUsers(pagination.page)}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-white/[0.02] border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.04]"
            onClick={exportCSV} disabled={users.length === 0}>
            <FileDown className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" className="h-8 gap-1.5 bg-[#03DAC6] text-black font-semibold hover:bg-[#03DAC6]/90 text-[12px]"
            onClick={() => setShowCreateUser(true)}>
            <UserPlus className="h-3.5 w-3.5" /> Create User
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar - Smooth slide-down */}
      <div className={cn(
        'grid transition-all duration-300 ease-in-out',
        selectedIds.size > 0
          ? 'grid-rows-[1fr] opacity-100'
          : 'grid-rows-[0fr] opacity-0 pointer-events-none',
      )}>
        <div className="overflow-hidden">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#03DAC6]/5 border border-[#03DAC6]/15">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-[#03DAC6]" />
            <span className="text-[12px] font-semibold text-[#03DAC6]">{selectedIds.size} selected</span>
          </div>
          <div className="h-4 w-px bg-[#03DAC6]/20" />
          <Select value={bulkAction} onValueChange={setBulkAction}>
            <SelectTrigger className="h-7 w-[140px] text-[11px] rounded-lg bg-[#03DAC6]/10 border-[#03DAC6]/20 text-[#03DAC6]">
              <SelectValue placeholder="Bulk action..." />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A2E] border-white/[0.08]">
              <SelectItem value="suspend">Suspend Users</SelectItem>
              <SelectItem value="activate">Activate Users</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-7 text-[11px] bg-[#03DAC6] text-black font-semibold hover:bg-[#03DAC6]/90"
            onClick={handleBulkAction} disabled={!bulkAction}>
            Apply
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/40 hover:text-white ml-auto"
            onClick={() => setSelectedIds(new Set())}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      </div>

      {/* Search & Filters */}
      <Card className="bg-[#0D0D0D] border-white/[0.06]">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
              <Input
                placeholder="Search by email, username, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-xl bg-white/[0.03] border-white/[0.06] text-white/80 text-sm placeholder:text-white/20"
                onKeyDown={(e) => e.key === 'Enter' && fetchUsers(1)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterPlan} onValueChange={(v) => setFilterPlan(v === 'all' ? '' : v)}>
                <SelectTrigger className="h-10 w-[120px] rounded-xl bg-white/[0.03] border-white/[0.06] text-white/60 text-sm">
                  <Filter className="h-3.5 w-3.5 mr-1 text-white/30" />
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A2E] border-white/[0.08]">
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}>
                <SelectTrigger className="h-10 w-[130px] rounded-xl bg-white/[0.03] border-white/[0.06] text-white/60 text-sm">
                  <Filter className="h-3.5 w-3.5 mr-1 text-white/30" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A2E] border-white/[0.08]">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card className="bg-[#0D0D0D] border-white/[0.06]">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 rounded-xl bg-white/[0.02] animate-pulse" />)}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 relative overflow-hidden">
              <div className="absolute inset-0 opacity-50"
                style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(3,218,198,0.03) 0%, transparent 70%)' }} />
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mx-auto mb-4">
                  <UserCircle className="h-10 w-10 text-white/[0.07]" />
                </div>
                <p className="text-white/30 text-sm font-medium">No users found</p>
                <p className="text-white/15 text-[11px] mt-1.5">Try adjusting your search or filters</p>
                <Button variant="outline" size="sm" className="mt-4 h-8 gap-1.5 bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white/70"
                  onClick={() => { setSearch(''); setFilterPlan(''); setFilterStatus(''); fetchUsers(1); }}>
                  <RefreshCw className="h-3 w-3" /> Clear Filters
                </Button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {users.map((u, rowIdx) => {
                const avatarColor = getAvatarColor(u.id);
                const isSelected = selectedIds.has(u.id);
                return (
                  <div key={u.id} className={cn(
                    'flex items-center justify-between p-4 hover:bg-white/[0.02] transition-all duration-200 animate-in fade-in-0 slide-in-from-bottom-1',
                    isSelected && 'bg-[#03DAC6]/[0.03]',
                  )} style={{ animationDelay: `${rowIdx * 30}ms`, animationFillMode: 'backwards' }}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Selection checkbox */}
                      <button
                        onClick={() => toggleSelect(u.id)}
                        className={cn(
                          'shrink-0 transition-all duration-200',
                          isSelected ? 'text-[#03DAC6] scale-110' : 'text-white/20 hover:text-white/50',
                        )}
                      >
                        {isSelected
                          ? <CheckSquare className="h-4 w-4 text-[#03DAC6]" />
                          : <Square className="h-4 w-4" />
                        }
                      </button>

                      {/* Avatar with hover glow */}
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 group-hover:shadow-[0_0_12px_var(--avatar-glow)]"
                          style={{ background: avatarColor.bg, border: `1px solid ${avatarColor.border}`, color: avatarColor.text, '--avatar-glow': avatarColor.text } as React.CSSProperties}>
                          {u.username.slice(0, 2).toUpperCase()}
                        </div>
                        {/* Pulsing green dot for active users */}
                        {u.status === 'active' && (
                          <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#03DAC6] opacity-50" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#03DAC6] ring-2 ring-[#0D0D0D]" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-white/80 truncate">{u.username}</p>
                          <Badge variant="outline" className={cn(
                            'text-[8px] font-bold uppercase px-1.5 py-0 shrink-0',
                            u.plan === 'pro' ? 'border-[#FFD700]/20 text-[#FFD700] bg-[#FFD700]/5' : 'border-white/10 text-white/40 bg-white/[0.02]',
                          )}>
                            {u.plan === 'pro' ? <><Crown className="h-2 w-2 mr-0.5 inline" />PRO</> : <><Sparkles className="h-2 w-2 mr-0.5 inline" />BASIC</>}
                          </Badge>
                          <Badge variant="outline" className={cn(
                            'text-[8px] font-bold uppercase px-1.5 py-0 shrink-0',
                            u.status === 'active' ? 'border-[#03DAC6]/20 text-[#03DAC6] bg-[#03DAC6]/5' : 'border-[#CF6679]/20 text-[#CF6679] bg-[#CF6679]/5',
                          )}>
                            {u.status}
                          </Badge>
                          {u.role === 'admin' && (
                            <Badge variant="outline" className="text-[8px] font-bold uppercase px-1.5 py-0 shrink-0 border-[#BB86FC]/20 text-[#BB86FC] bg-[#BB86FC]/5">
                              <Shield className="h-2 w-2 mr-0.5 inline" />ADMIN
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-white/30 truncate">{u.email}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-white/20">Joined {formatDate(u.createdAt)}</span>
                          <span className="text-[10px] text-white/20">•</span>
                          <span className="text-[10px] text-white/20">{u._count.transactions} txns</span>
                          {u.subscriptionEnd && (
                            <>
                              <span className="text-[10px] text-white/20">•</span>
                              <span className="text-[10px] text-[#FFD700]/50">Exp: {formatDate(u.subscriptionEnd)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/30 hover:text-white/60">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#0D0D0D]/95 backdrop-blur-xl border-white/[0.08] w-48">
                        <DropdownMenuItem className="text-white/60 focus:text-white focus:bg-white/[0.05] cursor-pointer"
                          onClick={() => openDetailProfile(u)}>
                          <Eye className="mr-2 h-3.5 w-3.5" /> View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-white/60 focus:text-white focus:bg-white/[0.05] cursor-pointer"
                          onClick={() => openEditDialog(u)}>
                          <Edit className="mr-2 h-3.5 w-3.5" /> Edit User
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-white/60 focus:text-white focus:bg-white/[0.05] cursor-pointer"
                          onClick={() => { setResetPwUser(u); setNewPassword(''); }}>
                          <Key className="mr-2 h-3.5 w-3.5" /> Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/[0.06]" />
                        <DropdownMenuItem className="text-[#CF6679]/70 focus:text-[#CF6679] focus:bg-[#CF6679]/5 cursor-pointer"
                          onClick={() => setDeleteUser(u)}>
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.04]">
            <p className="text-[11px] text-white/25">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} users
            </p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/40 hover:text-white hover:bg-white/[0.05]"
                disabled={pagination.page <= 1} onClick={() => fetchUsers(pagination.page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {/* Page numbers */}
              {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                return (
                  <Button key={pageNum} variant="ghost" size="sm"
                    className={cn(
                      'h-7 w-7 p-0 text-[11px] font-medium',
                      pageNum === pagination.page
                        ? 'text-[#03DAC6] bg-[#03DAC6]/10'
                        : 'text-white/40 hover:text-white hover:bg-white/[0.05]',
                    )}
                    onClick={() => fetchUsers(pageNum)}>
                    {pageNum}
                  </Button>
                );
              })}
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/40 hover:text-white hover:bg-white/[0.05]"
                disabled={pagination.page >= pagination.totalPages} onClick={() => fetchUsers(pagination.page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
        <DialogContent className="bg-[#0D0D0D] border-white/[0.08] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white/90 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#03DAC6]" />
              Create New User
            </DialogTitle>
            <DialogDescription className="text-white/40">
              Create a new user account directly from the admin panel
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[11px] text-white/50">Email Address</Label>
              <Input type="email" placeholder="user@example.com"
                value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="bg-white/[0.03] border-white/[0.06] text-white/70" />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] text-white/50">Username</Label>
              <Input placeholder="username (min 3 characters)"
                value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                className="bg-white/[0.03] border-white/[0.06] text-white/70" />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] text-white/50">Password</Label>
              <Input type="password" placeholder="Min 6 characters"
                value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="bg-white/[0.03] border-white/[0.06] text-white/70" />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] text-white/50">Assigned Plan</Label>
              <Select value={newUser.plan} onValueChange={(v) => setNewUser({ ...newUser, plan: v })}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white/70">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A2E] border-white/[0.08]">
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="bg-white/[0.03] border-white/[0.06] text-white/50"
              onClick={() => setShowCreateUser(false)}>Cancel</Button>
            <Button className="bg-[#03DAC6] text-black font-semibold hover:bg-[#03DAC6]/90"
              onClick={handleCreateUser} disabled={creatingUser}>
              {creatingUser ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="bg-[#0D0D0D] border-white/[0.08] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white/90">Edit User</DialogTitle>
            <DialogDescription className="text-white/40">
              {editUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[11px] text-white/50">Plan</Label>
              <Select value={editPlan} onValueChange={(v) => {
                setEditPlan(v);
                // Auto-update limits based on plan defaults
                const defaults = { basic: { cats: 10, savings: 3 }, pro: { cats: 50, savings: 20 } };
                const d = defaults[v as keyof typeof defaults] || defaults.basic;
                setEditMaxCats(String(d.cats));
                setEditMaxSavings(String(d.savings));
              }}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white/70">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A2E] border-white/[0.08]">
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[11px] text-white/50">Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A2E] border-white/[0.08]">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] text-white/50">Role</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A2E] border-white/[0.08]">
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[11px] text-white/50">Max Kategori</Label>
                <Input type="number" value={editMaxCats} onChange={(e) => setEditMaxCats(e.target.value)}
                  className="bg-white/[0.03] border-white/[0.06] text-white/70" />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] text-white/50">Max Target Tabungan</Label>
                <Input type="number" value={editMaxSavings} onChange={(e) => setEditMaxSavings(e.target.value)}
                  className="bg-white/[0.03] border-white/[0.06] text-white/70" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] text-white/50">Subscription End (leave empty for no expiry)</Label>
              <Input type="date" value={editSubEnd} onChange={(e) => setEditSubEnd(e.target.value)}
                className="bg-white/[0.03] border-white/[0.06] text-white/70" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="bg-white/[0.03] border-white/[0.06] text-white/50"
              onClick={() => setEditUser(null)}>Cancel</Button>
            <Button className="bg-[#03DAC6] text-black font-semibold hover:bg-[#03DAC6]/90"
              onClick={handleUpdateUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPwUser} onOpenChange={() => setResetPwUser(null)}>
        <DialogContent className="bg-[#0D0D0D] border-white/[0.08] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white/90">Reset Password</DialogTitle>
            <DialogDescription className="text-white/40">
              Set a new password for {resetPwUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-[11px] text-white/50">New Password</Label>
              <Input type="password" placeholder="Enter new password (min 6 chars)"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="bg-white/[0.03] border-white/[0.06] text-white/70" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="bg-white/[0.03] border-white/[0.06] text-white/50"
              onClick={() => setResetPwUser(null)}>Cancel</Button>
            <Button className="bg-[#FFD700] text-black font-semibold hover:bg-[#FFD700]/90"
              onClick={handleResetPassword}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Profile Modal */}
      <Dialog open={!!detailUser} onOpenChange={(open) => { if (!open) { setDetailUser(null); setDetailStats(null); } }}>
        <DialogContent className="bg-[#0D0D0D] border-white/[0.08] max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-white/90 flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#03DAC6]" />
              User Analytics
            </DialogTitle>
            <DialogDescription className="text-white/40">{detailUser?.email}</DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-4">
              <div className="h-20 rounded-xl bg-white/[0.02] animate-pulse" />
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-20 rounded-xl bg-white/[0.02] animate-pulse" />)}
              </div>
            </div>
          ) : detailUser && (
            <div className="space-y-5">
              {/* User Info Header */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                {(() => {
                  const ac = getAvatarColor(detailUser.id);
                  return (
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                      style={{ background: ac.bg, border: `2px solid ${ac.border}`, color: ac.text }}>
                      {detailUser.username.slice(0, 2).toUpperCase()}
                    </div>
                  );
                })()}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-base font-bold text-white/90">{detailUser.username}</p>
                    <Badge variant="outline" className={cn(
                      'text-[9px] font-bold uppercase px-2 py-0.5',
                      detailUser.plan === 'pro' ? 'border-[#FFD700]/20 text-[#FFD700] bg-[#FFD700]/5' : 'border-white/10 text-white/40 bg-white/[0.02]',
                    )}>
                      {detailUser.plan === 'pro' ? <><Crown className="h-2 w-2 mr-0.5 inline" />PRO</> : <><Sparkles className="h-2 w-2 mr-0.5 inline" />BASIC</>}
                    </Badge>
                    <Badge variant="outline" className={cn(
                      'text-[9px] font-bold uppercase px-2 py-0.5',
                      detailUser.status === 'active' ? 'border-[#03DAC6]/20 text-[#03DAC6] bg-[#03DAC6]/5' : 'border-[#CF6679]/20 text-[#CF6679] bg-[#CF6679]/5',
                    )}>
                      {detailUser.status}
                    </Badge>
                  </div>
                  <p className="text-[12px] text-white/30 truncate">{detailUser.email}</p>
                  <p className="text-[10px] text-white/20 mt-0.5">Joined {formatDate(detailUser.createdAt)}</p>
                </div>
              </div>

              {/* Account Statistics */}
              <div>
                <h4 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <BarChart3 className="h-3 w-3" /> Account Statistics
                </h4>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CreditCard className="h-3.5 w-3.5 text-[#03DAC6]" />
                      <span className="text-[10px] text-white/25 uppercase">Transactions</span>
                    </div>
                    <p className="text-lg font-bold text-white/80 tabular-nums">
                      {detailStats?.stats.totalTransactions ?? detailUser._count.transactions}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Target className="h-3.5 w-3.5 text-[#BB86FC]" />
                      <span className="text-[10px] text-white/25 uppercase">Categories</span>
                    </div>
                    <p className="text-lg font-bold text-white/80 tabular-nums">
                      {detailStats?.stats.totalCategories ?? detailUser._count.categories}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Wallet className="h-3.5 w-3.5 text-[#FFD700]" />
                      <span className="text-[10px] text-white/25 uppercase">Savings</span>
                    </div>
                    <p className="text-lg font-bold text-white/80 tabular-nums">
                      {detailStats?.stats.totalSavingsTargets ?? detailUser._count.savingsTargets}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-1.5 mb-1">
                      {detailStats && detailStats.stats.balance >= 0
                        ? <TrendingUp className="h-3.5 w-3.5 text-[#03DAC6]" />
                        : <TrendingDown className="h-3.5 w-3.5 text-[#CF6679]" />
                      }
                      <span className="text-[10px] text-white/25 uppercase">Balance</span>
                    </div>
                    <p className={cn('text-lg font-bold tabular-nums', detailStats && detailStats.stats.balance >= 0 ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                      {detailStats ? `${detailStats.stats.balance >= 0 ? '+' : ''}${detailStats.stats.balance.toLocaleString()}` : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Plan & Subscription */}
              <div>
                <h4 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Crown className="h-3 w-3" /> Plan & Subscription
                </h4>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-white/50">Current Plan</span>
                    <span className="text-[12px] font-bold" style={{ color: detailUser.plan === 'pro' ? '#FFD700' : 'rgba(255,255,255,0.6)' }}>
                      {detailUser.plan.toUpperCase()}
                    </span>
                  </div>
                  {/* Category usage progress bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-white/35">Category Usage</span>
                      <span className="text-[11px] text-white/50 font-medium tabular-nums">
                        {detailUser._count.categories}/{detailUser.maxCategories}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min((detailUser._count.categories / detailUser.maxCategories) * 100, 100)}%`,
                          background: 'linear-gradient(90deg, #03DAC6, #03DAC680)',
                        }} />
                    </div>
                  </div>
                  {/* Savings usage progress bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-white/35">Savings Usage</span>
                      <span className="text-[11px] text-white/50 font-medium tabular-nums">
                        {detailUser._count.savingsTargets}/{detailUser.maxSavings}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min((detailUser._count.savingsTargets / detailUser.maxSavings) * 100, 100)}%`,
                          background: 'linear-gradient(90deg, #BB86FC, #BB86FC80)',
                        }} />
                    </div>
                  </div>
                  {/* Subscription status */}
                  {detailStats?.subscription.end && (
                    <div className={cn(
                      'flex items-center gap-3 p-3 rounded-lg',
                      detailStats.subscription.status === 'active' ? 'bg-[#03DAC6]/5 border border-[#03DAC6]/10' :
                      detailStats.subscription.status === 'expiring' ? 'bg-[#FFD700]/5 border border-[#FFD700]/10' :
                      'bg-[#CF6679]/5 border border-[#CF6679]/10',
                    )}>
                      <Clock className={cn('h-4 w-4 shrink-0',
                        detailStats.subscription.status === 'active' ? 'text-[#03DAC6]' :
                        detailStats.subscription.status === 'expiring' ? 'text-[#FFD700]' : 'text-[#CF6679]',
                      )} />
                      <div>
                        <p className={cn('text-[11px] font-semibold capitalize',
                          detailStats.subscription.status === 'active' ? 'text-[#03DAC6]' :
                          detailStats.subscription.status === 'expiring' ? 'text-[#FFD700]' : 'text-[#CF6679]',
                        )}>
                          {detailStats.subscription.status === 'active' ? 'Active' :
                           detailStats.subscription.status === 'expiring' ? `Expiring in ${detailStats.subscription.daysLeft}d` :
                           'Expired'}
                        </p>
                        <p className="text-[10px] text-white/25">{formatDate(detailStats.subscription.end)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h4 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Activity className="h-3 w-3" /> Recent Activity
                </h4>
                {detailStats && detailStats.recentActivity.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                    {detailStats.recentActivity.map((log) => (
                      <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.015] hover:bg-white/[0.03] transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-[#03DAC6]/10 flex items-center justify-center shrink-0">
                          <Activity className="h-3 w-3 text-[#03DAC6]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-white/60 capitalize">{log.action.replace(/_/g, ' ')}</p>
                          <p className="text-[10px] text-white/25 truncate">{log.details || '—'}</p>
                        </div>
                        <span className="text-[9px] text-white/15 shrink-0">
                          {new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-white/15 text-[11px]">No recent activity recorded</div>
                )}
              </div>

              {/* Quick Actions */}
              <div>
                <h4 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <UserCog className="h-3 w-3" /> Quick Actions
                </h4>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"
                    className="flex-1 h-9 gap-1.5 bg-white/[0.02] border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.04] text-[11px]"
                    onClick={() => {
                      setDetailUser(null);
                      setDetailStats(null);
                      setResetPwUser(detailUser);
                      setNewPassword('');
                    }}>
                    <Key className="h-3 w-3" /> Reset Password
                  </Button>
                  <Button variant="outline" size="sm"
                    className="flex-1 h-9 gap-1.5 bg-white/[0.02] border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.04] text-[11px]"
                    onClick={() => {
                      const u = detailUser;
                      setDetailUser(null);
                      setDetailStats(null);
                      openEditDialog(u!);
                    }}>
                    <ArrowUpRight className="h-3 w-3" /> Change Plan
                  </Button>
                  <Button variant="outline" size="sm"
                    className={cn(
                      'flex-1 h-9 gap-1.5 border text-[11px]',
                      detailUser.status === 'active'
                        ? 'bg-[#CF6679]/5 border-[#CF6679]/15 text-[#CF6679]/70 hover:bg-[#CF6679]/10 hover:text-[#CF6679]'
                        : 'bg-[#03DAC6]/5 border-[#03DAC6]/15 text-[#03DAC6]/70 hover:bg-[#03DAC6]/10 hover:text-[#03DAC6]',
                    )}
                    onClick={async () => {
                      if (!detailUser) return;
                      try {
                        const newStatus = detailUser.status === 'active' ? 'suspended' : 'active';
                        const res = await fetch('/api/admin/users', {
                          method: 'PUT', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ userId: detailUser.id, status: newStatus })
                        });
                        if (res.ok) {
                          toast.success(`User ${newStatus === 'active' ? 'activated' : 'suspended'}`);
                          setDetailUser(null);
                          setDetailStats(null);
                          fetchUsers(pagination.page);
                        }
                      } catch { toast.error('Action failed'); }
                    }}>
                    {detailUser.status === 'active' ? <><Ban className="h-3 w-3" /> Suspend</> : <><UserCheck className="h-3 w-3" /> Activate</>}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent className="bg-[#0D0D0D] border-white/[0.08]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white/90">Delete User</AlertDialogTitle>
            <AlertDialogDescription className="text-white/40">
              Are you sure you want to delete <span className="text-white/70 font-medium">{deleteUser?.username}</span>?
              This action will permanently remove the user and all their data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-white/[0.03] border-white/[0.06] text-white/50">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-[#CF6679] text-white hover:bg-[#CF6679]/90" onClick={handleDeleteUser}>
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
