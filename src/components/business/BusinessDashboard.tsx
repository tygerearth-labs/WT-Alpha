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
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DashboardData {
  totalRevenue: number;
  totalExpense: number;
  profit: number;
  profitMargin: number;
  totalKasBesar: number;
  totalKasKecil: number;
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
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-[#1A1A2E]" />
          ))}
        </div>
        <Skeleton className="h-[300px] rounded-xl bg-[#1A1A2E]" />
      </div>
    );
  }

  const stats = data
    ? [
        {
          label: t('biz.bizRevenue'),
          value: data.totalRevenue,
          icon: TrendingUp,
          color: '#03DAC6',
          trend: '+12%',
        },
        {
          label: t('biz.bizExpense'),
          value: data.totalExpense,
          icon: TrendingDown,
          color: '#CF6679',
          trend: '+5%',
        },
        {
          label: t('biz.bizProfit'),
          value: data.profit,
          icon: DollarSign,
          color: data.profit >= 0 ? '#03DAC6' : '#CF6679',
          trend: `${data.profitMargin.toFixed(1)}%`,
        },
        {
          label: t('biz.totalKasBesar'),
          value: data.totalKasBesar,
          icon: ArrowUpRight,
          color: '#4CAF50',
          trend: null,
        },
        {
          label: t('biz.totalKasKecil'),
          value: data.totalKasKecil,
          icon: ArrowDownRight,
          color: '#03DAC6',
          trend: null,
        },
      ]
    : [];

  const profitData = data
    ? [
        { month: 'Jan', revenue: data.totalRevenue * 0.7, expense: data.totalExpense * 0.6 },
        { month: 'Feb', revenue: data.totalRevenue * 0.85, expense: data.totalExpense * 0.8 },
        { month: 'Mar', revenue: data.totalRevenue * 0.9, expense: data.totalExpense * 0.75 },
        { month: 'Apr', revenue: data.totalRevenue * 0.95, expense: data.totalExpense * 0.9 },
        { month: 'Mei', revenue: data.totalRevenue, expense: data.totalExpense },
        { month: 'Jun', revenue: data.totalRevenue * 1.05, expense: data.totalExpense * 1.02 },
      ]
    : [];

  const cashData = data
    ? [
        { name: t('biz.kasBesar'), value: data.totalKasBesar, fill: '#4CAF50' },
        { name: t('biz.kasKecil'), value: data.totalKasKecil, fill: '#03DAC6' },
        { name: t('biz.kasKeluar'), value: data.totalKasKeluar, fill: '#CF6679' },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-[#1A1A2E] border-white/[0.06]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${stat.color}20` }}
                >
                  <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                </div>
              </div>
              <p className="text-xs text-white/50 mb-1">{stat.label}</p>
              <p className="text-lg font-bold text-white">{formatAmount(stat.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue vs Expense Chart */}
        <Card className="bg-[#1A1A2E] border-white/[0.06]">
          <CardHeader>
            <CardTitle className="text-white text-sm">{t('biz.bizProfitLoss')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={profitData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#03DAC6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#03DAC6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#CF6679" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#CF6697" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                  <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#2A2A3E',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#03DAC6"
                    fill="url(#colorRevenue)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#CF6679"
                    fill="url(#colorExpense)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cash Distribution */}
        <Card className="bg-[#1A1A2E] border-white/[0.06]">
          <CardHeader>
            <CardTitle className="text-white text-sm">{t('biz.bizSalesOverview')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#2A2A3E',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Area dataKey="value" stroke="#BB86FC" fill="#BB86FC" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pending Invoices */}
        <Card className="bg-[#1A1A2E] border-white/[0.06]">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#FFD700]" />
              {t('biz.bizPendingInvoice')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.pendingInvoices > 0 ? (
              <p className="text-2xl font-bold text-[#FFD700]">{data.pendingInvoices}</p>
            ) : (
              <p className="text-white/40 text-sm">-</p>
            )}
            <p className="text-xs text-white/40 mt-1">
              {t('biz.invoicePending')}
            </p>
          </CardContent>
        </Card>

        {/* Total Hutang */}
        <Card className="bg-[#1A1A2E] border-white/[0.06]">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#CF6679]" />
              {t('biz.bizDebtDue')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.totalHutang > 0 ? (
              <p className="text-2xl font-bold text-[#CF6679]">{formatAmount(data.totalHutang)}</p>
            ) : (
              <p className="text-white/40 text-sm">-</p>
            )}
            <p className="text-xs text-white/40 mt-1">
              {t('biz.totalHutang')}
            </p>
          </CardContent>
        </Card>

        {/* Total Piutang */}
        <Card className="bg-[#1A1A2E] border-white/[0.06]">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#03DAC6]" />
              {t('biz.bizReceivableDue')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.totalPiutang > 0 ? (
              <p className="text-2xl font-bold text-[#03DAC6]">{formatAmount(data.totalPiutang)}</p>
            ) : (
              <p className="text-white/40 text-sm">-</p>
            )}
            <p className="text-xs text-white/40 mt-1">
              {t('biz.totalPiutang')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-[#1A1A2E] border-white/[0.06]">
        <CardHeader>
          <CardTitle className="text-white text-sm">{t('dashboard.income')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {data && data.recentSales.length > 0 ? (
              data.recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{sale.description}</p>
                    <p className="text-xs text-white/40">
                      {sale.customer?.name || '-'} · {new Date(sale.date).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-[#03DAC6] ml-4 shrink-0">
                    +{formatAmount(sale.amount)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-white/40 text-sm">{t('biz.noBizData')}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
