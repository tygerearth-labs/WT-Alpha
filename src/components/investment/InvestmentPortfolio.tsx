'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useBusinessStore } from '@/store/useBusinessStore';
import { useTranslation } from '@/hooks/useTranslation';
import { AssetType } from '@/lib/asset-catalogue';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus, Pencil, Trash2, ArrowUpRight, ArrowDownRight, Package,
  LineChart, RefreshCw, X, CircleDollarSign, Calculator, Info,
} from 'lucide-react';
import InvestmentChart from '@/components/investment/InvestmentChart';
import AssetSearchInput, { type SelectedAsset } from '@/components/investment/AssetSearchInput';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PortfolioItem {
  id: string;
  type: string;
  symbol: string;
  name?: string;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  targetPrice?: number;
  stopLoss?: number;
  status: string;
  notes?: string;
  currentValue: number;
  investedValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercentage: number;
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  saham: { bg: 'bg-purple-500/15', text: 'text-purple-400' },
  crypto: { bg: 'bg-teal-500/15', text: 'text-teal-400' },
  forex: { bg: 'bg-pink-500/15', text: 'text-pink-400' },
  komoditas: { bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  indeks: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
};

// Currency formatting based on asset type
function getInvCurrencyLabel(type: string): string {
  if (type === 'saham') return 'IDR';
  return 'USD';
}

function getInvCurrencyPrefix(type: string): string {
  if (type === 'saham') return 'Rp';
  if (type === 'crypto') return '$';
  if (type === 'komoditas') return '$';
  if (type === 'indeks') return '';
  return '';
}

function formatInvPrice(type: string, amount: number): string {
  if (type === 'saham') {
    return 'Rp' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  }
  if (type === 'crypto' || type === 'komoditas') {
    return '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  }
  if (type === 'indeks') {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  }
  // forex
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 5 }).format(amount);
}

const USD_IDR_RATE = 15_500;

const STATUS_VARIANTS: Record<string, string> = {
  open: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  closed: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
};

