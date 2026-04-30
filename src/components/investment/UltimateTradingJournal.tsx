'use client';

/* ═══════════════════════════════════════════════════════════════════════════
   UltimateTradingJournal — Comprehensive trading journal component
   Self-contained: only imports from @/hooks, @/components/ui, lucide-react, framer-motion
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  BookOpen, Plus, TrendingUp, TrendingDown, Target, Activity,
  ChevronDown, ChevronUp, Pencil, Trash2, Camera, X,
  BarChart3, DollarSign, Percent, Crosshair, AlertTriangle,
  Calendar, Filter, ArrowUpDown, Download, Brain, Zap,
} from 'lucide-react';

/* ─── shadcn/ui imports ─── */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES & CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */

interface UltimateTradingJournalProps {
  businessId: string;
}

interface JournalEntry {
  id: string;
  portfolioId: string;
  type: string;
  entryPrice: number;
  exitPrice?: number | null;
  quantity: number;
  pnl: number;
  pnlPercentage: number;
  riskReward?: number | null;
  fees: number;
  notes?: string | null;
  date: string;
  closedAt?: string | null;
  strategy?: string | null;
  emotionalState?: string | null;
  confluence?: string | null;
  screenshotBefore?: string | null;
  screenshotAfter?: string | null;
  instrumentCategory?: string | null;
  lotSize?: number | null;
  pipValue?: number | null;
  leverage?: number | null;
  fundingFee?: number | null;
  liquidationPrice?: number | null;
  tradeCurrency?: string | null;
  exchangeRate?: number | null;
  riskMultiple?: number | null;
}

interface PortfolioOption {
  id: string;
  symbol: string;
  type: string;
}

type DisplayMode = 'nominal' | 'percentage' | 'rmultiple';
type SortOption = 'date-desc' | 'date-asc' | 'pnl-desc' | 'pnl-asc';

const STRATEGIES = [
  'Breakout', 'Mean Reversion', 'FVG', 'Scalping', 'Swing',
  'Range', 'Trend Following', 'News Trading', 'Custom',
];

const EMOTIONAL_STATES = [
  'Calm', 'Confident', 'Disciplined', 'Anxious',
  'FOMO', 'Revenge Trading', 'Greedy', 'Bored', 'Frustrated',
];

const CONFLUENCE_OPTIONS = [
  'RSI Divergence', 'Support/Resistance', 'Volume Spike', 'Trend Line',
  'Moving Average Cross', 'Fibonacci Level', 'Candlestick Pattern',
  'Order Block', 'FVG', 'Liquidity Sweep', 'News Catalyst', 'Earnings Event',
];

const FOREX_PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD',
  'NZD/USD', 'USD/CAD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY',
];

const FOREX_LOT_SIZES = [
  { label: 'Standard (1.0)', value: '1' },
  { label: 'Mini (0.1)', value: '0.1' },
  { label: 'Micro (0.01)', value: '0.01' },
];

const FOREX_PIP_VALUES: Record<string, number> = {
  'EUR/USD': 10, 'GBP/USD': 10, 'AUD/USD': 10, 'NZD/USD': 10,
  'USD/JPY': 6.5, 'USD/CHF': 11.2, 'USD/CAD': 7.3,
  'EUR/GBP': 12.5, 'EUR/JPY': 6.5, 'GBP/JPY': 6.5,
};

/* ─── Theme constants ─── */
const T = {
  bg: '#0D0D0D', surface: '#121212', primary: '#BB86FC',
  secondary: '#03DAC6', destructive: '#CF6679', warning: '#F9A825',
  muted: '#9E9E9E', text: '#FFFFFF', textSecondary: '#B3B3B3',
} as const;

const EMPTY_FORM = {
  portfolioId: '', type: 'buy' as 'buy' | 'sell', strategy: '',
  emotionalState: '', confluence: [] as string[],
  entryPrice: '', exitPrice: '', quantity: '',
  stopLoss: '', targetPrice: '', fees: '0',
  notes: '', date: new Date().toISOString().split('T')[0],
  instrumentCategory: 'saham', lotSize: '', leverage: '1',
  pipValue: '10', fundingFee: '0', margin: '',
  screenshotBefore: '', screenshotAfter: '',
};

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
   ═══════════════════════════════════════════════════════════════════════════ */

const parseNum = (v: string) => (parseFloat(v) || 0);

const pnlColor = (val: number) => val >= 0 ? T.secondary : T.destructive;
const pnlSign = (val: number) => val > 0 ? '+' : '';

