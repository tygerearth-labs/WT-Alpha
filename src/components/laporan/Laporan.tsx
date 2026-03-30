'use client';

import { useState, useEffect } from 'react';
import { Download, Loader2, Target, Wallet, ArrowUpRight, ArrowDownRight, FileText } from 'lucide-react';
import { getCurrencyFormat } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import * as XLSX from 'xlsx';

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

interface SavingsTarget { id: string; name: string; targetAmount: number; currentAmount: number; targetDate: string; }

export function Laporan() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savingsTargets, setSavingsTargets] = useState<SavingsTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({ type: 'all', month: 'all', year: 'all' });

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
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(transactions.map(t => ({
      Tipe: t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      Kategori: t.category.name,
      Deskripsi: t.description || '-',
      Nominal: t.amount,
      Tanggal: format(new Date(t.date), 'dd/MM/yyyy', { locale: id }),
    }))), 'Transaksi');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(savingsTargets.map(s => ({
      'Target': s.name, 'Jumlah': s.targetAmount, 'Terkumpul': s.currentAmount,
      Progress: `${((s.currentAmount / s.targetAmount) * 100).toFixed(1)}%`,
      'Deadline': format(new Date(s.targetDate), 'dd/MM/yyyy', { locale: id }),
    }))), 'Target Tabungan');
    XLSX.writeFile(wb, `Laporan_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
    toast.success('File berhasil diunduh!');
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const totalSavings = savingsTargets.reduce((s, t) => s + t.currentAmount, 0);
  const txCount = transactions.length;
  const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100) : 0;
  const uniqueDays = new Set(transactions.map(t => t.date)).size;
  const avgDaily = txCount > 0 ? totalExpense / Math.max(uniqueDays, 1) : 0;

  const filterBtnCls = (active: boolean) =>
    `text-[10px] font-medium px-2.5 py-1.5 rounded-lg shrink-0 transition-all ${active ? '' : ''}`;

  const filterStyle = (active: boolean) => ({
    background: active ? `${T.primary}18` : 'transparent',
    color: active ? T.primary : T.muted,
    border: active ? `${T.primary}30` : '1px solid transparent',
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-7 w-7 animate-spin" style={{ color: T.primary }} /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: T.muted }}>Laporan</p>
          <p className="text-[10px] mt-0.5" style={{ color: T.muted }}>{txCount} transaksi</p>
        </div>
        <button
          onClick={exportToExcel}
          disabled={txCount === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-40"
          style={{ background: `${T.secondary}12`, color: T.secondary, border: `1px solid ${T.secondary}20` }}
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        {/* Type filter */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {([['all', 'Semua'], ['income', 'Masuk'], ['expense', 'Keluar']] as const).map(([val, label]) => (
            <button key={val} onClick={() => setFilter({ ...filter, type: val })} className={filterBtnCls(filter.type === val)} style={filterStyle(filter.type === val)}>
              {label}
            </button>
          ))}
        </div>
        {/* Month/Year filter */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {([['all', 'Semua'], ['1', 'Jan'], ['2', 'Feb'], ['3', 'Mar'], ['4', 'Apr'], ['5', 'Mei'], ['6', 'Jun'], ['7', 'Jul'], ['8', 'Agu'], ['9', 'Sep'], ['10', 'Okt'], ['11', 'Nov'], ['12', 'Des']] as const).map(([val, label]) => (
            <button key={val} onClick={() => setFilter({ ...filter, month: val })} className={filterBtnCls(filter.month === val)} style={filterStyle(filter.month === val)}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {([['all', 'Semua'], ['2023', '2023'], ['2024', '2024'], ['2025', '2025']] as const).map(([val, label]) => (
            <button key={val} onClick={() => setFilter({ ...filter, year: val })} className={filterBtnCls(filter.year === val)} style={filterStyle(filter.year === val)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Pemasukan', value: totalIncome, color: T.secondary, icon: ArrowUpRight, sub: '+income' },
          { label: 'Pengeluaran', value: totalExpense, color: T.destructive, icon: ArrowDownRight, sub: '-expense' },
          { label: 'Saldo', value: balance, color: balance >= 0 ? T.secondary : T.destructive, icon: Wallet, sub: 'net balance' },
          { label: 'Tabungan', value: totalSavings, color: T.primary, icon: Target, sub: 'terkumpul' },
        ].map(item => (
          <div key={item.label} className="p-3 rounded-xl" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-1.5 mb-1">
              <item.icon className="h-3 w-3" style={{ color: item.color }} />
              <span className="text-[9px] uppercase tracking-wider font-medium" style={{ color: T.muted }}>{item.label}</span>
            </div>
            <p className="text-sm sm:text-base font-bold truncate" style={{ color: item.color }}>
              {getCurrencyFormat(item.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Cash Flow Analytics */}
      <div className="p-3 sm:p-4 rounded-xl grid grid-cols-3 gap-3" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
        <div className="text-center">
          <p className="text-[9px] uppercase tracking-wider" style={{ color: T.muted }}>Savings Rate</p>
          <p className="text-base font-bold" style={{ color: savingsRate >= 20 ? T.secondary : T.warning }}>{savingsRate.toFixed(1)}%</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] uppercase tracking-wider" style={{ color: T.muted }}>Avg Harian</p>
          <p className="text-base font-bold truncate" style={{ color: T.textSub }}>{getCurrencyFormat(avgDaily)}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] uppercase tracking-wider" style={{ color: T.muted }}>Transaksi</p>
          <p className="text-base font-bold" style={{ color: T.primary }}>{txCount}</p>
        </div>
      </div>

      {/* Transactions */}
      <div className="rounded-xl overflow-hidden" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5" style={{ borderBottom: `1px solid ${T.border}` }}>
          <FileText className="h-4 w-4" style={{ color: T.primary }} />
          <p className="text-xs font-semibold" style={{ color: T.text }}>Riwayat Transaksi</p>
        </div>

        {txCount === 0 ? (
          <div className="py-10 text-center">
            <p className="text-xs" style={{ color: T.muted }}>Tidak ada data transaksi</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {transactions.map(tx => (
              <div
                key={tx.id}
                className="flex items-center gap-3 px-3 sm:px-4 py-2.5 transition-colors active:bg-white/[0.02]"
                style={{ borderBottom: `1px solid ${T.border}` }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm"
                  style={{ background: `${tx.category.color}15` }}
                >
                  {tx.category.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: T.text }}>{tx.description || tx.category.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px]" style={{ color: T.muted }}>{tx.category.name}</span>
                    <span className="text-[9px]" style={{ color: `${T.border}` }}>·</span>
                    <span className="text-[9px]" style={{ color: T.muted }}>{format(new Date(tx.date), 'dd MMM yyyy', { locale: id })}</span>
                  </div>
                </div>
                <span
                  className="text-xs font-semibold shrink-0"
                  style={{ color: tx.type === 'income' ? T.secondary : T.destructive }}
                >
                  {tx.type === 'income' ? '+' : '-'}{getCurrencyFormat(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Savings Targets */}
      {savingsTargets.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5" style={{ borderBottom: `1px solid ${T.border}` }}>
            <Target className="h-4 w-4" style={{ color: T.primary }} />
            <p className="text-xs font-semibold" style={{ color: T.text }}>Target Tabungan</p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {savingsTargets.map(target => {
              const pct = (target.currentAmount / target.targetAmount) * 100;
              const barColor = pct >= 80 ? T.secondary : pct >= 50 ? T.primary : pct >= 25 ? T.warning : T.destructive;
              return (
                <div key={target.id} className="px-3 sm:px-4 py-2.5 flex items-center gap-3" style={{ borderBottom: `1px solid ${T.border}` }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium truncate" style={{ color: T.text }}>{target.name}</span>
                      <span className="text-[10px] font-semibold shrink-0 ml-2" style={{ color: barColor }}>{pct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: T.border }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px]" style={{ color: T.muted }}>{getCurrencyFormat(target.currentAmount)}</span>
                      <span className="text-[9px]" style={{ color: T.muted }}>{getCurrencyFormat(target.targetAmount)}</span>
                    </div>
                  </div>
                  <span className="text-[10px] shrink-0" style={{ color: T.muted }}>
                    {format(new Date(target.targetDate), 'dd MMM', { locale: id })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
