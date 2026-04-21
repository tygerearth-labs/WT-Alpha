'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';
import { useBusinessStore } from '@/store/useBusinessStore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface InvestmentRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function InvestmentRegisterDialog({
  open,
  onOpenChange,
  onSuccess,
}: InvestmentRegisterDialogProps) {
  const { t } = useTranslation();
  const { setBusinesses, setActiveBusiness, setMode } = useBusinessStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category: 'investasi',
          description,
          address,
          phone,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create investment');
      }

      const business = await res.json();

      // Update store
      const { businesses: existing } = useBusinessStore.getState();
      const updated = [...existing, business];
      setBusinesses(updated);
      setActiveBusiness(business);
      setMode('investasi');

      toast.success(t('inv.portfolioCreated'));
      onOpenChange(false);
      onSuccess?.();

      // Reset form
      setName('');
      setDescription('');
      setAddress('');
      setPhone('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1A2E] border-white/[0.06] text-white sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-white">
            {t('inv.createInvestment')}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {t('inv.registerFirst')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white/80">{t('biz.businessName')} *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('biz.businessNamePlaceholder')}
              required
              className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/80">{t('biz.businessDesc')}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('biz.businessDesc')}
              className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/80">{t('biz.businessAddress')}</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('biz.businessAddress')}
              className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/80">{t('biz.businessPhone')}</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('biz.businessPhone')}
              className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30"
            />
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/[0.1] text-white hover:bg-white/10"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="bg-[#BB86FC] text-black hover:bg-[#9B6FDB]"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
