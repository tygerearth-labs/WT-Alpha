'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Search, MoreVertical, Edit, Trash2, Key, Shield,
  Crown, Sparkles, UserCheck, UserX, Users,
  Filter, RefreshCw, Eye, EyeOff, Settings, FileDown, UserPlus, CheckSquare,
  Square, X, UserCircle, Activity, CreditCard, Target, TrendingUp, Check,
  TrendingDown, ArrowUpRight, Clock, Wallet, Ban, UserCog, BarChart3, Gem, Loader2,
  ChevronDown, Image as ImageIcon, ChevronUp,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

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

function getPlanColor(plan: string) {
  if (plan === 'ultimate') return { border: '#03DAC6', text: '#03DAC6', bg: 'rgba(3,218,198,0.05)' };
  if (plan === 'pro') return { border: '#FFD700', text: '#FFD700', bg: 'rgba(255,215,0,0.05)' };
  return { border: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.02)' };
}

function getStatusColor(status: string) {
  if (status === 'active') return { border: '#03DAC6', text: '#03DAC6', bg: 'rgba(3,218,198,0.05)' };
  return { border: '#CF6679', text: '#CF6679', bg: 'rgba(207,102,121,0.05)' };
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
  }),
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

export function AdminUsers({ showAccessControl }: AdminUsersProps) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
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
  const [newUser, setNewUser] = useState({ email: '', username: '', password: '', plan: 'basic', role: 'user' });
  const [newUserConfirmPassword, setNewUserConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const fetchUsers = useCallback(async (page = 1, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (filterPlan) params.set('plan', filterPlan);
      if (filterStatus) params.set('status', filterStatus);

      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (append) {
          setUsers(prev => [...prev, ...data.users]);
        } else {
          setUsers(data.users);
        }
        setPagination(data.pagination);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, filterPlan, filterStatus]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleLoadMore = () => {
    const nextPage = pagination.page + 1;
    if (nextPage <= pagination.totalPages) {
      fetchUsers(nextPage, true);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
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
      fetchUsers(1);
    } catch {
      toast.error('Bulk action failed');
    }
  };

  const getPasswordStrength = (pw: string): { level: number; label: string; color: string } => {
    if (!pw) return { level: 0, label: '', color: '' };
    if (pw.length < 8) return { level: 1, label: 'Weak', color: '#CF6679' };
    const hasNumber = /\d/.test(pw);
    const hasLetter = /[a-zA-Z]/.test(pw);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pw);
    const hasMixed = /[a-z]/.test(pw) && /[A-Z]/.test(pw);
    if (hasNumber && hasLetter && hasSpecial && hasMixed && pw.length >= 12) return { level: 3, label: 'Strong', color: '#03DAC6' };
    if ((hasNumber && hasLetter) || (hasMixed && pw.length >= 8)) return { level: 2, label: 'Medium', color: '#FFD700' };
    return { level: 1, label: 'Weak', color: '#CF6679' };
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.username || !newUser.password) {
      toast.error('All fields are required');
      return;
    }
    if (newUser.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newUser.password !== newUserConfirmPassword) {
      toast.error('Passwords do not match');
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
        setNewUser({ email: '', username: '', password: '', plan: 'basic', role: 'user' });
        setNewUserConfirmPassword('');
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
        fetchUsers(1);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update');
      }
    } catch { toast.error('Failed to update user'); }
  };

  const handleResetPassword = async () => {
    if (!resetPwUser || !newPassword) return;
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
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
        fetchUsers(1);
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

  const [checkExpiring, setCheckExpiring] = useState(false);

  const handleCheckExpiredSubscriptions = async () => {
    setCheckExpiring(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setPagination(data.pagination);
        toast.success('Subscription data refreshed successfully');
      } else {
        toast.error('Failed to refresh subscriptions');
      }
    } catch {
      toast.error('Failed to check subscriptions');
    } finally {
      setCheckExpiring(false);
    }
  };

  const handleSuspendFreeTrials = async () => {
    try {
      const res = await fetch('/api/admin/users?subscription=free_trial', { method: 'PATCH' });
      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.count || 0} free trial users suspended`);
        fetchUsers();
      } else {
        toast.error('Failed to suspend users', { description: 'Server returned an error.' });
      }
    } catch {
      toast.error('Failed to suspend users', { description: 'Network error.' });
    }
  };

  const [sortField, setSortField] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (!sortField) return 0;
    let cmp = 0;
    if (sortField === 'username') cmp = a.username.localeCompare(b.username);
    else if (sortField === 'plan') cmp = a.plan.localeCompare(b.plan);
    else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
    else if (sortField === 'transactions') cmp = a._count.transactions - b._count.transactions;
    else if (sortField === 'joined') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const renderDialogs = () => (
    <>
      {/* Create User Dialog */}
      <Dialog open={showCreateUser} onOpenChange={(open) => {
        if (!open) {
          setShowCreateUser(false);
          setNewUserConfirmPassword('');
          setShowNewPassword(false);
          setShowConfirmPassword(false);
        }
      }}>
        <DialogContent className="bg-[#141414] border-white/[0.08] rounded-2xl p-0 overflow-hidden max-w-md adm-dialog-content">
          <div className="p-5">
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
                className="bg-white/[0.03] border-white/[0.06] text-white/70 adm-form-input" />
              {!newUser.email && <p className="text-[10px] text-white/20">Required</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] text-white/50">Username</Label>
              <Input placeholder="username (min 3 characters)"
                value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                className="bg-white/[0.03] border-white/[0.06] text-white/70 adm-form-input" />
              {newUser.username && newUser.username.length < 3 && (
                <p className="text-[10px] text-[#FFD700]">At least 3 characters</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] text-white/50">Password</Label>
              <div className="relative">
                <Input type={showNewPassword ? 'text' : 'password'} placeholder="Min 8 characters"
                  value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="bg-white/[0.03] border-white/[0.06] text-white/70 pr-10 adm-form-input" />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors touch-target">
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {newUser.password && (
                <div className="space-y-1.5">
                  <div className="flex gap-1.5">
                    {[1, 2, 3].map((seg) => {
                      const strength = getPasswordStrength(newUser.password);
                      return (
                        <div key={seg} className="h-1 flex-1 rounded-full transition-all duration-300"
                          style={{ background: seg <= strength.level ? strength.color : 'rgba(255,255,255,0.06)' }} />
                      );
                    })}
                  </div>
                  <p className="text-[10px]" style={{ color: getPasswordStrength(newUser.password).color }}>
                    {getPasswordStrength(newUser.password).label}
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] text-white/50">Confirm Password</Label>
              <div className="relative">
                <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="Re-enter password"
                  value={newUserConfirmPassword} onChange={(e) => setNewUserConfirmPassword(e.target.value)}
                  className={cn(
                    'bg-white/[0.03] border-white/[0.06] text-white/70 pr-10 adm-form-input',
                    newUserConfirmPassword && newUser.password !== newUserConfirmPassword && 'border-[#CF6679]/50',
                  )} />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors touch-target">
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {newUserConfirmPassword && newUser.password !== newUserConfirmPassword && (
                <p className="text-[10px] text-[#CF6679] flex items-center gap-1"><X className="h-2.5 w-2.5" /> Passwords do not match</p>
              )}
              {newUserConfirmPassword && newUser.password === newUserConfirmPassword && (
                <p className="text-[10px] text-[#03DAC6] flex items-center gap-1"><Check className="h-2.5 w-2.5" /> Passwords match</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[11px] text-white/50">Assigned Plan</Label>
                <Select value={newUser.plan} onValueChange={(v) => setNewUser({ ...newUser, plan: v })}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white/70 adm-form-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/[0.03] border-white/[0.08]">
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="ultimate">Ultimate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] text-white/50">Role</Label>
                <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white/70 adm-form-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/[0.03] border-white/[0.08]">
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="bg-white/[0.03] border-white/[0.06] text-white/50"
              onClick={() => setShowCreateUser(false)}>Cancel</Button>
            <Button className="bg-[#03DAC6] text-black font-semibold hover:bg-[#03DAC6]/90 adm-action-btn adm-action-btn-primary"
              onClick={handleCreateUser} disabled={creatingUser}>
              {creatingUser ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</> : 'Create User'}
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="bg-[#141414] border-white/[0.08] rounded-2xl p-0 overflow-hidden max-w-md adm-dialog-content">
          <div className="p-5">
          <DialogHeader>
            <DialogTitle className="text-white/90 flex items-center gap-2">
              <Edit className="h-5 w-5 text-[#BB86FC]" />
              Edit User
            </DialogTitle>
            <DialogDescription className="text-white/40">
              {editUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[11px] text-white/50">Plan</Label>
              <Select value={editPlan} onValueChange={(v) => {
                setEditPlan(v);
                const defaults = { basic: { cats: 10, savings: 3 }, pro: { cats: 50, savings: 20 }, ultimate: { cats: 100, savings: 50 } };
                const d = defaults[v as keyof typeof defaults] || defaults.basic;
                setEditMaxCats(String(d.cats));
                setEditMaxSavings(String(d.savings));
              }}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white/70 adm-form-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white/[0.03] border-white/[0.08]">
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="ultimate">Ultimate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[11px] text-white/50">Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white/70 adm-form-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/[0.03] border-white/[0.08]">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] text-white/50">Role</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white/70 adm-form-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/[0.03] border-white/[0.08]">
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[11px] text-white/50">Max Categories</Label>
                <Input type="number" value={editMaxCats} onChange={(e) => setEditMaxCats(e.target.value)}
                  className="bg-white/[0.03] border-white/[0.06] text-white/70 adm-form-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] text-white/50">Max Savings</Label>
                <Input type="number" value={editMaxSavings} onChange={(e) => setEditMaxSavings(e.target.value)}
                  className="bg-white/[0.03] border-white/[0.06] text-white/70 adm-form-input" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] text-white/50">Subscription End (leave empty for no expiry)</Label>
              <Input type="date" value={editSubEnd} onChange={(e) => setEditSubEnd(e.target.value)}
                className="bg-white/[0.03] border-white/[0.06] text-white/70 adm-form-input" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="bg-white/[0.03] border-white/[0.06] text-white/50"
              onClick={() => setEditUser(null)}>Cancel</Button>
            <Button className="bg-[#03DAC6] text-black font-semibold hover:bg-[#03DAC6]/90 adm-action-btn adm-action-btn-primary"
              onClick={handleUpdateUser}>Save Changes</Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPwUser} onOpenChange={() => setResetPwUser(null)}>
        <DialogContent className="bg-[#141414] border-white/[0.08] rounded-2xl p-0 overflow-hidden max-w-md adm-dialog-content">
          <div className="p-5">
          <DialogHeader>
            <DialogTitle className="text-white/90 flex items-center gap-2">
              <Key className="h-5 w-5 text-[#FFD700]" />
              Reset Password
            </DialogTitle>
            <DialogDescription className="text-white/40">
              Set a new password for {resetPwUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-[11px] text-white/50">New Password</Label>
              <Input type="password" placeholder="Enter new password (min 8 chars)"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="bg-white/[0.03] border-white/[0.06] text-white/70 adm-form-input" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="bg-white/[0.03] border-white/[0.06] text-white/50"
              onClick={() => setResetPwUser(null)}>Cancel</Button>
            <Button className="bg-[#FFD700] text-black font-semibold hover:bg-[#FFD700]/90 adm-action-btn"
              onClick={handleResetPassword}>Reset Password</Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Detail Profile Modal */}
      <Dialog open={!!detailUser} onOpenChange={(open) => { if (!open) { setDetailUser(null); setDetailStats(null); } }}>
        <DialogContent className="bg-[#141414] border-white/[0.08] rounded-2xl p-0 overflow-hidden max-w-lg max-h-[90vh] adm-dialog-content">
          <div className="overflow-y-auto max-h-[90vh] custom-scrollbar p-5">
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
              {/* User Info Header - Glass Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]"
              >
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
                      detailUser.plan === 'ultimate' ? 'border-[#03DAC6]/20 text-[#03DAC6] bg-[#03DAC6]/5' : detailUser.plan === 'pro' ? 'border-[#FFD700]/20 text-[#FFD700] bg-[#FFD700]/5' : 'border-white/10 text-white/40 bg-white/[0.02]',
                    )}>
                      {detailUser.plan === 'ultimate' ? <><Gem className="h-2 w-2 mr-0.5 inline" />ULTIMATE</> : detailUser.plan === 'pro' ? <><Crown className="h-2 w-2 mr-0.5 inline" />PRO</> : <><Sparkles className="h-2 w-2 mr-0.5 inline" />BASIC</>}
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
              </motion.div>

              {/* Account Statistics */}
              <div>
                <h4 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <BarChart3 className="h-3 w-3" /> Account Statistics
                </h4>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="adm-stat-card p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CreditCard className="h-3.5 w-3.5 text-[#03DAC6]" />
                      <span className="text-[10px] text-white/25 uppercase">Transactions</span>
                    </div>
                    <p className="text-lg font-bold text-white/80 tabular-nums">
                      {detailStats?.stats.totalTransactions ?? detailUser._count.transactions}
                    </p>
                  </div>
                  <div className="adm-stat-card p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Target className="h-3.5 w-3.5 text-[#BB86FC]" />
                      <span className="text-[10px] text-white/25 uppercase">Categories</span>
                    </div>
                    <p className="text-lg font-bold text-white/80 tabular-nums">
                      {detailStats?.stats.totalCategories ?? detailUser._count.categories}
                    </p>
                  </div>
                  <div className="adm-stat-card p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Wallet className="h-3.5 w-3.5 text-[#FFD700]" />
                      <span className="text-[10px] text-white/25 uppercase">Savings</span>
                    </div>
                    <p className="text-lg font-bold text-white/80 tabular-nums">
                      {detailStats?.stats.totalSavingsTargets ?? detailUser._count.savingsTargets}
                    </p>
                  </div>
                  <div className="adm-stat-card p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
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
                    <span className="text-[12px] font-bold" style={{ color: detailUser.plan === 'ultimate' ? '#03DAC6' : detailUser.plan === 'pro' ? '#FFD700' : 'rgba(255,255,255,0.6)' }}>
                      {detailUser.plan.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-white/35">Category Usage</span>
                      <span className="text-[11px] text-white/50 font-medium tabular-nums">
                        {detailUser._count.categories}/{detailUser.maxCategories}
                      </span>
                    </div>
                    <div className="adm-progress-track">
                      <div className="h-full rounded-full transition-all duration-500 adm-progress-fill"
                        style={{
                          width: `${Math.min((detailUser._count.categories / detailUser.maxCategories) * 100, 100)}%`,
                          background: 'linear-gradient(90deg, #03DAC6, #03DAC680)',
                        }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-white/35">Savings Usage</span>
                      <span className="text-[11px] text-white/50 font-medium tabular-nums">
                        {detailUser._count.savingsTargets}/{detailUser.maxSavings}
                      </span>
                    </div>
                    <div className="adm-progress-track">
                      <div className="h-full rounded-full transition-all duration-500 adm-progress-fill"
                        style={{
                          width: `${Math.min((detailUser._count.savingsTargets / detailUser.maxSavings) * 100, 100)}%`,
                          background: 'linear-gradient(90deg, #BB86FC, #BB86FC80)',
                        }} />
                    </div>
                  </div>
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
                    className="flex-1 h-11 gap-1.5 bg-white/[0.02] border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.04] text-[11px] adm-quick-action"
                    onClick={() => {
                      setDetailUser(null);
                      setDetailStats(null);
                      setResetPwUser(detailUser);
                      setNewPassword('');
                    }}>
                    <Key className="h-3 w-3" /> Reset Password
                  </Button>
                  <Button variant="outline" size="sm"
                    className="flex-1 h-11 gap-1.5 bg-white/[0.02] border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.04] text-[11px] adm-quick-action"
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
                      'flex-1 h-11 gap-1.5 border text-[11px] adm-quick-action',
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
                          fetchUsers(1);
                        }
                      } catch { toast.error('Action failed'); }
                    }}>
                    {detailUser.status === 'active' ? <><Ban className="h-3 w-3" /> Suspend</> : <><UserCheck className="h-3 w-3" /> Activate</>}
                  </Button>
                </div>
              </div>
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent className="bg-[#141414] border-white/[0.08] rounded-2xl p-0 overflow-hidden">
          <div className="p-5">
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
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  // Access Control view mode
  if (showAccessControl) {
    const adminUsers = users.filter(u => u.role === 'admin');
    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h2 className="text-xl font-bold text-white/90 adm-section-header">Access Control & Limits</h2>
          <p className="text-sm text-white/40 mt-1">Manage admin access rights, feature limits, and permissions</p>
        </motion.div>

        {/* Admin Users Section */}
        <Card className="bg-[#0D0D0D] border-white/[0.06] adm-content-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white/70 flex items-center gap-2 adm-section-header">
              <Shield className="h-4 w-4 text-[#03DAC6] adm-section-header-icon" />
              Admin Users
              <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 border-[#03DAC6]/20 text-[#03DAC6] bg-[#03DAC6]/5 adm-badge adm-badge-admin">
                {adminUsers.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2].map(i => <div key={i} className="h-16 rounded-xl bg-white/[0.02] animate-pulse" />)}
              </div>
            ) : adminUsers.length === 0 ? (
              <div className="text-center py-8 text-white/25 text-sm">No admin users found</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto adm-scroll-mobile">
                {adminUsers.slice(0, 20).map((admin, idx) => {
                  const ac = getAvatarColor(admin.id);
                  return (
                    <motion.div
                      key={admin.id}
                      custom={idx}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all adm-list-item"
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: ac.bg, border: `1px solid ${ac.border}`, color: ac.text }}>
                        {admin.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[12px] font-medium text-white/70 truncate">{admin.username}</p>
                          <Badge variant="outline" className="text-[8px] font-bold px-1.5 py-0 border-[#03DAC6]/20 text-[#03DAC6] bg-[#03DAC6]/5 adm-badge">
                            ADMIN
                          </Badge>
                        </div>
                        <p className="text-[10px] text-white/25 truncate">{admin.email}</p>
                      </div>
                      <Badge variant="outline" className={cn(
                        'text-[8px] font-bold px-1.5 py-0 adm-badge',
                        admin.status === 'active' ? 'border-[#03DAC6]/20 text-[#03DAC6] bg-[#03DAC6]/5 adm-badge-active' : 'border-[#CF6679]/20 text-[#CF6679] bg-[#CF6679]/5 adm-badge-suspended',
                      )}>
                        {admin.status}
                      </Badge>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plan Comparison */}
          <Card className="bg-[#0D0D0D] border-white/[0.06] adm-content-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white/70 flex items-center gap-2 adm-section-header">
                <Settings className="h-4 w-4 text-[#03DAC6] adm-section-header-icon" />
                Plan Feature Limits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0 overflow-x-auto">
                <div className="grid grid-cols-4 gap-2 text-center mb-2 min-w-[400px]">
                  <div />
                  <div className="flex flex-col items-center gap-0.5 py-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-white/40" />
                    <span className="text-[10px] font-bold text-white/50 tracking-wider">BASIC</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 py-1.5">
                    <Crown className="h-3.5 w-3.5 text-[#FFD700]" />
                    <span className="text-[10px] font-bold text-[#FFD700] tracking-wider">PRO</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 py-1.5">
                    <Gem className="h-3.5 w-3.5 text-[#03DAC6]" />
                    <span className="text-[10px] font-bold text-[#03DAC6] tracking-wider">ULTIMATE</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 items-center py-1.5 border-t border-white/[0.06] min-w-[400px]">
                  <span className="text-[10px] font-semibold text-[#BB86FC]/60 uppercase tracking-wider text-left">Resources</span>
                  <span className="text-[10px] text-white/20" />
                  <span className="text-[10px] text-white/20" />
                  <span className="text-[10px] text-white/20" />
                </div>
                {([
                  { feature: 'Max Categories', basic: '10', pro: '50', ultimate: '100' },
                  { feature: 'Max Savings', basic: '3', pro: '20', ultimate: '50' },
                ] as const).map((row) => (
                  <div key={row.feature} className="grid grid-cols-4 gap-2 text-center items-center py-2 border-t border-white/[0.03] min-w-[400px]">
                    <span className="text-[11px] text-white/50 text-left">{row.feature}</span>
                    <span className="text-[11px] font-medium text-white/35 bg-white/[0.02] rounded-md py-0.5 px-1.5 inline-block">{row.basic}</span>
                    <span className="text-[11px] font-medium text-[#FFD700]/50 bg-[#FFD700]/[0.04] rounded-md py-0.5 px-1.5 inline-block">{row.pro}</span>
                    <span className="text-[11px] font-medium text-[#03DAC6]/50 bg-[#03DAC6]/[0.04] rounded-md py-0.5 px-1.5 inline-block">{row.ultimate}</span>
                  </div>
                ))}
                <div className="grid grid-cols-4 gap-2 items-center py-1.5 border-t border-white/[0.06] mt-1 min-w-[400px]">
                  <span className="text-[10px] font-semibold text-[#03DAC6]/60 uppercase tracking-wider text-left">Core Features</span>
                  <span className="text-[10px] text-white/20" /><span className="text-[10px] text-white/20" /><span className="text-[10px] text-white/20" />
                </div>
                {([
                  { feature: 'AI Consultant', basic: false, pro: true, ultimate: true },
                  { feature: 'Export Reports', basic: true, pro: true, ultimate: true },
                  { feature: 'Priority Support', basic: false, pro: true, ultimate: true },
                  { feature: 'Custom Currency', basic: false, pro: true, ultimate: true },
                  { feature: 'Data Backup', basic: false, pro: true, ultimate: true },
                  { feature: 'Business Module', basic: false, pro: false, ultimate: true },
                ] as const).map((row) => (
                  <div key={row.feature} className="grid grid-cols-4 gap-2 text-center items-center py-2 border-t border-white/[0.03] min-w-[400px]">
                    <span className="text-[11px] text-white/50 text-left">{row.feature}</span>
                    {([row.basic, row.pro, row.ultimate] as const).map((val, i) => {
                      const colors = ['text-white/35', 'text-[#FFD700]/60', 'text-[#03DAC6]/60'];
                      return val ? <span key={i} className="flex justify-center"><Check className={cn('h-3.5 w-3.5', colors[i])} /></span>
                        : <span key={i} className="flex justify-center"><X className="h-3 w-3 text-white/10" /></span>;
                    })}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-[#0D0D0D] border-white/[0.06] adm-content-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white/70 flex items-center gap-2 adm-section-header">
                <Shield className="h-4 w-4 text-[#BB86FC] adm-section-header-icon" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[12px] text-white/30 mb-4">
                Use the Users page to individually manage each user&apos;s access rights, limits, and permissions.
              </p>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-3 bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] text-white/60 h-11 adm-quick-action"
                  onClick={handleCheckExpiredSubscriptions} disabled={checkExpiring}>
                  <RefreshCw className={cn('h-4 w-4', checkExpiring && 'animate-spin')} />
                  <span className="text-sm">{checkExpiring ? 'Checking...' : 'Check Expired Subscriptions'}</span>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] text-white/60 h-11 adm-quick-action"
                  onClick={handleSuspendFreeTrials}>
                  <UserX className="h-4 w-4" />
                  <span className="text-sm">Suspend All Free Trial Users</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Limits Table */}
        <Card className="bg-[#0D0D0D] border-white/[0.06] adm-content-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white/70 flex items-center gap-2 adm-section-header">
              <Users className="h-4 w-4 text-[#03DAC6] adm-section-header-icon" />
              Current User Limits
              <Badge variant="outline" className="text-[9px] font-semibold px-1.5 py-0 bg-white/[0.02] border-white/[0.06] text-white/30 adm-badge">
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
                    <tr className="border-b border-white/[0.06] adm-table-header">
                      <th className="text-left py-3 px-3 text-[10px] font-semibold text-white/25 uppercase tracking-wider">User</th>
                      <th className="text-center py-3 px-3 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Plan</th>
                      <th className="text-center py-3 px-3 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Categories</th>
                      <th className="text-center py-3 px-3 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Savings</th>
                      <th className="text-center py-3 px-3 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Status</th>
                      <th className="text-right py-3 px-3 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.slice(0, 20).map((u, idx) => {
                      const avatarColor = getAvatarColor(u.id);
                      return (
                        <motion.tr key={u.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03, type: 'spring', stiffness: 400, damping: 25 }}
                          whileHover={{ x: 2 }}
                          className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors adm-table-row"
                        >
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
                            <Badge variant="outline" className={cn('text-[9px] font-bold uppercase px-2 py-0.5 adm-badge', ...getPlanBadgeClasses(u.plan))}>
                              {u.plan === 'ultimate' ? <><Gem className="h-2 w-2 mr-0.5 inline" />ULT</> : u.plan === 'pro' ? <><Crown className="h-2 w-2 mr-0.5 inline" />PRO</> : 'BASIC'}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className="text-[12px] text-white/50">{u._count.categories}/{u.maxCategories}</span>
                              <div className="w-12 h-1 rounded-full bg-white/[0.06] mt-1 overflow-hidden">
                                <div className="h-full rounded-full bg-[#03DAC6]/50 transition-all" style={{ width: `${Math.min((u._count.categories / u.maxCategories) * 100, 100)}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className="text-[12px] text-white/50">{u._count.savingsTargets}/{u.maxSavings}</span>
                              <div className="w-12 h-1 rounded-full bg-white/[0.06] mt-1 overflow-hidden">
                                <div className="h-full rounded-full bg-[#BB86FC]/50 transition-all" style={{ width: `${Math.min((u._count.savingsTargets / u.maxSavings) * 100, 100)}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge variant="outline" className={cn('text-[9px] font-bold uppercase px-2 py-0.5 adm-badge', ...getStatusBadgeClasses(u.status))}>
                              {u.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Button size="sm" variant="ghost" className="h-8 text-[11px] text-[#03DAC6] hover:text-[#03DAC6] hover:bg-[#03DAC6]/10 adm-quick-action"
                              onClick={() => openEditDialog(u)}>
                              <Edit className="h-3 w-3 mr-1" /> Edit
                            </Button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
          {pagination.totalPages > 1 && pagination.page < pagination.totalPages && (
            <div className="flex justify-center py-4 border-t border-white/[0.04]">
              <Button variant="outline" className="adm-action-btn adm-action-btn-primary mx-auto" onClick={() => fetchUsers(pagination.page + 1)} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Load More
              </Button>
            </div>
          )}
        </Card>
        {renderDialogs()}
      </div>
    );
  }

  // ========== USERS MODE (default) ==========
  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white/90 adm-section-header">{t('admin.users.title')}</h2>
          <p className="text-sm text-white/40 mt-1">{pagination.total} total users</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-1.5 bg-white/[0.02] border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.04] adm-quick-action"
            onClick={() => fetchUsers(1)}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 bg-white/[0.02] border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.04] adm-quick-action"
            onClick={exportCSV} disabled={users.length === 0}>
            <FileDown className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" className="h-9 gap-1.5 bg-[#03DAC6] text-black font-semibold hover:bg-[#03DAC6]/90 text-[12px] adm-action-btn adm-action-btn-primary"
            onClick={() => setShowCreateUser(true)}>
            <UserPlus className="h-3.5 w-3.5" /> Create User
          </Button>
        </div>
      </motion.div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-[#03DAC6]/5 border border-[#03DAC6]/15">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-[#03DAC6]" />
                <span className="text-[12px] font-semibold text-[#03DAC6]">{selectedIds.size} selected</span>
              </div>
              <div className="h-4 w-px bg-[#03DAC6]/20" />
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger className="h-8 w-[140px] text-[11px] rounded-lg bg-[#03DAC6]/10 border-[#03DAC6]/20 text-[#03DAC6]">
                  <SelectValue placeholder="Bulk action..." />
                </SelectTrigger>
                <SelectContent className="bg-white/[0.03] border-white/[0.08]">
                  <SelectItem value="suspend">Suspend Users</SelectItem>
                  <SelectItem value="activate">Activate Users</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8 text-[11px] bg-[#03DAC6] text-black font-semibold hover:bg-[#03DAC6]/90 adm-action-btn adm-action-btn-primary"
                onClick={handleBulkAction} disabled={!bulkAction}>
                Apply
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/40 hover:text-white ml-auto touch-target"
                onClick={() => setSelectedIds(new Set())}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filter Chips */}
      <Card className="bg-[#0D0D0D] border-white/[0.06] adm-content-card">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
              <Input
                placeholder="Search by email, username, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-11 rounded-xl bg-white/[0.03] border-white/[0.06] text-white/80 text-sm placeholder:text-white/20 adm-search-input"
                onKeyDown={(e) => e.key === 'Enter' && fetchUsers(1)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {/* Plan Chips */}
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
                  onClick={() => { setFilterPlan(chip.value); fetchUsers(1); }}>
                  {chip.value === 'ultimate' && <Gem className="h-3 w-3 mr-0.5" />}
                  {chip.value === 'pro' && <Crown className="h-3 w-3 mr-0.5" />}
                  {chip.value === 'basic' && <Sparkles className="h-3 w-3 mr-0.5" />}
                  {chip.label}
                </Button>
              ))}
              <div className="w-px bg-white/[0.06] mx-1" />
              {/* Status Chips */}
              {[{ label: 'All', value: '' }, { label: 'Active', value: 'active' }, { label: 'Suspended', value: 'suspended' }].map(chip => (
                <Button key={chip.value} variant="outline" size="sm"
                  className={cn(
                    'text-[11px] rounded-lg h-8 adm-filter-chip',
                    filterStatus === chip.value
                      ? chip.value === 'active'
                        ? 'bg-[#03DAC6]/10 border-[#03DAC6]/20 text-[#03DAC6] adm-filter-chip-active'
                        : chip.value === 'suspended'
                          ? 'bg-[#CF6679]/10 border-[#CF6679]/20 text-[#CF6679] adm-filter-chip-active'
                          : 'bg-white/[0.08] border-white/[0.15] text-white/70 adm-filter-chip-active'
                      : 'bg-white/[0.02] border-white/[0.06] text-white/40',
                  )}
                  onClick={() => { setFilterStatus(chip.value); fetchUsers(1); }}>
                  {chip.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List - Cards on mobile, Table on desktop */}
      <Card className="bg-[#0D0D0D] border-white/[0.06] adm-content-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="relative h-20 rounded-xl overflow-hidden">
                  <div className="absolute inset-0 bg-white/[0.02]" />
                  <div className="absolute inset-0 animate-shimmer"
                    style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)', backgroundSize: '200% 100%' }} />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 relative overflow-hidden adm-empty-state">
              <div className="absolute inset-0 animate-empty-gradient" />
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mx-auto mb-4 adm-empty-state-icon"
                  style={{ animation: 'emptyPulse 4s ease-in-out infinite' }}>
                  <UserCircle className="h-10 w-10 text-white/[0.07]" />
                </div>
                <p className="text-white/30 text-sm font-medium">No users found</p>
                <p className="text-white/15 text-[11px] mt-1.5">Try adjusting your search or filters</p>
                <Button variant="outline" size="sm" className="mt-4 h-9 gap-1.5 bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white/70 adm-quick-action"
                  onClick={() => { setSearch(''); setFilterPlan(''); setFilterStatus(''); fetchUsers(1); }}>
                  <RefreshCw className="h-3 w-3" /> Clear Filters
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="md:hidden divide-y divide-white/[0.04]">
                {sortedUsers.map((u, rowIdx) => {
                  const avatarColor = getAvatarColor(u.id);
                  const isSelected = selectedIds.has(u.id);
                  const planC = getPlanColor(u.plan);
                  const statusC = getStatusColor(u.status);
                  return (
                    <motion.div
                      key={u.id}
                      custom={rowIdx % 20}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      className={cn(
                        'p-4 transition-all duration-200 adm-list-item',
                        isSelected && 'bg-[#03DAC6]/[0.03]',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleSelect(u.id)}
                          className="shrink-0 mt-1 touch-target transition-all duration-200"
                          aria-label="Select user"
                        >
                          {isSelected
                            ? <CheckSquare className="h-5 w-5 text-[#03DAC6]" />
                            : <Square className="h-5 w-5 text-white/20" />
                          }
                        </button>
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: avatarColor.bg, border: `1px solid ${avatarColor.border}`, color: avatarColor.text }}>
                            {u.username.slice(0, 2).toUpperCase()}
                          </div>
                          {u.status === 'active' && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#03DAC6] opacity-50" />
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#03DAC6] ring-2 ring-[#0D0D0D]" />
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-[13px] font-semibold text-white/85 truncate">{u.username}</p>
                            <Badge variant="outline" className="text-[8px] font-bold uppercase px-1.5 py-0 adm-badge"
                              style={{ borderColor: `${planC.border}30`, color: planC.text, backgroundColor: planC.bg }}>
                              {u.plan}
                            </Badge>
                            <Badge variant="outline" className="text-[8px] font-bold uppercase px-1.5 py-0 adm-badge"
                              style={{ borderColor: `${statusC.border}30`, color: statusC.text, backgroundColor: statusC.bg }}>
                              {u.status}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-white/30 truncate mt-0.5">{u.email}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-[10px] text-white/20">
                              <CreditCard className="h-2.5 w-2.5 inline mr-0.5" />
                              {u._count.transactions} txns
                            </span>
                            <span className="text-[10px] text-white/20">
                              <Target className="h-2.5 w-2.5 inline mr-0.5" />
                              {u._count.categories}
                            </span>
                            <span className="text-[10px] text-white/20">
                              Joined {formatDate(u.createdAt)}
                            </span>
                          </div>
                          <div className="flex gap-1.5 mt-3">
                            <button onClick={() => openDetailProfile(u)} className="h-8 px-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/40 text-[10px] flex items-center gap-1 hover:bg-white/[0.06] hover:text-white/70 transition-colors adm-quick-action">
                              <Activity className="h-3 w-3" /> Details
                            </button>
                            <button onClick={() => openEditDialog(u)} className="h-8 px-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/40 text-[10px] flex items-center gap-1 hover:bg-white/[0.06] hover:text-white/70 transition-colors adm-quick-action">
                              <Edit className="h-3 w-3" /> Edit
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="h-8 w-8 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/30 flex items-center justify-center hover:bg-white/[0.06] hover:text-white/70 transition-colors adm-quick-action">
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-[#1A1A1A] border-white/[0.08]" align="end">
                                <DropdownMenuItem className="text-white/60 focus:text-white focus:bg-white/[0.04]" onClick={() => { const u2 = u; setDetailUser(null); setResetPwUser(u2); setNewPassword(''); }}>
                                  <Key className="h-3.5 w-3.5 mr-2" /> Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/[0.06]" />
                                <DropdownMenuItem className="text-[#CF6679] focus:text-[#CF6679] focus:bg-[#CF6679]/5" onClick={() => setDeleteUser(u)}>
                                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
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
                      <th className="w-10 py-3 px-4">
                        <button onClick={() => {
                          if (selectedIds.size === users.length) setSelectedIds(new Set());
                          else setSelectedIds(new Set(users.map(u => u.id)));
                        }} className="touch-target text-white/30 hover:text-white/60 transition-colors">
                          <CheckSquare className={cn('h-4 w-4', selectedIds.size === users.length && 'text-[#03DAC6]')} />
                        </button>
                      </th>
                      <th className="text-left py-3 px-4 text-[10px] font-semibold text-white/25 uppercase tracking-wider cursor-pointer hover:text-white/50 transition-colors" onClick={() => toggleSort('username')}>
                        <span className="flex items-center gap-1">User {sortField === 'username' && <ChevronUp className={cn('h-3 w-3', sortDir === 'desc' && 'rotate-180')} />}</span>
                      </th>
                      <th className="text-left py-3 px-4 text-[10px] font-semibold text-white/25 uppercase tracking-wider cursor-pointer hover:text-white/50 transition-colors" onClick={() => toggleSort('plan')}>
                        <span className="flex items-center gap-1">Plan {sortField === 'plan' && <ChevronUp className={cn('h-3 w-3', sortDir === 'desc' && 'rotate-180')} />}</span>
                      </th>
                      <th className="text-center py-3 px-4 text-[10px] font-semibold text-white/25 uppercase tracking-wider cursor-pointer hover:text-white/50 transition-colors" onClick={() => toggleSort('status')}>
                        <span className="flex items-center justify-center gap-1">Status {sortField === 'status' && <ChevronUp className={cn('h-3 w-3', sortDir === 'desc' && 'rotate-180')} />}</span>
                      </th>
                      <th className="text-center py-3 px-4 text-[10px] font-semibold text-white/25 uppercase tracking-wider cursor-pointer hover:text-white/50 transition-colors" onClick={() => toggleSort('transactions')}>
                        <span className="flex items-center justify-center gap-1">Transactions {sortField === 'transactions' && <ChevronUp className={cn('h-3 w-3', sortDir === 'desc' && 'rotate-180')} />}</span>
                      </th>
                      <th className="text-center py-3 px-4 text-[10px] font-semibold text-white/25 uppercase tracking-wider cursor-pointer hover:text-white/50 transition-colors" onClick={() => toggleSort('joined')}>
                        <span className="flex items-center justify-center gap-1">Joined {sortField === 'joined' && <ChevronUp className={cn('h-3 w-3', sortDir === 'desc' && 'rotate-180')} />}</span>
                      </th>
                      <th className="text-right py-3 px-4 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map((u, idx) => {
                      const avatarColor = getAvatarColor(u.id);
                      const isSelected = selectedIds.has(u.id);
                      return (
                        <motion.tr key={u.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: (idx % 20) * 0.02, duration: 0.3 }}
                          className={cn(
                            'border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors adm-table-row',
                            idx % 2 === 0 && 'adm-table-row-alt',
                            isSelected && 'bg-[#03DAC6]/[0.03]',
                          )}
                        >
                          <td className="py-3 px-4">
                            <button onClick={() => toggleSelect(u.id)} className="touch-target transition-all duration-200">
                              {isSelected
                                ? <CheckSquare className="h-4 w-4 text-[#03DAC6]" />
                                : <Square className="h-4 w-4 text-white/15 hover:text-white/40" />
                              }
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="relative shrink-0">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold"
                                  style={{ background: avatarColor.bg, border: `1px solid ${avatarColor.border}`, color: avatarColor.text }}>
                                  {u.username.slice(0, 2).toUpperCase()}
                                </div>
                                {u.status === 'active' && (
                                  <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#03DAC6] ring-2 ring-[#0D0D0D]" />
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[12px] font-medium text-white/75 truncate max-w-[180px]">{u.username}</p>
                                <p className="text-[10px] text-white/25 truncate max-w-[180px]">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className={cn('text-[9px] font-bold uppercase px-2 py-0.5 adm-badge', ...getPlanBadgeClasses(u.plan))}>
                              {u.plan === 'ultimate' ? <><Gem className="h-2 w-2 mr-0.5 inline" />ULTIMATE</> : u.plan === 'pro' ? <><Crown className="h-2 w-2 mr-0.5 inline" />PRO</> : 'BASIC'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant="outline" className={cn('text-[9px] font-bold uppercase px-2 py-0.5 adm-badge', ...getStatusBadgeClasses(u.status))}>
                              {u.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-[12px] text-white/50 tabular-nums font-medium">{u._count.transactions}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-[11px] text-white/30">{formatDate(u.createdAt)}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="sm" variant="ghost" className="h-8 text-[11px] text-[#BB86FC] hover:text-[#BB86FC] hover:bg-[#BB86FC]/10 adm-quick-action"
                                onClick={() => openDetailProfile(u)}>
                                <Activity className="h-3 w-3 mr-1" /> Details
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white/30 hover:text-white/60 adm-quick-action">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-[#1A1A1A] border-white/[0.08]" align="end">
                                  <DropdownMenuItem className="text-white/60 focus:text-white focus:bg-white/[0.04]" onClick={() => openEditDialog(u)}>
                                    <Edit className="h-3.5 w-3.5 mr-2" /> Edit User
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-white/60 focus:text-white focus:bg-white/[0.04]" onClick={() => { setResetPwUser(u); setNewPassword(''); }}>
                                    <Key className="h-3.5 w-3.5 mr-2" /> Reset Password
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-white/[0.06]" />
                                  <DropdownMenuItem className="text-[#CF6679] focus:text-[#CF6679] focus:bg-[#CF6679]/5" onClick={() => setDeleteUser(u)}>
                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete User
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
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
        {!loading && users.length > 0 && pagination.page < pagination.totalPages && (
          <div className="flex flex-col items-center gap-2 py-5 border-t border-white/[0.04]">
            <p className="text-[11px] text-white/25 tabular-nums">
              Showing {users.length} of {pagination.total} users
            </p>
            <Button
              variant="outline"
              className="adm-action-btn adm-action-btn-primary mx-auto gap-2"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Loading...</>
              ) : (
                <><ChevronDown className="h-4 w-4" /> Load More</>
              )}
            </Button>
          </div>
        )}
        {!loading && users.length > 0 && pagination.page >= pagination.totalPages && (
          <div className="flex justify-center py-4 border-t border-white/[0.04]">
            <p className="text-[11px] text-white/20">All {pagination.total} users loaded</p>
          </div>
        )}
      </Card>

      {renderDialogs()}
    </div>
  );
}

// Helper functions for badge styling
function getPlanBadgeClasses(plan: string) {
  if (plan === 'ultimate') return ['border-[#03DAC6]/20 text-[#03DAC6] bg-[#03DAC6]/5'];
  if (plan === 'pro') return ['border-[#FFD700]/20 text-[#FFD700] bg-[#FFD700]/5'];
  return ['border-white/10 text-white/40 bg-white/[0.02]'];
}

function getStatusBadgeClasses(status: string) {
  if (status === 'active') return ['border-[#03DAC6]/20 text-[#03DAC6] bg-[#03DAC6]/5'];
  return ['border-[#CF6679]/20 text-[#CF6679] bg-[#CF6679]/5'];
}
