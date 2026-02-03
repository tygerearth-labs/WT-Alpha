'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Target, Plus, Edit, Trash2, CheckCircle2, ChevronDown, ChevronUp, PiggyBank, Zap, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { SavingsTarget } from '@/types/transaction.types';
import { TargetMetrics, getBrutalInsight, getSpeedCopy, getStatusCopy, getETAText, generateMiniChallenge, getCurrencyFormat } from '@/lib/targetLogic';
import { TargetSummaryCard } from '@/components/target/TargetSummaryCard';

interface TargetFormData {
  name: string;
  targetAmount: number;
  targetDate: string;
  initialInvestment: number;
  monthlyContribution: number;
  allocationPercentage: number;
}

export function TargetTabungan() {
  const [savingsTargets, setSavingsTargets] = useState<SavingsTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [selectedTarget, setSelectedTarget] = useState<SavingsTarget | null>(null);
  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState<TargetFormData>({
    name: '',
    targetAmount: '',
    targetDate: '',
    initialInvestment: '',
    monthlyContribution: '',
    allocationPercentage: '',
  });

  useEffect(() => {
    fetchSavingsTargets();
  }, []);

  const fetchSavingsTargets = async () => {
    try {
      const response = await fetch('/api/savings');
      if (response.ok) {
        const data = await response.json();
        setSavingsTargets(data.savingsTargets);
      }
    } catch (error) {
      console.error('Error fetching savings targets:', error);
      toast.error('Gagal memuat target tabungan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || formData.targetAmount <= 0 || !formData.targetDate) {
      toast.error('Mohon lengkapi semua field wajib');
      return;
    }

    try {
      const url = isEditDialogOpen
        ? `/api/savings/${selectedTarget?.id}`
        : '/api/savings';

      const method = isEditDialogOpen ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(isEditDialogOpen ? 'Target berhasil diperbarui' : 'Target berhasil ditambahkan');
        setIsAddDialogOpen(false);
        setIsEditDialogOpen(false);
        resetForm();
        fetchSavingsTargets();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal menyimpan target');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan');
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;

    try {
      const response = await fetch(`/api/savings/${deleteDialog.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Target berhasil dihapus');
        setDeleteDialog({ open: false, id: null });
        fetchSavingsTargets();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal menghapus target');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan');
    }
  };

  const handleQuickDeposit = async (targetId: string, amount: number) => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'income',
          amount,
          description: 'Setoran Cepat',
          categoryId: '', // Use default category
          date: new Date().toISOString().split('T')[0],
          targetId,
          allocationPercentage: 100, // Full allocation to target
        }),
      });

      if (response.ok) {
        toast.success(`Setoran Rp${amount.toLocaleString('id-ID')} berhasil!`);
        fetchSavingsTargets();
      } else {
        toast.error('Gagal melakukan setoran cepat');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedTargets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      targetAmount: 0,
      targetDate: '',
      initialInvestment: 0,
      monthlyContribution: 0,
      allocationPercentage: 0,
    });
    setSelectedTarget(null);
  };

  const openEditDialog = (target: SavingsTarget) => {
    setSelectedTarget(target);
    setFormData({
      name: target.name,
      targetAmount: target.targetAmount,
      targetDate: format(new Date(target.targetDate), 'yyyy-MM-dd'),
      initialInvestment: target.initialInvestment,
      monthlyContribution: target.monthlyContribution,
      allocationPercentage: target.allocationPercentage,
    });
    setIsEditDialogOpen(true);
  };

  const getDaysRemaining = (targetDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-2">Memuat target tabungan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Target Tabungan</h2>
          <p className="text-muted-foreground mt-1">Atur dan pantau target keuangan Anda</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Target
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Tambah Target Tabungan</DialogTitle>
              <DialogDescription>
                Buat target tabungan baru untuk mengatur keuangan Anda
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Target *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Dana Darurat"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetAmount">Target Jumlah *</Label>
                  <Input
                    id="targetAmount"
                    type="number"
                    value={formData.targetAmount}
                    onChange={(e) => setFormData({ ...formData, targetAmount: parseFloat(e.target.value) || 0 })}
                    placeholder="Contoh: 10000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetDate">Target Tanggal *</Label>
                  <Input
                    id="targetDate"
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="initialInvestment">Investasi Awal</Label>
                  <Input
                    id="initialInvestment"
                    type="number"
                    value={formData.initialInvestment}
                    onChange={(e) => setFormData({ ...formData, initialInvestment: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyContribution">Kontribusi Bulanan</Label>
                  <Input
                    id="monthlyContribution"
                    type="number"
                    value={formData.monthlyContribution}
                    onChange={(e) => setFormData({ ...formData, monthlyContribution: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allocationPercentage">Persentase Alokasi (%)</Label>
                  <Input
                    id="allocationPercentage"
                    type="number"
                    value={formData.allocationPercentage}
                    onChange={(e) => setFormData({ ...formData, allocationPercentage: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    min="0"
                    max="100"
                  />
                  <p className="text-xs text-muted-foreground">
                    Persentase dari kas masuk yang otomatis dialokasikan
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

      {/* Summary Card - Aggregate of All Targets */}
      {savingsTargets.length > 0 && (
        <TargetSummaryCard savingsTargets={savingsTargets} />
      )}

      {/* Savings Targets Grid */}
      {savingsTargets.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PiggyBank className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Belum ada target tabungan</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Mulai dengan membuat target tabungan pertama Anda
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Buat Target
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {savingsTargets.map((target) => {
            const isExpanded = expandedTargets.has(target.id);
            const metrics = target.metrics;
            if (!metrics) return null;

            const statusCopy = getStatusCopy(metrics.targetStatus);
            const speedCopy = getSpeedCopy(metrics.speedStatus);
            const brutalInsight = getBrutalInsight(metrics, target);
            const miniChallenge = generateMiniChallenge(target, metrics);
            const daysRemaining = getDaysRemaining(target.targetDate);

            return (
              <Card key={target.id} className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
                <CardHeader className="pb-3">
                  {/* Target Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Target className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base truncate">{target.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge className={statusCopy.color}>
                            {statusCopy.emoji} {statusCopy.text}
                          </Badge>
                          <Badge variant="outline" className={speedCopy.color}>
                            {speedCopy.emoji} {speedCopy.text}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => toggleExpand(target.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress Section */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold">{metrics.progressPercent.toFixed(0)}%</span>
                    </div>
                    <Progress value={metrics.progressPercent} className="h-2" />
                    <div className="flex items-center justify-between text-sm mt-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Terkumpul</p>
                        <p className="font-semibold text-lg">{getCurrencyFormat(target.currentAmount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Sisa</p>
                        <p className="font-semibold text-lg">{getCurrencyFormat(metrics.remainingAmount)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Time Projection */}
                  <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">ETA Terwujud</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Kecepatan saat ini</p>
                        <p className="font-semibold text-sm">{getETAText(metrics.etaInMonths)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Jika tidak diubah</p>
                        <p className="font-semibold text-sm">{getETAText(metrics.doNothingETA)}</p>
                      </div>
                    </div>
                    {daysRemaining > 0 && (
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Deadline: {daysRemaining} hari lagi
                      </p>
                    )}
                  </div>

                  {/* Monthly Performance */}
                  {target.monthlyContribution > 0 && (
                    <div className="bg-secondary/50 rounded-lg p-3 border border-border/50">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="font-medium">Bulanan Ini</span>
                        <Badge className={
                          target.monthlyAchievement >= 100 ? 'bg-green-500' :
                          target.monthlyAchievement >= 80 ? 'bg-blue-500' :
                          target.monthlyAchievement >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }>
                          {target.monthlyAchievement >= 100 ? 'Luar biasa! 🎉' :
                           target.monthlyAchievement >= 80 ? 'Hampir! 👍' :
                           target.monthlyAchievement >= 50 ? 'On track' : 'Perlu tingkatkan'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Realisasi: <span className="font-semibold text-foreground">{getCurrencyFormat(target.currentMonthlyAllocation || 0)}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Target: <span className="font-semibold text-foreground">{getCurrencyFormat(target.monthlyContribution)}</span>
                        </span>
                      </div>
                      <Progress value={Math.min(target.monthlyAchievement || 0, 100)} className="h-1.5 mt-2" />
                    </div>
                  )}

                  {/* Brutal Insight */}
                  {isExpanded && brutalInsight && (
                    <div className="bg-destructive/10 rounded-lg p-3 border border-destructive/20">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-destructive-foreground">
                          {brutalInsight}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  {isExpanded && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Aksi Cepat
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleQuickDeposit(target.id, 50000)}
                        >
                          <Plus className="mr-2 h-3 w-3" />
                          +50k
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleQuickDeposit(target.id, 100000)}
                        >
                          <Plus className="mr-2 h-3 w-3" />
                          +100k
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Mini Challenge */}
                  {isExpanded && miniChallenge && (
                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-3 border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-primary">Mini Challenge</span>
                      </div>
                      <p className="text-sm font-medium mb-1">{miniChallenge.title}</p>
                      <p className="text-xs text-muted-foreground mb-2">{miniChallenge.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-primary font-medium">
                          🏆 {miniChallenge.reward}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleQuickDeposit(target.id, miniChallenge.targetAmount)}
                        >
                          Ambil Challenge
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>

                {isExpanded && (
                  <CardFooter className="flex gap-2 pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEditDialog(target)}
                    >
                      <Edit className="mr-2 h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteDialog({ open: true, id: target.id })}
                    >
                      <Trash2 className="mr-2 h-3 w-3" />
                      Hapus
                    </Button>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Target Tabungan</DialogTitle>
            <DialogDescription>
              Perbarui informasi target tabungan Anda
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nama Target *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Dana Darurat"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-targetAmount">Target Jumlah *</Label>
                <Input
                  id="edit-targetAmount"
                  type="number"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: parseFloat(e.target.value) || 0 })}
                  placeholder="Contoh: 10000000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-targetDate">Target Tanggal *</Label>
                <Input
                  id="edit-targetDate"
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-initialInvestment">Investasi Awal</Label>
                <Input
                  id="edit-initialInvestment"
                  type="number"
                  value={formData.initialInvestment}
                  onChange={(e) => setFormData({ ...formData, initialInvestment: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-monthlyContribution">Kontribusi Bulanan</Label>
                <Input
                  id="edit-monthlyContribution"
                  type="number"
                  value={formData.monthlyContribution}
                  onChange={(e) => setFormData({ ...formData, monthlyContribution: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-allocationPercentage">Persentase Alokasi (%)</Label>
                <Input
                  id="edit-allocationPercentage"
                  type="number"
                  value={formData.allocationPercentage}
                  onChange={(e) => setFormData({ ...formData, allocationPercentage: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  min="0"
                  max="100"
                />
                <p className="text-xs text-muted-foreground">
                  Persentase dari kas masuk yang otomatis dialokasikan
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Simpan Perubahan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, id: deleteDialog.id })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Target Tabungan?</AlertDialogTitle>
            <AlertDialogDescription>
              Target tabungan yang dihapus tidak dapat dikembalikan. Semua riwayat alokasi akan tetap tersimpan.
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