export default function InvestmentPortfolio() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();

  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Sheet state (replaces Dialog for add/edit)
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<PortfolioItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: 'saham' as string,
    symbol: '',
    name: '',
    entryPrice: '',
    quantity: '',
    targetPrice: '',
    stopLoss: '',
    notes: '',
    status: 'open' as string,
    currentPrice: '',
  });

  // Search asset selection
  const [selectedAsset, setSelectedAsset] = useState<SelectedAsset | null>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<PortfolioItem | null>(null);

  // Chart dialog state
  const [chartDialog, setChartDialog] = useState<{ symbol: string; type: string; name?: string } | null>(null);

  // Live prices state
  const [livePrices, setLivePrices] = useState<Record<string, { price: number; change24h: number }>>({});

  const businessId = activeBusiness?.id;

  // ── Computed: nominal (quantity × entryPrice) ────────────────────────────────
  const computedNominal = useMemo(() => {
    const q = parseFloat(form.quantity) || 0;
    const p = parseFloat(form.entryPrice) || 0;
    return q * p;
  }, [form.quantity, form.entryPrice]);

  // ── Computed: is entry price matching live price? ────────────────────────────
  const isLivePrice = useMemo(() => {
    if (!selectedAsset || !selectedAsset.currentPrice) return false;
    const entry = parseFloat(form.entryPrice);
    if (!entry || entry === 0) return false;
    return Math.abs(entry - selectedAsset.currentPrice) < 0.01;
  }, [selectedAsset, form.entryPrice]);

  // ── Computed: IDR conversion hint for non-saham assets ──────────────────────
  const idrConversionHint = useMemo(() => {
    if (form.type === 'saham') return null;
    const nominal = computedNominal;
    if (!nominal || nominal <= 0) return null;
    const idrAmount = nominal * USD_IDR_RATE;
    const formatted = 'Rp' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(idrAmount);
    return `≈ ${formatted} (estimasi kurs ~${new Intl.NumberFormat('id-ID').format(USD_IDR_RATE)})`;
  }, [form.type, computedNominal]);

  const fetchPortfolios = useCallback(() => {
    if (!businessId) return;
    setLoading(true);
    fetch(`/api/business/${businessId}/portfolio`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((result) => setPortfolios(result.portfolios || []))
      .catch(() => setPortfolios([]))
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  const fetchLivePrices = useCallback(() => {
    if (!businessId || portfolios.length === 0) return;
    const symbols = portfolios.map((p) => ({ type: p.type, symbol: p.symbol }));
    fetch(`/api/business/${businessId}/market-data/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols }),
    })
      .then((r) => (r.ok ? r.json() : { prices: {} }))
      .then((data: { prices?: Record<string, { price: number; change24h: number }> }) => setLivePrices(data.prices || {}))
      .catch(() => {});
  }, [businessId, portfolios]);

  useEffect(() => {
    fetchLivePrices();
  }, [fetchLivePrices]);

  const filtered = portfolios.filter((p) => {
    if (typeFilter !== 'all' && p.type !== typeFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  const pnlColor = (val: number) => (val >= 0 ? 'text-[#03DAC6]' : 'text-[#CF6679]');

  const resetForm = () => {
    setForm({
      type: 'saham',
      symbol: '',
      name: '',
      entryPrice: '',
      quantity: '',
      targetPrice: '',
      stopLoss: '',
      notes: '',
      status: 'open',
      currentPrice: '',
    });
    setSelectedAsset(null);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setSheetOpen(true);
  };

  const openEdit = (item: PortfolioItem) => {
    setEditing(item);
    setForm({
      type: item.type,
      symbol: item.symbol,
      name: item.name || '',
      entryPrice: item.entryPrice.toString(),
      quantity: item.quantity.toString(),
      targetPrice: item.targetPrice?.toString() || '',
      stopLoss: item.stopLoss?.toString() || '',
      notes: item.notes || '',
      status: item.status,
      currentPrice: item.currentPrice.toString(),
    });
    setSelectedAsset({
      symbol: item.symbol,
      name: item.name || '',
      type: item.type as AssetType,
      currentPrice: item.currentPrice,
    });
    setSheetOpen(true);
  };

  // ── FIX: preventDefault to stop page redirect ──────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !form.symbol || !form.entryPrice || !form.quantity) return;
    setSaving(true);
    try {
      const url = editing
        ? `/api/business/${businessId}/portfolio/${editing.id}`
        : `/api/business/${businessId}/portfolio`;
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          entryPrice: parseFloat(form.entryPrice),
          quantity: parseFloat(form.quantity),
          currentPrice: form.currentPrice ? parseFloat(form.currentPrice) : 0,
          targetPrice: form.targetPrice ? parseFloat(form.targetPrice) : null,
          stopLoss: form.stopLoss ? parseFloat(form.stopLoss) : null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(editing ? t('inv.portfolioUpdated') : t('inv.portfolioCreated'));
      setSheetOpen(false);
      fetchPortfolios();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!businessId || !deleteTarget) return;
    try {
      const res = await fetch(`/api/business/${businessId}/portfolio/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      toast.success(t('inv.portfolioDeleted'));
      setDeleteTarget(null);
      fetchPortfolios();
    } catch {
      toast.error(t('common.error'));
    }
  };

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-white/50 text-center">{t('inv.registerFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters & Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className={cn("w-[130px] bg-white/[0.05] border-white/[0.1] text-white text-xs h-9", "inv-pos-filter", typeFilter !== 'all' && "inv-pos-filter-active")}>
              <SelectValue placeholder="Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('inv.dashAllType')}</SelectItem>
              <SelectItem value="crypto">{t('inv.typeCrypto')}</SelectItem>
              <SelectItem value="saham">{t('inv.typeSaham')}</SelectItem>
              <SelectItem value="forex">{t('inv.typeForex')}</SelectItem>
              <SelectItem value="komoditas">Komoditas</SelectItem>
              <SelectItem value="indeks">Indeks</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={cn("w-[130px] bg-white/[0.05] border-white/[0.1] text-white text-xs h-9", "inv-pos-filter", statusFilter !== 'all' && "inv-pos-filter-active")}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('inv.dashAllStatus')}</SelectItem>
              <SelectItem value="open">{t('inv.statusOpen')}</SelectItem>
              <SelectItem value="closed">{t('inv.statusClosed')}</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="border-white/[0.1] text-white/50 text-xs">
            {filtered.length} item
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2 text-white/40 hover:text-white hover:bg-white/10"
            onClick={fetchLivePrices}
            title="Refresh prices"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Button
          onClick={openCreate}
          size="sm"
          className="bg-[#BB86FC] text-black hover:bg-[#9B6FDB] h-9 shadow-lg shadow-[#BB86FC]/20 hover:shadow-xl hover:shadow-[#BB86FC]/30"
        >
          <Plus className="h-4 w-4 mr-1" />
          {t('inv.addPortfolio')}
        </Button>
      </div>

      {/* Portfolio Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl bg-white/[0.03]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="inv-empty-state bg-white/[0.03] border-white/[0.06]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="inv-empty-state-icon">
              <Package className="h-10 w-10 text-white/20 mb-3" />
            </div>
            <p className="text-white/40 text-sm">{t('inv.noInvData')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const typeColor = TYPE_COLORS[item.type] || TYPE_COLORS.saham;
            const isPositive = item.unrealizedPnl >= 0;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.25 }}
              >
              <Card className="inv-portfolio-card bg-white/[0.03] border-white/[0.06] hover:border-white/[0.1] transition-colors">
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={cn('inv-type-badge flex h-9 w-9 items-center justify-center rounded-lg', typeColor.bg)}>
                        <span className={cn('text-xs font-bold', typeColor.text)}>
                          {(item.type || 'crypto').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold">{item.symbol}</p>
                        {item.name && (
                          <p className="text-white/40 text-xs truncate max-w-[140px]">
                            {item.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={cn('text-[10px] border-0 px-2 py-0', STATUS_VARIANTS[item.status] || '')}>
                        {item.status === 'open' ? t('inv.statusOpen') : t('inv.statusClosed')}
                      </Badge>
                      {(() => {
                        const livePrice = livePrices[item.symbol];
                        if (!livePrice) return null;
                        return (
                          <div className="flex items-center gap-1">
                            <span className="inv-live-dot" />
                            <span className="text-[10px] text-white/40">{t('inv.dashTicker')}</span>
                            <span className={cn('text-xs font-medium', livePrice.change24h >= 0 ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                              {livePrice.change24h >= 0 ? '+' : ''}{(livePrice.change24h ?? 0).toFixed(2)}%
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Price Info */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-white/40 mb-0.5">{t('inv.entryPrice')}</p>
                      <p className="text-white/80 font-medium">{formatInvPrice(item.type, item.entryPrice)}</p>
                    </div>
                    <div>
                      <p className="text-white/40 mb-0.5">{t('inv.currentPrice')}</p>
                      <p className="text-white/80 font-medium">{formatInvPrice(item.type, item.currentPrice)}</p>
                    </div>
                    <div>
                      <p className="text-white/40 mb-0.5">{t('inv.quantity')}</p>
                      <p className="text-white/80 font-medium">{item.quantity}</p>
                    </div>
                    <div>
                      <p className="text-white/40 mb-0.5">{t('inv.totalPnL')}</p>
                      <p className={cn('font-bold flex items-center gap-0.5', pnlColor(item.unrealizedPnl))}>
                        {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {isPositive ? '+' : ''}
                        {formatInvPrice(item.type, item.unrealizedPnl)}
                      </p>
                    </div>
                  </div>

                  {/* PnL Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/40">PnL %</span>
                      <span className={cn('font-semibold', pnlColor(item.unrealizedPnl))}>
                        {isPositive ? '+' : ''}{(item.unrealizedPnlPercentage ?? 0).toFixed(2)}%
                      </span>
                    </div>
                    <div className="inv-pnl-track h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className={cn('inv-pnl-fill', isPositive ? 'inv-pnl-fill-positive' : 'inv-pnl-fill-negative', 'h-full rounded-full transition-all duration-300')}
                        style={{
                          width: `${Math.min(Math.abs(item.unrealizedPnlPercentage), 100)}%`,
                          backgroundColor: isPositive ? '#03DAC6' : '#CF6679',
                        }}
                      />
                    </div>
                  </div>

                  {/* Target/StopLoss */}
                  {(item.targetPrice || item.stopLoss) && (
                    <div className="flex gap-3 text-[10px] text-white/30">
                      {item.targetPrice && (
                        <span>Target: {formatInvPrice(item.type, item.targetPrice)}</span>
                      )}
                      {item.stopLoss && (
                        <span>SL: {formatInvPrice(item.type, item.stopLoss)}</span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-white/40 hover:text-[#BB86FC] hover:bg-white/10"
                      onClick={() => setChartDialog({ symbol: item.symbol, type: item.type, name: item.name })}
                      title="View Chart"
                    >
                      <LineChart className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/10"
                      onClick={() => openEdit(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-white/40 hover:text-[#CF6679] hover:bg-white/10"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          Add/Edit Sheet (slides in from right) — replaces old Dialog
          ═══════════════════════════════════════════════════════════════════════ */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="inv-dialog-content w-full sm:max-w-[480px] bg-white/[0.03] border-white/[0.06] text-white overflow-y-auto p-0"
        >
          <SheetHeader className="px-6 pt-8 pb-4">
            <SheetTitle className="text-white text-lg">
              {editing ? t('common.edit') : t('inv.addPortfolio')}
            </SheetTitle>
            <SheetDescription className="text-white/60 text-sm">
              {editing
                ? 'Perbarui detail posisi portofolio Anda.'
                : 'Tambahkan posisi baru ke portofolio Anda.'}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSave} className="flex flex-col gap-5 px-6 pb-8">
            {/* ── Asset Search Box ─────────────────────────────────────────── */}
            <div className="space-y-2">
              <Label className="text-white/80 text-sm">{t('inv.searchAsset')} *</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <AssetSearchInput
                    businessId={businessId!}
                    value={selectedAsset}
                    onSelect={(asset) => {
                      setSelectedAsset(asset);
                      setForm({
                        ...form,
                        type: asset.type,
                        symbol: asset.symbol,
                        name: asset.name,
                        currentPrice: asset.currentPrice ? asset.currentPrice.toString() : '',
                        entryPrice: asset.currentPrice ? asset.currentPrice.toString() : form.entryPrice,
                      });
                    }}
                  />
                </div>
                {selectedAsset && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-12 w-12 p-0 shrink-0 text-white/40 hover:text-[#CF6679] hover:bg-white/10 rounded-xl"
                    onClick={() => {
                      setSelectedAsset(null);
                      setForm({ ...form, symbol: '', name: '', type: 'saham', entryPrice: '', currentPrice: '' });
                    }}
                    title="Reset"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-white/25">{t('inv.searchAssetHint')}</p>
            </div>

            {/* ── Live Price Card (shown when asset is selected) ────────────── */}
            {selectedAsset && selectedAsset.currentPrice > 0 && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/[0.15]">
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
                  TYPE_COLORS[selectedAsset.type]?.bg || 'bg-purple-500/15'
                )}>
                  <span className={cn('text-xs font-bold', TYPE_COLORS[selectedAsset.type]?.text || 'text-purple-400')}>
                    {(selectedAsset.type || 'crypto').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-semibold">{selectedAsset.symbol}</span>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0 h-5 font-semibold">
                      LIVE
                    </Badge>
                  </div>
                  <p className="text-white/40 text-xs truncate">{selectedAsset.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white text-sm font-bold">
                    {formatInvPrice(selectedAsset.type, selectedAsset.currentPrice)}
                  </p>
                  <p className="text-white/30 text-[10px]">{t('inv.marketPrice')}</p>
                </div>
              </div>
            )}

            {/* ── Status ────────────────────────────────────────────────────── */}
            <div className="space-y-2">
              <Label className="text-white/80 text-sm">{t('inv.status')}</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="bg-white/[0.05] border-white/[0.1] text-white h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">{t('inv.statusOpen')}</SelectItem>
                  <SelectItem value="closed">{t('inv.statusClosed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ── Manual fallback (no asset selected) ───────────────────────── */}
            {!selectedAsset && (
              <>
                <div className="space-y-2">
                  <Label className="text-white/80 text-sm">{t('inv.portfolioType')}</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger className="bg-white/[0.05] border-white/[0.1] text-white h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="saham">{t('inv.typeSaham')}</SelectItem>
                      <SelectItem value="crypto">{t('inv.typeCrypto')}</SelectItem>
                      <SelectItem value="forex">{t('inv.typeForex')}</SelectItem>
                      <SelectItem value="komoditas">Komoditas</SelectItem>
                      <SelectItem value="indeks">Indeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm">{t('inv.symbol')} *</Label>
                    <Input
                      value={form.symbol}
                      onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
                      placeholder="BBCA"
                      className="inv-search-input bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80 text-sm">{t('inv.assetName')}</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Bank BC"
                      className="inv-search-input bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 h-10"
                    />
                  </div>
                </div>
              </>
            )}

            {/* ── Currency hint ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] w-fit">
              <CircleDollarSign className="h-3.5 w-3.5 text-white/30" />
              <span className="text-[11px] text-white/40">Mata uang:</span>
              <span className="text-[11px] font-semibold text-white/60">
                {getInvCurrencyPrefix(form.type)} {getInvCurrencyLabel(form.type)}
              </span>
            </div>

            {/* ── Entry Price ───────────────────────────────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-white/80 text-sm">{t('inv.entryPrice')} ({getInvCurrencyLabel(form.type)}) *</Label>
                {isLivePrice && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] px-1.5 py-0 h-4 font-bold tracking-wide">
                    LIVE
                  </Badge>
                )}
              </div>
              <Input
                type="number"
                value={form.entryPrice}
                onChange={(e) => setForm({ ...form, entryPrice: e.target.value })}
                placeholder={form.type === 'saham' ? '9750' : '65000'}
                min="0"
                step="any"
                className="inv-search-input bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 h-10"
              />
            </div>

            {/* ── Quantity (Jumlah Aset) ────────────────────────────────────── */}
            <div className="space-y-2">
              <Label className="text-white/80 text-sm">Jumlah Aset *</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  placeholder="0"
                  min="0"
                  step="any"
                  className="inv-search-input bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 h-10 pr-32"
                />
                {/* Inline Nominal Preview Badge */}
                {computedNominal > 0 && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-lg bg-[#BB86FC]/[0.12] border border-[#BB86FC]/20 pointer-events-none">
                    <Calculator className="h-3 w-3 text-[#BB86FC]/60" />
                    <span className="text-[11px] font-bold text-[#BB86FC] max-w-[140px] truncate">
                      {formatInvPrice(form.type, computedNominal)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-start gap-1.5">
                <Info className="h-3 w-3 text-white/25 mt-0.5 shrink-0" />
                <p className="text-[11px] text-white/30 leading-relaxed">
                  Contoh: 0.5 BTC, 100 lembar BBCA, 1000 EUR
                </p>
              </div>
            </div>

            {/* ── Nominal Posisi — Enhanced Preview Card ────────────────────── */}
            <div className={cn(
              'rounded-xl border p-4 transition-all duration-300',
              computedNominal > 0
                ? 'bg-gradient-to-br from-[#BB86FC]/[0.08] to-[#03DAC6]/[0.04] border-[#BB86FC]/20'
                : 'bg-white/[0.02] border-white/[0.06]'
            )}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-lg',
                    computedNominal > 0 ? 'bg-[#BB86FC]/20' : 'bg-white/[0.05]'
                  )}>
                    <Calculator className={cn('h-3.5 w-3.5', computedNominal > 0 ? 'text-[#BB86FC]' : 'text-white/30')} />
                  </div>
                  <span className={cn('text-xs font-semibold uppercase tracking-wider', computedNominal > 0 ? 'text-[#BB86FC]/80' : 'text-white/30')}>
                    Nominal Posisi
                  </span>
                </div>
                {computedNominal > 0 && (
                  <Badge className="text-[9px] font-bold px-2 py-0.5 h-5 bg-[#BB86FC]/15 text-[#BB86FC] border-[#BB86FC]/25">
                    {getInvCurrencyLabel(form.type)}
                  </Badge>
                )}
              </div>
              {computedNominal > 0 ? (
                <div className="space-y-3">
                  <p className="text-xl font-black text-white tracking-tight">
                    {formatInvPrice(form.type, computedNominal)}
                  </p>
                  {/* Breakdown */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-white/40">Harga Masuk</span>
                      <span className="text-white/70 font-mono">{formatInvPrice(form.type, parseFloat(form.entryPrice) || 0)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-white/40">Jumlah</span>
                      <span className="text-white/70 font-mono">× {form.quantity}</span>
                    </div>
                    <div className="h-px bg-white/[0.06]" />
                    <div className="flex justify-between text-[11px]">
                      <span className="text-white/50 font-medium">Total Investasi</span>
                      <span className="text-[#BB86FC] font-bold font-mono">{formatInvPrice(form.type, computedNominal)}</span>
                    </div>
                  </div>
                  {/* IDR conversion hint for non-saham */}
                  {idrConversionHint && (
                    <div className="flex items-start gap-1.5 pt-1">
                      <Info className="h-3 w-3 text-white/20 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-white/25 leading-relaxed">{idrConversionHint}</p>
                    </div>
                  )}
                  {/* PnL Projection based on Target Price */}
                  {form.targetPrice && parseFloat(form.targetPrice) > 0 && (
                    (() => {
                      const target = parseFloat(form.targetPrice);
                      const entry = parseFloat(form.entryPrice) || 0;
                      const qty = parseFloat(form.quantity) || 0;
                      const targetPnl = (target - entry) * qty;
                      const targetPnlPct = entry > 0 ? ((target - entry) / entry) * 100 : 0;
                      const isPositive = targetPnl >= 0;
                      return (
                        <div className={cn(
                          'mt-2 pt-2 border-t flex items-center justify-between',
                          isPositive ? 'border-[#03DAC6]/15' : 'border-[#CF6679]/15'
                        )}>
                          <div className="flex items-center gap-1.5">
                            {isPositive ? <ArrowUpRight className="h-3 w-3 text-[#03DAC6]" /> : <ArrowDownRight className="h-3 w-3 text-[#CF6679]" />}
                            <span className="text-[11px] text-white/50">Potensi PnL @ Target</span>
                          </div>
                          <span className={cn('text-xs font-bold font-mono', isPositive ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                            {isPositive ? '+' : ''}{formatInvPrice(form.type, Math.abs(targetPnl))} ({isPositive ? '+' : ''}{targetPnlPct.toFixed(1)}%)
                          </span>
                        </div>
                      );
                    })()
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 py-1">
                  <span className="text-white/20 text-sm">—</span>
                  <span className="text-[11px] text-white/20">Masukkan harga & jumlah untuk melihat nominal</span>
                </div>
              )}
            </div>

            {/* ── Target Price & Stop Loss ──────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-white/80 text-sm">{t('inv.targetPrice')} ({getInvCurrencyLabel(form.type)})</Label>
                <Input
                  type="number"
                  value={form.targetPrice}
                  onChange={(e) => setForm({ ...form, targetPrice: e.target.value })}
                  placeholder="0"
                  step="any"
                  className="inv-search-input bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80 text-sm">{t('inv.stopLoss')} ({getInvCurrencyLabel(form.type)})</Label>
                <Input
                  type="number"
                  value={form.stopLoss}
                  onChange={(e) => setForm({ ...form, stopLoss: e.target.value })}
                  placeholder="0"
                  step="any"
                  className="inv-search-input bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 h-10"
                />
              </div>
            </div>

            {/* ── Notes ─────────────────────────────────────────────────────── */}
            <div className="space-y-2">
              <Label className="text-white/80 text-sm">{t('inv.journalNotes')}</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Catatan..."
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 min-h-[80px] resize-none"
              />
            </div>

            {/* ── Footer ────────────────────────────────────────────────────── */}
            <SheetFooter className="flex-row gap-3 pt-2 px-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSheetOpen(false)}
                className="flex-1 border-white/[0.1] text-white hover:bg-white/10 h-10"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={saving || !form.symbol || !form.entryPrice || !form.quantity}
                className="flex-1 bg-[#BB86FC] text-black hover:bg-[#9B6FDB] h-10 font-semibold"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Menyimpan...
                  </span>
                ) : (
                  t('common.save')
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Chart Dialog (kept as Dialog — fine for chart view) */}
      <Dialog open={!!chartDialog} onOpenChange={() => setChartDialog(null)}>
        <DialogContent className="inv-dialog-content bg-[#0D0D0D] border-white/[0.06] text-white sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {chartDialog && (
            <>
              <DialogHeader className="px-6 pt-6">
                <DialogTitle className="text-white flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-[#BB86FC]" />
                  {chartDialog.symbol}
                  {chartDialog.name && <span className="text-white/40 text-sm font-normal">{chartDialog.name}</span>}
                </DialogTitle>
              </DialogHeader>
              <InvestmentChart symbol={chartDialog.symbol} type={chartDialog.type as 'saham' | 'crypto' | 'forex'} height={400} />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation (kept as AlertDialog — fine for confirmation) */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="inv-dialog-content bg-white/[0.03] border-white/[0.06] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Hapus portofolio <strong className="text-white">{deleteTarget?.symbol}</strong>? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/[0.1] text-white hover:bg-white/10">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-[#CF6679] text-white hover:bg-[#B85A6C]"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
