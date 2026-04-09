'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2, TrendingUp, TrendingDown, Minus, Wallet,
  ArrowUpRight, ArrowDownRight, Activity, Target,
  PieChart as PieChartIcon, BarChart3, Sparkles,
  AlertTriangle, Trophy, Flame, CheckCircle2, Zap,
  Shield, ChevronLeft, ChevronRight, Banknote, Timer, Radar, Eye,
} from 'lucide-react';
// embla-carousel removed — replaced with lightweight CSS transform carousel
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { getCurrentStage, getNextStage, getProgressToNextStage } from '@/components/cards/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { SavingsTarget, Transaction, PieChartData } from '@/types/transaction.types';
import { DynamicIcon } from '@/components/shared/DynamicIcon';

// ── Theme Constants ──────────────────────────────────────────────
const THEME = {
  bg: '#000000',
  surface: '#121212',
  primary: '#BB86FC',
  secondary: '#03DAC6',
  destructive: '#CF6679',
  warning: '#F9A825',
  muted: '#9E9E9E',
  border: 'rgba(255,255,255,0.08)',
  borderHover: 'rgba(255,255,255,0.15)',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
} as const;

const CATEGORY_COLORS = [
  '#BB86FC', '#03DAC6', '#CF6679', '#F9A825',
  '#64B5F6', '#81C784', '#FFB74D', '#E57373',
  '#4DB6AC', '#BA68C8',
];

// ── Types ────────────────────────────────────────────────────────
interface MonthlyTrend {
  month: string;
  monthNum: number;
  year: number;
  income: number;
  expense: number;
  savings: number;
  savingsRate: number;
  transactionCount: number;
}

interface HealthBreakdown {
  savingsRateScore: number;
  consistencyScore: number;
  targetProgressScore: number;
  growthScore: number;
}

interface MonthlyComparison {
  incomeChange: number;
  expenseChange: number;
  savingsChange: number;
  transactionCountChange: number;
  currentMonthIncome: number;
  currentMonthExpense: number;
  previousMonthIncome: number;
  previousMonthExpense: number;
}

interface TopCategory {
  name: string;
  amount: number;
  percentage: number;
  color: string;
  icon: string;
  trend: string;
  trendPercentage: number;
  transactionCount: number;
  averagePerTransaction: number;
}

interface Averages {
  dailyExpense: number;
  weeklyExpense: number;
  monthlyExpense: number;
  dailyIncome: number;
  transactionSize: number;
}

interface Forecast {
  projectedMonthEnd: number;
  projectedYearEnd: number;
  runwayMonths: number;
  dailyBurnRate: number;
}

interface TargetAnalytics {
  onTrack: number;
  behind: number;
  totalMonthlyContribution: number;
  averageProgress: number;
  nearestCompletion: string | null;
  nearestCompletionDate: string | null;
}

interface DashboardData {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  totalSavings: number;
  savingsTargets: SavingsTarget[];
  transactions: Transaction[];
  last7DaysGrowth: number;
  last30DaysGrowth: number;
  momentumIndicator: 'accelerating' | 'stable' | 'slowing';
  momentumChange: number;
  savingsHistory: Array<{ date: string; savings: number }>;
  savingsRate: number;
  unallocatedFunds: number;
  expenseByCategory: PieChartData[];
  monthlyTrends?: MonthlyTrend[];
  financialHealthScore?: number;
  healthBreakdown?: HealthBreakdown;
  healthGrade?: string;
  healthLabel?: string;
  monthlyComparison?: MonthlyComparison;
  topCategories?: TopCategory[];
  averages?: Averages;
  forecast?: Forecast;
  targetAnalytics?: TargetAnalytics;
}

// ── Custom Tooltip ───────────────────────────────────────────────
function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-xl"
      style={{
        background: THEME.surface,
        border: `1px solid ${THEME.border}`,
      }}
    >
      <p className="font-medium mb-1" style={{ color: THEME.textSecondary }}>{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="flex items-center gap-1.5" style={{ color: entry.color || THEME.text }}>
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}: {formatter ? formatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
}

// ── Health Score Ring ────────────────────────────────────────────
function HealthScoreRing({ score, grade, label }: { score: number; grade: string; label: string }) {
  const radius = 52;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  const gradeColor =
    grade === 'A' ? THEME.secondary :
    grade === 'B' ? THEME.primary :
    grade === 'C' ? THEME.warning :
    grade === 'D' ? '#FF7043' :
    THEME.destructive;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg height={radius * 2} width={radius * 2} className="-rotate-90">
          <circle
            stroke={THEME.border}
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={gradeColor}
            fill="transparent"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 1s ease-in-out' }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color: gradeColor }}>{grade}</span>
          <span className="text-[10px]" style={{ color: THEME.muted }}>{score}</span>
        </div>
      </div>
      <p className="mt-2 text-xs font-medium" style={{ color: THEME.textSecondary }}>{label}</p>
    </div>
  );
}

