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
import { Plus, Trash2, Loader2, Calculator } from 'lucide-react';
import { getCurrencyFormat } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface SavingsTarget {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  initialInvestment: number;
  monthlyContribution: number;
  yearlyInterestRate: number;
  createdAt: string;
}

export function TargetTabungan() {
  const [targets, setTargets] = useState<SavingsTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string }>({ open: false, id: '' });

  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    targetDate: '',
    initialInvestment: '0',
    monthlyContribution: '0',
    yearlyInterestRate: '0',
  });

  // Investment Calculator State
  const [calculator, setCalculator] = useState({
    initialInvestment: '0',
    monthlyContribution: '0',
    yearlyInterestRate: '5',
    duration: '12',
  });

  useEffect(() => {
    fetchTargets();
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
          yearlyInterestRate: parseFloat(formData.yearlyInterestRate),
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
          yearlyInterestRate: '0',
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

  const calculateInvestment = () => {
    const initial = parseFloat(calculator.initialInvestment) || 0;
    const monthly = parseFloat(calculator.monthlyContribution) || 0;
    const rate = parseFloat(calculator.yearlyInterestRate) / 100 / 12;
    const months = parseInt(calculator.duration) || 12;

    let total = initial;
    for (let i = 0; i < months; i++) {
      total = (total + monthly) * (1 + rate);
    }

    const totalInvested = initial + (monthly * months);
    const profit = total - totalInvested;

    return {
      totalInvested,
      profit,
      finalAmount: total,
    };
  };

  const result = calculateInvestment();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Target Tabungan</h2>
          <p className="text-muted-foreground mt-1">Atur target dan alokasi tabungan Anda</p>
        </div>
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
                  <Label htmlFor="yearlyInterestRate">Bunga Tahunan % (Opsional)</Label>
                  <Input
                    id="yearlyInterestRate"
                    type="number"
                    value={formData.yearlyInterestRate}
                    onChange={(e) => setFormData({ ...formData, yearlyInterestRate: e.target.value })}
                    placeholder="0"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Simpan Target</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="targets" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="targets">Target Tabungan</TabsTrigger>
          <TabsTrigger value="calculator">
            <Calculator className="mr-2 h-4 w-4" />
            Kalkulator Investasi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="targets" className="space-y-4">
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
                const remainingDays = Math.ceil((new Date(target.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                return (
                  <Card key={target.id} className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-lg">{target.name}</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteDialog({ open: true, id: target.id })}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span className="font-semibold">{progress.toFixed(1)}%</span>
                        </div>
                        <Progress value={progress} className="h-3" />
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Terkumpul</p>
                          <p className="text-lg font-bold text-primary">
                            {getCurrencyFormat(target.currentAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Target</p>
                          <p className="text-lg font-bold">
                            {getCurrencyFormat(target.targetAmount)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Tanggal Target</p>
                          <p className="font-medium">
                            {format(new Date(target.targetDate), 'dd MMMM yyyy', { locale: id })}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Sisa Waktu</p>
                          <p className="font-medium">
                            {remainingDays > 0 ? `${remainingDays} hari` : 'Terlampaui'}
                          </p>
                        </div>
                      </div>

                      {(target.monthlyContribution > 0 || target.yearlyInterestRate > 0) && (
                        <div className="pt-4 border-t border-border/50">
                          <p className="text-xs text-muted-foreground mb-2">Parameter Investasi:</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {target.initialInvestment > 0 && (
                              <div>
                                <span className="text-muted-foreground">Modal Awal:</span>{' '}
                                {getCurrencyFormat(target.initialInvestment)}
                              </div>
                            )}
                            {target.monthlyContribution > 0 && (
                              <div>
                                <span className="text-muted-foreground">Kontribusi:</span>{' '}
                                {getCurrencyFormat(target.monthlyContribution)}/bulan
                              </div>
                            )}
                            {target.yearlyInterestRate > 0 && (
                              <div>
                                <span className="text-muted-foreground">Bunga:</span>{' '}
                                {target.yearlyInterestRate}%/tahun
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
        </TabsContent>

        <TabsContent value="calculator" className="space-y-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle>Kalkulator Investasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="calcInitial">Modal Awal</Label>
                  <Input
                    id="calcInitial"
                    type="number"
                    value={calculator.initialInvestment}
                    onChange={(e) => setCalculator({ ...calculator, initialInvestment: e.target.value })}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calcMonthly">Kontribusi Bulanan</Label>
                  <Input
                    id="calcMonthly"
                    type="number"
                    value={calculator.monthlyContribution}
                    onChange={(e) => setCalculator({ ...calculator, monthlyContribution: e.target.value })}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calcRate">Bunga Tahunan (%)</Label>
                  <Input
                    id="calcRate"
                    type="number"
                    value={calculator.yearlyInterestRate}
                    onChange={(e) => setCalculator({ ...calculator, yearlyInterestRate: e.target.value })}
                    placeholder="5"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calcDuration">Durasi (Bulan)</Label>
                  <Input
                    id="calcDuration"
                    type="number"
                    value={calculator.duration}
                    onChange={(e) => setCalculator({ ...calculator, duration: e.target.value })}
                    placeholder="12"
                    min="1"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3 pt-6 border-t border-border/50">
                <div className="bg-background/50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">Total Investasi</p>
                  <p className="text-2xl font-bold text-primary">
                    {getCurrencyFormat(result.totalInvested)}
                  </p>
                </div>
                <div className="bg-background/50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">Keuntungan</p>
                  <p className="text-2xl font-bold text-green-500">
                    {getCurrencyFormat(result.profit)}
                  </p>
                </div>
                <div className="bg-background/50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">Jumlah Akhir</p>
                  <p className="text-2xl font-bold text-purple-500">
                    {getCurrencyFormat(result.finalAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, id: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Target Tabungan?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Target tabungan akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
