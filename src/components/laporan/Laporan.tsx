'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Loader2 } from 'lucide-react';
import { getCurrencyFormat } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  date: string;
  category: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
}

interface SavingsTarget {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
}

export function Laporan() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savingsTargets, setSavingsTargets] = useState<SavingsTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({ type: 'all', month: 'all', year: 'all' });

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.type && filter.type !== 'all') params.append('type', filter.type);
      if (filter.month && filter.month !== 'all') params.append('month', filter.month);
      if (filter.year && filter.year !== 'all') params.append('year', filter.year);

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
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToExcel = () => {
    // Prepare transactions data
    const transactionsData = transactions.map((t) => ({
      Tipe: t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      Kategori: t.category.name,
      Deskripsi: t.description || '-',
      Nominal: t.amount,
      Tanggal: format(new Date(t.date), 'dd/MM/yyyy', { locale: id }),
    }));

    // Prepare savings data
    const savingsData = savingsTargets.map((s) => ({
      'Target Tabungan': s.name,
      'Target Jumlah': s.targetAmount,
      'Terkumpul': s.currentAmount,
      Progress: `${((s.currentAmount / s.targetAmount) * 100).toFixed(1)}%`,
      'Tanggal Target': format(new Date(s.targetDate), 'dd/MM/yyyy', { locale: id }),
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Add transactions sheet
    const wsTransactions = XLSX.utils.json_to_sheet(transactionsData);
    XLSX.utils.book_append_sheet(wb, wsTransactions, 'Transaksi');

    // Add savings sheet
    const wsSavings = XLSX.utils.json_to_sheet(savingsData);
    XLSX.utils.book_append_sheet(wb, wsSavings, 'Target Tabungan');

    // Add summary sheet
    const totalIncome = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;
    const totalSavings = savingsTargets.reduce((sum, t) => sum + t.currentAmount, 0);

    const summaryData = [
      { Item: 'Total Pemasukan', Jumlah: totalIncome },
      { Item: 'Total Pengeluaran', Jumlah: totalExpense },
      { Item: 'Saldo', Jumlah: balance },
      { Item: 'Total Tabungan', Jumlah: totalSavings },
    ];

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');

    // Generate filename with date
    const filename = `Laporan_Keuangan_${format(new Date(), 'dd_MM_yyyy', { locale: id })}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Laporan</h2>
          <p className="text-muted-foreground mt-1">Ringkasan dan ekspor data keuangan</p>
        </div>
        <Button onClick={exportToExcel} disabled={transactions.length === 0 && savingsTargets.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
      </div>

      {/* Filter */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Filter Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Select value={filter.type} onValueChange={(value) => setFilter({ ...filter, type: value })}>
              <SelectTrigger className="w-[180px] bg-background/50">
                <SelectValue placeholder="Semua Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="income">Pemasukan</SelectItem>
                <SelectItem value="expense">Pengeluaran</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filter.month} onValueChange={(value) => setFilter({ ...filter, month: value })}>
              <SelectTrigger className="w-[140px] bg-background/50">
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
              <SelectTrigger className="w-[120px] bg-background/50">
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
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pemasukan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {getCurrencyFormat(totalIncome)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {getCurrencyFormat(totalExpense)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {getCurrencyFormat(balance)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tabungan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {getCurrencyFormat(savingsTargets.reduce((sum, t) => sum + t.currentAmount, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Riwayat Transaksi</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Tidak ada data transaksi
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs md:text-sm">Tanggal</TableHead>
                    <TableHead className="text-xs md:text-sm">Tipe</TableHead>
                    <TableHead className="text-xs md:text-sm">Kategori</TableHead>
                    <TableHead className="text-xs md:text-sm">Deskripsi</TableHead>
                    <TableHead className="text-xs md:text-sm text-right">Nominal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-xs md:text-sm py-2 md:py-3">
                        {format(new Date(transaction.date), 'dd/MM/yyyy', { locale: id })}
                      </TableCell>
                      <TableCell className="py-2 md:py-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] md:text-xs font-medium ${
                          transaction.type === 'income' 
                            ? 'bg-green-500/20 text-green-500' 
                            : 'bg-red-500/20 text-red-500'
                        }`}>
                          {transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 md:py-3">
                        <div className="flex items-center gap-2 text-xs md:text-sm">
                          <span>{transaction.category.icon}</span>
                          <span>{transaction.category.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 md:py-3 text-xs md:text-sm">{transaction.description || '-'}</TableCell>
                      <TableCell className={`text-right py-2 md:py-3 font-semibold text-xs md:text-sm ${
                        transaction.type === 'income' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}
                        {getCurrencyFormat(transaction.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Savings Targets Table */}
      {savingsTargets.length > 0 && (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Target Tabungan</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs md:text-sm">Nama Target</TableHead>
                    <TableHead className="text-xs md:text-sm">Target Jumlah</TableHead>
                    <TableHead className="text-xs md:text-sm">Terkumpul</TableHead>
                    <TableHead className="text-xs md:text-sm">Progress</TableHead>
                    <TableHead className="text-xs md:text-sm">Tanggal Target</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savingsTargets.map((target) => {
                    const progress = (target.currentAmount / target.targetAmount) * 100;
                    return (
                      <TableRow key={target.id}>
                        <TableCell className="font-medium text-xs md:text-sm py-2 md:py-3">{target.name}</TableCell>
                        <TableCell className="text-xs md:text-sm py-2 md:py-3">{getCurrencyFormat(target.targetAmount)}</TableCell>
                        <TableCell className="text-xs md:text-sm py-2 md:py-3">{getCurrencyFormat(target.currentAmount)}</TableCell>
                        <TableCell className="py-2 md:py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 md:h-2 bg-background rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] md:text-xs text-muted-foreground min-w-[40px] md:min-w-[50px]">
                              {progress.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs md:text-sm py-2 md:py-3">
                          {format(new Date(target.targetDate), 'dd/MM/yyyy', { locale: id })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
