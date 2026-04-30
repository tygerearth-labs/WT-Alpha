'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Wallet, ArrowUpRight, ArrowDownRight, FileText, FileSpreadsheet } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrencyFormat } from '@/hooks/useCurrencyFormat';
import { LaporanSkeleton } from '@/components/shared/PageSkeleton';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { DynamicIcon } from '@/components/shared/DynamicIcon';
import { useAuthStore } from '@/store/useAuthStore';

// ── Theme ──
const T = {
  bg: '#121212', primary: '#BB86FC', secondary: '#03DAC6',
  destructive: '#CF6679', warning: '#F9A825', muted: '#9E9E9E',
  border: 'rgba(255,255,255,0.06)', text: '#E6E1E5', textSub: '#B3B3B3',
} as const;

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  date: string;
  category: { id: string; name: string; color: string; icon: string; };
}

interface SavingsTarget { id: string; name: string; targetAmount: number; currentAmount: number; targetDate: Date | string; }

export function Laporan() {
  const { t } = useTranslation();
  const { formatAmount } = useCurrencyFormat();
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savingsTargets, setSavingsTargets] = useState<SavingsTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({ type: 'all', month: 'all', year: 'all' });
  const [exportEnabled, setExportEnabled] = useState<{ pdf: boolean; excel: boolean }>({ pdf: true, excel: true });

  // Fetch export permissions from platform config
  useEffect(() => {
    const fetchExportConfig = async () => {
      try {
        const res = await fetch('/api/platform-config');
        if (res.ok) {
          const config = await res.json();
          if (config.exportEnabled) {
            const plan = user?.plan || 'basic';
            const planExport = config.exportEnabled[plan];
            if (planExport) {
              setExportEnabled({
                pdf: planExport.pdf !== false,
                excel: planExport.excel !== false,
              });
            }
          }
        }
      } catch {
        // Default to showing export buttons if config fetch fails
      }
    };
    fetchExportConfig();
  }, [user?.plan]);

  useEffect(() => { fetchData(); }, [filter]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.type !== 'all') params.append('type', filter.type);
      if (filter.month !== 'all') params.append('month', filter.month);
      if (filter.year !== 'all') params.append('year', filter.year);
      const [transRes, savingsRes] = await Promise.all([
        fetch(`/api/transactions?${params}`),
        fetch('/api/savings'),
      ]);
      if (transRes.ok && savingsRes.ok) {
        const transData = await transRes.json();
        const savingsData = await savingsRes.json();
        setTransactions(transData.transactions);
        setSavingsTargets(savingsData.savingsTargets);
      }
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(transactions.map(tx => ({
      [t('laporan.excelType')]: tx.type === 'income' ? t('laporan.income') : t('laporan.expense'),
      [t('laporan.excelCategory')]: tx.category.name,
      [t('laporan.excelDescription')]: tx.description || '-',
      [t('laporan.excelAmount')]: tx.amount,
      [t('laporan.excelDate')]: format(new Date(tx.date), 'dd/MM/yyyy', { locale: id }),
    }))), t('laporan.transactionSheetName'));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(savingsTargets.map(s => ({
      [t('laporan.targetName')]: s.name, [t('laporan.targetAmount')]: s.targetAmount, [t('laporan.collected')]: s.currentAmount,
      [t('laporan.progress')]: `${((s.currentAmount / s.targetAmount) * 100 || 0).toFixed(1)}%`,
      [t('laporan.deadline')]: format(new Date(s.targetDate), 'dd/MM/yyyy', { locale: id }),
    }))), t('laporan.targetSheetName'));
    XLSX.writeFile(wb, `${t('laporan.excelFilename')}_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
    toast.success(t('laporan.downloadSuccess'));
  };

  const totalIncome = transactions.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
  const totalExpense = transactions.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
  const balance = totalIncome - totalExpense;
  const totalSavings = savingsTargets.reduce((s, st) => s + st.currentAmount, 0);
  const txCount = transactions.length;
  const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100) : 0;
  const uniqueDays = new Set(transactions.map(tx => tx.date)).size;
  const avgDaily = txCount > 0 ? totalExpense / Math.max(uniqueDays, 1) : 0;

  const filterBtnCls = (active: boolean) =>
    `text-[10px] sm:text-[11px] font-medium px-2.5 py-1.5 h-9 sm:h-10 rounded-full shrink-0 transition-all ${active ? '' : ''}`;

  const filterStyle = (active: boolean) => ({
    background: active ? `linear-gradient(135deg, ${T.primary}20, ${T.primary}08)` : 'transparent',
    color: active ? T.primary : T.muted,
    border: active ? `1px solid ${T.primary}30` : '1px solid transparent',
    boxShadow: active ? `0 0 12px ${T.primary}15` : 'none',
  });

  if (isLoading) {
    return <LaporanSkeleton />;
  }

  return (
    <div className="px-4 sm:px-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-bold uppercase tracking-wider" style={{ color: T.text }}>{t('laporan.title')}</p>
          <p className="text-[10px] mt-0.5" style={{ color: T.muted }}>{t('laporan.transactionCount', { count: txCount })}</p>
        </div>
        <div className="flex items-center gap-2">
          {exportEnabled.excel && (
            <button
              onClick={exportToExcel}
              disabled={txCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-40"
              style={{ background: `${T.secondary}12`, color: T.secondary, border: `1px solid ${T.secondary}20` }}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              {t('laporan.export')}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        {/* Type filter */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {([['all', t('laporan.all')], ['income', t('laporan.income')], ['expense', t('laporan.expense')]] as const).map(([val, label]) => (
            <button key={val} onClick={() => setFilter({ ...filter, type: val })} className={filterBtnCls(filter.type === val)} style={filterStyle(filter.type === val)}>
              {label}
            </button>
          ))}
        </div>
        {/* Month/Year filters — side by side on desktop */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {([['all', t('laporan.all')], ['1', 'Jan'], ['2', 'Feb'], ['3', 'Mar'], ['4', 'Apr'], ['5', 'Mei'], ['6', 'Jun'], ['7', 'Jul'], ['8', 'Agu'], ['9', 'Sep'], ['10', 'Okt'], ['11', 'Nov'], ['12', 'Des']] as const).map(([val, label]) => (
              <button key={val} onClick={() => setFilter({ ...filter, month: val })} className={filterBtnCls(filter.month === val)} style={filterStyle(filter.month === val)}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {([['all', t('laporan.all')], ['2023', '2023'], ['2024', '2024'], ['2025', '2025']] as const).map(([val, label]) => (
              <button key={val} onClick={() => setFilter({ ...filter, year: val })} className={filterBtnCls(filter.year === val)} style={filterStyle(filter.year === val)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: t('laporan.income'), value: totalIncome, color: T.secondary, icon: ArrowUpRight, sub: t('laporan.subIncome') },
          { label: t('laporan.expense'), value: totalExpense, color: T.destructive, icon: ArrowDownRight, sub: t('laporan.subExpense') },
          { label: t('laporan.balance'), value: balance, color: balance >= 0 ? T.secondary : T.destructive, icon: Wallet, sub: t('laporan.subNetBalance') },
          { label: t('laporan.savings'), value: totalSavings, color: T.primary, icon: Target, sub: t('laporan.subCollected') },
        ].map(item => (
          <motion.div
            key={item.label}
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="p-3 lg:p-4 rounded-xl relative overflow-hidden"
            style={{ background: T.bg, border: `1px solid ${T.border}` }}
          >

            <div className="flex items-center gap-1.5 mb-1">
              <item.icon className="h-3 w-3" style={{ color: item.color }} />
              <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-medium" style={{ color: T.muted }}>{item.label}</span>
            </div>
            <p className="text-sm sm:text-base lg:text-lg font-bold truncate" style={{ color: item.color }}>
              {formatAmount(item.value)}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Section divider */}
      <div className="h-px bg-white/[0.06]" />

      {/* Cash Flow Analytics */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-xl overflow-hidden relative"
        style={{ background: `linear-gradient(135deg, ${T.bg}, #141418)`, border: `1px solid ${T.border}` }}
      >
        <div className="h-px bg-white/[0.06]" />
        <div className="p-3 sm:p-4 lg:p-5 grid grid-cols-3 gap-3 lg:gap-6">
          <div className="text-center">
            <p className="text-[10px] sm:text-[11px] uppercase tracking-wider" style={{ color: T.muted }}>{t('laporan.savingsRate')}</p>
            <p className="text-base lg:text-xl font-bold" style={{ color: savingsRate >= 20 ? T.secondary : T.warning }}>{(savingsRate ?? 0).toFixed(1)}%</p>
            <div className="w-full h-1.5 rounded-full overflow-hidden mt-2" style={{ background: T.border }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: savingsRate >= 20 ? 'linear-gradient(to right, #03DAC6, #03DAC6aa)' : 'linear-gradient(to right, #F9A825, #F9A825aa)' }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(savingsRate, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
          <div className="text-center">
            <p className="text-[10px] sm:text-[11px] uppercase tracking-wider" style={{ color: T.muted }}>{t('laporan.dailyAvg')}</p>
            <p className="text-base lg:text-xl font-bold truncate" style={{ color: T.textSub }}>{formatAmount(avgDaily)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] sm:text-[11px] uppercase tracking-wider" style={{ color: T.muted }}>{t('laporan.transaction')}</p>
            <p className="text-base lg:text-xl font-bold" style={{ color: T.primary }}>{txCount}</p>
          </div>
        </div>
      </motion.div>

      {/* Section divider */}
      <div className="h-px bg-white/[0.06]" />

      {/* Transactions */}
      <div className="rounded-xl overflow-hidden" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-2 px-3 sm:px-4 lg:px-5 py-2.5 lg:py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
          <FileText className="h-4 w-4" style={{ color: T.primary }} />
          <p className="text-xs font-semibold" style={{ color: T.text }}>{t('laporan.history')}</p>
        </div>

        {txCount === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="py-16 sm:py-20 text-center relative px-6"
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: T.primary }} />
            </div>
            <div className="w-14 h-14 rounded-2xl grid place-items-center mb-3 mx-auto relative border"
              style={{ background: `${T.primary}10`, borderColor: `${T.primary}20` }}>
              <FileText className="h-7 w-7 relative" style={{ color: T.primary, opacity: 0.7 }} />
            </div>
            <p className="text-sm font-semibold relative" style={{ color: T.text }}>{t('laporan.noData')}</p>
          </motion.div>
        ) : (
          <>
            {/* Desktop: table layout */}
            <div className="hidden lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-5 py-2.5" style={{ color: T.muted }}>{t('laporan.date')}</th>
                    <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-4 py-2.5" style={{ color: T.muted }}>{t('laporan.category')}</th>
                    <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-4 py-2.5" style={{ color: T.muted }}>{t('laporan.excelDescription')}</th>
                    <th className="text-right text-[10px] font-semibold uppercase tracking-wider px-5 py-2.5" style={{ color: T.muted }}>{t('laporan.excelAmount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr
                      key={tx.id}
                      className="transition-colors hover:bg-white/[0.02]"
                      style={{ borderBottom: `1px solid ${T.border}`, borderLeft: tx.type === 'income' ? '3px solid #03DAC6' : '3px solid #CF6679' }}
                    >
                      <td className="px-5 py-3 whitespace-nowrap" style={{ color: T.muted, fontSize: '13px' }}>
                        {format(new Date(tx.date), 'dd MMM yyyy', { locale: id })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg grid place-items-center shrink-0 [&>*]:block leading-none"
                            style={{ background: `${tx.category.color}15` }}
                          >
                            <DynamicIcon name={tx.category.icon} className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-[13px] font-medium truncate" style={{ color: T.text }}>{tx.category.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] truncate max-w-[200px]" style={{ color: T.textSub }}>
                        {tx.description || '-'}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap font-semibold text-[13px]" style={{ color: tx.type === 'income' ? T.secondary : T.destructive }}>
                        {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile: list layout */}
            <div className="lg:hidden max-h-96 overflow-y-auto">
              {transactions.map(tx => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 px-3 sm:px-4 py-2.5 transition-colors active:bg-white/[0.02]"
                  style={{ borderBottom: `1px solid ${T.border}`, borderLeft: tx.type === 'income' ? '3px solid #03DAC6' : '3px solid #CF6679' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg grid place-items-center shrink-0 text-sm [&>*]:block leading-none"
                    style={{ background: `${tx.category.color}15` }}
                  >
                    <DynamicIcon name={tx.category.icon} className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: T.text }}>{tx.description || tx.category.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] sm:text-[11px]" style={{ color: T.muted }}>{tx.category.name}</span>
                      <span className="text-[10px] sm:text-[11px]" style={{ color: `${T.border}` }}>·</span>
                      <span className="text-[10px] sm:text-[11px]" style={{ color: T.muted }}>{format(new Date(tx.date), 'dd MMM yyyy', { locale: id })}</span>
                    </div>
                  </div>
                  <span
                    className="text-xs font-semibold shrink-0"
                    style={{ color: tx.type === 'income' ? T.secondary : T.destructive }}
                  >
                    {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Section divider */}
      {savingsTargets.length > 0 && <div className="h-px bg-white/[0.06]" />}

      {/* Savings Targets */}
      {savingsTargets.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-xl overflow-hidden"
          style={{ background: T.bg, border: `1px solid ${T.border}` }}
        >
          <div className="flex items-center gap-2 px-3 sm:px-4 lg:px-5 py-2.5 lg:py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
            <Target className="h-4 w-4" style={{ color: T.primary }} />
            <p className="text-xs font-semibold" style={{ color: T.text }}>{t('laporan.targetSavings')}</p>
          </div>
          {/* Desktop: grid layout */}
          <div className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-3 gap-4 p-5">
            {savingsTargets.map(target => {
              const pct = (target.currentAmount / target.targetAmount) * 100;
              const barColor = pct >= 80 ? T.secondary : pct >= 50 ? T.primary : pct >= 25 ? T.warning : T.destructive;
              return (
                <motion.div
                  key={target.id}
                  whileHover={{ scale: 1.01, y: -1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  className="rounded-xl p-4"
                  style={{ background: `${T.border}30` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold truncate" style={{ color: T.text }}>{target.name}</span>
                    <span className="text-xs font-semibold shrink-0 ml-2" style={{ color: barColor }}>{(pct || 0).toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden mb-2" style={{ background: T.border }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(to right, ${barColor}cc, ${barColor})` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(pct, 100)}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px]" style={{ color: T.muted }}>{formatAmount(target.currentAmount)}</span>
                    <span className="text-[11px]" style={{ color: T.muted }}>{formatAmount(target.targetAmount)}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
          {/* Mobile: list layout */}
          <div className="lg:hidden max-h-64 overflow-y-auto rounded-b-2xl">
            {savingsTargets.map(target => {
              const pct = (target.currentAmount / target.targetAmount) * 100;
              const barColor = pct >= 80 ? T.secondary : pct >= 50 ? T.primary : pct >= 25 ? T.warning : T.destructive;
              return (
                <div key={target.id} className="px-4 sm:px-5 py-3 flex items-center gap-3" style={{ borderBottom: `1px solid ${T.border}`, borderLeft: '3px solid ' + barColor + '40' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium truncate" style={{ color: T.text }}>{target.name}</span>
                      <span className="text-[10px] font-semibold shrink-0 ml-2" style={{ color: barColor }}>{(pct || 0).toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: T.border }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(to right, ${barColor}cc, ${barColor})` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(pct, 100)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] sm:text-[11px]" style={{ color: T.muted }}>{formatAmount(target.currentAmount)}</span>
                      <span className="text-[10px] sm:text-[11px]" style={{ color: T.muted }}>{formatAmount(target.targetAmount)}</span>
                    </div>
                  </div>
                  <span className="text-[10px] shrink-0" style={{ color: T.muted }}>
                    {format(new Date(target.targetDate), 'dd MMM', { locale: id })}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
