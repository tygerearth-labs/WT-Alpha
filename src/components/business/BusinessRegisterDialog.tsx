'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import { useBusinessStore } from '@/store/useBusinessStore';
import { toast } from 'sonner';
import {
  Loader2,
  Briefcase,
  LineChart,
  Building2,
  MapPin,
  Phone,
  FileText,
  Tag,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface BusinessRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultCategory?: 'bisnis' | 'investasi';
}

const accentConfig = {
  bisnis: {
    gradient: 'from-[#03DAC6]/20 via-[#03DAC6]/5 to-transparent',
    iconBg: 'bg-[#03DAC6]/15',
    iconColor: 'text-[#03DAC6]',
    accentBorder: 'border-[#03DAC6]/20',
    btnGradient: 'bg-[#03DAC6] hover:bg-[#03DAC6]/90 text-[#0D0D0D]',
    dotColor: 'bg-[#03DAC6]',
    icon: Briefcase,
    hintTitle: 'biz.manageFinance' as const,
    hintDesc: 'biz.manageFinanceDesc' as const,
  },
  investasi: {
    gradient: 'from-[#FFD700]/20 via-[#FFD700]/5 to-transparent',
    iconBg: 'bg-[#FFD700]/15',
    iconColor: 'text-[#FFD700]',
    accentBorder: 'border-[#FFD700]/20',
    btnGradient: 'bg-[#FFD700] hover:bg-[#FFD700]/90 text-[#0D0D0D]',
    dotColor: 'bg-[#FFD700]',
    icon: LineChart,
    hintTitle: 'biz.trackInvestments' as const,
    hintDesc: 'biz.trackInvestmentsDesc' as const,
  },
};

export default function BusinessRegisterDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultCategory = 'bisnis',
}: BusinessRegisterDialogProps) {
  const { t } = useTranslation();
  const { setBusinesses, setActiveBusiness } = useBusinessStore();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<'bisnis' | 'investasi'>(defaultCategory);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const config = accentConfig[category];
  const HeaderIcon = config.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, description, address, phone }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create business');
      }

      const business = await res.json();

      const { businesses: existing } = useBusinessStore.getState();
      const updated = [...existing, business];
      setBusinesses(updated);
      setActiveBusiness(business);

      toast.success(category === 'bisnis' ? t('biz.businessCreated') : t('inv.portfolioCreated'));
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="bg-[#0D0D0D] border-white/[0.08] text-white sm:max-w-[520px] p-0 overflow-hidden rounded-2xl"
      >
        {/* Visual Header */}
        <div className={`relative bg-gradient-to-br ${config.gradient} p-6 pb-5`}>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/[0.03] to-transparent rounded-bl-full" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-white/[0.02] to-transparent rounded-tr-full" />

          <div className="relative flex items-start gap-4">
            {/* Icon */}
            <div className={`flex-shrink-0 w-14 h-14 rounded-2xl ${config.iconBg} flex items-center justify-center`}>
              <HeaderIcon className={`w-7 h-7 ${config.iconColor}`} />
            </div>

            {/* Title & Subtitle */}
            <div className="flex-1 min-w-0 pt-1">
              <h2 className="text-xl font-bold text-white leading-tight">
                {category === 'bisnis'
                  ? t('biz.createBusiness')
                  : t('biz.createInvestment')}
              </h2>
              <div className="mt-1.5 flex items-center gap-1.5">
                <Sparkles className={`w-3.5 h-3.5 ${config.iconColor} opacity-70`} />
                <p className="text-sm text-white/50">
                  {t(config.hintTitle)}
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

          {/* Step indicator */}
          <div className="relative mt-5 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full ${config.dotColor}/20 flex items-center justify-center`}>
                <span className={`text-xs font-bold ${config.iconColor}`}>1</span>
              </div>
              <span className="text-xs text-white/60">{t('biz.selectCategory')}</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-white/20" />
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center">
                <span className="text-xs font-medium text-white/30">2</span>
              </div>
              <span className="text-xs text-white/30">{t('biz.categoryName')}</span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 pt-5 space-y-4">
          {/* Category Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70 flex items-center gap-2">
              <Tag className="w-4 h-4 text-white/40" />
              {t('biz.selectCategory')}
              <span className="text-white/30">*</span>
            </label>
            <Select
              value={category}
              onValueChange={(val) => setCategory(val as 'bisnis' | 'investasi')}
            >
              <SelectTrigger className={`w-full h-11 bg-white/[0.05] border-white/[0.08] text-white rounded-xl focus:border-[${category === 'bisnis' ? '#03DAC6' : '#FFD700'}]/40 focus:ring-[${category === 'bisnis' ? '#03DAC6' : '#FFD700'}]/10`}>
                <SelectValue placeholder={t('biz.selectCategory')} />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A2E] border-white/[0.1] rounded-xl">
                <SelectItem value="bisnis" className="text-white focus:bg-white/[0.06] focus:text-white rounded-lg">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#03DAC6]" />
                    {t('biz.bisnis')}
                  </div>
                </SelectItem>
                <SelectItem value="investasi" className="text-white focus:bg-white/[0.06] focus:text-white rounded-lg">
                  <div className="flex items-center gap-2">
                    <LineChart className="w-4 h-4 text-[#FFD700]" />
                    {t('biz.investasi')}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Business / Investment Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-white/40" />
              {t('biz.categoryName')}
              <span className="text-white/30">*</span>
            </label>
            <div className="relative">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('biz.businessNamePlaceholder')}
                required
                className="h-11 bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/25 rounded-xl pl-4 pr-4 focus:border-white/20 transition-colors"
              />
            </div>
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
              className="bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/25 rounded-xl px-4 py-3 min-h-[90px] resize-none focus:border-white/20 transition-colors"
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
              className="h-11 bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/25 rounded-xl pl-4 pr-4 focus:border-white/20 transition-colors"
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
              className="h-11 bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/25 rounded-xl pl-4 pr-4 focus:border-white/20 transition-colors"
            />
          </div>

          {/* Benefit Hint Card */}
          <div className={`rounded-xl border ${config.accentBorder} bg-white/[0.02] p-4`}>
            <p className="text-xs text-white/40 leading-relaxed">
              {t(config.hintDesc)}
            </p>
          </div>

          {/* Footer Buttons */}
          <DialogFooter className="gap-3 pt-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 border-white/[0.1] text-white/70 hover:bg-white/[0.06] hover:text-white rounded-xl transition-all"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className={`flex-1 h-11 ${config.btnGradient} rounded-xl font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
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