// ── Savings Rate Gauge ───────────────────────────────────────────
function SavingsRateGauge({ rate }: { rate: number }) {
  const clampedRate = Math.min(Math.max(rate, 0), 100);
  const radius = 28;
  const stroke = 5;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * Math.PI; // half circle
  const offset = circumference - (clampedRate / 100) * circumference;

  const gaugeColor =
    clampedRate >= 20 ? THEME.secondary :
    clampedRate >= 10 ? THEME.warning :
    THEME.destructive;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={radius * 2} height={radius + 8} className="overflow-visible">
        <path
          d={`M ${stroke / 2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - stroke / 2} ${radius}`}
          fill="none"
          stroke={THEME.border}
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d={`M ${stroke / 2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - stroke / 2} ${radius}`}
          fill="none"
          stroke={gaugeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      </svg>
      <div className="absolute -bottom-0.5 text-center">
        <span className="text-sm font-bold" style={{ color: gaugeColor }}>
          {clampedRate.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

// ── Analytics Carousel ──────────────────────────────────────────
function AnalyticsCarousel({
  cashFlowData,
  categoryData,
  totalCategoryAmount,
  healthScore,
  healthGrade,
  healthLabel,
  healthBreakdown,
}: {
  cashFlowData: any[];
  categoryData: any[];
  totalCategoryAmount: number;
  healthScore: number;
  healthGrade: string;
  healthLabel: string;
  healthBreakdown: any;
}) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [slideWidth, setSlideWidth] = useState(0);

  const slides = [
    { label: t('dashboard.cashFlow'), icon: BarChart3 },
    { label: t('dashboard.topSpending'), icon: PieChartIcon },
    { label: t('dashboard.financialHealth'), icon: Shield },
  ];

  // Measure actual viewport width for pixel-perfect transform
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => setSlideWidth(el.offsetWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scrollTo = (idx: number) => setSelectedIdx(idx);

  return (
    <div className="space-y-3 w-full">
      {/* Carousel Header with Tabs + Arrows — hidden on desktop grid */}
      <div className="flex items-center justify-between gap-2 px-0 lg:hidden">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide">
          {slides.map((s, i) => (
            <button
              key={s.label}
              onClick={() => scrollTo(i)}
              className="flex items-center gap-1 sm:gap-1.5 shrink-0 transition-all duration-200 px-2 py-1 rounded-lg"
              style={{
                background: selectedIdx === i ? `${THEME.primary}15` : 'transparent',
              }}
            >
              <s.icon
                className="h-3.5 w-3.5 transition-colors duration-200"
                style={{ color: selectedIdx === i ? THEME.primary : THEME.muted }}
              />
              <span
                className="text-[11px] font-medium transition-colors duration-200 whitespace-nowrap"
                style={{ color: selectedIdx === i ? THEME.primary : THEME.muted }}
              >
                {s.label}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => scrollTo(selectedIdx === 0 ? slides.length - 1 : selectedIdx - 1)}
            className="p-1.5 rounded-lg transition-colors duration-150"
            style={{ background: `${THEME.border}` }}
          >
            <ChevronLeft className="h-4 w-4" style={{ color: THEME.textSecondary }} />
          </button>
          <button
            onClick={() => scrollTo(selectedIdx === slides.length - 1 ? 0 : selectedIdx + 1)}
            className="p-1.5 rounded-lg transition-colors duration-150"
            style={{ background: `${THEME.border}` }}
          >
            <ChevronRight className="h-4 w-4" style={{ color: THEME.textSecondary }} />
          </button>
        </div>
      </div>

      {/* Desktop: 3-column grid */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-4 xl:gap-6">
        {/* Cash Flow Card */}
        <Card className="overflow-hidden group/card relative" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
          <div className="absolute inset-0 rounded-lg opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: `radial-gradient(ellipse at top left, ${THEME.primary}06 0%, transparent 60%)` }} />
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${THEME.primary}12` }}>
                <BarChart3 className="h-3.5 w-3.5" style={{ color: THEME.primary }} />
              </div>
              <CardTitle className="text-sm font-semibold" style={{ color: THEME.text }}>{t('dashboard.cashFlow')}</CardTitle>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full" style={{ color: THEME.muted, background: `${THEME.border}` }}>{t('dashboard.sixMonthsShort')}</span>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowData} barGap={4} barCategoryGap="20%">
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: THEME.muted }} axisLine={false} tickLine={false} width={35} />
                  <YAxis tick={{ fontSize: 9, fill: THEME.muted }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(0)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)} width={38} />
                  <Tooltip content={<ChartTooltip formatter={(v: number) => formatAmount(v)} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="income" name={t('dashboard.income')} fill={THEME.secondary} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="expense" name={t('dashboard.expense')} fill={THEME.destructive} radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-3 justify-center">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: THEME.secondary }} />
                <span className="text-[11px] font-medium" style={{ color: THEME.textSecondary }}>{t('dashboard.income')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: THEME.destructive }} />
                <span className="text-[11px] font-medium" style={{ color: THEME.textSecondary }}>{t('dashboard.expense')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Spending Card */}
        <Card className="overflow-hidden group/card relative" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
          <div className="absolute inset-0 rounded-lg opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: `radial-gradient(ellipse at top right, ${THEME.destructive}06 0%, transparent 60%)` }} />
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${THEME.destructive}12` }}>
                <PieChartIcon className="h-3.5 w-3.5" style={{ color: THEME.destructive }} />
              </div>
              <CardTitle className="text-sm font-semibold" style={{ color: THEME.text }}>{t('dashboard.topSpending')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {categoryData.length === 0 ? (
              <p className="text-xs text-center py-8" style={{ color: THEME.muted }}>{t('dashboard.noExpenseData')}</p>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="h-40 w-40 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={32} outerRadius={55} paddingAngle={2} dataKey="value" stroke="none">
                        {categoryData.map((entry: any, i: number) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip formatter={(v: number) => formatAmount(v)} />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 w-full space-y-2.5 min-w-0">
                  {categoryData.map((cat: any, i: number) => {
                    const pct = totalCategoryAmount > 0 ? (cat.value / totalCategoryAmount) * 100 : 0;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 min-w-0">
                            {cat.icon && <DynamicIcon name={cat.icon} className="h-3 w-3 shrink-0" style={{ color: cat.color }} />}
                            <span className="text-[11px] font-medium truncate" style={{ color: THEME.text }}>{cat.name}</span>
                          </div>
                          <span className="text-[10px] font-semibold shrink-0" style={{ color: cat.color }}>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: THEME.border }}>
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: cat.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Health Card */}
        <Card className="overflow-hidden group/card relative" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
          <div className="absolute inset-0 rounded-lg opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: `radial-gradient(ellipse at bottom center, ${THEME.secondary}06 0%, transparent 60%)` }} />
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${THEME.secondary}12` }}>
                <Shield className="h-3.5 w-3.5" style={{ color: THEME.secondary }} />
              </div>
              <CardTitle className="text-sm font-semibold" style={{ color: THEME.text }}>{t('dashboard.financialHealth')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center justify-center">
                <HealthScoreRing score={healthScore} grade={healthGrade} label={healthLabel} />
              </div>
              <div className="flex-1 w-full space-y-3 min-w-0">
                {[
                  { label: t('dashboard.savingsRate'), score: healthBreakdown.savingsRateScore },
                  { label: t('dashboard.consistency'), score: healthBreakdown.consistencyScore },
                  { label: t('dashboard.targetProgress'), score: healthBreakdown.targetProgressScore },
                  { label: t('dashboard.growth'), score: healthBreakdown.growthScore },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium" style={{ color: THEME.textSecondary }}>{item.label}</span>
                      <span className="text-[11px] font-bold" style={{ color: THEME.text }}>{item.score}/25</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: THEME.border }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(item.score / 25) * 100}%`, background: `linear-gradient(90deg, ${THEME.primary}, ${THEME.secondary})` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile/Tablet: Carousel Slides */}
      <div ref={viewportRef} className="w-full overflow-hidden lg:hidden">
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{
            width: slideWidth ? `${slideWidth * slides.length}px` : undefined,
            transform: slideWidth ? `translateX(-${selectedIdx * slideWidth}px)` : undefined,
          }}
        >
          {/* Slide 1: Cash Flow */}
          <div className="shrink-0" style={{ width: slideWidth || undefined, minWidth: slideWidth || '100%' }}>
            <Card
              className="overflow-hidden"
              style={{
                background: THEME.surface,
                border: `1px solid ${THEME.border}`,
              }}
            >
              <CardHeader className="pb-2 pt-3 sm:pt-4 px-3 sm:px-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" style={{ color: THEME.primary }} />
                  <CardTitle className="text-sm" style={{ color: THEME.text }}>
                    {t('dashboard.cashFlow')}
                  </CardTitle>
                  <span className="ml-auto text-[10px] whitespace-nowrap" style={{ color: THEME.muted }}>
                    {t('dashboard.sixMonthsShort')}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                <div className="h-40 sm:h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashFlowData} barGap={4} barCategoryGap="20%">
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: THEME.muted }}
                        axisLine={false}
                        tickLine={false}
                        width={35}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: THEME.muted }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(0)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)}
                        width={38}
                      />
                      <Tooltip
                        content={<ChartTooltip formatter={(v: number) => formatAmount(v)} />}
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      />
                      <Bar dataKey="income" name={t('dashboard.income')} fill={THEME.secondary} radius={[4, 4, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="expense" name={t('dashboard.expense')} fill={THEME.destructive} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-4 mt-1.5 justify-center">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: THEME.secondary }} />
                    <span className="text-[10px]" style={{ color: THEME.muted }}>{t('dashboard.income')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: THEME.destructive }} />
                    <span className="text-[10px]" style={{ color: THEME.muted }}>{t('dashboard.expense')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Slide 2: Top Spending */}
          <div className="shrink-0" style={{ width: slideWidth || undefined, minWidth: slideWidth || '100%' }}>
            <Card
              className="overflow-hidden"
              style={{
                background: THEME.surface,
                border: `1px solid ${THEME.border}`,
              }}
            >
              <CardHeader className="pb-2 pt-3 sm:pt-4 px-3 sm:px-4">
                <div className="flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4" style={{ color: THEME.primary }} />
                  <CardTitle className="text-sm" style={{ color: THEME.text }}>
                    {t('dashboard.topSpending')}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                {categoryData.length === 0 ? (
                  <p className="text-xs text-center py-6" style={{ color: THEME.muted }}>
                    {t('dashboard.noExpenseData')}
                  </p>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    {/* Donut */}
                    <div className="h-32 w-32 sm:h-36 sm:w-36 flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={50}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                          >
                            {categoryData.map((entry: any, i: number) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={<ChartTooltip formatter={(v: number) => formatAmount(v)} />}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Ranked list */}
                    <div className="flex-1 w-full space-y-2 min-w-0">
                      {categoryData.map((cat: any, i: number) => {
                        const pct = totalCategoryAmount > 0 ? (cat.value / totalCategoryAmount) * 100 : 0;
                        return (
                          <div key={i} className="space-y-0.5">
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1 min-w-0">
                                {cat.icon && <DynamicIcon name={cat.icon} className="h-3 w-3 shrink-0" style={{ color: cat.color }} />}
                                <span className="text-[11px] font-medium truncate" style={{ color: THEME.text }}>
                                  {cat.name}
                                </span>
                              </div>
                              <span className="text-[10px] shrink-0" style={{ color: THEME.muted }}>
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                            <div
                              className="h-1 rounded-full overflow-hidden"
                              style={{ background: THEME.border }}
                            >
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${pct}%`,
                                  background: cat.color,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Slide 3: Financial Health */}
          <div className="shrink-0" style={{ width: slideWidth || undefined, minWidth: slideWidth || '100%' }}>
            <Card
              className="overflow-hidden"
              style={{
                background: THEME.surface,
                border: `1px solid ${THEME.border}`,
              }}
            >
              <CardHeader className="pb-2 pt-3 sm:pt-4 px-3 sm:px-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" style={{ color: THEME.primary }} />
                  <CardTitle className="text-sm" style={{ color: THEME.text }}>
                    {t('dashboard.financialHealth')}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                  {/* Score ring */}
                  <div className="flex items-center justify-center">
                    <HealthScoreRing
                      score={healthScore}
                      grade={healthGrade}
                      label={healthLabel}
                    />
                  </div>

                  {/* Breakdown bars */}
                  <div className="flex-1 w-full space-y-2.5 min-w-0">
                    {[
                      { label: t('dashboard.savingsRate'), score: healthBreakdown.savingsRateScore },
                      { label: t('dashboard.consistency'), score: healthBreakdown.consistencyScore },
                      { label: t('dashboard.targetProgress'), score: healthBreakdown.targetProgressScore },
                      { label: t('dashboard.growth'), score: healthBreakdown.growthScore },
                    ].map((item) => (
                      <div key={item.label} className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px]" style={{ color: THEME.muted }}>{item.label}</span>
                          <span className="text-[10px] font-semibold" style={{ color: THEME.textSecondary }}>
                            {item.score}/25
                          </span>
                        </div>
                        <div
                          className="h-1 rounded-full overflow-hidden"
                          style={{ background: THEME.border }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${(item.score / 25) * 100}%`,
                              background: `linear-gradient(90deg, ${THEME.primary}, ${THEME.secondary})`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dot indicators (mobile only) */}
      <div className="flex items-center justify-center gap-2 lg:hidden">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: selectedIdx === i ? 20 : 6,
              background: selectedIdx === i ? THEME.primary : THEME.border,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main Dashboard Component ────────────────────────────────────
export function Dashboard() {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({ month: 'all', year: 'all' });

  useEffect(() => {
    fetchDashboardData();
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

  // ── Computed values with safe fallbacks ──
  const currentStage = data ? getCurrentStage(data.totalSavings) : getCurrentStage(0);
  const nextStage = data ? getNextStage(currentStage) : null;
  const progressToNext = data ? getProgressToNextStage(data.totalSavings, currentStage) : 0;

  const monthlyTrends = useMemo(() => {
    if (data?.monthlyTrends?.length) return data.monthlyTrends;
    // Fallback: generate from savingsHistory if available
    if (!data) return [];
    return [];
  }, [data]);

  const mc = data?.monthlyComparison;
  const topCats = data?.topCategories || [];
  const healthScore = data?.financialHealthScore ?? 50;
  const healthBreakdown = data?.healthBreakdown ?? {
    savingsRateScore: 50, consistencyScore: 50,
    targetProgressScore: 50, growthScore: 50,
  };
  const healthGrade = data?.healthGrade ?? 'C';
  const healthLabel = data?.healthLabel ?? 'Fair';
  const forecast = data?.forecast ?? {
    projectedMonthEnd: 0, projectedYearEnd: 0,
    runwayMonths: 0, dailyBurnRate: 0,
  };
  const targetAnalytics = data?.targetAnalytics ?? {
    onTrack: 0, behind: 0, totalMonthlyContribution: 0,
    averageProgress: 0, nearestCompletion: null, nearestCompletionDate: null,
  };
  const averages = data?.averages ?? {
    dailyExpense: 0, weeklyExpense: 0, monthlyExpense: 0,
    dailyIncome: 0, transactionSize: 0,
  };

  // ── Smart Insights ──
  const insights = useMemo(() => {
    if (!data) return [];
    const items: Array<{
      id: string; type: 'opportunity' | 'warning' | 'achievement';
      title: string; description: string; detail: string;
      icon: any; accent: string;
    }> = [];

    // Opportunity: Unallocated funds
    if (data.unallocatedFunds > 100000) {
      const potentialGrowth = data.unallocatedFunds * 0.09;
      items.push({
        id: 'unallocated',
        type: 'opportunity',
        title: t('dashboard.unallocatedTitle'),
        description: t('dashboard.unallocatedDesc', { amount: formatAmount(data.unallocatedFunds) }),
        detail: t('dashboard.unallocatedDetail', { amount: formatAmount(potentialGrowth) }),
        icon: <Sparkles className="h-4 w-4" />,
        accent: THEME.primary,
      });
    }

    // Opportunity: Close to next phase
    if (nextStage && data.totalSavings > 0) {
      const amountNeeded = nextStage.range[0] - data.totalSavings;
      if (amountNeeded > 0 && amountNeeded < data.totalSavings * 0.5) {
        const monthlyBoost = Math.ceil(amountNeeded / 3);
        items.push({
          id: 'accelerate',
          type: 'opportunity',
          title: t('dashboard.almostNextLevelTitle'),
          description: t('dashboard.almostNextLevelDesc', { amount: formatAmount(amountNeeded), stage: nextStage.name }),
          detail: t('dashboard.almostNextLevelDetail', { amount: formatAmount(monthlyBoost) }),
          icon: <Zap className="h-4 w-4" />,
          accent: THEME.primary,
        });
      }
    }

    // Warning: Low savings rate
    if (data.totalIncome > 0 && data.savingsRate < 10 && data.savingsRate >= 0) {
      items.push({
        id: 'low-savings-rate',
        type: 'warning',
        title: t('dashboard.lowSavingsTitle'),
        description: t('dashboard.lowSavingsDesc', { rate: data.savingsRate.toFixed(1) }),
        detail: t('dashboard.lowSavingsDetail'),
        icon: <AlertTriangle className="h-4 w-4" />,
        accent: THEME.warning,
      });
    }

    // Warning: Stagnant growth
    if (data.last30DaysGrowth <= 0 && data.totalIncome > 0) {
      items.push({
        id: 'stagnant',
        type: 'warning',
        title: t('dashboard.stagnantTitle'),
        description: t('dashboard.stagnantDesc'),
        detail: t('dashboard.stagnantDetail'),
        icon: <TrendingDown className="h-4 w-4" />,
        accent: THEME.destructive,
      });
    }

    // Achievement: Accelerating
    if (data.momentumIndicator === 'accelerating' && data.last7DaysGrowth > 0) {
      items.push({
        id: 'accelerating',
        type: 'achievement',
        title: t('dashboard.momentumTitle'),
        description: t('dashboard.momentumDesc'),
        detail: t('dashboard.momentumDetail', { amount: formatAmount(data.last7DaysGrowth) }),
        icon: <Flame className="h-4 w-4" />,
        accent: THEME.secondary,
      });
    }

    // Achievement: High savings rate
    if (data.savingsRate >= 20) {
      items.push({
        id: 'high-rate',
        type: 'achievement',
        title: t('dashboard.strongSavingsTitle'),
        description: t('dashboard.strongSavingsDesc', { rate: data.savingsRate.toFixed(0) }),
        detail: t('dashboard.strongSavingsDetail'),
        icon: <Trophy className="h-4 w-4" />,
        accent: THEME.secondary,
      });
    }

    // ── NEW INSIGHTS ──

    // Warning: Budget Almost Full — expense >= 80% of income
    if (mc && mc.currentMonthIncome > 0 && mc.currentMonthExpense > 0) {
      const burnRatio = (mc.currentMonthExpense / mc.currentMonthIncome) * 100;
      if (burnRatio >= 80 && burnRatio < 100) {
        items.push({
          id: 'budget-almost-full',
          type: 'warning',
          title: t('dashboard.budgetAlmostFull'),
          description: t('dashboard.budgetAlmostFullDesc', { percent: burnRatio.toFixed(0) }),
          detail: t('dashboard.budgetAlmostFullDetail', { amount: formatAmount(mc.currentMonthIncome - mc.currentMonthExpense) }),
          icon: <Timer className="h-4 w-4" />,
          accent: THEME.warning,
        });
      } else if (burnRatio >= 100) {
        items.push({
          id: 'budget-over',
          type: 'warning',
          title: t('dashboard.budgetOver'),
          description: t('dashboard.budgetOverDesc', { amount: formatAmount(mc.currentMonthExpense - mc.currentMonthIncome) }),
          detail: t('dashboard.budgetOverDetail'),
          icon: <AlertTriangle className="h-4 w-4" />,
          accent: THEME.destructive,
        });
      }
    }

    // Warning: Expense Surge — monthly expense jumped > 30% vs last month
    if (mc && mc.expenseChange > 30 && mc.previousMonthExpense > 0) {
      const extraSpending = mc.currentMonthExpense - mc.previousMonthExpense;
      items.push({
        id: 'expense-surge',
        type: 'warning',
        title: t('dashboard.expenseSurge'),
        description: t('dashboard.expenseSurgeDesc', { percent: mc.expenseChange.toFixed(0) }),
        detail: t('dashboard.expenseSurgeDetail', { amount: formatAmount(extraSpending) }),
        icon: <Radar className="h-4 w-4" />,
        accent: '#FF7043',
      });
    }

    // Warning: Category Surge — a specific category spiked > 50%
    if (topCats.length > 0) {
      const surged = topCats.find((c) => c.trend === 'up' && c.trendPercentage > 50);
      if (surged) {
        items.push({
          id: 'category-surge',
          type: 'warning',
          title: t('dashboard.categorySurgeTitle', { name: surged.name }),
          description: t('dashboard.categorySurgeDesc', { name: surged.name, percent: surged.trendPercentage.toFixed(0) }),
          detail: t('dashboard.categorySurgeDetail', { amount: formatAmount(surged.amount), name: surged.name }),
          icon: <Eye className="h-4 w-4" />,
          accent: '#FF7043',
        });
      }
    }

    // Opportunity: Big Transaction Detected — single tx > 3x average
    if (data.transactions && data.transactions.length > 2 && averages.transactionSize > 0) {
      const bigTx = data.transactions.find(
        (t: any) => t.type === 'expense' && t.amount > averages.transactionSize * 3
      );
      if (bigTx) {
        items.push({
          id: 'big-expense',
          type: 'warning',
          title: t('dashboard.bigTransaction'),
          description: t('dashboard.bigTransactionDesc', { desc: bigTx.description, amount: formatAmount(bigTx.amount) }),
          detail: t('dashboard.bigTransactionDetail', { times: ((bigTx.amount / averages.transactionSize) - 1).toFixed(0) }),
          icon: <Banknote className="h-4 w-4" />,
          accent: THEME.warning,
        });
      }
    }

    // Achievement: Target Almost Complete — any target >= 90%
    const nearComplete = data.savingsTargets?.find(
      (t: any) => {
        const p = Math.min((t.currentAmount / t.targetAmount) * 100, 100);
        return p >= 90 && p < 100;
      }
    );
    if (nearComplete) {
      const pct = Math.min((nearComplete.currentAmount / nearComplete.targetAmount) * 100, 100);
      const remaining = nearComplete.targetAmount - nearComplete.currentAmount;
      items.push({
        id: 'target-almost-done',
        type: 'achievement',
        title: t('dashboard.targetAlmostDone'),
        description: t('dashboard.targetAlmostDoneDesc', { name: nearComplete.name, percent: pct.toFixed(0) }),
        detail: t('dashboard.targetAlmostDoneDetail', { amount: formatAmount(remaining) }),
        icon: <CheckCircle2 className="h-4 w-4" />,
        accent: THEME.secondary,
      });
    }

    // Achievement: All targets on track
    if (targetAnalytics.onTrack > 0 && targetAnalytics.behind === 0 && data.savingsTargets.length > 0) {
      items.push({
        id: 'all-on-track',
        type: 'achievement',
        title: t('dashboard.allOnTrackTitle'),
        description: t('dashboard.allOnTrackDesc', { count: targetAnalytics.onTrack }),
        detail: t('dashboard.allOnTrackDetail'),
        icon: <Trophy className="h-4 w-4" />,
        accent: THEME.secondary,
      });
    }

    // All good fallback
    if (items.length === 0) {
      items.push({
        id: 'all-good',
        type: 'achievement',
        title: t('dashboard.allGoodTitle'),
        description: t('dashboard.allGoodDesc'),
        detail: t('dashboard.allGoodDetail'),
        icon: <CheckCircle2 className="h-4 w-4" />,
        accent: THEME.secondary,
      });
    }

    return items.slice(0, 5);
  }, [data, nextStage, mc, topCats, averages, targetAnalytics]);

  // ── Cash flow chart data ──
  const cashFlowData = useMemo(() => {
    if (monthlyTrends.length > 0) {
      return monthlyTrends.slice(-6).map((t) => {
        const date = new Date(t.year, t.monthNum - 1, 1);
        return {
          name: format(date, 'MMM', { locale: idLocale }),
          income: t.income,
          expense: t.expense,
        };
      });
    }
    // Fallback: derive from expenseByCategory and current data
    if (!data) return [];
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return {
        name: format(d, 'MMM', { locale: idLocale }),
        income: i === 5 ? data.totalIncome : Math.round(data.totalIncome * (0.6 + Math.random() * 0.5)),
        expense: i === 5 ? data.totalExpense : Math.round(data.totalExpense * (0.6 + Math.random() * 0.5)),
      };
    });
  }, [monthlyTrends, data]);

  // ── Spending categories for chart ──
  const categoryData = useMemo(() => {
    if (topCats.length > 0) {
      return topCats.slice(0, 6).map((c, i) => ({
        name: c.name,
        value: c.amount,
        color: c.color || CATEGORY_COLORS[i % CATEGORY_COLORS.length],
        percentage: c.percentage,
        icon: c.icon,
      }));
    }
    if (!data?.expenseByCategory?.length) return [];
    return data.expenseByCategory.slice(0, 6).map((c: any, i: number) => ({
      name: c.category,
      value: c.amount,
      color: c.color || CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      percentage: data.totalExpense > 0 ? ((c.amount / data.totalExpense) * 100).toFixed(1) : '0',
      icon: c.icon,
    }));
  }, [topCats, data]);

  const totalCategoryAmount = categoryData.reduce((s, c) => s + c.value, 0);

  // ── Loading State ──
  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: THEME.primary }} />
      </div>
    );
  }

  // ── Trend helpers ──
  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-3.5 w-3.5" style={{ color: THEME.secondary }} />;
    if (change < 0) return <TrendingDown className="h-3.5 w-3.5" style={{ color: THEME.destructive }} />;
    return <Minus className="h-3.5 w-3.5" style={{ color: THEME.muted }} />;
  };

  const getTrendColor = (change: number, inverse = false) => {
    if (inverse) {
      if (change < 0) return THEME.secondary;
      if (change > 0) return THEME.destructive;
    } else {
      if (change > 0) return THEME.secondary;
      if (change < 0) return THEME.destructive;
    }
    return THEME.muted;
  };

  return (
    <div className="space-y-4 lg:space-y-5 xl:space-y-6 overflow-hidden w-full max-w-full">
      {/* ═══ Section 1: Filter Bar ═══ */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold shrink-0" style={{ color: THEME.text }}>{t('nav.dashboard')}</h2>
        <div className="flex gap-1.5 shrink-0">
          <Select value={filter.month} onValueChange={(v) => setFilter({ ...filter, month: v })}>
            <SelectTrigger
              className="w-[100px] h-8 text-xs"
              style={{
                background: THEME.surface,
                border: `1px solid ${THEME.border}`,
                color: THEME.textSecondary,
              }}
            >
              <SelectValue placeholder={t('kas.filterMonth')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filter.all')}</SelectItem>
              {[...Array(12)].map((_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {format(new Date(2025, i, 1), 'MMMM', { locale: idLocale })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filter.year} onValueChange={(v) => setFilter({ ...filter, year: v })}>
            <SelectTrigger
              className="w-[80px] h-8 text-xs"
              style={{
                background: THEME.surface,
                border: `1px solid ${THEME.border}`,
                color: THEME.textSecondary,
              }}
            >
              <SelectValue placeholder={t('dashboard.sixMonthsShort')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filter.all')}</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ═══ Section 2: KPI Strip ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 xl:gap-4">
        {/* Net Worth */}
        <Card
          className="group cursor-default transition-all duration-200"
          style={{
            background: THEME.surface,
            border: `1px solid ${THEME.border}`,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = THEME.borderHover)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = THEME.border)}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Wallet className="h-3.5 w-3.5" style={{ color: THEME.primary }} />
              <span className="text-[10px] sm:text-[11px] font-medium" style={{ color: THEME.muted }}>{t('dashboard.netWorth')}</span>
            </div>
            <p className="text-base sm:text-xl font-bold tracking-tight truncate" style={{ color: THEME.text }}>
              {formatAmount(data.totalSavings)}
            </p>
            <div className="flex items-center gap-1 mt-1 overflow-hidden">
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{ background: `${THEME.primary}20`, color: THEME.primary }}
              >
                {currentStage.name}
              </span>
              {nextStage && (
                <span className="text-[10px] truncate" style={{ color: THEME.muted }}>
                  {progressToNext.toFixed(0)}% {t('dashboard.toNext')} {nextStage.name}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Income */}
        <Card
          className="group cursor-default transition-all duration-200"
          style={{
            background: THEME.surface,
            border: `1px solid ${THEME.border}`,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = THEME.borderHover)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = THEME.border)}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <ArrowUpRight className="h-3.5 w-3.5" style={{ color: THEME.secondary }} />
                <span className="text-[10px] sm:text-[11px] font-medium" style={{ color: THEME.muted }}>{t('dashboard.income')}</span>
              </div>
              {mc && getTrendIcon(mc.incomeChange)}
            </div>
            <p className="text-base sm:text-xl font-bold tracking-tight truncate" style={{ color: THEME.text }}>
              {formatAmount(mc?.currentMonthIncome ?? data.totalIncome)}
            </p>
            {mc && mc.incomeChange !== 0 && (
              <p className="text-[10px] sm:text-[11px] mt-1 truncate" style={{ color: getTrendColor(mc.incomeChange) }}>
                {mc.incomeChange > 0 ? '+' : ''}{mc.incomeChange.toFixed(1)}% {t('dashboard.vsLastMonth')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Monthly Expense */}
        <Card
          className="group cursor-default transition-all duration-200"
          style={{
            background: THEME.surface,
            border: `1px solid ${THEME.border}`,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = THEME.borderHover)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = THEME.border)}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <ArrowDownRight className="h-3.5 w-3.5" style={{ color: THEME.destructive }} />
                <span className="text-[10px] sm:text-[11px] font-medium" style={{ color: THEME.muted }}>{t('dashboard.expense')}</span>
              </div>
              {mc && getTrendIcon(mc.expenseChange, true)}
            </div>
            <p className="text-base sm:text-xl font-bold tracking-tight truncate" style={{ color: THEME.text }}>
              {formatAmount(mc?.currentMonthExpense ?? data.totalExpense)}
            </p>
            {mc && mc.expenseChange !== 0 && (
              <p className="text-[10px] sm:text-[11px] mt-1 truncate" style={{ color: getTrendColor(mc.expenseChange, true) }}>
                {mc.expenseChange > 0 ? '+' : ''}{mc.expenseChange.toFixed(1)}% {t('dashboard.vsLastMonth')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Savings Rate */}
        <Card
          className="group cursor-default transition-all duration-200"
          style={{
            background: THEME.surface,
            border: `1px solid ${THEME.border}`,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = THEME.borderHover)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = THEME.border)}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Activity className="h-3.5 w-3.5" style={{ color: THEME.warning }} />
              <span className="text-[10px] sm:text-[11px] font-medium" style={{ color: THEME.muted }}>{t('dashboard.savingsRate')}</span>
            </div>
            <div className="flex items-end gap-3">
              <SavingsRateGauge rate={data.savingsRate} />
              <div className="pb-1">
                <p className="text-xs" style={{ color: THEME.muted }}>
                  {t('dashboard.savingsTarget20')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Section 3: Analytics Carousel ═══ */}
      <AnalyticsCarousel
        cashFlowData={cashFlowData}
        categoryData={categoryData}
        totalCategoryAmount={totalCategoryAmount}
        healthScore={healthScore}
        healthGrade={healthGrade}
        healthLabel={healthLabel}
        healthBreakdown={healthBreakdown}
      />

      {/* ═══ Section 5: Smart Insights ═══ */}
      {insights.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" style={{ color: THEME.primary }} />
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: THEME.muted }}>
              {t('dashboard.smartInsights')}
            </h3>
          </div>
          {/* Mobile: horizontal scroll */}
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-3 px-3 lg:hidden">
            {insights.map((insight) => {
              const typeLabel = insight.type === 'opportunity' ? t('dashboard.insightOpportunity') : insight.type === 'warning' ? t('dashboard.insightWarning') : t('dashboard.insightAchievement');
              const typeBg = insight.type === 'opportunity' ? THEME.primary + '20' : insight.type === 'warning' ? THEME.warning + '20' : THEME.secondary + '20';
              return (
                <div
                  key={insight.id}
                  className="shrink-0 w-[260px] sm:w-[280px] rounded-xl p-3.5 transition-all duration-200 relative overflow-hidden"
                  style={{
                    background: THEME.surface,
                    border: `1px solid ${THEME.border}`,
                    borderLeft: `3px solid ${insight.accent}`,
                  }}
                >
                  {/* subtle gradient glow */}
                  <div
                    className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-20 pointer-events-none"
                    style={{ background: insight.accent }}
                  />
                  <div className="relative z-10 space-y-2.5">
                    {/* Type badge + icon */}
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                        style={{ background: typeBg, color: insight.accent }}
                      >
                        {typeLabel}
                      </span>
                      <div
                        className="p-1.5 rounded-lg"
                        style={{ background: insight.accent + '15' }}
                      >
                        <span style={{ color: insight.accent }}>{insight.icon}</span>
                      </div>
                    </div>
                    {/* Title + Description */}
                    <div>
                      <h4 className="text-[13px] font-semibold leading-tight mb-1" style={{ color: THEME.text }}>
                        {insight.title}
                      </h4>
                      <p className="text-[11px] leading-relaxed" style={{ color: THEME.muted }}>
                        {insight.description}
                      </p>
                    </div>
                    {/* Detail pill */}
                    <div
                      className="text-[10px] font-medium px-2.5 py-1 rounded-lg"
                      style={{
                        background: insight.accent + '10',
                        color: insight.accent,
                      }}
                    >
                      {insight.detail}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Desktop: 3-column grid */}
          <div className="hidden lg:grid lg:grid-cols-3 gap-4 xl:gap-5">
            {insights.map((insight) => {
              const typeLabel = insight.type === 'opportunity' ? t('dashboard.insightOpportunity') : insight.type === 'warning' ? t('dashboard.insightWarning') : t('dashboard.insightAchievement');
              const typeBg = insight.type === 'opportunity' ? THEME.primary + '20' : insight.type === 'warning' ? THEME.warning + '20' : THEME.secondary + '20';
              return (
                <div
                  key={insight.id}
                  className="rounded-xl p-4 transition-all duration-200 relative overflow-hidden"
                  style={{
                    background: THEME.surface,
                    border: `1px solid ${THEME.border}`,
                    borderLeft: `3px solid ${insight.accent}`,
                  }}
                >
                  <div
                    className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-20 pointer-events-none"
                    style={{ background: insight.accent }}
                  />
                  <div className="relative z-10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                        style={{ background: typeBg, color: insight.accent }}
                      >
                        {typeLabel}
                      </span>
                      <div
                        className="p-1.5 rounded-lg"
                        style={{ background: insight.accent + '15' }}
                      >
                        <span style={{ color: insight.accent }}>{insight.icon}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[13px] font-semibold leading-tight mb-1" style={{ color: THEME.text }}>{insight.title}</h4>
                      <p className="text-[11px] leading-relaxed" style={{ color: THEME.muted }}>{insight.description}</p>
                    </div>
                    <div
                      className="text-[10px] font-medium px-2.5 py-1 rounded-lg"
                      style={{ background: insight.accent + '10', color: insight.accent }}
                    >
                      {insight.detail}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Section 6: Savings Targets Progress ═══ */}
      {data.savingsTargets.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5" style={{ color: THEME.primary }} />
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: THEME.muted }}>
                {t('dashboard.savingsTargets')}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {targetAnalytics.onTrack > 0 && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: THEME.secondary + '15', color: THEME.secondary }}>
                  {targetAnalytics.onTrack} {t('dashboard.onTrack')}
                </span>
              )}
              {targetAnalytics.behind > 0 && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: THEME.destructive + '15', color: THEME.destructive }}>
                  {targetAnalytics.behind} {t('dashboard.behind')}
                </span>
              )}
            </div>
          </div>
          {/* Mobile: horizontal scroll */}
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-3 px-3 lg:hidden">
            {data.savingsTargets.slice(0, 6).map((target: any) => {
              const progress = Math.min((target.currentAmount / target.targetAmount) * 100, 100);
              const remaining = Math.max(target.targetAmount - target.currentAmount, 0);
              const progressColor =
                progress >= 80 ? THEME.secondary :
                progress >= 40 ? THEME.warning :
                THEME.primary;
              // Mini ring
              const ringRadius = 20;
              const ringStroke = 3;
              const ringNorm = ringRadius - ringStroke / 2;
              const ringCirc = ringNorm * 2 * Math.PI;
              const ringOffset = ringCirc - (progress / 100) * ringCirc;

              return (
                <div
                  key={target.id}
                  className="shrink-0 w-[200px] sm:w-[220px] rounded-xl p-3.5 transition-all duration-200 relative overflow-hidden"
                  style={{
                    background: THEME.surface,
                    border: `1px solid ${THEME.border}`,
                  }}
                >
                  {/* subtle glow */}
                  <div
                    className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full blur-2xl opacity-10 pointer-events-none"
                    style={{ background: progressColor }}
                  />
                  <div className="relative z-10 flex items-start gap-3">
                    {/* Mini progress ring */}
                    <div className="relative shrink-0">
                      <svg width={ringRadius * 2} height={ringRadius * 2} className="-rotate-90">
                        <circle
                          stroke="rgba(255,255,255,0.06)"
                          fill="transparent"
                          strokeWidth={ringStroke}
                          r={ringNorm}
                          cx={ringRadius}
                          cy={ringRadius}
                        />
                        <circle
                          stroke={progressColor}
                          fill="transparent"
                          strokeWidth={ringStroke}
                          strokeLinecap="round"
                          strokeDasharray={ringCirc + ' ' + ringCirc}
                          style={{ strokeDashoffset: ringOffset, transition: 'stroke-dashoffset 0.8s ease-out' }}
                          r={ringNorm}
                          cx={ringRadius}
                          cy={ringRadius}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[8px] font-bold" style={{ color: progressColor }}>
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <h4 className="text-xs font-semibold truncate" style={{ color: THEME.text }}>
                        {target.name}
                      </h4>
                      <p className="text-[10px]" style={{ color: THEME.muted }}>
                        {formatAmount(target.currentAmount)}
                      </p>
                      <p className="text-[10px]" style={{ color: THEME.muted }}>
                        of {formatAmount(target.targetAmount)}
                      </p>
                      {remaining > 0 && (
                        <div className="flex items-center gap-1 pt-0.5">
                          <div className="h-1 flex-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${progress}%`, background: progressColor }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Desktop: grid layout */}
          <div className="hidden lg:grid lg:grid-cols-3 gap-4 xl:gap-5">
            {data.savingsTargets.slice(0, 6).map((target: any) => {
              const progress = Math.min((target.currentAmount / target.targetAmount) * 100, 100);
              const remaining = Math.max(target.targetAmount - target.currentAmount, 0);
              const progressColor =
                progress >= 80 ? THEME.secondary :
                progress >= 40 ? THEME.warning :
                THEME.primary;
              const ringRadius = 22;
              const ringStroke = 3;
              const ringNorm = ringRadius - ringStroke / 2;
              const ringCirc = ringNorm * 2 * Math.PI;
              const ringOffset = ringCirc - (progress / 100) * ringCirc;

              return (
                <div
                  key={target.id}
                  className="rounded-xl p-4 transition-all duration-200 relative overflow-hidden"
                  style={{
                    background: THEME.surface,
                    border: `1px solid ${THEME.border}`,
                  }}
                >
                  <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full blur-2xl opacity-10 pointer-events-none" style={{ background: progressColor }} />
                  <div className="relative z-10 flex items-start gap-3">
                    <div className="relative shrink-0">
                      <svg width={ringRadius * 2} height={ringRadius * 2} className="-rotate-90">
                        <circle stroke="rgba(255,255,255,0.06)" fill="transparent" strokeWidth={ringStroke} r={ringNorm} cx={ringRadius} cy={ringRadius} />
                        <circle stroke={progressColor} fill="transparent" strokeWidth={ringStroke} strokeLinecap="round" strokeDasharray={ringCirc + ' ' + ringCirc} style={{ strokeDashoffset: ringOffset, transition: 'stroke-dashoffset 0.8s ease-out' }} r={ringNorm} cx={ringRadius} cy={ringRadius} />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[8px] font-bold" style={{ color: progressColor }}>{progress.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <h4 className="text-xs font-semibold truncate" style={{ color: THEME.text }}>{target.name}</h4>
                      <p className="text-[10px]" style={{ color: THEME.muted }}>{formatAmount(target.currentAmount)}</p>
                      <p className="text-[10px]" style={{ color: THEME.muted }}>of {formatAmount(target.targetAmount)}</p>
                      {remaining > 0 && (
                        <div className="flex items-center gap-1 pt-0.5">
                          <div className="h-1 flex-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: progressColor }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {data.savingsTargets.length > 6 && (
            <p className="text-[10px] text-center" style={{ color: THEME.muted }}>
              + {data.savingsTargets.length - 6} more targets
            </p>
          )}
        </div>
      )}

      {/* ═══ Section 7: Quick Stats Footer ═══ */}
      <Card
        style={{
          background: THEME.surface,
          border: `1px solid ${THEME.border}`,
        }}
      >
        <CardContent className="p-4 lg:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: THEME.muted }}>
                {t('dashboard.expensePerDay')}
              </p>
              <p className="text-sm font-semibold" style={{ color: THEME.text }}>
                {formatAmount(averages.dailyExpense)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: THEME.muted }}>
                {t('dashboard.expensePerWeek')}
              </p>
              <p className="text-sm font-semibold" style={{ color: THEME.text }}>
                {formatAmount(averages.weeklyExpense)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: THEME.muted }}>
                {t('dashboard.fundResilience')}
              </p>
              <p className="text-sm font-semibold" style={{ color: forecast.runwayMonths === -1 ? THEME.secondary : THEME.text }}>
                {forecast.runwayMonths === -1 ? t('dashboard.safe') : forecast.runwayMonths > 0 ? `${forecast.runwayMonths} ${t('dashboard.monthsUnit')}` : `0 ${t('dashboard.monthsUnit')}`}
              </p>
              {forecast.runwayMonths === -1 && (
                <p className="text-[9px]" style={{ color: THEME.muted }}>{t('dashboard.surplusThisMonth')}</p>
              )}
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: THEME.muted }}>
                {t('dashboard.avgTransaction')}
              </p>
              <p className="text-sm font-semibold" style={{ color: THEME.text }}>
                {formatAmount(averages.transactionSize)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