const parseConfluence = (c?: string | null): string[] => {
  if (!c) return [];
  try { const parsed = JSON.parse(c); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
};

/* ─── PnL Calculations ─── */
function calcSahamPnl(entry: number, exit: number, qty: number, fees: number) {
  return (exit - entry) * qty - fees;
}
function calcForexPnl(pips: number, lot: number, pipVal: number, fees: number) {
  return pips * lot * pipVal - fees;
}
function calcCryptoLinearPnl(entry: number, exit: number, size: number, lev: number, funding: number) {
  return (exit - entry) * size / lev - funding;
}
function calcCryptoInversePnl(entry: number, exit: number, size: number, funding: number) {
  return (1 / entry - 1 / exit) * size - funding;
}
function calcPnlPercent(pnl: number, entry: number, qty: number) {
  if (!entry || !qty) return 0;
  return (pnl / (entry * qty)) * 100;
}
function calcRiskMultiple(pnl: number, entry: number, sl: number, qty: number) {
  const risk = Math.abs(entry - sl) * qty;
  return risk > 0 ? pnl / risk : 0;
}
function calcLiquidation(entry: number, leverage: number, isLong: boolean) {
  if (!leverage || leverage <= 1) return 0;
  return isLong ? entry * (1 - 1 / leverage) : entry * (1 + 1 / leverage);
}
function calcForexPips(entry: number, exit: number, pair: string) {
  const isJpy = pair.includes('JPY');
  return isJpy ? (exit - entry) * 100 : (exit - entry) * 10000;
}

/* ─── Progress Ring SVG ─── */
function ProgressRing({ value, size = 64, strokeWidth = 5, color = T.primary }: {
  value: number; size?: number; strokeWidth?: number; color?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(value, 100) / 100) * circ;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function UltimateTradingJournal({ businessId }: UltimateTradingJournalProps) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();

  /* ─── State ─── */
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [portfolios, setPortfolios] = useState<PortfolioOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('nominal');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [strategyFilter, setStrategyFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<JournalEntry | null>(null);
  const [screenshotView, setScreenshotView] = useState<{ url: string; label: string } | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const fileInputBeforeRef = useRef<HTMLInputElement>(null);
  const fileInputAfterRef = useRef<HTMLInputElement>(null);

  /* ─── Data Fetching ─── */
  const fetchData = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const [jRes, pRes] = await Promise.all([
        fetch(`/api/business/${businessId}/journal`).then(r => r.json()),
        fetch(`/api/business/${businessId}/portfolio`).then(r => r.json()),
      ]);
      setJournals(jRes.journals || []);
      setPortfolios((pRes.portfolios || []).map((p: { id: string; symbol: string; type: string }) => ({
        id: p.id, symbol: p.symbol, type: p.type,
      })));
    } catch {
      setJournals([]);
      setPortfolios([]);
    } finally { setLoading(false); }
  }, [businessId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ─── Computed Values ─── */
  const getSymbol = useCallback((pid: string) =>
    portfolios.find(p => p.id === pid)?.symbol || '—', [portfolios]);

  const filtered = useMemo(() => {
    let result = journals.filter(j => {
      if (categoryFilter !== 'all' && j.instrumentCategory !== categoryFilter) return false;
      if (strategyFilter !== 'all' && j.strategy !== strategyFilter) return false;
      if (dateFrom && new Date(j.date) < new Date(dateFrom)) return false;
      if (dateTo && new Date(j.date) > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    });
    switch (sortOption) {
      case 'date-asc': result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); break;
      case 'pnl-desc': result.sort((a, b) => b.pnl - a.pnl); break;
      case 'pnl-asc': result.sort((a, b) => a.pnl - b.pnl); break;
      default: result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return result;
  }, [journals, categoryFilter, strategyFilter, dateFrom, dateTo, sortOption]);

  const closedTrades = useMemo(() =>
    filtered.filter(j => j.exitPrice != null && j.exitPrice > 0), [filtered]);

  const stats = useMemo(() => {
    const total = closedTrades.length;
    const wins = closedTrades.filter(j => j.pnl > 0).length;
    const losses = closedTrades.filter(j => j.pnl < 0).length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    const avgPnl = total > 0 ? closedTrades.reduce((s, j) => s + j.pnl, 0) / total : 0;
    const grossProfit = closedTrades.filter(j => j.pnl > 0).reduce((s, j) => s + j.pnl, 0);
    const grossLoss = Math.abs(closedTrades.filter(j => j.pnl < 0).reduce((s, j) => s + j.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    const avgWin = wins > 0 ? closedTrades.filter(j => j.pnl > 0).reduce((s, j) => s + j.pnl, 0) / wins : 0;
    const avgLoss = losses > 0 ? Math.abs(closedTrades.filter(j => j.pnl < 0).reduce((s, j) => s + j.pnl, 0)) / losses : 0;
    const avgWinLossRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;
    const expectancy = total > 0 ? closedTrades.reduce((s, j) => s + j.pnl, 0) / total : 0;

    // Max drawdown calculation
    let peak = 0, maxDD = 0, cumulative = 0;
    const sorted = [...closedTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (const j of sorted) {
      cumulative += j.pnl;
      if (cumulative > peak) peak = cumulative;
      const dd = peak - cumulative;
      if (dd > maxDD) maxDD = dd;
    }

    // This month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = closedTrades.filter(j => new Date(j.date) >= monthStart).length;

    return { total, winRate, avgPnl, profitFactor, expectancy, maxDD, avgWinLossRatio, thisMonth };
  }, [closedTrades]);

  /* ─── Form Calculations (live) ─── */
  const livePnl = useMemo(() => {
    const entry = parseNum(form.entryPrice);
    const exit = parseNum(form.exitPrice);
    const qty = parseNum(form.quantity);
    const fees = parseNum(form.fees);
    const sl = parseNum(form.stopLoss);
    if (!entry || !exit) return { pnl: 0, pnlPct: 0, rm: 0, liqPrice: 0 };

    let pnl = 0;
    const cat = form.instrumentCategory;
    if (cat === 'saham') {
      pnl = calcSahamPnl(entry, exit, qty, fees);
    } else if (cat === 'forex') {
      const pair = form.portfolioId ? '' : '';
      const pips = (exit - entry) * 10000;
      pnl = calcForexPnl(pips, parseNum(form.lotSize) || 1, parseNum(form.pipValue) || 10, fees);
    } else if (cat === 'crypto_perpetual') {
      const lev = parseNum(form.leverage) || 1;
      pnl = calcCryptoLinearPnl(entry, exit, qty, lev, parseNum(form.fundingFee));
    }
    const pnlPct = calcPnlPercent(pnl, entry, qty);
    const rm = sl > 0 ? calcRiskMultiple(pnl, entry, sl, qty) : 0;
    const lev = parseNum(form.leverage) || 1;
    const liqPrice = cat === 'crypto_perpetual' ? calcLiquidation(entry, lev, form.type === 'buy') : 0;
    return { pnl, pnlPct, rm, liqPrice };
  }, [form.entryPrice, form.exitPrice, form.quantity, form.fees, form.stopLoss,
    form.lotSize, form.pipValue, form.leverage, form.fundingFee, form.instrumentCategory, form.type, form.portfolioId]);

  /* ─── Display Mode Formatter ─── */
  const formatPnlDisplay = (entry: JournalEntry) => {
    if (displayMode === 'percentage') {
      return `${pnlSign(entry.pnlPercentage)}${entry.pnlPercentage.toFixed(2)}%`;
    }
    if (displayMode === 'rmultiple') {
      const rm = entry.riskMultiple || entry.riskReward || 0;
      return `${pnlSign(rm)}${rm.toFixed(2)}R`;
    }
    return `${pnlSign(entry.pnl)}${formatAmount(entry.pnl)}`;
  };

  /* ─── Handlers ─── */
  const updateForm = (patch: Partial<typeof EMPTY_FORM>) => setForm(prev => ({ ...prev, ...patch }));

  const toggleConfluence = (item: string) => {
    setForm(prev => ({
      ...prev,
      confluence: prev.confluence.includes(item)
        ? prev.confluence.filter(c => c !== item)
        : [...prev.confluence, item],
    }));
  };

  const handleScreenshot = (field: 'screenshotBefore' | 'screenshotAfter', file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => updateForm({ [field]: e.target?.result as string });
    reader.readAsDataURL(file);
  };

  const resetForm = () => { setForm(EMPTY_FORM); setEditing(null); };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (item: JournalEntry) => {
    setEditing(item);
    setForm({
      portfolioId: item.portfolioId, type: (item.type as 'buy' | 'sell'),
      strategy: item.strategy || '', emotionalState: item.emotionalState || '',
      confluence: parseConfluence(item.confluence),
      entryPrice: String(item.entryPrice), exitPrice: String(item.exitPrice || ''),
      quantity: String(item.quantity), stopLoss: '', targetPrice: '',
      fees: String(item.fees), notes: item.notes || '',
      date: item.date.split('T')[0],
      instrumentCategory: item.instrumentCategory || 'saham',
      lotSize: String(item.lotSize || ''), leverage: String(item.leverage || '1'),
      pipValue: String(item.pipValue || '10'), fundingFee: String(item.fundingFee || '0'),
      margin: '', screenshotBefore: item.screenshotBefore || '',
      screenshotAfter: item.screenshotAfter || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.portfolioId || !form.entryPrice || !form.quantity) {
      toast.error('Portfolio, Entry Price, and Quantity are required');
      return;
    }
    setSaving(true);
    try {
      const entry = parseNum(form.entryPrice);
      const exit = parseNum(form.exitPrice);
      const qty = parseNum(form.quantity);
      const fees = parseNum(form.fees);
      const sl = parseNum(form.stopLoss);
      const cat = form.instrumentCategory;
      let pnl = 0;
      if (exit > 0) {
        if (cat === 'saham') pnl = calcSahamPnl(entry, exit, qty, fees);
        else if (cat === 'forex') pnl = calcForexPnl((exit - entry) * 10000, parseNum(form.lotSize) || 1, parseNum(form.pipValue) || 10, fees);
        else if (cat === 'crypto_perpetual') pnl = calcCryptoLinearPnl(entry, exit, qty, parseNum(form.leverage) || 1, parseNum(form.fundingFee));
      }
      const pnlPct = calcPnlPercent(pnl, entry, qty);
      const rm = sl > 0 ? calcRiskMultiple(pnl, entry, sl, qty) : 0;

      const body: Record<string, unknown> = {
        portfolioId: form.portfolioId, type: form.type,
        entryPrice: entry, exitPrice: exit > 0 ? exit : null,
        quantity: qty, pnl, pnlPercentage: pnlPct,
        riskReward: rm, fees,
        notes: form.notes || null,
        date: form.date || new Date().toISOString(),
        closedAt: exit > 0 ? new Date().toISOString() : null,
        strategy: form.strategy || null,
        emotionalState: form.emotionalState || null,
        confluence: form.confluence.length > 0 ? JSON.stringify(form.confluence) : null,
        screenshotBefore: form.screenshotBefore || null,
        screenshotAfter: form.screenshotAfter || null,
        instrumentCategory: form.instrumentCategory,
        lotSize: form.lotSize ? parseNum(form.lotSize) : null,
        pipValue: form.pipValue ? parseNum(form.pipValue) : null,
        leverage: form.leverage ? parseNum(form.leverage) : null,
        fundingFee: form.fundingFee ? parseNum(form.fundingFee) : null,
        liquidationPrice: livePnl.liqPrice || null,
        riskMultiple: rm || null,
      };

      const url = editing
        ? `/api/business/${businessId}/journal/${editing.id}`
        : `/api/business/${businessId}/journal`;
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success(editing ? 'Trade updated' : 'Trade added');
      setDialogOpen(false);
      fetchData();
    } catch {
      toast.error('Failed to save trade');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/business/${businessId}/journal/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Trade deleted');
      setDeleteTarget(null);
      fetchData();
    } catch { toast.error('Failed to delete'); }
  };

  const exportCSV = () => {
    if (!filtered.length) return;
    const headers = ['Date', 'Symbol', 'Type', 'Category', 'Entry', 'Exit', 'Qty', 'PnL', 'PnL%', 'R-Multiple', 'Strategy', 'Emotion', 'Fees', 'Notes'];
    const rows = filtered.map(j => [
      j.date.split('T')[0], getSymbol(j.portfolioId), j.type, j.instrumentCategory || '-',
      j.entryPrice, j.exitPrice || '-', j.quantity, j.pnl,
      j.pnlPercentage.toFixed(2), j.riskMultiple?.toFixed(2) || '-',
      j.strategy || '-', j.emotionalState || '-', j.fees, `"${(j.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `journal_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════════ */

  if (!businessId) return null;

  /* ─── Reusable Glass Card ─── */
  const Glass = ({ children, className = '', ...rest }: React.ComponentProps<'div'>) => (
    <div className={cn('bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-2xl', className)} {...rest}>
      {children}
    </div>
  );

  const inputCls = 'bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 text-white placeholder:text-white/30 text-sm h-11 transition-colors';
  const selectCls = 'bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 text-white text-sm h-11 transition-colors';
  const labelCls = 'text-[11px] sm:text-xs text-white/60 font-medium';

  /* ─── Foreground input styling overrides for dark theme ─── */
  const fgInputStyle = { colorScheme: 'dark' as const };

  return (
    <div className="space-y-4 md:space-y-5" style={{ color: T.text }}>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 1: HEADER
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${T.primary}20` }}>
            <BookOpen size={20} style={{ color: T.primary }} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: T.text }}>Trading Journal</h2>
            <p className="text-[11px]" style={{ color: T.muted }}>
              {filtered.length} trade{filtered.length !== 1 ? 's' : ''} tracked
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={exportCSV}
            className="h-11 w-11 p-0 rounded-xl border border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.04]">
            <Download size={16} />
          </Button>
          <Button onClick={openCreate}
            className="h-11 rounded-xl text-white font-medium active:scale-[0.98] transition-transform min-w-[44px]"
            style={{ background: `linear-gradient(135deg, ${T.primary}, ${T.secondary})` }}>
            <Plus size={18} className="mr-1.5" />
            <span className="hidden sm:inline">New Trade</span>
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2: STATS CARDS
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Total Trades', value: String(stats.total), icon: <Activity size={16} />, color: T.primary },
          { label: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`, icon: <Target size={16} />, color: T.secondary },
          { label: 'Avg PnL', value: `${pnlSign(stats.avgPnl)}${formatAmount(Math.abs(stats.avgPnl))}`, icon: stats.avgPnl >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />, color: pnlColor(stats.avgPnl) },
          { label: 'Profit Factor', value: stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2), icon: <BarChart3 size={16} />, color: T.warning },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 260, damping: 20 }}>
            <Glass className="p-4 hover:bg-white/[0.04] transition-colors cursor-default">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold" style={{ color: T.muted }}>{card.label}</span>
                <div style={{ color: `${card.color}40` }}>{card.icon}</div>
              </div>
              <p className="text-base sm:text-lg font-bold" style={{ color: card.color }}>{card.value}</p>
            </Glass>
          </motion.div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 3: FILTERS + DISPLAY MODE TOGGLE
          ═══════════════════════════════════════════════════════════ */}
      <Glass className="p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mb-1">
            <Filter size={14} className="shrink-0" style={{ color: T.muted }} />
            {['all', 'saham', 'forex', 'crypto_perpetual'].map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all min-h-[36px] active:scale-[0.98]',
                  categoryFilter === cat
                    ? 'text-white'
                    : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                )}
                style={categoryFilter === cat ? { background: `${T.primary}25`, color: T.primary } : undefined}>
                {cat === 'all' ? 'All' : cat === 'saham' ? 'Saham' : cat === 'forex' ? 'Forex' : 'Crypto'}
              </button>
            ))}
            <div className="flex-1" />

            {/* Strategy Filter */}
            <Select value={strategyFilter} onValueChange={setStrategyFilter}>
              <SelectTrigger className={cn(selectCls, 'w-auto min-w-[120px] h-8 text-[11px]')}>
                <SelectValue placeholder="Strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Strategies</SelectItem>
                {STRATEGIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range + Sort + Display Mode */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Calendar size={13} style={{ color: T.muted }} />
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className={cn(inputCls, 'h-8 w-[130px] text-[11px]')} style={fgInputStyle} />
              <span className="text-white/30 text-[11px]">→</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className={cn(inputCls, 'h-8 w-[130px] text-[11px]')} style={fgInputStyle} />
            </div>
            <div className="flex-1" />
            <Select value={sortOption} onValueChange={(v: SortOption) => setSortOption(v)}>
              <SelectTrigger className={cn(selectCls, 'w-auto min-w-[110px] h-8 text-[11px]')}>
                <ArrowUpDown size={12} className="mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="pnl-desc">PnL ↓</SelectItem>
                <SelectItem value="pnl-asc">PnL ↑</SelectItem>
              </SelectContent>
            </Select>

            {/* Display Mode Toggle */}
            <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.06] p-0.5">
              {([
                { key: 'nominal' as DisplayMode, icon: <DollarSign size={13} />, label: '$' },
                { key: 'percentage' as DisplayMode, icon: <Percent size={13} />, label: '%' },
                { key: 'rmultiple' as DisplayMode, icon: <Crosshair size={13} />, label: 'R' },
              ]).map(m => (
                <button key={m.key} onClick={() => setDisplayMode(m.key)}
                  className={cn(
                    'h-7 w-7 rounded-md flex items-center justify-center transition-all text-xs font-bold active:scale-[0.95]',
                    displayMode === m.key ? 'text-white' : 'text-white/30 hover:text-white/60'
                  )}
                  style={displayMode === m.key ? { background: `${T.primary}30`, color: T.primary } : undefined}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Glass>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 4: TRADE LIST (CARD-BASED)
          ═══════════════════════════════════════════════════════════ */}
      <Glass className="overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl bg-white/[0.03]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: `${T.primary}10`, border: `1px solid ${T.primary}20` }}>
              <BookOpen size={28} style={{ color: `${T.primary}60` }} />
            </div>
            <p className="text-sm font-medium" style={{ color: `${T.muted}` }}>No trades found</p>
            <p className="text-xs mt-1" style={{ color: `${T.textSecondary}50` }}>Add your first trade to start journaling</p>
          </motion.div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto p-2 sm:p-3 space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
            <AnimatePresence mode="popLayout">
              {filtered.map((trade, idx) => {
                const isBuy = trade.type === 'buy';
                const isProfit = trade.pnl >= 0;
                const isExpanded = expandedId === trade.id;
                const confluenceTags = parseConfluence(trade.confluence);

                return (
                  <motion.div key={trade.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }} transition={{ delay: idx * 0.03, type: 'spring', stiffness: 300, damping: 25 }}>
                    <div className={cn(
                      'rounded-xl p-3 sm:p-4 transition-colors cursor-pointer',
                      'hover:bg-white/[0.03] border',
                      isBuy ? 'border-l-[3px]' : 'border-l-[3px]',
                      isExpanded && 'bg-white/[0.03]'
                    )} style={{ borderColor: isExpanded ? 'rgba(255,255,255,0.08)' : 'transparent', borderLeftColor: isBuy ? T.secondary : T.destructive }}
                      onClick={() => setExpandedId(isExpanded ? null : trade.id)}>

                      {/* Card Header Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Badge className={cn(
                            'text-[10px] px-2 py-0.5 rounded-md font-semibold shrink-0 border-0',
                            isBuy ? 'bg-[#03DAC6]/15 text-[#03DAC6]' : 'bg-[#CF6679]/15 text-[#CF6679]'
                          )}>{isBuy ? 'BUY' : 'SELL'}</Badge>
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate" style={{ color: T.text }}>
                              {getSymbol(trade.portfolioId)}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {trade.strategy && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: `${T.primary}15`, color: T.primary }}>{trade.strategy}</span>
                              )}
                              {trade.emotionalState && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-0.5"
                                  style={{ background: `${T.warning}15`, color: T.warning }}>
                                  <Brain size={9} />{trade.emotionalState}
                                </span>
                              )}
                              {trade.instrumentCategory && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.05] text-white/40">{trade.instrumentCategory === 'crypto_perpetual' ? 'Crypto' : trade.instrumentCategory}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-2">
                          <div>
                            <p className={cn('text-sm font-bold', trade.pnl !== 0 ? '' : 'text-white/50')} style={trade.pnl !== 0 ? { color: pnlColor(trade.pnl) } : undefined}>
                              {trade.pnl !== 0 ? formatPnlDisplay(trade) : '—'}
                            </p>
                            <p className="text-[10px]" style={{ color: T.muted }}>
                              {new Date(trade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown size={14} style={{ color: T.muted }} />
                          </motion.div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                            className="overflow-hidden">
                            <Separator className="my-3 bg-white/[0.06]" />

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] mb-3">
                              <div><span style={{ color: T.muted }}>Entry</span><p className="font-semibold mt-0.5">{formatAmount(trade.entryPrice)}</p></div>
                              <div><span style={{ color: T.muted }}>Exit</span><p className="font-semibold mt-0.5">{trade.exitPrice ? formatAmount(trade.exitPrice) : '—'}</p></div>
                              <div><span style={{ color: T.muted }}>Qty</span><p className="font-semibold mt-0.5">{trade.quantity}</p></div>
                              <div><span style={{ color: T.muted }}>Fees</span><p className="font-semibold mt-0.5">{formatAmount(trade.fees)}</p></div>
                              {trade.riskMultiple != null && trade.riskMultiple !== 0 && (
                                <div><span style={{ color: T.muted }}>R-Multiple</span><p className="font-semibold mt-0.5" style={{ color: pnlColor(trade.riskMultiple) }}>{trade.riskMultiple.toFixed(2)}R</p></div>
                              )}
                              {trade.leverage && trade.leverage > 1 && (
                                <div><span style={{ color: T.muted }}>Leverage</span><p className="font-semibold mt-0.5">{trade.leverage}x</p></div>
                              )}
                              {trade.liquidationPrice && (
                                <div><span style={{ color: T.muted }}>Liq. Price</span><p className="font-semibold mt-0.5" style={{ color: T.destructive }}>{formatAmount(trade.liquidationPrice)}</p></div>
                              )}
                              {trade.pnlPercentage !== 0 && (
                                <div><span style={{ color: T.muted }}>PnL %</span><p className="font-semibold mt-0.5" style={{ color: pnlColor(trade.pnlPercentage) }}>{trade.pnlPercentage.toFixed(2)}%</p></div>
                              )}
                            </div>

                            {/* Confluence Tags */}
                            {confluenceTags.length > 0 && (
                              <div className="mb-3">
                                <p className="text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: T.muted }}>Confluence</p>
                                <div className="flex flex-wrap gap-1">
                                  {confluenceTags.map(tag => (
                                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md flex items-center gap-0.5"
                                      style={{ background: `${T.secondary}10`, color: T.secondary }}>
                                      <Zap size={8} />{tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Notes */}
                            {trade.notes && (
                              <p className="text-[11px] leading-relaxed mb-3 rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.03)', color: T.textSecondary }}>
                                {trade.notes}
                              </p>
                            )}

                            {/* Screenshots */}
                            <div className="flex gap-2 mb-3">
                              {trade.screenshotBefore && (
                                <button onClick={(e) => { e.stopPropagation(); setScreenshotView({ url: trade.screenshotBefore!, label: 'Before' }); }}
                                  className="w-16 h-16 rounded-lg overflow-hidden border border-white/[0.08] shrink-0 active:scale-[0.97] transition-transform">
                                  <img src={trade.screenshotBefore} alt="Before" className="w-full h-full object-cover" />
                                </button>
                              )}
                              {trade.screenshotAfter && (
                                <button onClick={(e) => { e.stopPropagation(); setScreenshotView({ url: trade.screenshotAfter!, label: 'After' }); }}
                                  className="w-16 h-16 rounded-lg overflow-hidden border border-white/[0.08] shrink-0 active:scale-[0.97] transition-transform">
                                  <img src={trade.screenshotAfter} alt="After" className="w-full h-full object-cover" />
                                </button>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" onClick={() => openEdit(trade)}
                                className="h-9 px-3 text-[11px] text-white/50 hover:text-white hover:bg-white/[0.06] rounded-lg">
                                <Pencil size={13} className="mr-1" />Edit
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(trade)}
                                className="h-9 px-3 text-[11px] hover:bg-[#CF6679]/10 rounded-lg"
                                style={{ color: T.destructive }}>
                                <Trash2 size={13} className="mr-1" />Delete
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </Glass>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 5: PERFORMANCE ANALYTICS
          ═══════════════════════════════════════════════════════════ */}
      {closedTrades.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h3 className="text-xs uppercase tracking-wider font-bold mb-3 flex items-center gap-2" style={{ color: T.muted }}>
            <BarChart3 size={14} /> Performance Analytics
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              {
                label: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`,
                extra: <ProgressRing value={stats.winRate} size={40} strokeWidth={3} color={stats.winRate >= 50 ? T.secondary : T.destructive} />,
                color: stats.winRate >= 50 ? T.secondary : T.destructive,
              },
              {
                label: 'Profit Factor', value: stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2),
                sub: stats.profitFactor >= 1.5 ? 'Excellent' : stats.profitFactor >= 1 ? 'Good' : 'Needs work',
                color: stats.profitFactor >= 1.5 ? T.secondary : stats.profitFactor >= 1 ? T.warning : T.destructive,
              },
              {
                label: 'Expectancy', value: `${pnlSign(stats.expectancy)}${formatAmount(Math.abs(stats.expectancy))}`,
                sub: 'Avg $/trade', color: pnlColor(stats.expectancy),
              },
              {
                label: 'Max Drawdown', value: formatAmount(stats.maxDD),
                sub: 'Peak to valley', color: T.destructive,
              },
              {
                label: 'Avg W/L Ratio', value: stats.avgWinLossRatio === Infinity ? '∞' : stats.avgWinLossRatio.toFixed(2),
                sub: `${stats.avgWinLossRatio >= 2 ? 'Strong' : stats.avgWinLossRatio >= 1 ? 'Moderate' : 'Weak'}`,
                color: stats.avgWinLossRatio >= 2 ? T.secondary : stats.avgWinLossRatio >= 1 ? T.warning : T.destructive,
              },
              {
                label: 'This Month', value: String(stats.thisMonth),
                sub: 'Closed trades', color: T.primary,
              },
            ].map((metric, i) => (
              <motion.div key={metric.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.06, type: 'spring' }}>
                <Glass className="p-3 sm:p-4 flex flex-col items-center text-center">
                  {metric.extra}
                  <p className="text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold mt-1.5 mb-1" style={{ color: T.muted }}>
                    {metric.label}
                  </p>
                  <p className="text-sm sm:text-base font-bold" style={{ color: metric.color }}>{metric.value}</p>
                  {'sub' in metric && metric.sub && (
                    <p className="text-[10px] mt-0.5" style={{ color: T.textSecondary }}>{metric.sub}</p>
                  )}
                </Glass>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          SECTION 6: TRADE ENTRY DIALOG
          ═══════════════════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[540px] max-w-[calc(100vw-1rem)] p-0 overflow-hidden rounded-2xl"
          style={{ background: T.surface, border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="max-h-[90vh] overflow-y-auto p-4 sm:p-5 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
            <DialogHeader>
              <DialogTitle className="text-white text-base">{editing ? 'Edit Trade' : 'New Trade'}</DialogTitle>
              <DialogDescription className="text-white/50 text-xs">Record your trade details for performance analysis</DialogDescription>
            </DialogHeader>

            {/* ── Buy/Sell Toggle + Portfolio ── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className={labelCls}>Type</Label>
                <div className="flex gap-2 mt-1.5">
                  {(['buy', 'sell'] as const).map(tp => (
                    <button key={tp} onClick={() => updateForm({ type: tp })}
                      className={cn(
                        'flex-1 h-11 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]',
                        form.type === tp ? 'text-white' : 'bg-white/[0.04] text-white/40 hover:text-white/60'
                      )}
                      style={form.type === tp ? { background: tp === 'buy' ? `${T.secondary}20` : `${T.destructive}20`, color: tp === 'buy' ? T.secondary : T.destructive, border: `1px solid ${tp === 'buy' ? T.secondary : T.destructive}40` } : { border: '1px solid rgba(255,255,255,0.06)' }}>
                      {tp === 'buy' ? '▲ Buy / Long' : '▼ Sell / Short'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-2">
                <Label className={labelCls}>Portfolio / Asset *</Label>
                <Select value={form.portfolioId} onValueChange={v => updateForm({ portfolioId: v })}>
                  <SelectTrigger className={cn(selectCls, 'mt-1.5')}><SelectValue placeholder="Select asset" /></SelectTrigger>
                  <SelectContent>
                    {portfolios.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.symbol} <span className="text-white/30 text-[10px]">({p.type})</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="bg-white/[0.06]" />

            {/* ── Strategy + Emotional State + Category ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className={labelCls}>Strategy</Label>
                <Select value={form.strategy} onValueChange={v => updateForm({ strategy: v })}>
                  <SelectTrigger className={cn(selectCls, 'mt-1.5')}><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {STRATEGIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={labelCls}>Emotional State</Label>
                <Select value={form.emotionalState} onValueChange={v => updateForm({ emotionalState: v })}>
                  <SelectTrigger className={cn(selectCls, 'mt-1.5')}><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {EMOTIONAL_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={labelCls}>Instrument</Label>
                <Select value={form.instrumentCategory} onValueChange={v => updateForm({ instrumentCategory: v })}>
                  <SelectTrigger className={cn(selectCls, 'mt-1.5')}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saham">Saham</SelectItem>
                    <SelectItem value="forex">Forex</SelectItem>
                    <SelectItem value="crypto_perpetual">Crypto Perpetual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="bg-white/[0.06]" />

            {/* ── Price Fields ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className={labelCls}>Entry Price *</Label>
                <Input type="number" value={form.entryPrice} onChange={e => updateForm({ entryPrice: e.target.value })}
                  placeholder="0" min="0" step="any" className={cn(inputCls, 'mt-1.5')} style={fgInputStyle} />
              </div>
              <div>
                <Label className={labelCls}>Exit Price</Label>
                <Input type="number" value={form.exitPrice} onChange={e => updateForm({ exitPrice: e.target.value })}
                  placeholder="0" min="0" step="any" className={cn(inputCls, 'mt-1.5')} style={fgInputStyle} />
              </div>
              <div>
                <Label className={labelCls}>Quantity *</Label>
                <Input type="number" value={form.quantity} onChange={e => updateForm({ quantity: e.target.value })}
                  placeholder="0" min="0" step="any" className={cn(inputCls, 'mt-1.5')} style={fgInputStyle} />
              </div>
              <div>
                <Label className={labelCls}>Fees</Label>
                <Input type="number" value={form.fees} onChange={e => updateForm({ fees: e.target.value })}
                  placeholder="0" min="0" step="any" className={cn(inputCls, 'mt-1.5')} style={fgInputStyle} />
              </div>
            </div>

            {/* ── Stop Loss + Target ── */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className={labelCls}>Stop Loss</Label>
                <Input type="number" value={form.stopLoss} onChange={e => updateForm({ stopLoss: e.target.value })}
                  placeholder="0" step="any" className={cn(inputCls, 'mt-1.5')} style={fgInputStyle} />
              </div>
              <div>
                <Label className={labelCls}>Target Price</Label>
                <Input type="number" value={form.targetPrice} onChange={e => updateForm({ targetPrice: e.target.value })}
                  placeholder="0" step="any" className={cn(inputCls, 'mt-1.5')} style={fgInputStyle} />
              </div>
            </div>

            {/* ── Instrument-Specific: Saham ── */}
            {form.instrumentCategory === 'saham' && (
              <div className="rounded-xl p-3 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: T.primary }}>Saham Fields</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={labelCls}>Lot Size</Label>
                    <Input type="number" value={form.lotSize} onChange={e => updateForm({ lotSize: e.target.value })}
                      placeholder="100" className={cn(inputCls, 'mt-1.5')} style={fgInputStyle} />
                  </div>
                  <div>
                    <Label className={labelCls}>Price per Share</Label>
                    <Input type="number" value={form.entryPrice} readOnly
                      className={cn(inputCls, 'mt-1.5 opacity-60')} style={fgInputStyle} />
                  </div>
                </div>
              </div>
            )}

            {/* ── Instrument-Specific: Forex ── */}
            {form.instrumentCategory === 'forex' && (
              <div className="rounded-xl p-3 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: T.primary }}>Forex Fields</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className={labelCls}>Currency Pair</Label>
                    <Select value="" onValueChange={v => updateForm({ pipValue: String(FOREX_PIP_VALUES[v] || 10) })}>
                      <SelectTrigger className={cn(selectCls, 'mt-1.5')}><SelectValue placeholder="Pair" /></SelectTrigger>
                      <SelectContent>
                        {FOREX_PAIRS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className={labelCls}>Lot Size</Label>
                    <Select value={form.lotSize} onValueChange={v => updateForm({ lotSize: v })}>
                      <SelectTrigger className={cn(selectCls, 'mt-1.5')}><SelectValue placeholder="Lot" /></SelectTrigger>
                      <SelectContent>
                        {FOREX_LOT_SIZES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className={labelCls}>Leverage</Label>
                    <Input type="number" value={form.leverage} onChange={e => updateForm({ leverage: e.target.value })}
                      placeholder="100" className={cn(inputCls, 'mt-1.5')} style={fgInputStyle} />
                  </div>
                  <div>
                    <Label className={labelCls}>Pip Value ($)</Label>
                    <Input type="number" value={form.pipValue} onChange={e => updateForm({ pipValue: e.target.value })}
                      placeholder="10" className={cn(inputCls, 'mt-1.5')} style={fgInputStyle} />
                  </div>
                </div>
                {form.entryPrice && form.exitPrice && (
                  <div className="flex gap-3 text-[11px]">
                    <span style={{ color: T.muted }}>Pips: <span className="font-bold text-white">{((parseNum(form.exitPrice) - parseNum(form.entryPrice)) * 10000).toFixed(1)}</span></span>
                  </div>
                )}
              </div>
            )}

            {/* ── Instrument-Specific: Crypto Perpetual ── */}
            {form.instrumentCategory === 'crypto_perpetual' && (
              <div className="rounded-xl p-3 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: T.primary }}>Crypto Perpetual Fields</p>

                <div>
                  <Label className={labelCls}>Leverage: <span className="font-bold" style={{ color: T.warning }}>{form.leverage}x</span></Label>
                  <div className="mt-2">
                    <Slider value={[parseNum(form.leverage) || 1]} min={1} max={125} step={1}
                      onValueChange={v => updateForm({ leverage: String(v[0]) })}
                      className="py-2" />
                    <div className="flex justify-between text-[10px]" style={{ color: T.muted }}>
                      <span>1x</span><span>25x</span><span>50x</span><span>75x</span><span>100x</span><span>125x</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={labelCls}>Margin</Label>
                    <Input type="number" value={form.margin} onChange={e => updateForm({ margin: e.target.value })}
                      placeholder="0" className={cn(inputCls, 'mt-1.5')} style={fgInputStyle} />
                  </div>
                  <div>
                    <Label className={labelCls}>Funding Fee</Label>
                    <Input type="number" value={form.fundingFee} onChange={e => updateForm({ fundingFee: e.target.value })}
                      placeholder="0" className={cn(inputCls, 'mt-1.5')} style={fgInputStyle} />
                  </div>
                </div>

                {livePnl.liqPrice > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: `${T.destructive}10`, border: `1px solid ${T.destructive}20` }}>
                    <AlertTriangle size={14} style={{ color: T.destructive }} />
                    <span className="text-[11px]" style={{ color: T.destructive }}>
                      Est. Liquidation: <span className="font-bold">{formatAmount(livePnl.liqPrice)}</span>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ── Live Calculations Preview ── */}
            {form.entryPrice && form.exitPrice && parseNum(form.exitPrice) > 0 && (
              <div className="rounded-xl p-3 grid grid-cols-3 gap-3 text-center"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: T.muted }}>PnL</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: pnlColor(livePnl.pnl) }}>
                    {pnlSign(livePnl.pnl)}{formatAmount(Math.abs(livePnl.pnl))}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: T.muted }}>PnL %</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: pnlColor(livePnl.pnl) }}>
                    {pnlSign(livePnl.pnlPct)}{livePnl.pnlPct.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: T.muted }}>R-Multiple</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: pnlColor(livePnl.rm) }}>
                    {pnlSign(livePnl.rm)}{livePnl.rm.toFixed(2)}R
                  </p>
                </div>
              </div>
            )}

            <Separator className="bg-white/[0.06]" />

            {/* ── Confluence ── */}
            <div>
              <Label className={labelCls}>Confluence Factors</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {CONFLUENCE_OPTIONS.map(item => (
                  <label key={item} className="flex items-center gap-2 cursor-pointer group min-h-[36px] rounded-lg px-2 hover:bg-white/[0.04] transition-colors">
                    <Checkbox checked={form.confluence.includes(item)} onCheckedChange={() => toggleConfluence(item)}
                      className="border-white/20 data-[state=checked]:bg-[#BB86FC] data-[state=checked]:border-[#BB86FC]" />
                    <span className="text-[11px] text-white/60 group-hover:text-white/80 transition-colors">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            <Separator className="bg-white/[0.06]" />

            {/* ── Date + Notes ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className={labelCls}>Date</Label>
                <Input type="date" value={form.date} onChange={e => updateForm({ date: e.target.value })}
                  className={cn(inputCls, 'mt-1.5')} style={fgInputStyle} />
              </div>
            </div>

            <div>
              <Label className={labelCls}>Notes</Label>
              <Textarea value={form.notes} onChange={e => updateForm({ notes: e.target.value })}
                placeholder="Trade rationale, observations..."
                className="bg-white/[0.04] border-white/[0.08] rounded-xl focus:border-white/15 focus:ring-0 text-white placeholder:text-white/30 min-h-[70px] mt-1.5 text-sm" />
            </div>

            {/* ── Screenshots ── */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className={labelCls}>Screenshot Before</Label>
                <input ref={fileInputBeforeRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleScreenshot('screenshotBefore', f); e.target.value = ''; }} />
                <div className="mt-1.5 space-y-2">
                  {form.screenshotBefore ? (
                    <div className="relative group">
                      <img src={form.screenshotBefore} alt="Before" className="w-full h-20 object-cover rounded-lg border border-white/[0.08]" />
                      <button onClick={() => updateForm({ screenshotBefore: '' })}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => fileInputBeforeRef.current?.click()}
                      className="w-full h-20 rounded-lg border border-dashed border-white/[0.1] flex flex-col items-center justify-center gap-1 hover:bg-white/[0.03] transition-colors active:scale-[0.98]">
                      <Camera size={16} style={{ color: T.muted }} />
                      <span className="text-[10px]" style={{ color: T.muted }}>Upload Image</span>
                    </button>
                  )}
                </div>
              </div>
              <div>
                <Label className={labelCls}>Screenshot After</Label>
                <input ref={fileInputAfterRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleScreenshot('screenshotAfter', f); e.target.value = ''; }} />
                <div className="mt-1.5 space-y-2">
                  {form.screenshotAfter ? (
                    <div className="relative group">
                      <img src={form.screenshotAfter} alt="After" className="w-full h-20 object-cover rounded-lg border border-white/[0.08]" />
                      <button onClick={() => updateForm({ screenshotAfter: '' })}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => fileInputAfterRef.current?.click()}
                      className="w-full h-20 rounded-lg border border-dashed border-white/[0.1] flex flex-col items-center justify-center gap-1 hover:bg-white/[0.03] transition-colors active:scale-[0.98]">
                      <Camera size={16} style={{ color: T.muted }} />
                      <span className="text-[10px]" style={{ color: T.muted }}>Upload Image</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Dialog Actions ── */}
            <DialogFooter className="flex-row gap-2 pt-2 sm:pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}
                className="flex-1 h-11 rounded-xl border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.04]">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !form.portfolioId || !form.entryPrice || !form.quantity}
                className="flex-1 h-11 rounded-xl text-white font-medium active:scale-[0.98] transition-transform disabled:opacity-40"
                style={{ background: `linear-gradient(135deg, ${T.primary}, ${T.secondary})` }}>
                {saving ? 'Saving...' : editing ? 'Update Trade' : 'Save Trade'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 7: DELETE CONFIRMATION
          ═══════════════════════════════════════════════════════════ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl" style={{ background: T.surface, border: '1px solid rgba(255,255,255,0.08)' }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Trade</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              This will permanently delete the trade for <span className="text-white font-medium">{deleteTarget ? getSymbol(deleteTarget.portfolioId) : ''}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-white/[0.08] text-white/60 hover:bg-white/[0.04]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}
              className="rounded-xl text-white font-medium"
              style={{ background: T.destructive }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 8: SCREENSHOT VIEWER
          ═══════════════════════════════════════════════════════════ */}
      <Dialog open={!!screenshotView} onOpenChange={() => setScreenshotView(null)}>
        <DialogContent className="sm:max-w-[600px] max-w-[calc(100vw-2rem)] p-2 rounded-2xl"
          style={{ background: '#000', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="relative">
            {screenshotView && (
              <img src={screenshotView.url} alt={screenshotView.label}
                className="w-full rounded-lg max-h-[80vh] object-contain" />
            )}
            <div className="absolute top-3 right-3">
              <button onClick={() => setScreenshotView(null)}
                className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors">
                <X size={14} className="text-white" />
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
