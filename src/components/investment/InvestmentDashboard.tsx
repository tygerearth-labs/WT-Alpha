'use client';

import { useEffect, useState, useMemo } from 'react';
import { useBusinessStore } from '@/store/useBusinessStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Trophy,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

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
  _count?: { journals: number };
}

const ALLOCATION_COLORS: Record<string, string> = {
  saham: '#BB86FC',
  crypto: '#03DAC6',
  forex: '#CF6679',
};

const TYPE_LABELS: Record<string, string> = {
  saham: 'Saham',
  crypto: 'Crypto',
  forex: 'Forex',
};

export default function InvestmentDashboard() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const { formatAmount } = useCurrencyFormat();
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  const businessId = activeBusiness?.id;

  useEffect(() => {
    if (!businessId) {
      return;
    }

    let cancelled = false;
    fetch(`/api/business/${businessId}/portfolio`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then((result) => {
        if (!cancelled) setPortfolios(result.portfolios || []);
      })
      .catch(() => {
        if (!cancelled) setPortfolios([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [businessId]);

  const stats = useMemo(() => {
    const open = portfolios.filter((p) => p.status === 'open');
    const closed = portfolios.filter((p) => p.status === 'closed');

    const totalValue = open.reduce((sum, p) => sum + p.currentValue, 0);
    const unrealizedPnl = open.reduce((sum, p) => sum + p.unrealizedPnl, 0);
    const realizedPnl = closed.reduce((sum, p) => sum + p.unrealizedPnl, 0);

    const winTrades = closed.filter((p) => p.unrealizedPnl > 0).length;
    const totalTrades = closed.length;
    const winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;

    return { totalValue, unrealizedPnl, realizedPnl, winRate, totalTrades };
  }, [portfolios]);

  const allocationData = useMemo(() => {
    const byType: Record<string, number> = {};
    portfolios
      .filter((p) => p.status === 'open')
      .forEach((p) => {
        byType[p.type] = (byType[p.type] || 0) + p.currentValue;
      });
    return Object.entries(byType).map(([name, value]) => ({
      name: TYPE_LABELS[name] || name,
      value,
      color: ALLOCATION_COLORS[name] || '#888',
    }));
  }, [portfolios]);

  const topPerformers = useMemo(() => {
    return [...portfolios]
      .filter((p) => p.status === 'open' && p.currentValue > 0)
      .sort((a, b) => b.unrealizedPnlPercentage - a.unrealizedPnlPercentage)
      .slice(0, 5);
  }, [portfolios]);

  const pnlTrendData = useMemo(() => {
    if (portfolios.length === 0) return [];
    const sorted = [...portfolios]
      .filter((p) => p.status === 'open')
      .sort((a, b) => b.unrealizedPnl - a.unrealizedPnl);
    return sorted.slice(0, 8).map((p) => ({
      symbol: p.symbol,
      pnl: Math.round(p.unrealizedPnl),
      pnlPct: parseFloat(p.unrealizedPnlPercentage.toFixed(2)),
    }));
  }, [portfolios]);

  const pnlColor = (val: number) => (val >= 0 ? '#03DAC6' : '#CF6679');

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-[#1A1A2E]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-[300px] rounded-xl bg-[#1A1A2E]" />
          <Skeleton className="h-[300px] rounded-xl bg-[#1A1A2E]" />
        </div>
      </div>
    );
  }

  if (portfolios.length === 0) {
    return (
      <Card className="bg-[#1A1A2E] border-white/[0.06]">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <BarChart3 className="h-12 w-12 text-white/20 mb-4" />
          <p className="text-white/40 text-center mb-1">{t('inv.noInvData')}</p>
          <p className="text-white/25 text-sm text-center">{t('inv.startInvesting')}</p>
        </CardContent>
      </Card>
    );
  }

  const summaryCards = [
    {
      label: t('inv.portfolioValue'),
      value: stats.totalValue,
      icon: Wallet,
      color: '#BB86FC',
    },
    {
      label: t('inv.unrealizedPnL'),
      value: stats.unrealizedPnl,
      icon: stats.unrealizedPnl >= 0 ? TrendingUp : TrendingDown,
      color: pnlColor(stats.unrealizedPnl),
    },
    {
      label: t('inv.realizedPnL'),
      value: stats.realizedPnl,
      icon: stats.realizedPnl >= 0 ? TrendingUp : TrendingDown,
      color: pnlColor(stats.realizedPnl),
    },
    {
      label: t('inv.winRate'),
      value: stats.winRate,
      icon: Trophy,
      color: '#03DAC6',
      isPercent: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="bg-[#1A1A2E] border-white/[0.06]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${card.color}20` }}
                >
                  <card.icon className="h-5 w-5" style={{ color: card.color }} />
                </div>
              </div>
              <p className="text-xs text-white/50 mb-1">{card.label}</p>
              {card.isPercent ? (
                <p className="text-lg font-bold" style={{ color: card.color }}>
                  {card.value.toFixed(1)}%
                </p>
              ) : (
                <p className="text-lg font-bold" style={{ color: card.color }}>
                  {formatAmount(card.value)}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Asset Allocation Pie Chart */}
        <Card className="bg-[#1A1A2E] border-white/[0.06]">
          <CardHeader>
            <CardTitle className="text-white text-sm">{t('inv.invAllocation')}</CardTitle>
          </CardHeader>
          <CardContent>
            {allocationData.length > 0 ? (
              <div className="h-[280px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#2A2A3E',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                      formatter={(value: number) => formatAmount(value)}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center">
                <p className="text-white/30 text-sm">-</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PnL Trend Area Chart */}
        <Card className="bg-[#1A1A2E] border-white/[0.06]">
          <CardHeader>
            <CardTitle className="text-white text-sm">{t('inv.invPerformance')}</CardTitle>
          </CardHeader>
          <CardContent>
            {pnlTrendData.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={pnlTrendData}>
                    <defs>
                      <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#03DAC6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#03DAC6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="pnlGradientNeg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#CF6679" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#CF6679" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="symbol"
                      stroke="rgba(255,255,255,0.3)"
                      tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.3)"
                      tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#2A2A3E',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                      formatter={(value: number, name: string) => [
                        name === 'pnl' ? formatAmount(value) : `${value}%`,
                        name === 'pnl' ? 'PnL' : 'PnL %',
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="pnl"
                      stroke="#03DAC6"
                      fill="url(#pnlGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center">
                <p className="text-white/30 text-sm">-</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performers Table */}
      <Card className="bg-[#1A1A2E] border-white/[0.06]">
        <CardHeader>
          <CardTitle className="text-white text-sm">{t('inv.invPerformance')}</CardTitle>
        </CardHeader>
        <CardContent>
          {topPerformers.length > 0 ? (
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-white/50 text-xs pb-2 pr-4">Symbol</th>
                    <th className="text-left text-white/50 text-xs pb-2 pr-4">Tipe</th>
                    <th className="text-right text-white/50 text-xs pb-2 pr-4">Nilai</th>
                    <th className="text-right text-white/50 text-xs pb-2">PnL %</th>
                  </tr>
                </thead>
                <tbody>
                  {topPerformers.map((p) => (
                    <tr key={p.id} className="border-b border-white/[0.04] last:border-0">
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-medium">{p.symbol}</span>
                          {p.unrealizedPnlPercentage >= 0 ? (
                            <ArrowUpRight className="h-3.5 w-3.5 text-[#03DAC6]" />
                          ) : (
                            <ArrowDownRight className="h-3.5 w-3.5 text-[#CF6679]" />
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${ALLOCATION_COLORS[p.type] || '#888'}20`,
                            color: ALLOCATION_COLORS[p.type] || '#888',
                          }}
                        >
                          {TYPE_LABELS[p.type] || p.type}
                        </span>
                      </td>
                      <td className="text-right text-white/70 text-sm py-2.5 pr-4">
                        {formatAmount(p.currentValue)}
                      </td>
                      <td
                        className="text-right text-sm font-medium py-2.5"
                        style={{ color: pnlColor(p.unrealizedPnl) }}
                      >
                        {p.unrealizedPnlPercentage >= 0 ? '+' : ''}
                        {p.unrealizedPnlPercentage.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-white/30 text-sm text-center py-8">{t('common.noData')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
