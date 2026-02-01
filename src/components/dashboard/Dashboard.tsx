'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QuickStats } from '@/components/cards/QuickStats';
import { CurrentStageCard } from '@/components/cards/CurrentStageCard';
import { AllStagesGrid } from '@/components/cards/AllStagesGrid';
import { getCurrentStage, getNextStage } from '@/components/cards/types';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { getCurrencyFormat } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface DashboardData {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  totalSavings: number;
  debtRatio: number;
  savingsTargets: any[];
  transactions: any[];
  expenseByCategory: any[];
}

const TIPS = [
  "💡 Mulailah menabung sejak dini, meskipun jumlahnya kecil.",
  "💰 Sisihkan minimal 20% dari penghasilan untuk tabungan.",
  "📈 Diversifikasi investasi untuk mengurangi risiko.",
  "🎯 Tetapkan tujuan keuangan yang spesifik dan terukur.",
  "⚖️ Jaga keseimbangan antara menabung dan menikmati hidup.",
  "🚀 Investasi jangka panjang lebih baik daripada spekulasi.",
  "💎 Emas dan properti adalah aset yang baik untuk jangka panjang.",
  "📚 Teruslah belajar tentang keuangan dan investasi.",
  "🛡️ Buat dana darurat minimal 6 bulan pengeluaran.",
  "🏠 Prioritaskan pembayaran hutang dengan bunga tinggi.",
];

const COLORS = ['#ef4444', '#f97316', '#ec4899', '#3b82f6', '#14b8a6', '#22c55e', '#a855f7', '#6b7280'];

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({ month: 'all', year: 'all' });
  const [currentTip, setCurrentTip] = useState('');

  useEffect(() => {
    fetchDashboardData();
    // Rotate tips every 10 seconds
    const tipInterval = setInterval(() => {
      setCurrentTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
    }, 10000);
    setCurrentTip(TIPS[Math.floor(Math.random() * TIPS.length)]);

    return () => clearInterval(tipInterval);
  }, [filter]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filter.month && filter.month !== 'all') params.append('month', filter.month);
      if (filter.year && filter.year !== 'all') params.append('year', filter.year);

      const response = await fetch(`/api/dashboard?${params}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentStage = data ? getCurrentStage(data.totalSavings) : getCurrentStage(0);
  const nextStage = data ? getNextStage(currentStage) : null;

  const healthRatio = data && data.totalIncome > 0
    ? ((data.totalIncome - data.totalExpense) / data.totalIncome) * 100
    : 0;

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base">Filter Data</CardTitle>
            <div className="flex gap-2">
              <Select value={filter.month} onValueChange={(value) => setFilter({ ...filter, month: value })}>
                <SelectTrigger className="w-[110px] bg-background/50 h-8 text-xs">
                  <SelectValue placeholder="Bulan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="1">Januari</SelectItem>
                  <SelectItem value="2">Februari</SelectItem>
                  <SelectItem value="3">Maret</SelectItem>
                  <SelectItem value="4">April</SelectItem>
                  <SelectItem value="5">Mei</SelectItem>
                  <SelectItem value="6">Juni</SelectItem>
                  <SelectItem value="7">Juli</SelectItem>
                  <SelectItem value="8">Agustus</SelectItem>
                  <SelectItem value="9">September</SelectItem>
                  <SelectItem value="10">Oktober</SelectItem>
                  <SelectItem value="11">November</SelectItem>
                  <SelectItem value="12">Desember</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filter.year} onValueChange={(value) => setFilter({ ...filter, year: value })}>
                <SelectTrigger className="w-[90px] bg-background/50 h-8 text-xs">
                  <SelectValue placeholder="Tahun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      <QuickStats
        totalSavings={data.totalSavings}
        currentStageName={currentStage.name}
        nextTarget={nextStage ? `${nextStage.name} (${getCurrencyFormat(nextStage.range[0])})` : 'Maksimal'}
      />

      {/* Current Stage Card */}
      <CurrentStageCard
        totalSavings={data.totalSavings}
        currentStage={currentStage}
      />

      {/* Financial Health Ratio */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Rasio Kesehatan Keuangan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Sehat</span>
                <span className="font-semibold">{healthRatio.toFixed(1)}%</span>
              </div>
              <Progress value={healthRatio} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {healthRatio >= 30 ? 'Kesehatan keuangan sangat baik' :
                 healthRatio >= 20 ? 'Kesehatan keuangan baik' :
                 healthRatio >= 10 ? 'Kesehatan keuangan cukup' :
                 'Perlu evaluasi pengeluaran'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Rasio Hutang Piutang</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold text-green-500">
                {data.debtRatio.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {data.debtRatio === 0 ? 'Bebas hutang!' : 'Tingkatkan kewaspadaan'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income & Expense Charts */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Distribusi Arus Kas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Pemasukan', value: data.totalIncome, fill: '#10b981' },
                    { name: 'Pengeluaran', value: data.totalExpense, fill: '#ef4444' },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip formatter={(value: number) => getCurrencyFormat(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Distribusi Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.expenseByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {data.expenseByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => getCurrencyFormat(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Savings Targets Progress */}
      {data.savingsTargets.length > 0 && (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Progress Target Tabungan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.savingsTargets.slice(0, 3).map((target: any) => {
              const progress = (target.currentAmount / target.targetAmount) * 100;
              return (
                <div key={target.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{target.name}</span>
                    <span className="text-muted-foreground">
                      {getCurrencyFormat(target.currentAmount)} / {getCurrencyFormat(target.targetAmount)}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="text-xs text-muted-foreground text-right">
                    {progress.toFixed(1)}% tercapai
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Tips Section */}
      <Card className="bg-gradient-to-r from-primary/20 to-purple-500/20 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            💡 Tips Menabung & Investasi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium">{currentTip}</p>
          <p className="text-xs text-muted-foreground mt-2">
            - Kutipan dari investor hebat
          </p>
        </CardContent>
      </Card>

      {/* All Stages Grid */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Semua Fase Keuangan</CardTitle>
        </CardHeader>
        <CardContent>
          <AllStagesGrid
            totalSavings={data.totalSavings}
            currentStageId={currentStage.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
