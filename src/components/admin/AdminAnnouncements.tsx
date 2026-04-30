'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
  Megaphone, Plus, Pencil, Trash2, RefreshCw, ChevronLeft, ChevronRight,
  Info, AlertTriangle, CheckCircle, Wrench, Clock, Eye, EyeOff,
  Flame, Calendar, BarChart3, ChevronDown, ChevronUp, MonitorPlay, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AnnouncementRecord {
  id: string;
  title: string;
  message: string;
  type: string;
  isActive: boolean;
  priority: number;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; label: string; accent: string }> = {
  info: { icon: Info, color: 'text-[#03DAC6]', bg: 'bg-[#03DAC6]/10', border: 'border-[#03DAC6]/20', label: 'Info', accent: '#03DAC6' },
  warning: { icon: AlertTriangle, color: 'text-[#FFD700]', bg: 'bg-[#FFD700]/10', border: 'border-[#FFD700]/20', label: 'Warning', accent: '#FFD700' },
  success: { icon: CheckCircle, color: 'text-[#4CAF50]', bg: 'bg-[#4CAF50]/10', border: 'border-[#4CAF50]/20', label: 'Success', accent: '#4CAF50' },
  maintenance: { icon: Wrench, color: 'text-[#CF6679]', bg: 'bg-[#CF6679]/10', border: 'border-[#CF6679]/20', label: 'Maintenance', accent: '#CF6679' },
};

const PRIORITY_STYLES: Record<number, { gradient: string; text: string; label: string }> = {
  1: { gradient: 'linear-gradient(135deg, #FFD700, #FFA500)', text: 'text-[#FFD700]', label: 'P1 Critical' },
  2: { gradient: 'linear-gradient(135deg, #C0C0C0, #A0A0A0)', text: 'text-[#C0C0C0]', label: 'P2 High' },
  3: { gradient: 'linear-gradient(135deg, #CD7F32, #A0522D)', text: 'text-[#CD7F32]', label: 'P3 Medium' },
};

function getAnnouncementStatus(a: AnnouncementRecord) {
  const now = new Date();
  if (!a.isActive) return 'inactive';
  if (a.startsAt && new Date(a.startsAt) > now) return 'scheduled';
  if (a.expiresAt && new Date(a.expiresAt) <= now) return 'expired';
  return 'active';
}

