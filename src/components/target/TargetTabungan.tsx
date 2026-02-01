'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Loader2, Calculator, Calendar, TrendingUp, Wallet, CheckCircle2 } from 'lucide-react';
import { getCurrencyFormat } from '@/lib/utils';
import { toast } from 'sonner';
import { format, differenceInMonths, differenceInDays } from 'date-fns';
import { id } from 'date-fns/locale';

interface SavingsTarget {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  initialInvestment: number;
  monthlyContribution: number;
  allocationPercentage: number;
  isAllocated: boolean;
  createdAt: string;
}

export function TargetTabungan() {
  const [targets, setTargets] = useState<SavingsTarget[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string }>({ open: false, id: '' });

  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    targetDate: '',
    initialInvestment: '0',
    monthlyContribution: '0',
    allocationPercentage: '0',
  });

  useEffect(() => {
    fetchTargets();
    fetchFinancialOverview();
  }, []);

  const fetchTargets = async () => {
    try {
      const response = await fetch('/api/savings');
      if (response.ok) {
        const data = await response.json();
        setTargets(data.savingsTargets);
      }
    } catch (error) {
      console.error('Error fetching targets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFinancialOverview = async () => {
    try {
      const response = await fetch('/api/dashboard');
      if (response.ok) {
        const data = await response.json();
        setTotalBalance(data.totalIncome - data.totalExpense);
        setTotalExpense(data.totalExpense);
      }
    } catch (error) {
      console.error('Error fetching financial overview:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/savings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          targetAmount: parseFloat(formData.targetAmount),
          targetDate: formData.targetDate,
          initialInvestment: parseFloat(formData.initialInvestment),
          monthlyContribution: parseFloat(formData.monthlyContribution),
          allocationPercentage: parseFloat(formData.allocationPercentage),
        }),
      });

      if (response.ok) {
        toast.success('Target tabungan berhasil dibuat');
        setFormData({
          name: '',
          targetAmount: '',
          targetDate: '',
          initialInvestment: '0',
          monthlyContribution: '0',
          allocationPercentage: '0',
        });
        setIsDialogOpen(false);
        fetchTargets();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal membuat target tabungan');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan');
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/savings/${deleteDialog.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Target tabungan berhasil dihapus');
        setDeleteDialog({ open: false, id: '' });
        fetchTargets();
      } else {
        toast.error('Gagal menghapus target tabungan');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan');
    }
  };

  const toggleAllocated = async (targetId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/savings/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAllocated: !currentStatus }),
      });

      if (response.ok) {
        toast.success(!currentStatus ? 'Dana berhasil disisihkan' : 'Status alokasi diubah');
        fetchTargets();
      } else {
        toast.error('Gagal mengubah status alokasi');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan');
    }
  };

  const calculateETA = (target: SavingsTarget) => {
    const remaining = target.targetAmount - target.currentAmount;
    const monthlyContribution = target.monthlyContribution || 0;

    if (remaining <= 0) {
      return { text: 'Tercapai!', months: 0, days: 0 };
    }

    if (monthlyContribution <= 0) {
      const targetDate = new Date(target.targetDate);
      const today = new Date();
      const days = differenceInDays(targetDate, today);
      return { text: `${days} hari tersisa`, months: 0, days };
    }

    const monthsNeeded = Math.ceil(remaining / monthlyContribution);
    const etaDate = new Date();
    etaDate.setMonth(etaDate.getMonth() + monthsNeeded);

    const daysLeft = differenceInDays(etaDate, new Date());

    return {
      text: `${monthsNeeded} bulan (${daysLeft} hari)`,
      months: monthsNeeded,
      days: daysLeft,
    };
  };

  const calculateProjectedSavings = (target: SavingsTarget) => {
    const monthlyAllocation = (totalBalance * target.allocationPercentage) / 100;
    const projectedMonthly = monthlyAllocation + (target.monthlyContribution || 0);
    return projectedMonthly;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Target Tabungan</h2>
          <p className="text-muted-foreground mt-1 text-sm">Atur target dan alokasi tabungan Anda</p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Target
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Target Tabungan Baru</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="name">Nama Target</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Contoh: Dana Darurat"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetAmount">Target Jumlah</Label>
                    <Input
                      id="targetAmount"
                      type="number"
                      value={formData.targetAmount}
                      onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                      placeholder="0"
                      required
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetDate">Tanggal Target</Label>
                    <Input
                      id="targetDate"
                      type="date"
                      value={formData.targetDate}
                      onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="initialInvestment">Modal Awal (Opsional)</Label>
                    <Input
                      id="initialInvestment"
                      type="number"
                      value={formData.initialInvestment}
                      onChange={(e) => setFormData({ ...formData, initialInvestment: e.target.value })}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthlyContribution">Kontribusi Bulanan (Opsional)</Label>
                    <Input
                      id="monthlyContribution"
                      type="number"
                                           value={formData.monthlyContribution}
                      onChange={(e) => setFormData({ ...formData, monthlyContribution: e.target.value })}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="allocationPercentage">Alokasi Dana Otomatis % dari Pemasukan</Label>
                    <Input
                      id="allocationPercentage"
                      type="number"
                      value={formData.allocationPercentage}
                      onChange={(e) => setFormData({ ...formData, allocationPercentage: e.target.value })}
                      placeholder="0"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <p className="text-xs text-muted-foreground">
                      Persentase dari setiap pemasukan yang akan dialokasikan otomatis ke target ini
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Simpan Target</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 backdrop-blur-sm border-green-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-500 text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Total Saldo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {getCurrencyFormat(totalBalance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pemasukan - Pengeluaran
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/20 to-rose-500/10 backdrop-blur-sm border-red-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-500 text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Pengeluaran
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {getCurrencyFormat(totalExpense)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total transaksi keluar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Targets List */}
      {targets.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            Belum ada target tabungan. Buat target pertama Anda!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {targets.map((target) => {
            const progress = (target.currentAmount / target.targetAmount) * 100;
            const eta = calculateETA(target);
            const projectedMonthly = calculateProjectedSavings(target);

            return (
              <Card key={target.id} className={`bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-colors ${target.isAllocated ? 'border-green-500/30' : ''}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base">{target.name}</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleAllocated(target.id, target.isAllocated)}
                      className={target.isAllocated ? 'text-green-500 hover:text-green-600' : 'text-muted-foreground'}
                    >
                      <CheckCircle2 className="h-4 w-4" fill={target.isAllocated ? 'currentColor' : 'none'} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteDialog({ open: true, id: target.id })}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span className="font-semibold">{progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                  </div>

                  {/* Amount Info */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Terkumpul</p>
                      <p className="text-lg font-bold text-primary">
                        {getCurrencyFormat(target.currentAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Target</p>
                      <p className="text-lg font-bold">
                        {getCurrencyFormat(target.targetAmount)}
                      </p>
                    </div>
                  </div>

                  {/* ETA and Date */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">ETA (Estimasi Tercapai)</p>
                      <p className="font-medium text-base font-semibold text-green-500">
                        {eta.text}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Tanggal Target</p>
                      <p className="font-medium text-sm">
                        {format(new Date(target.targetDate), 'dd MMM yyyy', { locale: id })}
                      </p>
                    </div>
                  </div>

                  {/* Allocation Info */}
                  {(target.allocationPercentage > 0 || target.monthlyContribution > 0) && (
                    <div className="pt-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-2">Alokasi Dana:</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {target.allocationPercentage > 0 && (
                          <div>
                            <span className="text-muted-foreground">Auto Alokasi:</span>{' '}
                            <span className="font-semibold text-primary">{target.allocationPercentage}%</span>{' '}
                            <span className="text-muted-foreground">({getCurrencyFormat(projectedMonthly)}/bulan)</span>
                          </div>
                        )}
                        {target.monthlyContribution > 0 && (
                          <div>
                            <span className="text-muted-foreground">Manual:</span>{' '}
                            <span className="font-semibold">{getCurrencyFormat(target.monthlyContribution)}/bulan</span>
                          </div>
                        )}
                        {target.isAllocated && (
                          <div className="col-span-2 mt-1">
                            <span className="text-green-500 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" fill="currentColor" />
                              Dana aktif dialokasikan
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Target Tabungan?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin ingin menghapus target tabungan ini?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
