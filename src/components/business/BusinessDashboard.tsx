'use client';

import { useEffect, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Plus,
  FileText,
  Receipt,
  Clock,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface DashboardData {
  totalRevenue: number;
  totalExpense: number;
  profit: number;
  profitMargin: number;
  totalKasBesar: number;
  totalKasKecil: number;
  totalKasKeluar: number;
  netCash: number;
  pendingInvoices: number;
  totalHutang: number;
  totalPiutang: number;
  debtsDueSoon: Array<{
    id: string;
    counterpart: string;
    remaining: number;
    dueDate: string;
  }>;
  recentSales: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    customer: { name: string } | null;
  }>;
  recentCashEntries: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    type: string;
  }>;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

export default function BusinessDashboard() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusinessStore();
  const { formatAmount } = useCurrencyFormat();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchKey, setFetchKey] = useState(0);

  const businessId = activeBusiness?.id;

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      try {
        const res = await fetch(`/api/business/${businessId}/dashboard`, { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to load dashboard');
        const result = await res.json();
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setData(null);
          setLoading(false);
        }
      }
    };

    load();
    return () => { cancelled = true; controller.abort(); };
  }, [businessId, fetchKey]);

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-white/50 text-center">{t('biz.registerFirst')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px] rounded-xl bg-[#1A1A2E]" />
          ))}
        </div>
        <Skeleton className="h-[52px] rounded-xl bg-[#1A1A2E]" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Skeleton className="h-[280px] rounded-xl bg-[#1A1A2E] lg:col-span-3" />
          <Skeleton className="h-[280px] rounded-xl bg-[#1A1A2E] lg:col-span-2" />
        </div>
        <Skeleton className="h-[220px] rounded-xl bg-[#1A1A2E]" />
      </div>
    );
  }

  // Derived values
  const totalCash = (data?.totalKasBesar ?? 0) + (data?.totalKasKecil ?? 0);
  const netCashValue = data?.netCash ?? totalCash;

  // Quick stats definition
  const quickStats = data
    ? [
        {
          label: t('biz.bizRevenue'),
          value: data.totalRevenue,
          icon: TrendingUp,
          accentColor: '#03DAC6',
          subText: data.totalRevenue > 0 ? t('biz.totalPenjualan') : t('biz.noBizData'),
        },
        {
          label: t('biz.bizExpense'),
          value: data.totalExpense,
          icon: TrendingDown,
          accentColor: '#CF6679',
          subText: data.totalExpense > 0
            ? `${t('biz.kasKeluar')}: ${formatAmount(data.totalKasKeluar)}`
            : t('biz.noBizData'),
        },
        {
          label: t('biz.bizProfit'),
          value: data.profit,
          icon: DollarSign,
          accentColor: data.profit >= 0 ? '#03DAC6' : '#CF6679',
          subText: data.profitMargin > 0
            ? `${t('biz.bizNetIncome')}: ${data.profitMargin.toFixed(1)}%`
            : t('biz.noBizData'),
          badge: data.profitMargin > 0 ? `+${data.profitMargin.toFixed(1)}%` : null,
        },
        {
          label: 'Cash Flow',
          value: netCashValue,
          icon: Wallet,
          accentColor: netCashValue >= 0 ? '#03DAC6' : '#CF6679',
          subText: `${t('biz.kasBesar')}: ${formatAmount(data.totalKasBesar)} · ${t('biz.kasKecil')}: ${formatAmount(data.totalKasKecil)}`,
        },
      ]
    : [];

  // Chart data: simple bar comparison of revenue vs expense (current period)
  const comparisonData = data
    ? [
        { name: t('biz.bizRevenue'), value: data.totalRevenue, fill: '#03DAC6' },
        { name: t('biz.bizExpense'), value: data.totalExpense, fill: '#CF6679' },
        { name: t('biz.bizProfit'), value: Math.max(0, data.profit), fill: '#4CAF50' },
      ]
    : [];

  const maxChartValue = Math.max(...comparisonData.map(d => d.value), 1);

  // Status items
  const statusItems = data
    ? [
        {
          label: t('biz.bizPendingInvoice'),
          count: data.pendingInvoices,
          amount: null as number | null,
          icon: Clock,
          accentColor: '#FFD700',
          bgColor: 'rgba(255, 215, 0, 0.08)',
          emptyLabel: t('biz.noBizData'),
        },
        {
          label: t('biz.bizDebtDue'),
          count: data.totalHutang > 0 ? undefined : 0,
          amount: data.totalHutang,
          icon: AlertTriangle,
          accentColor: '#CF6679',
          bgColor: 'rgba(207, 102, 121, 0.08)',
          emptyLabel: t('biz.noBizData'),
        },
        {
          label: t('biz.bizReceivableDue'),
          count: data.totalPiutang > 0 ? undefined : 0,
          amount: data.totalPiutang,
          icon: ArrowUpRight,
          accentColor: '#03DAC6',
          bgColor: 'rgba(3, 218, 198, 0.08)',
          emptyLabel: t('biz.noBizData'),
        },
      ]
    : [];

  // Quick actions
  const quickActions = [
    { label: t('biz.addSale'), icon: Plus, color: '#03DAC6' },
    { label: t('biz.addInvoice'), icon: FileText, color: '#BB86FC' },
    { label: t('biz.kasKeluar'), icon: Receipt, color: '#CF6679' },
  ];

  // Format date helper
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <motion.div
      className="space-y-5"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Section 1: Quick Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} variants={itemVariants}>
              <Card className="bg-[#1A1A2E] border-white/[0.06] hover:border-white/[0.12] transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
                      style={{ backgroundColor: `${stat.accentColor}15` }}
                    >
                      <Icon className="h-4.5 w-4.5" style={{ color: stat.accentColor }} />
                    </div>
                    {stat.badge && (
                      <span
                        className="text-xs font-semibold px-1.5 py-0.5 rounded-md"
                        style={{
                          color: stat.accentColor,
                          backgroundColor: `${stat.accentColor}15`,
                        }}
                      >
                        {stat.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/45 uppercase tracking-wide font-medium mb-1">
                    {stat.label}
                  </p>
                  <p
                    className="text-xl font-bold leading-tight"
                    style={{ color: '#fff' }}
                  >
                    {formatAmount(stat.value)}
                  </p>
                  <p className="text-[11px] text-white/35 mt-1.5 leading-snug truncate">
                    {stat.subText}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ── Section 2: Action Center ── */}
      <motion.div variants={itemVariants}>
        <Card className="bg-[#1A1A2E] border-white/[0.06]">
          <CardContent className="px-5 py-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-white/40 font-medium uppercase tracking-wide shrink-0">
                Quick Actions
              </span>
              <Separator orientation="vertical" className="h-5 bg-white/[0.06]" />
              <div className="flex items-center gap-2 flex-wrap">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.label}
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 gap-1.5 text-xs text-white/60 hover:text-white hover:bg-white/[0.06] border border-white/[0.06] rounded-lg"
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: action.color }} />
                      <span>{action.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Section 3: Two Column ─ Chart + Status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Pendapatan vs Pengeluaran bar chart */}
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <Card className="bg-[#1A1A2E] border-white/[0.06] h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-semibold">
                {t('biz.bizRevenue')} vs {t('biz.bizExpense')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-5">
              {comparisonData.some(d => d.value > 0) ? (
                <div className="space-y-4">
                  {comparisonData.map((item) => (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/50">{item.name}</span>
                        <span className="text-sm font-semibold text-white">
                          {formatAmount(item.value)}
                        </span>
                      </div>
                      <div className="h-7 bg-white/[0.04] rounded-lg overflow-hidden relative">
                        <motion.div
                          className="h-full rounded-lg relative overflow-hidden"
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.max((item.value / maxChartValue) * 100, 2)}%`,
                          }}
                          transition={{ duration: 0.8, ease: 'easeOut' as const, delay: 0.2 }}
                          style={{ backgroundColor: item.fill }}
                        >
                          <div
                            className="absolute inset-0"
                            style={{
                              background: `linear-gradient(90deg, transparent 60%, ${item.fill}40)`,
                            }}
                          />
                        </motion.div>
                      </div>
                    </div>
                  ))}

                  {/* Profit / Loss indicator */}
                  {data && (
                    <Separator className="my-2 bg-white/[0.06]" />
                  )}
                  {data && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-white/45">{t('biz.bizProfitLoss')}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-base font-bold"
                          style={{ color: data.profit >= 0 ? '#03DAC6' : '#CF6679' }}
                        >
                          {data.profit >= 0 ? '+' : ''}{formatAmount(data.profit)}
                        </span>
                        <span
                          className="text-xs font-medium px-1.5 py-0.5 rounded"
                          style={{
                            color: data.profitMargin >= 0 ? '#03DAC6' : '#CF6679',
                            backgroundColor: data.profitMargin >= 0 ? 'rgba(3,218,198,0.1)' : 'rgba(207,102,121,0.1)',
                          }}
                        >
                          {data.profitMargin.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[160px]">
                  <TrendingUp className="h-8 w-8 text-white/15 mb-2" />
                  <p className="text-sm text-white/30">{t('biz.noBizData')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Right: Status Ringkas */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="bg-[#1A1A2E] border-white/[0.06] h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-semibold">
                Status Ringkas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-5">
              {statusItems.map((item) => {
                const Icon = item.icon;
                const hasData = (item.count !== undefined && item.count > 0) || (item.amount !== null && item.amount > 0);
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                    style={{ backgroundColor: item.bgColor }}
                  >
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
                      style={{ backgroundColor: `${item.accentColor}18` }}
                    >
                      <Icon className="h-4 w-4" style={{ color: item.accentColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/50 mb-0.5">{item.label}</p>
                      {hasData ? (
                        <div className="flex items-center gap-2">
                          {item.count !== undefined && item.count > 0 && (
                            <span className="text-sm font-bold text-white">
                              {item.count} <span className="text-[11px] font-normal text-white/40">items</span>
                            </span>
                          )}
                          {item.amount !== null && item.amount > 0 && (
                            <span className="text-sm font-bold" style={{ color: item.accentColor }}>
                              {formatAmount(item.amount)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-white/25">{item.emptyLabel}</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Debts due soon detail */}
              {data && data.debtsDueSoon.length > 0 && (
                <>
                  <Separator className="bg-white/[0.06]" />
                  <div className="space-y-2">
                    <p className="text-xs text-white/40 uppercase tracking-wide font-medium">
                      {t('biz.bizDebtDue')}
                    </p>
                    {data.debtsDueSoon.slice(0, 3).map((debt) => (
                      <div
                        key={debt.id}
                        className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-white truncate">{debt.counterpart}</p>
                          <p className="text-[10px] text-white/35">{formatDate(debt.dueDate)}</p>
                        </div>
                        <span className="text-xs font-semibold text-[#CF6679] ml-2 shrink-0">
                          {formatAmount(debt.remaining)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Section 4: Aktivitas Terbaru ── */}
      <motion.div variants={itemVariants}>
        <Card className="bg-[#1A1A2E] border-white/[0.06]">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm font-semibold">
              Aktivitas Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[260px] overflow-y-auto pr-1 space-y-0.5 custom-scrollbar">
              {data && data.recentSales.length > 0 ? (
                <div className="divide-y divide-white/[0.04]">
                  {data.recentSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="flex items-center gap-3 py-2.5 group hover:bg-white/[0.02] rounded-lg px-2 -mx-2 transition-colors"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#03DAC6]/[0.08] shrink-0">
                        <ArrowUpRight className="h-3.5 w-3.5 text-[#03DAC6]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/85 truncate group-hover:text-white transition-colors">
                          {sale.description}
                        </p>
                        <p className="text-[11px] text-white/35 mt-0.5">
                          {sale.customer?.name || '-'} · {formatDate(sale.date)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-[#03DAC6] ml-2 shrink-0">
                        +{formatAmount(sale.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10">
                  <TrendingUp className="h-7 w-7 text-white/10 mb-2" />
                  <p className="text-sm text-white/25">{t('biz.noBizData')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </motion.div>
  );
}