function formatDate(date: string | null) {
  if (!date) return 'No limit';
  return new Date(date).toLocaleDateString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const TRUNCATE_LENGTH = 180;

export function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<AnnouncementRecord | null>(null);
  const [deleteItem, setDeleteItem] = useState<AnnouncementRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [previewItem, setPreviewItem] = useState<{
    title: string; message: string; type: string; priority: number; isActive: boolean;
  } | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formType, setFormType] = useState('info');
  const [formPriority, setFormPriority] = useState('0');
  const [formStartsAt, setFormStartsAt] = useState('');
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  const resetForm = () => {
    setFormTitle('');
    setFormMessage('');
    setFormType('info');
    setFormPriority('0');
    setFormStartsAt('');
    setFormExpiresAt('');
    setFormIsActive(true);
  };

  const populateForm = (item: AnnouncementRecord) => {
    setFormTitle(item.title);
    setFormMessage(item.message);
    setFormType(item.type);
    setFormPriority(String(item.priority));
    setFormStartsAt(item.startsAt ? item.startsAt.slice(0, 16) : '');
    setFormExpiresAt(item.expiresAt ? item.expiresAt.slice(0, 16) : '');
    setFormIsActive(item.isActive);
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchAnnouncements = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/admin/announcements?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements);
        setPagination(data.pagination);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleCreate = async () => {
    if (!formTitle.trim() || !formMessage.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: formTitle.trim(),
        message: formMessage.trim(),
        type: formType,
        priority: parseInt(formPriority),
        isActive: formIsActive,
      };
      if (formStartsAt) body.startsAt = new Date(formStartsAt).toISOString();
      if (formExpiresAt) body.expiresAt = new Date(formExpiresAt).toISOString();

      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success('Announcement created');
        setShowCreate(false);
        resetForm();
        fetchAnnouncements(1);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create announcement');
      }
    } catch {
      toast.error('Failed to create announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editItem || !formTitle.trim() || !formMessage.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: formTitle.trim(),
        message: formMessage.trim(),
        type: formType,
        priority: parseInt(formPriority),
        isActive: formIsActive,
      };
      if (formStartsAt) body.startsAt = new Date(formStartsAt).toISOString();
      else body.startsAt = null;
      if (formExpiresAt) body.expiresAt = new Date(formExpiresAt).toISOString();
      else body.expiresAt = null;

      const res = await fetch(`/api/admin/announcements/${editItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success('Announcement updated');
        setEditItem(null);
        resetForm();
        fetchAnnouncements(pagination.page);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update announcement');
      }
    } catch {
      toast.error('Failed to update announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      const res = await fetch(`/api/admin/announcements/${deleteItem.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Announcement deleted');
        setDeleteItem(null);
        fetchAnnouncements(pagination.page);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete announcement');
    }
  };

  const handleToggleActive = async (item: AnnouncementRecord) => {
    try {
      const res = await fetch(`/api/admin/announcements/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (res.ok) {
        toast.success(item.isActive ? 'Announcement deactivated' : 'Announcement activated');
        fetchAnnouncements(pagination.page);
      } else {
        toast.error('Failed to toggle announcement');
      }
    } catch {
      toast.error('Failed to toggle announcement');
    }
  };

  // Stats
  const stats = {
    total: announcements.length,
    active: announcements.filter(a => getAnnouncementStatus(a) === 'active').length,
    scheduled: announcements.filter(a => getAnnouncementStatus(a) === 'scheduled').length,
    expired: announcements.filter(a => getAnnouncementStatus(a) === 'expired').length,
  };

  const statusColorMap: Record<string, string> = {
    active: 'border-[#03DAC6]/20 text-[#03DAC6] bg-[#03DAC6]/5',
    scheduled: 'border-[#FFD700]/20 text-[#FFD700] bg-[#FFD700]/5',
    expired: 'border-[#CF6679]/20 text-[#CF6679] bg-[#CF6679]/5',
    inactive: 'border-white/10 text-white/40 bg-white/[0.02]',
  };

  const renderForm = (_isEdit: boolean) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-[11px] text-white/50">Title</Label>
        <Input
          placeholder="Announcement title"
          value={formTitle}
          onChange={(e) => setFormTitle(e.target.value)}
          className="bg-white/[0.03] border-white/[0.06] text-white/70 adm-form-input"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-[11px] text-white/50">Message</Label>
        <Textarea
          placeholder="Announcement message"
          value={formMessage}
          onChange={(e) => setFormMessage(e.target.value)}
          rows={3}
          className="bg-white/[0.03] border-white/[0.06] text-white/70 resize-none adm-form-input"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-[11px] text-white/50">Type</Label>
          <Select value={formType} onValueChange={setFormType}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-white/70 adm-form-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white/[0.03] border-white/[0.08]">
              <SelectItem value="info">
                <div className="flex items-center gap-2">
                  <Info className="h-3.5 w-3.5 text-[#03DAC6]" />
                  <span>Info</span>
                </div>
              </SelectItem>
              <SelectItem value="warning">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-[#FFD700]" />
                  <span>Warning</span>
                </div>
              </SelectItem>
              <SelectItem value="success">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-[#4CAF50]" />
                  <span>Success</span>
                </div>
              </SelectItem>
              <SelectItem value="maintenance">
                <div className="flex items-center gap-2">
                  <Wrench className="h-3.5 w-3.5 text-[#CF6679]" />
                  <span>Maintenance</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-[11px] text-white/50">Priority (higher = first)</Label>
          <Input
            type="number"
            min="0"
            value={formPriority}
            onChange={(e) => setFormPriority(e.target.value)}
            className="bg-white/[0.03] border-white/[0.06] text-white/70 adm-form-input"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-[11px] text-white/50 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Starts At (optional)
          </Label>
          <Input
            type="datetime-local"
            value={formStartsAt}
            onChange={(e) => setFormStartsAt(e.target.value)}
            className="bg-white/[0.03] border-white/[0.06] text-white/70 [color-scheme:dark] adm-form-input"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[11px] text-white/50 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Expires At (optional)
          </Label>
          <Input
            type="datetime-local"
            value={formExpiresAt}
            onChange={(e) => setFormExpiresAt(e.target.value)}
            className="bg-white/[0.03] border-white/[0.06] text-white/70 [color-scheme:dark] adm-form-input"
          />
        </div>
      </div>
      <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <div className="flex items-center gap-2">
          {formIsActive ? <Eye className="h-4 w-4 text-[#03DAC6]" /> : <EyeOff className="h-4 w-4 text-white/30" />}
          <div>
            <p className="text-[12px] font-medium text-white/60">{formIsActive ? 'Active' : 'Inactive'}</p>
            <p className="text-[10px] text-white/25">Visible to users when active</p>
          </div>
        </div>
        <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white/90 adm-section-header">Announcements</h2>
          <p className="text-sm text-white/40 mt-1">Manage banners and notifications shown to users</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="gap-2 bg-[#03DAC6] text-black font-semibold hover:bg-[#03DAC6]/90 text-[12px] adm-quick-action"
            onClick={() => { resetForm(); setShowCreate(true); }}
          >
            <Plus className="h-4 w-4" /> Create Announcement
          </Button>
          <Button
            variant="outline"
            className="gap-2 bg-white/[0.02] border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.04] text-[12px]"
            onClick={() => {
              if (formTitle.trim() || formMessage.trim()) {
                setPreviewItem({
                  title: formTitle || 'Untitled Announcement',
                  message: formMessage || 'No message content yet...',
                  type: formType,
                  priority: parseInt(formPriority) || 0,
                  isActive: formIsActive,
                });
              } else {
                setPreviewItem({
                  title: 'Sample Announcement',
                  message: 'This is how your announcement will appear to users in the app. Configure the title, message, type, and priority above to customize it.',
                  type: 'info',
                  priority: 0,
                  isActive: true,
                });
              }
            }}
          >
            <MonitorPlay className="h-4 w-4" /> Preview
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: pagination.total, icon: BarChart3, color: '#BB86FC', gradient: 'from-[#BB86FC]/20' },
          { label: 'Active', value: stats.active, icon: CheckCircle, color: '#03DAC6', gradient: 'from-[#03DAC6]/20' },
          { label: 'Scheduled', value: stats.scheduled, icon: Clock, color: '#FFD700', gradient: 'from-[#FFD700]/20' },
          { label: 'Expired', value: stats.expired, icon: AlertTriangle, color: '#CF6679', gradient: 'from-[#CF6679]/20' },
        ].map((stat) => (
          <div key={stat.label} className="group relative">
            <div className={cn(
              'absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500',
              `bg-gradient-to-br ${stat.gradient} to-transparent`,
            )} />
            <Card className="relative bg-[#0D0D0D] border-white/[0.06] adm-stat-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${stat.color}10` }}>
                    <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white/80">{stat.value}</p>
                <p className="text-[10px] text-white/30 mt-1 font-medium uppercase tracking-wider">{stat.label}</p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        {['', 'active', 'scheduled', 'expired', 'inactive'].map((status) => (
          <Button key={status} variant="outline" size="sm"
            className={cn(
              'text-[11px] rounded-lg h-8 transition-all adm-filter-chip',
              filterStatus === status
                ? 'bg-[#03DAC6]/10 border-[#03DAC6]/25 text-[#03DAC6] adm-filter-chip-active'
                : 'bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/[0.04]',
            )}
            onClick={() => { setFilterStatus(status); fetchAnnouncements(1); }}
          >
            {status === '' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-medium px-2.5 py-1 bg-white/[0.02] border-white/[0.06] text-white/30 adm-badge">
            {pagination.total} total
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
            onClick={() => fetchAnnouncements(pagination.page)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Announcements List */}
      <Card className="bg-[#0D0D0D] border-white/[0.06] adm-content-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="relative h-28 rounded-xl bg-white/[0.02] overflow-hidden">
                  <div className="absolute inset-0 animate-shimmer"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)',
                      backgroundSize: '200% 100%',
                    }} />
                </div>
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-20 relative overflow-hidden adm-empty-state">
              {/* Animated gradient background */}
              <div className="absolute inset-0 animate-empty-gradient" />
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mx-auto mb-5 adm-empty-state-icon"
                  style={{ animation: 'emptyPulse 4s ease-in-out infinite' }}>
                  <Megaphone className="h-9 w-9 text-white/[0.06]" />
                </div>
                <p className="text-white/30 text-sm font-medium">No announcements yet</p>
                <p className="text-white/15 text-[11px] mt-1.5">Create your first announcement to notify users</p>
                <Button
                  className="mt-4 gap-2 bg-[#03DAC6]/10 text-[#03DAC6] border-[#03DAC6]/20 hover:bg-[#03DAC6]/20 text-[12px]"
                  variant="outline"
                  onClick={() => { resetForm(); setShowCreate(true); }}
                >
                  <Plus className="h-3.5 w-3.5" /> Create Announcement
                </Button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {announcements.map((item, idx) => {
                const status = getAnnouncementStatus(item);
                const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.info;
                const TypeIcon = typeConfig.icon;
                const isExpanded = expandedIds.has(item.id);
                const isLongMessage = item.message.length > TRUNCATE_LENGTH;
                const priorityStyle = item.priority > 0 && item.priority <= 3 ? PRIORITY_STYLES[item.priority] : null;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'p-4 hover:bg-white/[0.02] transition-all duration-200 group/item relative adm-list-item',
                      item.type === 'info' ? 'border-l-info' :
                      item.type === 'warning' ? 'border-l-warning' :
                      item.type === 'success' ? 'border-l-success' :
                      item.type === 'maintenance' ? 'border-l-maintenance' : '',
                    )}
                    style={{ animation: 'fadeSlideIn 0.4s ease-out backwards', animationDelay: `${idx * 60}ms` }}
                  >

                    <div className="flex items-start gap-3 pl-2">
                      {/* Type icon */}
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-transform duration-200 group-hover/item:scale-110', typeConfig.bg)}>
                        <TypeIcon className={cn('h-4 w-4', typeConfig.color)} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-sm font-semibold text-white/70 truncate">{item.title}</h3>
                          <Badge variant="outline" className={cn('text-[9px] font-bold uppercase px-2 py-0.5 adm-badge', typeConfig.border, typeConfig.color, typeConfig.bg)}>
                            {typeConfig.label}
                          </Badge>
                          <Badge variant="outline" className={cn('text-[9px] font-bold uppercase px-2 py-0.5 adm-badge', statusColorMap[status] || '')}>
                            {status}
                          </Badge>
                          {/* Priority badge: HIGH / MED / LOW */}
                          {item.priority >= 10 && (
                            <span
                              className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md inline-flex items-center gap-0.5"
                              style={{
                                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                                color: '#000',
                                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                              }}
                            >
                              <Flame className="h-2.5 w-2.5" />
                              HIGH
                            </span>
                          )}
                          {item.priority >= 5 && item.priority < 10 && (
                            <span
                              className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md inline-flex items-center gap-0.5"
                              style={{
                                background: 'linear-gradient(135deg, #C0C0C0, #A0A0A0)',
                                color: '#000',
                                textShadow: '0 1px 2px rgba(0,0,0,0.15)',
                              }}
                            >
                              <Flame className="h-2.5 w-2.5" />
                              MED
                            </span>
                          )}
                          {item.priority > 0 && item.priority < 5 && (
                            <Badge variant="outline" className="text-[9px] font-bold px-2 py-0.5 border-white/10 text-white/40 bg-white/[0.02] adm-badge">
                              <Flame className="h-2.5 w-2.5 mr-0.5 inline" />
                              LOW
                            </Badge>
                          )}
                          {priorityStyle && (
                            <span
                              className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md inline-flex items-center gap-0.5"
                              style={{
                                background: priorityStyle.gradient,
                                color: '#000',
                                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                              }}
                            >
                              <Flame className="h-2.5 w-2.5" />
                              {priorityStyle.label}
                            </span>
                          )}
                        </div>
                        {/* Message with expand/collapse */}
                        <div className="relative">
                          <p className={cn(
                            'text-[12px] text-white/35 mb-2 transition-all duration-300',
                            !isExpanded && isLongMessage && 'line-clamp-2',
                          )}>
                            {isExpanded || !isLongMessage ? item.message : item.message.slice(0, TRUNCATE_LENGTH) + '...'}
                          </p>
                          {isLongMessage && (
                            <button
                              onClick={() => toggleExpanded(item.id)}
                              className="inline-flex items-center gap-1 text-[11px] text-[#BB86FC]/60 hover:text-[#BB86FC] transition-colors mt-0.5"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3 w-3" />
                                  Show less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" />
                                  Show more
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-white/20">
                          <span>Created {formatDate(item.createdAt)}</span>
                          {item.startsAt && (
                            <>
                              <span className="text-white/10">•</span>
                              <span className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5" />Starts: {formatDate(item.startsAt)}</span>
                            </>
                          )}
                          {item.expiresAt && (
                            <>
                              <span className="text-white/10">•</span>
                              <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />Expires: {formatDate(item.expiresAt)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover/item:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            'h-8 adm-action-btn',
                            item.isActive
                              ? 'text-[#03DAC6]/60 hover:text-[#03DAC6] hover:bg-[#03DAC6]/10'
                              : 'text-white/20 hover:text-white/40 hover:bg-white/[0.04]',
                          )}
                          onClick={() => handleToggleActive(item)}
                          title={item.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {item.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-white/40 hover:text-[#BB86FC] hover:bg-[#BB86FC]/10 adm-action-btn"
                          onClick={() => { populateForm(item); setEditItem(item); }}
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-white/20 hover:text-[#CF6679] hover:bg-[#CF6679]/10 adm-action-btn"
                          onClick={() => setDeleteItem(item)}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.04]">
            <p className="text-[11px] text-white/25">Page {pagination.page} of {pagination.totalPages}</p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-white/40"
                disabled={pagination.page <= 1}
                onClick={() => fetchAnnouncements(pagination.page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-white/40"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchAnnouncements(pagination.page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) { setShowCreate(false); resetForm(); } }}>
        <DialogContent className="bg-[#141414] border-white/[0.08] rounded-2xl p-0 overflow-hidden max-w-md adm-dialog-content">
          <div className="p-5">
          <DialogHeader>
            <DialogTitle className="text-white/90 flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#03DAC6]" />
              Create Announcement
            </DialogTitle>
            <DialogDescription className="text-white/40">
              Create a new announcement banner for users
            </DialogDescription>
          </DialogHeader>
          {renderForm(false)}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="bg-white/[0.03] border-white/[0.06] text-white/50"
              onClick={() => { setShowCreate(false); resetForm(); }}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#03DAC6] text-black font-semibold hover:bg-[#03DAC6]/90"
              onClick={handleCreate}
              disabled={saving}
            >
              {saving ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) { setEditItem(null); resetForm(); } }}>
        <DialogContent className="bg-[#141414] border-white/[0.08] rounded-2xl p-0 overflow-hidden max-w-md adm-dialog-content">
          <div className="p-5">
          <DialogHeader>
            <DialogTitle className="text-white/90 flex items-center gap-2">
              <Pencil className="h-5 w-5 text-[#BB86FC]" />
              Edit Announcement
            </DialogTitle>
            <DialogDescription className="text-white/40">
              Update announcement details
            </DialogDescription>
          </DialogHeader>
          {renderForm(true)}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="bg-white/[0.03] border-white/[0.06] text-white/50"
              onClick={() => { setEditItem(null); resetForm(); }}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#BB86FC] text-black font-semibold hover:bg-[#BB86FC]/90"
              onClick={handleUpdate}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent className="bg-[#141414] border-white/[0.08] rounded-2xl p-0 overflow-hidden adm-dialog-content">
          <div className="p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white/90">Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription className="text-white/40">
              Are you sure you want to delete <strong className="text-white/60">"{deleteItem?.title}"</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-white/[0.03] border-white/[0.06] text-white/50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#CF6679] text-white hover:bg-[#CF6679]/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="bg-[#141414] border-white/[0.08] rounded-2xl p-0 overflow-hidden max-w-md adm-dialog-content">
          <div className="p-5">
          <DialogHeader>
            <DialogTitle className="text-white/90 flex items-center gap-2">
              <MonitorPlay className="h-5 w-5 text-[#BB86FC]" />
              Announcement Preview
            </DialogTitle>
            <DialogDescription className="text-white/40">
              This is how the announcement will appear to users
            </DialogDescription>
          </DialogHeader>
          {previewItem && (
            <div className="space-y-4">
              {/* Mock App Bar */}
              <div className="flex items-center justify-between p-3 rounded-t-xl bg-[#0D0D0D] border border-white/[0.06] border-b-0">
                <span className="text-[11px] font-semibold text-white/40">Wealth Tracker</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#03DAC6]" />
                  <span className="text-[9px] text-white/25">●</span>
                  <div className="w-2 h-2 rounded-full bg-[#FFD700]" />
                  <div className="w-2 h-2 rounded-full bg-[#CF6679]" />
                </div>
              </div>

              {/* Announcement Banner */}
              <div
                className={cn(
                  'p-4 rounded-b-xl border',
                  previewItem.type === 'info' && 'bg-[#03DAC6]/8 border-[#03DAC6]/20',
                  previewItem.type === 'warning' && 'bg-[#FFD700]/8 border-[#FFD700]/20',
                  previewItem.type === 'success' && 'bg-[#4CAF50]/8 border-[#4CAF50]/20',
                  previewItem.type === 'maintenance' && 'bg-[#CF6679]/8 border-[#CF6679]/20',
                )}
              >
                <div className="flex items-start gap-3">
                  {(() => {
                    const cfg = TYPE_CONFIG[previewItem.type] || TYPE_CONFIG.info;
                    const TypeIcon = cfg.icon;
                    return (
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', cfg.bg)}>
                        <TypeIcon className={cn('h-4 w-4', cfg.color)} />
                      </div>
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[13px] font-semibold text-white/80">{previewItem.title}</h3>
                      {previewItem.priority >= 10 && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5"
                          style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#000' }}>
                          <Flame className="h-2 w-2" /> HIGH
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-white/50 leading-relaxed">{previewItem.message}</p>
                  </div>
                  <button className="shrink-0 text-white/20 hover:text-white/40 mt-0.5">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Mock Content Area */}
              <div className="p-4 rounded-xl bg-[#0D0D0D] border border-white/[0.04] space-y-2">
                <div className="h-4 w-32 rounded bg-white/[0.04]" />
                <div className="h-4 w-48 rounded bg-white/[0.03]" />
                <div className="h-4 w-24 rounded bg-white/[0.02]" />
              </div>

              {/* Preview Metadata */}
              <div className="flex items-center justify-between text-[10px] text-white/20 px-1">
                <span>Type: {previewItem.type}</span>
                <span>Priority: {previewItem.priority}</span>
                <span className={previewItem.isActive ? 'text-[#03DAC6]/50' : 'text-white/15'}>
                  {previewItem.isActive ? '● Visible' : '○ Hidden'}
                </span>
              </div>
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
