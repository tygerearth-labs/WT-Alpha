'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';
import { useBusinessStore } from '@/store/useBusinessStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Loader2,
  LineChart,
  MapPin,
  Phone,
  FileText,
  Sparkles,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';

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
  const { setBusinesses, setActiveBusiness, businesses } = useBusinessStore();

  // Check if investasi is already registered
  const isAlreadyRegistered = useMemo(() => {
    return businesses.some(b => b.category === 'investasi');
  }, [businesses]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!name.trim()) return;

    // Prevent duplicate registration
    if (isAlreadyRegistered) {
      toast.error(t('inv.alreadyRegistered'));
      onOpenChange(false);
      return;
    }

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

      const data = await res.json();
      const business = data.business;

      const { businesses: existing } = useBusinessStore.getState();
      const updated = [...existing, business];
      setBusinesses(updated);
      setActiveBusiness(business);

      toast.success(t('inv.portfolioCreated'));
      onSuccess?.();
      onOpenChange(false);

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

  // If already registered, show already-registered message
  if (isAlreadyRegistered) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent aria-describedby={undefined} className={cn("bg-[#0D0D0D] border-white/[0.08] text-white sm:max-w-[520px] p-0 overflow-hidden rounded-2xl", "inv-dialog-content")}>
          <VisuallyHidden>
            <DialogTitle>{t('inv.alreadyRegistered')}</DialogTitle>
          </VisuallyHidden>
          <div className="relative bg-gradient-to-br from-[#FFD700]/20 via-[#FFD700]/5 to-transparent p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FFD700]/15 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-[#FFD700]" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">{t('inv.alreadyRegistered')}</h2>
            <p className="text-sm text-white/50 mb-6">
              {t('inv.alreadyRegisteredDesc')}
            </p>
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-[#FFD700] hover:bg-[#FFD700]/90 text-[#0D0D0D] px-8"
            >
              {t('common.close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className={cn("bg-[#0D0D0D] border-white/[0.08] text-white sm:max-w-[520px] p-0 overflow-hidden rounded-2xl", "inv-dialog-content")}
      >
        <VisuallyHidden>
          <DialogTitle>{t('inv.createInvestment')}</DialogTitle>
        </VisuallyHidden>
        {/* Visual Header */}
        <motion.div
          className="relative bg-gradient-to-br from-[#FFD700]/20 via-[#FFD700]/5 to-transparent p-6 pb-5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/[0.03] to-transparent rounded-bl-full" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-white/[0.02] to-transparent rounded-tr-full" />

          <div className="relative flex items-start gap-4">
            {/* Icon */}
            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-[#FFD700]/15 flex items-center justify-center">
              <LineChart className="w-7 h-7 text-[#FFD700]" />
            </div>

            {/* Title & Subtitle */}
            <div className="flex-1 min-w-0 pt-1">
              <h2 className="text-xl font-bold text-white leading-tight">
                {t('inv.createInvestment')}
              </h2>
              <div className="mt-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FFD700] opacity-70" />
                <p className="text-sm text-white/50">
                  {t('inv.trackInvestments')}
                </p>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => onOpenChange(false)}
              className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/50 hover:text-white/80 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Feature highlights */}
          <div className="relative mt-5 flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 rounded-full bg-[#FFD700]/10 px-3 py-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#FFD700]/70" />
              <span className="text-xs text-white/50">{t('inv.portfolio')}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-[#FFD700]/10 px-3 py-1.5">
              <LineChart className="w-3.5 h-3.5 text-[#FFD700]/70" />
              <span className="text-xs text-white/50">PnL</span>
            </div>
          </div>
        </motion.div>

        {/* Scrollable Form Body */}
        <motion.div
          className="p-6 pt-5 space-y-4 max-h-[55vh] overflow-y-auto"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {/* Investment Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70 flex items-center gap-2">
              <LineChart className="w-4 h-4 text-[#FFD700]/60" />
              {t('inv.investmentName')}
              <span className="text-white/30">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('inv.investmentNamePlaceholder')}
              required
              className="h-11 bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/25 rounded-xl pl-4 pr-4 focus:border-[#FFD700]/30 transition-colors"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70 flex items-center gap-2">
              <FileText className="w-4 h-4 text-white/40" />
              {t('biz.businessDesc')}
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('biz.businessDesc')}
              className="bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/25 rounded-xl px-4 py-3 min-h-[90px] resize-none focus:border-[#FFD700]/30 transition-colors"
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-white/40" />
              {t('biz.businessAddress')}
            </label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('biz.businessAddress')}
              className="h-11 bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/25 rounded-xl pl-4 pr-4 focus:border-[#FFD700]/30 transition-colors"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70 flex items-center gap-2">
              <Phone className="w-4 h-4 text-white/40" />
              {t('biz.businessPhone')}
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('biz.businessPhone')}
              className="h-11 bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/25 rounded-xl pl-4 pr-4 focus:border-[#FFD700]/30 transition-colors"
            />
          </div>

          {/* Benefit Hint Card */}
          <div className="rounded-xl border border-[#FFD700]/20 bg-white/[0.02] p-4">
            <p className="text-xs text-white/40 leading-relaxed">
              {t('inv.trackInvestmentsDesc')}
            </p>
          </div>
        </motion.div>

        {/* Footer Buttons - fixed at bottom */}
        <DialogFooter className="gap-3 p-6 pt-3 sm:gap-3 border-t border-white/[0.06]">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-11 border-white/[0.1] text-white/70 hover:bg-white/[0.06] hover:text-white rounded-xl transition-all"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            disabled={loading || !name.trim()}
            className="flex-1 h-11 bg-[#FFD700] hover:bg-[#FFD700]/90 text-[#0D0D0D] rounded-xl font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={handleSubmit}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
