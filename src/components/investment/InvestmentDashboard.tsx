'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useBusinessStore } from '@/store/useBusinessStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { formatAssetPrice, currencyPrefix } from '@/lib/asset-catalogue';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Trophy,
  Activity,
  BarChart3,
  RefreshCw,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import InvestmentChart from '@/components/investment/InvestmentChart';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

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

interface LivePrice {
  price: number;
  change24h: number;
}

// ── Design Tokens ────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, { bg: string; text: string; hex: string }> = {
  saham: { bg: 'rgba(187,134,252,0.12)', text: '#BB86FC', hex: '#BB86FC' },
  crypto: { bg: 'rgba(3,218,198,0.12)', text: '#03DAC6', hex: '#03DAC6' },
  forex: { bg: 'rgba(207,102,121,0.12)', text: '#CF6679', hex: '#CF6679' },
};

const UP_COLOR = '#03DAC6';
const DOWN_COLOR = '#CF6679';

// ── Component ────────────────────────────────────────────────────────────────

export default function InvestmentDashboard() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const { formatAmount } = useCurrencyFormat();
  const businessId = activeBusiness?.id;

  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [livePrices, setLivePrices] = useState<Record<string, LivePrice>>({});
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);
  const abortRef = useRef<AbortController | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch portfolios ──────────────────────────────────────────────────────
  const loadingRef = useRef(true);
  const portfoliosRef = useRef<PortfolioItem[]>([]);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    loadingRef.current = true;
    fetch(`/api/business/${businessId}/portfolio`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((result) => {
        if (!cancelled) {
          portfoliosRef.current = result.portfolios || [];
          setPortfolios(portfoliosRef.current);
          loadingRef.current = false;
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          portfoliosRef.current = [];
          setPortfolios([]);
          loadingRef.current = false;
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [businessId]);

  // ── Fetch live prices for portfolio assets only ───────────────────────────
  const fetchLivePrices = useCallback((isRefresh = false) => {
    if (!businessId || portfolios.length === 0) return;

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const symbols = portfolios
      .filter((p) => p.status === 'open')
      .map((p) => ({ type: p.type, symbol: p.symbol }));

    if (symbols.length === 0) return;

    fetch(`/api/business/${businessId}/market-data/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols }),
      signal: abortRef.current.signal,
    })
      .then((r) => (r.ok ? r.json() : { prices: {} }))
      .then((data: { prices?: Record<string, LivePrice> }) => {
        setLivePrices(data.prices || {});
        if (isRefresh) setCountdown(30);
      })
      .catch(() => {});
  }, [businessId, portfolios]);

  // ── Auto-refresh countdown ────────────────────────────────────────────────
  useEffect(() => {
    if (!businessId || portfolios.length === 0) return;

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchLivePrices(true);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [businessId, portfolios, fetchLivePrices]);

  // ── Computed data ─────────────────────────────────────────────────────────
  const openPortfolios = useMemo(() => portfolios.filter((p) => p.status === 'open'), [portfolios]);

  const stats = useMemo(() => {
    const closed = portfolios.filter((p) => p.status === 'closed');
    const totalValue = openPortfolios.reduce((s, p) => s + p.currentValue, 0);
    const investedValue = openPortfolios.reduce((s, p) => s + p.investedValue, 0);
    const unrealizedPnl = openPortfolios.reduce((s, p) => s + p.unrealizedPnl, 0);
    const realizedPnl = closed.reduce((s, p) => s + p.unrealizedPnl, 0);
    const winTrades = closed.filter((p) => p.unrealizedPnl > 0).length;
    const totalTrades = closed.length;
    const winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;
    return { totalValue, investedValue, unrealizedPnl, realizedPnl, winRate, totalTrades };
  }, [portfolios, openPortfolios]);

  const allocationData = useMemo(() => {
    const byType: Record<string, { value: number; count: number }> = {};
    openPortfolios.forEach((p) => {
      if (!byType[p.type]) byType[p.type] = { value: 0, count: 0 };
      byType[p.type].value += p.currentValue;
      byType[p.type].count++;
    });
    return Object.entries(byType).map(([type, { value, count }]) => ({
      type,
      value,
      count,
      color: TYPE_COLORS[type]?.hex || '#888',
      pct: stats.totalValue > 0 ? ((value / stats.totalValue) * 100).toFixed(1) : '0',
    }));
  }, [openPortfolios, stats.totalValue]);

  const sortedPositions = useMemo(() => {
    return [...openPortfolios].sort(
      (a, b) => Math.abs(b.unrealizedPnlPercentage) - Math.abs(a.unrealizedPnlPercentage)
    );
  }, [openPortfolios]);

  const pnlColor = (val: number) => (val >= 0 ? UP_COLOR : DOWN_COLOR);
  const fmtPrice = (type: string, val: number) => {
    const prefix = currencyPrefix(type as 'saham' | 'crypto' | 'forex');
    return `${prefix}${formatAssetPrice(val, type as 'saham' | 'crypto' | 'forex')}`;
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-white/50 text-center">{t('inv.registerFirst')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-[#1A1A2E]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-[420px] rounded-xl bg-[#1A1A2E] lg:col-span-2" />
          <Skeleton className="h-[420px] rounded-xl bg-[#1A1A2E]" />
        </div>
      </div>
    );
  }

  if (portfolios.length === 0) {
    return (
      <Card className="bg-[#1A1A2E] border-white/[0.06]">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <BarChart3 className="h-14 w-14 text-white/15 mb-4" />
          <p className="text-white/40 text-center mb-1">{t('inv.noInvData')}</p>
          <p className="text-white/25 text-sm text-center">{t('inv.startInvesting')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Ticker Bar (Bloomberg-style) ── */}
      {sortedPositions.length > 0 && (
        <div className="rounded-xl bg-[#0D0D0D] border border-white/[0.06] px-4 py-2.5 overflow-hidden">
          <div className="flex items-center gap-4 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1.5 shrink-0">
              <Activity className="h-3.5 w-3.5 text-[#03DAC6] animate-pulse" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Live</span>
            </div>
            <div className="h-4 w-px bg-white/[0.08] shrink-0" />
            {sortedPositions.map((p) => {
              const live = livePrices[`${p.type}:${p.symbol}`];
              const change = live?.change24h ?? 0;
              const price = live?.price ?? p.currentPrice;
              const isUp = change >= 0;
              const tc = TYPE_COLORS[p.type];
              return (
                <div key={p.symbol} className="flex items-center gap-2.5 shrink-0 px-1">
                  <div className="flex items-center gap-1.5">
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', tc?.bg)} style={{ color: tc?.text }}>
                      {p.symbol}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-white/80">{fmtPrice(p.type, price)}</span>
                  <span className={cn('text-[11px] font-mono font-medium', isUp ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                    {isUp ? '+' : ''}{change.toFixed(2)}%
                  </span>
                  <div className="h-4 w-px bg-white/[0.06]" />
                </div>
              );
            })}
            <div className="flex items-center gap-1.5 shrink-0 pl-1">
              <RefreshCw className="h-3 w-3 text-white/20" />
              <span className="text-[10px] text-white/25 font-mono">{countdown}s</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: t('inv.portfolioValue'),
            value: formatAmount(stats.totalValue),
            sub: formatAmount(stats.investedValue) + ' invested',
            icon: Wallet,
            color: '#BB86FC',
          },
          {
            label: t('inv.unrealizedPnL'),
            value: (stats.unrealizedPnl >= 0 ? '+' : '') + formatAmount(stats.unrealizedPnl),
            sub: ((stats.investedValue > 0 ? (stats.unrealizedPnl / stats.investedValue) * 100 : 0)).toFixed(2) + '% return',
            icon: stats.unrealizedPnl >= 0 ? TrendingUp : TrendingDown,
            color: pnlColor(stats.unrealizedPnl),
          },
          {
            label: t('inv.realizedPnL'),
            value: (stats.realizedPnl >= 0 ? '+' : '') + formatAmount(stats.realizedPnl),
            sub: stats.totalTrades + ' trades closed',
            icon: stats.realizedPnl >= 0 ? TrendingUp : TrendingDown,
            color: pnlColor(stats.realizedPnl),
          },
          {
            label: t('inv.winRate'),
            value: stats.winRate.toFixed(1) + '%',
            sub: stats.totalTrades > 0 ? `${stats.winRate >= 50 ? 'Profitable' : 'Review strategy'}` : 'No closed trades',
            icon: Trophy,
            color: stats.winRate >= 50 ? '#03DAC6' : '#CF6679',
          },
        ].map((card) => (
          <Card key={card.label} className="bg-[#1A1A2E] border-white/[0.06]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-white/40 uppercase tracking-wider font-medium">{card.label}</p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${card.color}18` }}>
                  <card.icon className="h-4 w-4" style={{ color: card.color }} />
                </div>
              </div>
              <p className="text-lg font-bold tracking-tight" style={{ color: card.color }}>{card.value}</p>
              <p className="text-[11px] text-white/30 mt-0.5 font-mono">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Charts Column (2/3 width) ── */}
        <div className="lg:col-span-2 space-y-4">
          {sortedPositions.length > 0 ? (
            <>
              {/* Featured Chart (largest position) */}
              <Card className="bg-[#0D0D0D] border-white/[0.06] overflow-hidden">
                <CardContent className="p-0">
                  <InvestmentChart
                    symbol={sortedPositions[0].symbol}
                    type={sortedPositions[0].type as 'saham' | 'crypto' | 'forex'}
                    height={340}
                  />
                </CardContent>
              </Card>

              {/* Other Position Charts Grid */}
              {sortedPositions.length > 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sortedPositions.slice(1, 5).map((p) => (
                    <Card key={p.id} className="bg-[#0D0D0D] border-white/[0.06] overflow-hidden group">
                      <CardContent className="p-0">
                        {/* Chart header overlay */}
                        <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-xs font-bold">{p.symbol}</span>
                            <Badge
                              className="text-[9px] px-1.5 py-0 h-4 font-medium border-0"
                              style={{ backgroundColor: TYPE_COLORS[p.type]?.bg, color: TYPE_COLORS[p.type]?.text }}
                            >
                              {p.type.toUpperCase()}
                            </Badge>
                            <span className={cn('text-[11px] font-mono font-medium',
                              p.unrealizedPnlPercentage >= 0 ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                              {p.unrealizedPnlPercentage >= 0 ? '+' : ''}{p.unrealizedPnlPercentage.toFixed(2)}%
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-white hover:bg-white/10"
                            onClick={() => setExpandedChart(`${p.type}:${p.symbol}`)}
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <InvestmentChart
                          symbol={p.symbol}
                          type={p.type as 'saham' | 'crypto' | 'forex'}
                          height={220}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Show chart expand button for featured */}
              {sortedPositions.length > 0 && (
                <div className="flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/30 hover:text-white/60 hover:bg-white/[0.04] text-xs gap-1.5"
                    onClick={() => setExpandedChart(`${sortedPositions[0].type}:${sortedPositions[0].symbol}`)}
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                    Expand {sortedPositions[0].symbol} Chart
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Card className="bg-[#1A1A2E] border-white/[0.06]">
              <CardContent className="flex flex-col items-center justify-center py-20">
                <BarChart3 className="h-12 w-12 text-white/15 mb-3" />
                <p className="text-white/30 text-sm">No open positions</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Sidebar (1/3 width) ── */}
        <div className="space-y-4">
          {/* Allocation Ring */}
          {allocationData.length > 0 && (
            <Card className="bg-[#1A1A2E] border-white/[0.06]">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-white/40 uppercase tracking-wider font-medium">{t('inv.invAllocation')}</p>
                  <Badge variant="outline" className="border-white/[0.06] text-white/30 text-[10px]">
                    {openPortfolios.length} open
                  </Badge>
                </div>

                {/* Custom allocation bars */}
                <div className="space-y-2.5">
                  {allocationData.map((item) => (
                    <div key={item.type} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-xs text-white/60 capitalize font-medium">{item.type}</span>
                          <span className="text-[10px] text-white/25">({item.count})</span>
                        </div>
                        <span className="text-xs text-white/50 font-mono">{item.pct}%</span>
                      </div>
                      <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Positions Table (Bloomberg-style) */}
          <Card className="bg-[#1A1A2E] border-white/[0.06]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Positions</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-white/30 hover:text-white/60 hover:bg-white/[0.06]"
                  onClick={() => fetchLivePrices(true)}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  <span className="text-[10px]">{countdown}s</span>
                </Button>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left text-[10px] text-white/30 uppercase tracking-wider pb-2 pr-2">Asset</th>
                      <th className="text-right text-[10px] text-white/30 uppercase tracking-wider pb-2 pr-2">Price</th>
                      <th className="text-right text-[10px] text-white/30 uppercase tracking-wider pb-2 pr-2">Qty</th>
                      <th className="text-right text-[10px] text-white/30 uppercase tracking-wider pb-2">PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPositions.map((p) => {
                      const live = livePrices[`${p.type}:${p.symbol}`];
                      const price = live?.price ?? p.currentPrice;
                      const isUp = p.unrealizedPnl >= 0;
                      const tc = TYPE_COLORS[p.type];

                      return (
                        <tr
                          key={p.id}
                          className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer group"
                          onClick={() => setExpandedChart(`${p.type}:${p.symbol}`)}
                        >
                          <td className="py-2.5 pr-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-white text-xs font-bold font-mono">{p.symbol}</span>
                                <Maximize2 className="h-3 w-3 text-white/0 group-hover:text-white/40 transition-colors" />
                              </div>
                              {p.name && (
                                <p className="text-[10px] text-white/30 truncate max-w-[100px]">{p.name}</p>
                              )}
                            </div>
                          </td>
                          <td className="text-right py-2.5 pr-2">
                            <p className="text-white/70 text-xs font-mono">{fmtPrice(p.type, price)}</p>
                            {live && (
                              <p className={cn('text-[10px] font-mono',
                                live.change24h >= 0 ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                                {live.change24h >= 0 ? '+' : ''}{live.change24h.toFixed(2)}%
                              </p>
                            )}
                          </td>
                          <td className="text-right text-white/50 text-xs font-mono py-2.5 pr-2">
                            {p.quantity}
                          </td>
                          <td className="text-right py-2.5">
                            <div className="flex items-center justify-end gap-0.5">
                              {isUp ? (
                                <ArrowUpRight className="h-3 w-3 text-[#03DAC6] shrink-0" />
                              ) : (
                                <ArrowDownRight className="h-3 w-3 text-[#CF6679] shrink-0" />
                              )}
                              <span className={cn('text-xs font-bold font-mono', isUp ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                                {isUp ? '+' : ''}{p.unrealizedPnlPercentage.toFixed(2)}%
                              </span>
                            </div>
                            <p className={cn('text-[10px] font-mono', isUp ? 'text-[#03DAC6]/60' : 'text-[#CF6679]/60')}>
                              {fmtPrice(p.type, Math.abs(p.unrealizedPnl))}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="bg-[#1A1A2E] border-white/[0.06]">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Quick Stats</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-[10px] text-white/25 uppercase">Open</p>
                  <p className="text-lg font-bold text-white/80">{openPortfolios.length}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-white/25 uppercase">Closed</p>
                  <p className="text-lg font-bold text-white/80">{portfolios.length - openPortfolios.length}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-white/25 uppercase">Best</p>
                  <p className={cn('text-sm font-bold font-mono',
                    sortedPositions.length > 0 && sortedPositions[sortedPositions.length - 1].unrealizedPnlPercentage >= 0
                      ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                    {sortedPositions.length > 0
                      ? `${sortedPositions[sortedPositions.length - 1].symbol} ${sortedPositions[sortedPositions.length - 1].unrealizedPnlPercentage >= 0 ? '+' : ''}${sortedPositions[sortedPositions.length - 1].unrealizedPnlPercentage.toFixed(2)}%`
                      : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-white/25 uppercase">Worst</p>
                  <p className={cn('text-sm font-bold font-mono',
                    sortedPositions.length > 0 && sortedPositions[0].unrealizedPnlPercentage >= 0
                      ? 'text-[#03DAC6]' : 'text-[#CF6679]')}>
                    {sortedPositions.length > 0
                      ? `${sortedPositions[0].symbol} ${sortedPositions[0].unrealizedPnlPercentage >= 0 ? '+' : ''}${sortedPositions[0].unrealizedPnlPercentage.toFixed(2)}%`
                      : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Expanded Chart Dialog ── */}
      <Dialog open={!!expandedChart} onOpenChange={() => setExpandedChart(null)}>
        <DialogContent className="max-w-5xl w-[95vw] bg-[#0D0D0D] border-white/[0.06] p-0 gap-0 overflow-hidden">
          {expandedChart && (() => {
            const [type, symbol] = expandedChart.split(':');
            const p = portfolios.find((x) => x.symbol === symbol && x.type === type);
            return (
              <>
                <DialogHeader className="px-5 pt-4 pb-2">
                  <div className="flex items-center gap-3">
                    <DialogTitle className="text-white text-sm font-bold flex items-center gap-2">
                      {symbol}
                      {p?.name && <span className="text-white/30 font-normal text-xs">{p.name}</span>}
                    </DialogTitle>
                    {type && (
                      <Badge
                        className="text-[9px] px-2 py-0 h-4 font-medium border-0"
                        style={{
                          backgroundColor: TYPE_COLORS[type]?.bg,
                          color: TYPE_COLORS[type]?.text,
                        }}
                      >
                        {type.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </DialogHeader>
                <div className="px-3 pb-3">
                  <InvestmentChart
                    symbol={symbol}
                    type={type as 'saham' | 'crypto' | 'forex'}
                    height={450}
                  />
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
