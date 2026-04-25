'use client';

import { useState, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import { useBusinessStore, type BusinessCategory } from '@/store/useBusinessStore';
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
  CheckCircle2,
} from 'lucide-react';

interface BusinessRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultCategory?: 'bisnis' | 'investasi';
}

const accentConfig = {
  bisnis: {
    gradient: 'from-secondary/20 via-[#03DAC6]/5 to-transparent',
    iconBg: 'bg-secondary/15',
    iconColor: 'text-secondary',
    accentBorder: 'border-secondary/20',
    btnGradient: 'bg-secondary hover:bg-secondary/90 text-background',
    dotColor: 'bg-secondary',
    icon: Briefcase,
    hintTitle: 'biz.manageFinance' as const,
    hintDesc: 'biz.manageFinanceDesc' as const,
  },
  investasi: {
    gradient: 'from-warning/20 via-[#FFD700]/5 to-transparent',
    iconBg: 'bg-warning/15',
    iconColor: 'text-warning',
    accentBorder: 'border-warning/20',
    btnGradient: 'bg-warning hover:bg-warning/90 text-background',
    dotColor: 'bg-warning',
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
  const { setBusinesses, setActiveBusiness, businesses } = useBusinessStore();

  // Check which categories are already registered
  const registeredCategories = useMemo(() => {
    return new Set(businesses.map(b => b.category as BusinessCategory));
  }, [businesses]);

  // Determine available categories
  const availableCategories = useMemo(() => {
    const cats: ('bisnis' | 'investasi')[] = [];
    if (!registeredCategories.has('bisnis')) cats.push('bisnis');
    if (!registeredCategories.has('investasi')) cats.push('investasi');
    return cats;
  }, [registeredCategories]);

  const isAllRegistered = availableCategories.length === 0;

  // Initial category: use default if available, otherwise first available
  const initialCategory = useMemo(() => {
    if (isAllRegistered) return 'bisnis';
    if (availableCategories.includes(defaultCategory)) return defaultCategory;
    return availableCategories[0];
  }, [defaultCategory, availableCategories, isAllRegistered]);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<'bisnis' | 'investasi'>(initialCategory);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const config = accentConfig[category];
  const HeaderIcon = config.icon;
  const showCategorySelector = availableCategories.length > 1;

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!name.trim()) return;

    // Prevent duplicate registration
    if (registeredCategories.has(category)) {
      toast.error(t('biz.alreadyRegistered'));
      return;
    }

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

      const data = await res.json();
      const business = data.business;

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

  // If all categories are registered, show already-registered message
  if (isAllRegistered) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent aria-describedby={undefined} className="bg-background border-border text-foreground sm:max-w-[520px] p-0 overflow-hidden rounded-2xl">
          <VisuallyHidden>
            <DialogTitle>{t('biz.allRegistered')}</DialogTitle>
          </VisuallyHidden>
          <div className="relative bg-gradient-to-br from-secondary/20 via-[#FFD700]/5 to-transparent p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/15 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-secondary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">{t('biz.allRegistered')}</h2>
            <p className="text-sm text-muted-foreground/50 mb-6">
              {t('biz.allRegisteredDesc')}
            </p>
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-primary hover:bg-primary text-black px-8"
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
        className="bg-background border-border text-foreground sm:max-w-[520px] p-0 overflow-hidden rounded-2xl"
      >
        <VisuallyHidden>
          <DialogTitle>
            {category === 'bisnis'
              ? t('biz.createBusiness')
              : t('biz.createInvestment')}
          </DialogTitle>
        </VisuallyHidden>
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
              <h2 className="text-xl font-bold text-foreground leading-tight">
                {category === 'bisnis'
                  ? t('biz.createBusiness')
                  : t('biz.createInvestment')}
              </h2>
              <div className="mt-1.5 flex items-center gap-1.5">
                <Sparkles className={`w-3.5 h-3.5 ${config.iconColor} opacity-70`} />
                <p className="text-sm text-muted-foreground/50">
                  {t(config.hintTitle)}
                </p>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => onOpenChange(false)}
              className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted/40 hover:bg-muted/50 flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground/80 transition-all"
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
              <span className="text-xs text-muted-foreground/60">{t('biz.selectCategory')}</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-white/20" />
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-muted/40 flex items-center justify-center">
                <span className="text-xs font-medium text-muted-foreground/30">2</span>
              </div>
              <span className="text-xs text-muted-foreground/30">{t('biz.categoryName')}</span>
            </div>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 pt-5 space-y-4 max-h-[55vh] overflow-y-auto">
          {/* Category Selector - only show if multiple categories available */}
          {showCategorySelector ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground/70 flex items-center gap-2">
                <Tag className="w-4 h-4 text-muted-foreground/40" />
                {t('biz.selectCategory')}
                <span className="text-muted-foreground/30">*</span>
              </label>
              <Select
                value={category}
                onValueChange={(val) => setCategory(val as 'bisnis' | 'investasi')}
              >
                <SelectTrigger className="w-full h-11 bg-muted/30 border-border text-foreground rounded-xl focus:border-white/20 focus:ring-white/10">
                  <SelectValue placeholder={t('biz.selectCategory')} />
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-xl">
                  {!registeredCategories.has('bisnis') && (
                    <SelectItem value="bisnis" className="text-foreground focus:bg-muted/40 focus:text-foreground rounded-lg">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-secondary" />
                        {t('biz.bisnis')}
                      </div>
                    </SelectItem>
                  )}
                  {!registeredCategories.has('investasi') && (
                    <SelectItem value="investasi" className="text-foreground focus:bg-muted/40 focus:text-foreground rounded-lg">
                      <div className="flex items-center gap-2">
                        <LineChart className="w-4 h-4 text-warning" />
                        {t('biz.investasi')}
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          ) : (
            /* Show selected category as a non-interactive badge */
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/30 border border-border">
              {category === 'bisnis' ? (
                <Briefcase className="w-4 h-4 text-secondary" />
              ) : (
                <LineChart className="w-4 h-4 text-warning" />
              )}
              <span className="text-sm font-medium text-muted-foreground/70">{category === 'bisnis' ? t('biz.bisnis') : t('biz.investasi')}</span>
            </div>
          )}

          {/* Business / Investment Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground/70 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground/40" />
              {t('biz.categoryName')}
              <span className="text-muted-foreground/30">*</span>
            </label>
            <div className="relative">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('biz.businessNamePlaceholder')}
                required
                className="h-11 bg-muted/30 border-border text-foreground placeholder:text-muted-foreground/25 rounded-xl pl-4 pr-4 focus:border-white/20 transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground/70 flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground/40" />
              {t('biz.businessDesc')}
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('biz.businessDesc')}
              className="bg-muted/30 border-border text-foreground placeholder:text-muted-foreground/25 rounded-xl px-4 py-3 min-h-[90px] resize-none focus:border-white/20 transition-colors"
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground/70 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground/40" />
              {t('biz.businessAddress')}
            </label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('biz.businessAddress')}
              className="h-11 bg-muted/30 border-border text-foreground placeholder:text-muted-foreground/25 rounded-xl pl-4 pr-4 focus:border-white/20 transition-colors"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground/70 flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground/40" />
              {t('biz.businessPhone')}
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('biz.businessPhone')}
              className="h-11 bg-muted/30 border-border text-foreground placeholder:text-muted-foreground/25 rounded-xl pl-4 pr-4 focus:border-white/20 transition-colors"
            />
          </div>

          {/* Benefit Hint Card */}
          <div className={`rounded-xl border ${config.accentBorder} bg-muted/20 p-4`}>
            <p className="text-xs text-muted-foreground/40 leading-relaxed">
              {t(config.hintDesc)}
            </p>
          </div>
        </div>

        {/* Footer Buttons - fixed at bottom */}
        <DialogFooter className="gap-3 p-6 pt-3 sm:gap-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-11 border-border text-muted-foreground/70 hover:bg-muted/40 hover:text-foreground rounded-xl transition-all"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            disabled={loading || !name.trim()}
            className={`flex-1 h-11 ${config.btnGradient} rounded-xl font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
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
