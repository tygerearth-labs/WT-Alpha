'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  User,
  Palette,
  Monitor,
  Sun,
  Sparkles,
  Shield,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Check,
  ChevronRight,
  Globe,
  Heart,
  Info,
  Mail,
  BellRing,
  BarChart3,
  Crown,
  Gift,
  Timer,
  Copy,
  MessageCircle,
  Lock,
  Unlock,
  Phone,
  Settings,
  Layout,
  Server,
  Loader2,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';

/* ── Types ── */
interface SystemHealth {
  status: string;
  database: { size: string; tables: number };
  memory: { used: string; total: string };
  uptime: number;
  version: string;
}

/* ── Animated Toggle Switch ── */
function AnimatedSwitch({
  checked,
  onCheckedChange,
  activeColor = '#03DAC6',
  className,
}: {
  checked: boolean;
  onCheckedChange: (val: boolean) => void;
  activeColor?: string;
  className?: string;
}) {
  const [animating, setAnimating] = useState(false);
  const handleClick = () => {
    onCheckedChange(!checked);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);
  };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={handleClick}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BB86FC]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0D0D] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      style={{ backgroundColor: checked ? activeColor : 'rgba(255,255,255,0.1)' }}
    >
      <span
        className="pointer-events-none inline-block h-5 w-5 rounded-full shadow-lg ring-0"
        style={{
          backgroundColor: '#fff',
          transform: `translateX(${checked ? 20 : 0}px) scale(${animating ? (checked ? 1.1 : 1) : 1})`,
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: checked
            ? `0 0 8px ${activeColor}40, 0 2px 4px rgba(0,0,0,0.2)`
            : '0 1px 3px rgba(0,0,0,0.3)',
        }}
      />
    </button>
  );
}

/* ── Tab Definitions ── */
const TABS = [
  { id: 'umum', label: 'Umum', icon: Settings, color: '#03DAC6' },
  { id: 'platform', label: 'Platform', icon: Globe, color: '#FFD700' },
  { id: 'pricing', label: 'Pricing', icon: Crown, color: '#FFD700' },
  { id: 'landing', label: 'Landing Page', icon: Layout, color: '#03DAC6' },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, color: '#BB86FC' },
  { id: 'sistem', label: 'Sistem', icon: Server, color: '#CF6679' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const contentVariants = {
  enter: { opacity: 0, y: 12, transition: { duration: 0.25, ease: 'easeOut' as const } },
  center: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: 'easeIn' as const } },
};

/* ═══════════════════════════════════════════════════════════════
   GLASS CARD WRAPPER — premium dark glassmorphism card
   ═══════════════════════════════════════════════════════════════ */
function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Card
      className={cn(
        'adm-content-card relative overflow-hidden bg-white/[0.02] border-white/[0.06]',
        'backdrop-blur-sm hover:border-white/[0.1] transition-all duration-300',
        'hover:shadow-[0_4px_24px_rgba(0,0,0,0.2)]',
        'before:pointer-events-none before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/[0.03] before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity',
        className,
      )}
    >
      {children}
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION HEADER — icon + title + optional badge
   ═══════════════════════════════════════════════════════════════ */
function SectionHeader({
  icon: Icon,
  title,
  color,
  badge,
}: {
  icon: React.ElementType;
  title: string;
  color: string;
  badge?: string;
}) {
  return (
    <CardHeader className="pb-4">
      <CardTitle className="text-sm font-semibold text-white/70 flex items-center gap-2">
        <div className="adm-section-header-icon" style={{ backgroundColor: `${color}10` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <span className="truncate">{title}</span>
        {badge && (
          <Badge
            variant="outline"
            className="adm-badge shrink-0 text-[9px] font-semibold px-2 py-[3px] ml-auto leading-none"
            style={{
              backgroundColor: `${color}08`,
              borderColor: `${color}20`,
              color: `${color}A0`,
            }}
          >
            {badge}
          </Badge>
        )}
      </CardTitle>
    </CardHeader>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TOGGLE ROW — glass card with icon, label, desc, toggle
   ═══════════════════════════════════════════════════════════════ */
function ToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onCheckedChange,
  color = '#03DAC6',
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (val: boolean) => void;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200 group">
      <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors" style={{ backgroundColor: `${color}10` }}>
          <Icon className="h-4 w-4 transition-colors" style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-white/70 group-hover:text-white/85 transition-colors">{label}</p>
          <p className="text-[10px] text-white/30 mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <AnimatedSwitch checked={checked} onCheckedChange={onCheckedChange} activeColor={color} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export function AdminSettings() {
  const { t } = useTranslation();

  /* ── State ── */
  const [profileName, setProfileName] = useState('Admin');
  const [profileEmail, setProfileEmail] = useState('admin@wealthtracker.com');
  const [profileSaving, setProfileSaving] = useState(false);
  const [showEmailPasswordDialog, setShowEmailPasswordDialog] = useState(false);
  const [emailConfirmPassword, setEmailConfirmPassword] = useState('');

  const [defaultPlan, setDefaultPlan] = useState('basic');
  const [defaultCategoryLimit, setDefaultCategoryLimit] = useState('10');
  const [defaultSavingsLimit, setDefaultSavingsLimit] = useState('3');
  const [autoSuspend, setAutoSuspend] = useState(true);
  const [emailNotifNewUser, setEmailNotifNewUser] = useState(true);
  const [emailNotifExpiry, setEmailNotifExpiry] = useState(true);
  const [emailNotifInviteUsage, setEmailNotifInviteUsage] = useState(false);
  const [emailNotifDailySummary, setEmailNotifDailySummary] = useState(false);
  const [showClearLogsDialog, setShowClearLogsDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [basicPlanPrice, setBasicPlanPrice] = useState('Gratis');
  const [proPlanPrice, setProPlanPrice] = useState('Rp 99.000');
  const [basicPlanFeatures, setBasicPlanFeatures] = useState('');
  const [proPlanFeatures, setProPlanFeatures] = useState('');
  const [trialEnabled, setTrialEnabled] = useState(true);
  const [trialDurationDays, setTrialDurationDays] = useState('30');
  const [trialPlan, setTrialPlan] = useState('basic');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [availablePlans, setAvailablePlans] = useState<string[]>(['basic', 'pro', 'ultimate']);
  const [basicPlanDiscount, setBasicPlanDiscount] = useState('');
  const [proPlanDiscount, setProPlanDiscount] = useState('');
  const [basicPlanDiscountLabel, setBasicPlanDiscountLabel] = useState('');
  const [proPlanDiscountLabel, setProPlanDiscountLabel] = useState('');
  const [basicPurchaseUrl, setBasicPurchaseUrl] = useState('');
  const [proPurchaseUrl, setProPurchaseUrl] = useState('');
  const [ultimatePlanPrice, setUltimatePlanPrice] = useState('Rp 199.000');
  const [ultimatePlanFeatures, setUltimatePlanFeatures] = useState('');
  const [ultimatePlanDiscount, setUltimatePlanDiscount] = useState('');
  const [ultimatePlanDiscountLabel, setUltimatePlanDiscountLabel] = useState('');
  const [ultimatePurchaseUrl, setUltimatePurchaseUrl] = useState('');
  const [landingPageConfig, setLandingPageConfig] = useState({
    showStory: true,
    showFeatures: true,
    showTestimonials: true,
    showPricing: true,
    showFaq: true,
    showStats: true,
    heroSubtitle: '',
    customFooterText: '',
  });
  const [landingStats, setLandingStats] = useState([
    { value: '73%', label: 'Accuracy Rate' },
    { value: '2x', label: 'Faster Tracking' },
    { value: '30%', label: 'Time Saved' },
  ]);
  const [sectionVisibility, setSectionVisibility] = useState<Record<string, Record<string, boolean>>>({ basic: {}, pro: {}, ultimate: {} });
  const [exportEnabled, setExportEnabled] = useState<Record<string, Record<string, boolean>>>({ basic: {}, pro: {}, ultimate: {} });

  const [activeTab, setActiveTab] = useState<TabId>('umum');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const originalValuesRef = useRef<string>('');
  const [hasChanges, setHasChanges] = useState(false);

  /* ── Serialize current values (for dirty tracking only) ── */
  const currentValues = useMemo(() => {
    return JSON.stringify({
      defaultPlan, defaultCategoryLimit, defaultSavingsLimit, autoSuspend,
      basicPlanPrice, proPlanPrice, ultimatePlanPrice,
      basicPlanFeatures, proPlanFeatures, ultimatePlanFeatures,
      trialEnabled, trialDurationDays, trialPlan,
      whatsappNumber, registrationOpen, registrationMessage, availablePlans,
      basicPlanDiscount, proPlanDiscount, basicPlanDiscountLabel, proPlanDiscountLabel,
      ultimatePlanDiscount, ultimatePlanDiscountLabel,
      basicPurchaseUrl, proPurchaseUrl, ultimatePurchaseUrl,
      emailNotifNewUser, emailNotifExpiry, emailNotifInviteUsage, emailNotifDailySummary,
      landingPageConfig, landingStats, sectionVisibility, exportEnabled,
    });
  }, [
    defaultPlan, defaultCategoryLimit, defaultSavingsLimit, autoSuspend,
 emailNotifNewUser, emailNotifExpiry, emailNotifInviteUsage, emailNotifDailySummary,
    basicPlanPrice, proPlanPrice, ultimatePlanPrice,
    basicPlanFeatures, proPlanFeatures, ultimatePlanFeatures,
    trialEnabled, trialDurationDays, trialPlan,
    whatsappNumber, registrationOpen, registrationMessage, availablePlans,
    basicPlanDiscount, proPlanDiscount, basicPlanDiscountLabel, proPlanDiscountLabel,
    ultimatePlanDiscount, ultimatePlanDiscountLabel,
    basicPurchaseUrl, proPurchaseUrl, ultimatePurchaseUrl,
    landingPageConfig, landingStats, sectionVisibility, exportEnabled,
  ]);

  /* ── Dirty tracking ── */
  useEffect(() => {
    if (configLoaded && originalValuesRef.current === '') {
      originalValuesRef.current = currentValues;
    }
    if (originalValuesRef.current !== '') {
      setHasChanges(currentValues !== originalValuesRef.current);
    }
  }, [configLoaded, currentValues]);

  /* ═══════════════════════════════════════════════════════════════
     AUTO-SAVE — SINGLE unified system, no race conditions
     ═══════════════════════════════════════════════════════════════ */
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  const doSave = useCallback(async (toastMessage?: string) => {
    if (isSavingRef.current) return; // prevent concurrent saves
    isSavingRef.current = true;
    setSaveStatus('saving');
    try {
      const payload = {
        defaultPlan,
        defaultMaxCategories: parseInt(defaultCategoryLimit, 10) || 10,
        defaultMaxSavings: parseInt(defaultSavingsLimit, 10) || 3,
        autoSuspendExpired: autoSuspend,
        basicPlanPrice, proPlanPrice, ultimatePlanPrice,
        basicPlanFeatures: JSON.stringify(basicPlanFeatures.split('\n').map(f => f.trim()).filter(Boolean)),
        proPlanFeatures: JSON.stringify(proPlanFeatures.split('\n').map(f => f.trim()).filter(Boolean)),
        ultimatePlanFeatures: JSON.stringify(ultimatePlanFeatures.split('\n').map(f => f.trim()).filter(Boolean)),
        trialEnabled,
        trialDurationDays: parseInt(trialDurationDays, 10) || 30,
        trialPlan,
        whatsappNumber, registrationOpen, registrationMessage,
        availablePlans: JSON.stringify(availablePlans),
        basicPlanDiscount, proPlanDiscount, basicPlanDiscountLabel, proPlanDiscountLabel,
        ultimatePlanDiscount, ultimatePlanDiscountLabel,
        basicPurchaseUrl, proPurchaseUrl, ultimatePurchaseUrl,
        sectionVisibility: JSON.stringify(sectionVisibility),
        exportEnabled: JSON.stringify(exportEnabled),
        landingPageConfig: JSON.stringify(landingPageConfig),
        landingPageStats: JSON.stringify(landingStats),
        emailNotifications: JSON.stringify({ newUser: emailNotifNewUser, expiry: emailNotifExpiry, inviteUsage: emailNotifInviteUsage, dailySummary: emailNotifDailySummary }),
      };

      const res = await fetch('/api/admin/platform-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        originalValuesRef.current = currentValues;
        setHasChanges(false);
        setSaveStatus('success');
        toast.success(toastMessage || 'Pengaturan berhasil disimpan');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        const errData = await res.json().catch(() => null);
        console.error('[AdminSettings] Save failed:', res.status, errData);
        setSaveStatus('error');
        toast.error(errData?.error || 'Gagal menyimpan', { description: `HTTP ${res.status}` });
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (err) {
      console.error('[AdminSettings] Save error:', err);
      setSaveStatus('error');
      toast.error('Gagal menyimpan', { description: 'Network error' });
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      isSavingRef.current = false;
    }
  }, [
    defaultPlan, defaultCategoryLimit, defaultSavingsLimit, autoSuspend,
    basicPlanPrice, proPlanPrice, ultimatePlanPrice,
    basicPlanFeatures, proPlanFeatures, ultimatePlanFeatures,
    trialEnabled, trialDurationDays, trialPlan,
    whatsappNumber, registrationOpen, registrationMessage, availablePlans,
    basicPlanDiscount, proPlanDiscount, basicPlanDiscountLabel, proPlanDiscountLabel,
    basicPurchaseUrl, proPurchaseUrl, ultimatePlanPrice, ultimatePlanFeatures,
    ultimatePlanDiscount, ultimatePlanDiscountLabel, ultimatePurchaseUrl,
    sectionVisibility, exportEnabled, landingPageConfig, landingStats, currentValues,
    emailNotifNewUser, emailNotifExpiry, emailNotifInviteUsage, emailNotifDailySummary,
  ]);

  const doSaveRef = useRef(doSave);
  doSaveRef.current = doSave;

  /* ── Schedule auto-save (debounced, single entry point) ── */
  const scheduleAutoSave = useCallback((delay = 800) => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      doSaveRef.current();
    }, delay);
  }, []);

  /* ── Unified auto-save effect: triggers on ANY form change ── */
  useEffect(() => {
    if (!configLoaded || !hasChanges) return;
    scheduleAutoSave(1000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [configLoaded, hasChanges, currentValues, scheduleAutoSave]);

  /* ── Toggle handler — sets state, unified effect handles save ── */
  const handleToggleWithAutoSave = useCallback((setter: (v: boolean) => void, value: boolean) => {
    setter(value);
  }, []);

  /* ── Input handler — sets state, unified effect handles save ── */
  const handleInputWithAutoSave = useCallback((setter: (v: string) => void, value: string) => {
    setter(value);
  }, []);

  /* ── Manual save (button click) ── */
  const handleSave = useCallback(async () => {
    if (!hasChanges) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    await doSave();
  }, [hasChanges, doSave]);

  /* ── Fetch system health ── */
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/admin/system-health');
        if (res.ok) setSystemHealth(await res.json());
      } catch {}
      setLoadingHealth(false);
    };
    fetchHealth();
  }, []);

  /* ── Fetch platform config ── */
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/admin/platform-config');
        if (res.ok) {
          const data = await res.json();
          if (data.config) {
            setDefaultPlan(data.config.defaultPlan || 'basic');
            setDefaultCategoryLimit(String(data.config.defaultMaxCategories || 10));
            setDefaultSavingsLimit(String(data.config.defaultMaxSavings || 3));
            setAutoSuspend(data.config.autoSuspendExpired ?? true);
            setBasicPlanPrice(data.config.basicPlanPrice || 'Gratis');
            setProPlanPrice(data.config.proPlanPrice || 'Rp 99.000');
            setUltimatePlanPrice(data.config.ultimatePlanPrice || 'Rp 199.000');
            try {
              const b = data.config.basicPlanFeatures ? JSON.parse(data.config.basicPlanFeatures) : [];
              setBasicPlanFeatures(Array.isArray(b) ? b.join('\n') : '');
            } catch { setBasicPlanFeatures(''); }
            try {
              const p = data.config.proPlanFeatures ? JSON.parse(data.config.proPlanFeatures) : [];
              setProPlanFeatures(Array.isArray(p) ? p.join('\n') : '');
            } catch { setProPlanFeatures(''); }
            try {
              const u = data.config.ultimatePlanFeatures ? JSON.parse(data.config.ultimatePlanFeatures) : [];
              setUltimatePlanFeatures(Array.isArray(u) ? u.join('\n') : '');
            } catch { setUltimatePlanFeatures(''); }
            setTrialEnabled(data.config.trialEnabled ?? true);
            setTrialDurationDays(String(data.config.trialDurationDays ?? 30));
            setTrialPlan(data.config.trialPlan || 'basic');
            setWhatsappNumber(data.config.whatsappNumber || '');
            setRegistrationOpen(data.config.registrationOpen ?? true);
            setRegistrationMessage(data.config.registrationMessage || '');
            try {
              const ap = data.config.availablePlans ? JSON.parse(data.config.availablePlans) : ['basic', 'pro', 'ultimate'];
              setAvailablePlans(Array.isArray(ap) ? ap : ['basic', 'pro', 'ultimate']);
            } catch { setAvailablePlans(['basic', 'pro', 'ultimate']); }
            setBasicPlanDiscount(data.config.basicPlanDiscount || '');
            setProPlanDiscount(data.config.proPlanDiscount || '');
            setBasicPlanDiscountLabel(data.config.basicPlanDiscountLabel || '');
            setProPlanDiscountLabel(data.config.proPlanDiscountLabel || '');
            setBasicPurchaseUrl(data.config.basicPurchaseUrl || '');
            setProPurchaseUrl(data.config.proPurchaseUrl || '');
            setUltimatePlanDiscount(data.config.ultimatePlanDiscount || '');
            setUltimatePlanDiscountLabel(data.config.ultimatePlanDiscountLabel || '');
            setUltimatePurchaseUrl(data.config.ultimatePurchaseUrl || '');
            const defaultSV = {
              basic: { budget: true, healthScore: true, tips: true, spendingTrend: true, topCategories: true, monthlySummary: true, savingsOverview: true, quickTransaction: false },
              pro: { budget: true, healthScore: true, tips: true, spendingTrend: true, topCategories: true, monthlySummary: true, savingsOverview: true, quickTransaction: true },
              ultimate: { budget: true, healthScore: true, tips: true, spendingTrend: true, topCategories: true, monthlySummary: true, savingsOverview: true, quickTransaction: true },
            };
            try {
              const sv = data.config.sectionVisibility ? JSON.parse(data.config.sectionVisibility) : null;
              setSectionVisibility(sv && typeof sv === 'object' ? { ...defaultSV, ...sv, ultimate: sv.ultimate || defaultSV.ultimate } : defaultSV);
            } catch { setSectionVisibility(defaultSV); }
            const defaultEE = { basic: { pdf: false, excel: false }, pro: { pdf: true, excel: true }, ultimate: { pdf: true, excel: true } };
            try {
              const ee = data.config.exportEnabled ? JSON.parse(data.config.exportEnabled) : null;
              setExportEnabled(ee && typeof ee === 'object' ? { ...defaultEE, ...ee, ultimate: ee.ultimate || defaultEE.ultimate } : defaultEE);
            } catch { setExportEnabled(defaultEE); }
            let parsedLS = [{ value: '73%', label: 'Accuracy Rate' }, { value: '2x', label: 'Faster Tracking' }, { value: '30%', label: 'Time Saved' }];
            try { if (data.config.landingPageStats) parsedLS = JSON.parse(data.config.landingPageStats); } catch {}
            setLandingStats(parsedLS);
            const defaultLPC = { showStory: true, showFeatures: true, showTestimonials: true, showPricing: true, showFaq: true, showStats: true, heroSubtitle: '', customFooterText: '' };
            try {
              const lpc = data.config.landingPageConfig ? JSON.parse(data.config.landingPageConfig) : null;
              if (lpc && typeof lpc === 'object') setLandingPageConfig({ ...defaultLPC, ...lpc });
            } catch {}
            try {
              const en = data.config.emailNotifications ? JSON.parse(data.config.emailNotifications) : null;
              if (en && typeof en === 'object') {
                setEmailNotifNewUser(en.newUser ?? true);
                setEmailNotifExpiry(en.expiry ?? true);
                setEmailNotifInviteUsage(en.inviteUsage ?? false);
                setEmailNotifDailySummary(en.dailySummary ?? false);
              }
            } catch {}
            setConfigLoaded(true);
          }
        }
      } catch { setConfigLoaded(true); }
    };
    fetchConfig();
  }, []);

  /* ── Fetch user profile ── */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setProfileName(data.user.username || 'Admin');
            setProfileEmail(data.user.email || 'admin@wealthtracker.com');
            localStorage.setItem('wt-admin-original-email', data.user.email || 'admin@wealthtracker.com');
          }
        }
      } catch {}
    })();
  }, []);

  /* ── Profile save ── */
  const handleSaveProfile = async (password?: string) => {
    setProfileSaving(true);
    try {
      const body: Record<string, string> = { username: profileName };
      if (password) { body.currentPassword = password; body.email = profileEmail; }
      const res = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        toast.success('Profile updated', { description: 'Name and email saved successfully.' });
        setShowEmailPasswordDialog(false);
        setEmailConfirmPassword('');
      } else {
        const data = await res.json();
        toast.error('Failed to update profile', { description: data.error || 'Server error.' });
      }
    } catch { toast.error('Failed to update profile', { description: 'Network error.' }); }
    finally { setProfileSaving(false); }
  };

  const handleProfileSaveClick = () => {
    const initiallyFetched = localStorage.getItem('wt-admin-original-email');
    if (profileEmail !== (initiallyFetched || 'admin@wealthtracker.com')) setShowEmailPasswordDialog(true);
    else handleSaveProfile();
  };

  const handleClearLogs = async () => {
    setShowClearLogsDialog(false);
    try {
      const res = await fetch('/api/admin/activity-log', { method: 'DELETE' });
      if (res.ok) toast.success('Activity logs cleared', { description: 'All activity logs have been deleted.' });
      else toast.error('Failed to clear logs', { description: 'Server returned an error.' });
    } catch { toast.error('Failed to clear logs', { description: 'Network error.' }); }
  };

  const handleResetDemoData = async () => {
    setShowResetDialog(false);
    try {
      const res = await fetch('/api/admin/system-health', { method: 'DELETE' });
      if (res.ok) { toast.success('Demo data reset', { description: 'All demo data has been cleared.' }); window.location.reload(); }
      else toast.error('Failed to reset data', { description: 'Server returned an error.' });
    } catch { toast.error('Failed to reset data', { description: 'Network error.' }); }
  };

  const handleSyncPlanLimits = async () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    await doSave('Plan limits synced successfully');
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  /* ── Shared helpers ── */
  const inputCls = 'adm-form-input bg-white/[0.03] border-white/[0.08] text-white/80 h-10 text-sm focus:border-[#03DAC6]/30 focus:ring-[#03DAC6]/10 placeholder:text-white/15';
  const textareaCls = 'w-full rounded-lg bg-white/[0.03] border border-white/[0.08] text-white/80 text-sm px-3 py-2 focus:border-[#03DAC6]/30 focus:ring-1 focus:ring-[#03DAC6]/10 focus:outline-none placeholder:text-white/15 resize-none';

  const PlanSelector = ({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn('bg-white/[0.03] border-white/[0.08] text-white/80 h-10 text-sm focus:ring-[#03DAC6]/10 focus:border-[#03DAC6]/30', className)}>
        <SelectValue placeholder="Select plan" />
      </SelectTrigger>
      <SelectContent className="bg-[#0D0D0D] border-white/[0.08]">
        <SelectItem value="basic" className="text-white/70 focus:bg-white/[0.06] focus:text-white">
          <div className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-white/40" />Basic</div>
        </SelectItem>
        <SelectItem value="pro" className="text-white/70 focus:bg-white/[0.06] focus:text-white">
          <div className="flex items-center gap-2"><Sun className="h-3 w-3 text-[#FFD700]" />Pro</div>
        </SelectItem>
        <SelectItem value="ultimate" className="text-white/70 focus:bg-white/[0.06] focus:text-white">
          <div className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-[#03DAC6]" />Ultimate</div>
        </SelectItem>
      </SelectContent>
    </Select>
  );

  /* ═══════════════════════════════════════════════════════════════
     SAVE BUTTON — used at bottom of each tab
     ═══════════════════════════════════════════════════════════════ */
  const isSaving = saveStatus === 'saving';
  const isIdle = saveStatus === 'idle';
  const isSuccess = saveStatus === 'success';

  /* ═══════════════════════════════════════════════════════════════
     TAB 1: UMUM (General)
     ═══════════════════════════════════════════════════════════════ */
  const TabUmum = () => (
    <motion.div key="umum" variants={contentVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
      {/* Profile Card */}
      <GlassCard>
        <SectionHeader icon={User} title="Profile" color="#03DAC6" badge="Admin" />
        <CardContent className="pt-0 space-y-5">
          {/* Avatar + Info */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-white/[0.02] to-transparent border border-white/[0.04]">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#03DAC6]/20 via-[#BB86FC]/15 to-[#03DAC6]/10 flex items-center justify-center text-[#03DAC6] text-xl font-bold border border-white/[0.08] shrink-0 shadow-[0_4px_16px_rgba(3,218,198,0.1)]">
              {profileName?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-white/85">{profileName}</p>
              <p className="text-[12px] text-white/35 truncate">{profileEmail}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="outline" className="adm-badge text-[8px] font-bold uppercase px-1.5 py-0 border-[#03DAC6]/20 text-[#03DAC6] bg-[#03DAC6]/5">
                  <Shield className="h-2 w-2 mr-0.5 inline" />Admin
                </Badge>
                <span className="text-[10px] text-white/20">Joined {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
          {/* Edit fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Display Name</Label>
              <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} className={inputCls} placeholder="Admin name" />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Email Address</Label>
              <Input value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} className={inputCls} placeholder="admin@wealthtracker.com" type="email" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Button onClick={handleProfileSaveClick} disabled={profileSaving} className="adm-action-btn h-9 px-5 text-[12px] font-semibold rounded-lg bg-[#03DAC6]/15 text-[#03DAC6] hover:bg-[#03DAC6]/25 border border-[#03DAC6]/20 transition-all disabled:opacity-50">
              {profileSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
              Save Profile
            </Button>
            <p className="text-[10px] text-white/20">Changing email requires password confirmation</p>
          </div>
        </CardContent>
      </GlassCard>

      {/* Email Notifications */}
      <GlassCard>
        <SectionHeader icon={Mail} title={t('admin.settings.emailNotifications')} color="#03DAC6" badge="Alerts" />
        <CardContent className="pt-0 space-y-3">
          <p className="text-[10px] text-white/25 mb-1">Configure which email notifications the admin receives. Changes are saved automatically.</p>
          <ToggleRow
            icon={User} label="New User Registration" description="Receive an email when a new user joins the platform"
            checked={emailNotifNewUser}
            onCheckedChange={(v) => handleToggleWithAutoSave(setEmailNotifNewUser, v)}
            color="#03DAC6"
          />
          <ToggleRow
            icon={AlertTriangle} label="Subscription Expiry Warnings" description="Get alerts 7 days before a user's Pro plan expires"
            checked={emailNotifExpiry}
            onCheckedChange={(v) => handleToggleWithAutoSave(setEmailNotifExpiry, v)}
            color="#FFD700"
          />
          <ToggleRow
            icon={BellRing} label="Invite Token Usage Alerts" description="Notify when an invite token is used to register"
            checked={emailNotifInviteUsage}
            onCheckedChange={(v) => handleToggleWithAutoSave(setEmailNotifInviteUsage, v)}
            color="#BB86FC"
          />
          <ToggleRow
            icon={BarChart3} label="Daily Activity Summary" description="Receive a daily digest of platform activity and metrics"
            checked={emailNotifDailySummary}
            onCheckedChange={(v) => handleToggleWithAutoSave(setEmailNotifDailySummary, v)}
            color="#CF6679"
          />
          {isSaving && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#03DAC6]/[0.04] border border-[#03DAC6]/10">
              <Loader2 className="h-3 w-3 animate-spin text-[#03DAC6]" />
              <span className="text-[11px] text-[#03DAC6]/70">Menyimpan perubahan notifikasi...</span>
            </div>
          )}
        </CardContent>
      </GlassCard>

      {/* Appearance */}
      <GlassCard>
        <SectionHeader icon={Palette} title={t('admin.settings.appearance')} color="#BB86FC" />
        <CardContent className="pt-0">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="w-9 h-9 rounded-lg bg-[#BB86FC]/10 flex items-center justify-center shrink-0"><Info className="h-4 w-4 text-[#BB86FC]" /></div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-white/70">Dark Mode Active</p>
              <p className="text-[10px] text-white/30 mt-0.5">The platform uses an optimized dark theme. Additional theme options will be available in a future update.</p>
            </div>
            <Badge variant="outline" className="adm-badge text-[9px] font-semibold px-1.5 py-0 bg-[#03DAC6]/5 border-[#03DAC6]/15 text-[#03DAC6]/70 ml-auto shrink-0">Default</Badge>
          </div>
        </CardContent>
      </GlassCard>

    </motion.div>
  );

  /* ═══════════════════════════════════════════════════════════════
     TAB 2: PLATFORM
     ═══════════════════════════════════════════════════════════════ */
  const TabPlatform = () => (
    <motion.div key="platform" variants={contentVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
      <GlassCard>
        <SectionHeader icon={Globe} title="Platform Settings" color="#FFD700" badge="Configuration" />
        <CardContent className="pt-0 space-y-5">
          <div className="space-y-2">
            <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Default User Plan</Label>
            <PlanSelector value={defaultPlan} onChange={setDefaultPlan} className="w-full sm:w-64" />
            <p className="text-[10px] text-white/20">Plan assigned to new users who register without an invite</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Default Category Limit</Label>
              <Select value={defaultCategoryLimit} onValueChange={setDefaultCategoryLimit}>
                <SelectTrigger className={cn('w-full', inputCls)}><SelectValue placeholder="Select limit" /></SelectTrigger>
                <SelectContent className="bg-[#0D0D0D] border-white/[0.08]">
                  {[5, 10, 15, 20, 25, 30].map((v) => (<SelectItem key={v} value={String(v)} className="text-white/70 focus:bg-white/[0.06] focus:text-white">{v} categories</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Default Savings Limit</Label>
              <Select value={defaultSavingsLimit} onValueChange={setDefaultSavingsLimit}>
                <SelectTrigger className={cn('w-full', inputCls)}><SelectValue placeholder="Select limit" /></SelectTrigger>
                <SelectContent className="bg-[#0D0D0D] border-white/[0.08]">
                  {[1, 3, 5, 10, 15].map((v) => (<SelectItem key={v} value={String(v)} className="text-white/70 focus:bg-white/[0.06] focus:text-white">{v} savings targets</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <ToggleRow
            icon={AlertTriangle} label="Auto-Suspend Expired Subscriptions"
            description="Automatically downgrade users when their Pro subscription expires"
            checked={autoSuspend}
            onCheckedChange={(v) => handleToggleWithAutoSave(setAutoSuspend, v)}
            color="#FFD700"
          />
        </CardContent>
      </GlassCard>

      <GlassCard>
        <SectionHeader icon={MessageCircle} title="Registration & WhatsApp" color="#25D366" badge="Contact & Access" />
        <CardContent className="pt-0 space-y-5">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[#03DAC6]/10 flex items-center justify-center shrink-0">
                  {registrationOpen ? <Unlock className="h-4 w-4 text-[#03DAC6]" /> : <Lock className="h-4 w-4 text-[#CF6679]" />}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-white/70">Registration Open</p>
                  <p className="text-[10px] text-white/30 mt-0.5 truncate">{registrationOpen ? 'New users can register through the sign-up form' : 'Registration is closed'}</p>
                </div>
              </div>
              <AnimatedSwitch checked={registrationOpen} onCheckedChange={(v) => handleToggleWithAutoSave(setRegistrationOpen, v)} activeColor={registrationOpen ? '#03DAC6' : '#CF6679'} />
            </div>
            {!registrationOpen && (
              <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Closed Registration Message</Label>
                <textarea value={registrationMessage} onChange={(e) => setRegistrationMessage(e.target.value)} rows={2} className={cn(textareaCls, 'focus:border-[#CF6679]/30 focus:ring-[#CF6679]/10')} placeholder="Registration is currently closed." />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="h-3 w-3 text-[#25D366]/50" /> WhatsApp Number
            </Label>
            <Input value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} className={cn(inputCls, 'focus:border-[#25D366]/30 focus:ring-[#25D366]/10')} placeholder="6281234567890" />
            <p className="text-[10px] text-white/20">Include country code without + (e.g., 6281234567890)</p>
            {whatsappNumber && (
              <div className="p-3 rounded-xl bg-[#25D366]/5 border border-[#25D366]/10 space-y-2">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" />
                  <p className="text-[11px] font-semibold text-white/70">Preview</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 rounded-lg bg-black/20 border border-white/[0.06] text-[11px] text-white/50 font-mono truncate">
                    https://wa.me/{whatsappNumber.replace(/[^0-9]/g, '')}
                  </div>
                  <Button variant="outline" size="sm" className="adm-action-btn h-8 text-[10px] gap-1.5 bg-[#25D366]/10 border-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/20 shrink-0" onClick={() => {
                    const url = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`;
                    navigator.clipboard.writeText(url).then(() => toast.success('WhatsApp link copied!')).catch(() => toast.info(`Link: ${url}`));
                  }}>
                    <Copy className="h-3 w-3" /> Copy
                  </Button>
                </div>
              </div>
            )}
          </div>
          {/* Available Plans */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-3">
            <div className="flex items-center gap-2">
              <Crown className="h-3.5 w-3.5 text-[#FFD700]/60" />
              <p className="text-[11px] font-semibold text-white/70">Available Plans on Landing Page</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {['basic', 'pro', 'ultimate'].map((plan) => {
                const isActive = availablePlans.includes(plan);
                return (
                  <button
                    key={plan}
                    onClick={() => {
                      if (isActive && availablePlans.length > 1) setAvailablePlans(availablePlans.filter(p => p !== plan));
                      else if (!isActive) setAvailablePlans([...availablePlans, plan]);
                    }}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 text-left',
                      isActive ? 'bg-[#FFD700]/[0.06] border-[#FFD700]/25' : 'bg-white/[0.015] border-white/[0.06] hover:border-white/[0.12] opacity-40',
                    )}
                  >
                    {plan === 'basic' ? <Sparkles className={cn('h-4 w-4', isActive ? 'text-white/60' : 'text-white/30')} /> : <Crown className={cn('h-4 w-4', isActive ? 'text-[#FFD700]' : 'text-white/30')} />}
                    <div>
                      <p className={cn('text-[12px] font-semibold transition-colors capitalize', isActive ? 'text-white/80' : 'text-white/40')}>{plan} Plan</p>
                    </div>
                    {isActive && <Check className="h-3.5 w-3.5 text-[#FFD700] ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </GlassCard>

    </motion.div>
  );

  /* ═══════════════════════════════════════════════════════════════
     TAB 3: PRICING
     ═══════════════════════════════════════════════════════════════ */
  const PlanCard = ({
    planKey,
    planLabel,
    icon: PlanIcon,
    color,
    price,
    priceSetter,
    features,
    featuresSetter,
    discount,
    discountSetter,
    discountLabel,
    discountLabelSetter,
    purchaseUrl,
    purchaseUrlSetter,
  }: {
    planKey: string;
    planLabel: string;
    icon: React.ElementType;
    color: string;
    price: string;
    priceSetter: (v: string) => void;
    features: string;
    featuresSetter: (v: string) => void;
    discount: string;
    discountSetter: (v: string) => void;
    discountLabel: string;
    discountLabelSetter: (v: string) => void;
    purchaseUrl: string;
    purchaseUrlSetter: (v: string) => void;
  }) => {
    const featureList = features.split('\n').filter(Boolean);
    return (
      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 space-y-4 relative overflow-hidden">
        {/* Gradient accent top */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ backgroundColor: `${color}10`, borderColor: `${color}20` }}>
            <PlanIcon className="h-5 w-5" style={{ color }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white/85">{planLabel}</h3>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Plan</p>
          </div>
        </div>
        {/* Price */}
        <div className="space-y-2">
          <Label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Price</Label>
          <Input value={price} onChange={(e) => priceSetter(e.target.value)} className={cn(inputCls, 'text-center font-semibold text-base')} placeholder="Gratis" />
        </div>
        {/* Features */}
        <div className="space-y-2">
          <Label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Features</Label>
          <textarea value={features} onChange={(e) => featuresSetter(e.target.value)} rows={5} className={textareaCls} placeholder="One feature per line" />
          {featureList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {featureList.map((f, i) => (
                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium" style={{ backgroundColor: `${color}08`, color: `${color}C0`, border: `1px solid ${color}15` }}>
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>
        {/* Discount */}
        <div className="space-y-2 pt-2 border-t border-white/[0.04]">
          <Label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Discount</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input value={discount} onChange={(e) => discountSetter(e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white/80 h-8 text-xs focus:border-[#03DAC6]/30 focus:ring-[#03DAC6]/10 placeholder:text-white/15" placeholder="20%" />
            <Input value={discountLabel} onChange={(e) => discountLabelSetter(e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white/80 h-8 text-xs focus:border-[#03DAC6]/30 focus:ring-[#03DAC6]/10 placeholder:text-white/15" placeholder="Label" />
          </div>
        </div>
        {/* Purchase URL */}
        <div className="space-y-2">
          <Label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Purchase URL</Label>
          <Input value={purchaseUrl} onChange={(e) => purchaseUrlSetter(e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white/80 h-8 text-xs focus:border-[#03DAC6]/30 focus:ring-[#03DAC6]/10 placeholder:text-white/15" placeholder="https://..." />
        </div>
      </div>
    );
  };

  const TabPricing = () => (
    <motion.div key="pricing" variants={contentVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
      <GlassCard>
        <SectionHeader icon={Crown} title="Plan Pricing & Features" color="#FFD700" badge="Pricing" />
        <CardContent className="pt-0">
          <p className="text-[10px] text-white/25 mb-4">Configure pricing, features, discounts and purchase links for each plan.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PlanCard
              planKey="basic" planLabel="Basic" icon={Sparkles} color="#03DAC6"
              price={basicPlanPrice} priceSetter={setBasicPlanPrice}
              features={basicPlanFeatures} featuresSetter={setBasicPlanFeatures}
              discount={basicPlanDiscount} discountSetter={setBasicPlanDiscount}
              discountLabel={basicPlanDiscountLabel} discountLabelSetter={setBasicPlanDiscountLabel}
              purchaseUrl={basicPurchaseUrl} purchaseUrlSetter={setBasicPurchaseUrl}
            />
            <PlanCard
              planKey="pro" planLabel="Pro" icon={Crown} color="#FFD700"
              price={proPlanPrice} priceSetter={setProPlanPrice}
              features={proPlanFeatures} featuresSetter={setProPlanFeatures}
              discount={proPlanDiscount} discountSetter={setProPlanDiscount}
              discountLabel={proPlanDiscountLabel} discountLabelSetter={setProPlanDiscountLabel}
              purchaseUrl={proPurchaseUrl} purchaseUrlSetter={setProPurchaseUrl}
            />
            <PlanCard
              planKey="ultimate" planLabel="Ultimate" icon={Sparkles} color="#BB86FC"
              price={ultimatePlanPrice} priceSetter={setUltimatePlanPrice}
              features={ultimatePlanFeatures} featuresSetter={setUltimatePlanFeatures}
              discount={ultimatePlanDiscount} discountSetter={setUltimatePlanDiscount}
              discountLabel={ultimatePlanDiscountLabel} discountLabelSetter={setUltimatePlanDiscountLabel}
              purchaseUrl={ultimatePurchaseUrl} purchaseUrlSetter={setUltimatePurchaseUrl}
            />
          </div>
        </CardContent>
      </GlassCard>

      {/* Trial Settings */}
      <GlassCard>
        <SectionHeader icon={Gift} title="Free Trial Settings" color="#03DAC6" badge="Trial" />
        <CardContent className="pt-0 space-y-4">
          <ToggleRow
            icon={Gift} label="Free Trial for New Users"
            description="Give new registrants a trial subscription without an invite"
            checked={trialEnabled}
            onCheckedChange={(v) => handleToggleWithAutoSave(setTrialEnabled, v)}
            color="#03DAC6"
          />
          {trialEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/[0.04]">
              <div className="space-y-2">
                <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider flex items-center gap-1.5"><Timer className="h-3 w-3 text-[#BB86FC]/50" /> Trial Duration</Label>
                <Select value={trialDurationDays} onValueChange={setTrialDurationDays}>
                  <SelectTrigger className={cn('w-full', inputCls)}><SelectValue placeholder="Select duration" /></SelectTrigger>
                  <SelectContent className="bg-[#0D0D0D] border-white/[0.08]">
                    {[7, 14, 30, 60, 90].map((d) => (<SelectItem key={d} value={String(d)} className="text-white/70 focus:bg-white/[0.06] focus:text-white">{d} days</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Trial Plan</Label>
                <PlanSelector value={trialPlan} onChange={setTrialPlan} />
              </div>
            </div>
          )}
          {trialEnabled && (
            <div className="p-3 rounded-xl bg-[#03DAC6]/5 border border-[#03DAC6]/10 space-y-2">
              <div className="flex items-center gap-2">
                <Gift className="h-3.5 w-3.5 text-[#03DAC6]" />
                <p className="text-[11px] font-semibold text-white/70">Free Trial Registration Link</p>
              </div>
              <p className="text-[10px] text-white/30">
                Share this link to let users register with a {trialDurationDays}-day free {trialPlan} trial.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-lg bg-black/20 border border-white/[0.06] text-[11px] text-white/50 font-mono truncate">
                  {typeof window !== 'undefined' ? `${window.location.origin}/?trial=true` : '/?trial=true'}
                </div>
                <Button variant="outline" size="sm" className="adm-action-btn h-8 text-[10px] gap-1.5 bg-[#03DAC6]/10 border-[#03DAC6]/20 text-[#03DAC6] hover:bg-[#03DAC6]/20 shrink-0" onClick={() => {
                  const url = `${window.location.origin}/?trial=true`;
                  navigator.clipboard.writeText(url).then(() => toast.success('Trial link copied!')).catch(() => toast.info(`Link: ${url}`));
                }}>
                  <Copy className="h-3 w-3" /> Copy
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </GlassCard>

    </motion.div>
  );

  /* ═══════════════════════════════════════════════════════════════
     TAB 4: LANDING PAGE
     ═══════════════════════════════════════════════════════════════ */
  const TabLanding = () => (
    <motion.div key="landing" variants={contentVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
      <GlassCard>
        <SectionHeader icon={Layout} title="Landing Page Sections" color="#03DAC6" badge="Visibility" />
        <CardContent className="pt-0 space-y-3">
          <p className="text-[10px] text-white/25 mb-1">Toggle sections on/off. Changes are saved automatically.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'showStory' as const, label: 'Story Section', desc: 'Brand narrative section', color: '#BB86FC', icon: Heart },
              { key: 'showFeatures' as const, label: 'Features Section', desc: 'Feature highlights grid', color: '#03DAC6', icon: Sparkles },
              { key: 'showTestimonials' as const, label: 'Testimonials', desc: 'User reviews/testimonials', color: '#FFD700', icon: User },
              { key: 'showPricing' as const, label: 'Pricing Section', desc: 'Plan pricing cards', color: '#03DAC6', icon: Crown },
              { key: 'showFaq' as const, label: 'FAQ Section', desc: 'Frequently asked questions', color: '#BB86FC', icon: Info },
              { key: 'showStats' as const, label: 'Statistics', desc: 'Animated stat counters', color: '#CF6679', icon: BarChart3 },
            ].map((item) => (
              <ToggleRow
                key={item.key}
                icon={item.icon}
                label={item.label}
                description={item.desc}
                checked={landingPageConfig[item.key]}
                onCheckedChange={(val) => handleToggleWithAutoSave((v) => setLandingPageConfig((prev) => ({ ...prev, [item.key]: v })), val)}
                color={item.color}
              />
            ))}
          </div>
        </CardContent>
      </GlassCard>

      <GlassCard>
        <SectionHeader icon={Settings} title="Content & Text" color="#BB86FC" />
        <CardContent className="pt-0 space-y-4">
          <div className="space-y-2">
            <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Hero Subtitle</Label>
            <textarea
              value={landingPageConfig.heroSubtitle}
              onChange={(e) => setLandingPageConfig((prev) => ({ ...prev, heroSubtitle: e.target.value }))}
              rows={2} className={textareaCls}
              placeholder="Custom subtitle text below the hero title"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Custom Footer Text</Label>
            <textarea
              value={landingPageConfig.customFooterText}
              onChange={(e) => setLandingPageConfig((prev) => ({ ...prev, customFooterText: e.target.value }))}
              rows={2} className={textareaCls}
              placeholder="Custom text displayed in the footer area"
            />
          </div>
          <Button
            variant="outline"
            className="adm-action-btn h-9 text-[11px] font-semibold rounded-lg bg-white/[0.03] border-white/[0.08] text-white/50 hover:text-white/70 hover:bg-white/[0.06]"
            onClick={() => {
              const url = typeof window !== 'undefined' ? `${window.location.origin}/` : '/';
              window.open(url, '_blank');
            }}
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Preview Landing Page
          </Button>
        </CardContent>
      </GlassCard>

      {/* Stats Editor */}
      <GlassCard>
        <SectionHeader icon={BarChart3} title="Statistics Section" color="#CF6679" badge="Stats Config" />
        <CardContent className="pt-0 space-y-4">
          <p className="text-[10px] text-white/25">Configure stat items displayed in the landing page statistics section.</p>
          <div className="space-y-3">
            {landingStats.map((stat, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors">
                <div className="flex flex-col items-center gap-1 pt-1">
                  <button
                    type="button"
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.04] hover:bg-[#CF6679]/10 text-white/30 hover:text-[#CF6679] transition-colors"
                    onClick={() => { if (landingStats.length > 1) setLandingStats(prev => prev.filter((_, i) => i !== idx)); }}
                    disabled={landingStats.length <= 1}
                    aria-label="Remove stat"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <span className="text-[9px] text-white/20">{idx + 1}</span>
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Value</Label>
                    <Input value={stat.value} onChange={(e) => { const u = [...landingStats]; u[idx] = { ...u[idx], value: e.target.value }; setLandingStats(u); }} className={inputCls} placeholder="73%" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Label</Label>
                    <Input value={stat.label} onChange={(e) => { const u = [...landingStats]; u[idx] = { ...u[idx], label: e.target.value }; setLandingStats(u); }} className={inputCls} placeholder="Accuracy Rate" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button" variant="outline"
            className="h-9 text-[11px] font-medium rounded-lg border-dashed border-white/[0.1] text-white/40 hover:text-white/70 hover:border-white/[0.2] hover:bg-white/[0.02]"
            onClick={() => setLandingStats(prev => [...prev, { value: '', label: '' }])}
          >
            <ChevronRight className="h-3 w-3 mr-1" />Add Stat Item
          </Button>
        </CardContent>
      </GlassCard>

    </motion.div>
  );

  /* ═══════════════════════════════════════════════════════════════
     TAB 5: DASHBOARD
     ═══════════════════════════════════════════════════════════════ */
  const dashboardSections = [
    { key: 'budget', label: 'Budget Tracker' },
    { key: 'healthScore', label: 'Financial Health Score' },
    { key: 'tips', label: 'Financial Tips' },
    { key: 'spendingTrend', label: 'Spending Trend' },
    { key: 'topCategories', label: 'Top Categories' },
    { key: 'monthlySummary', label: 'Monthly Summary' },
    { key: 'savingsOverview', label: 'Savings Overview' },
    { key: 'quickTransaction', label: 'Quick Transaction' },
  ];

  const TabDashboard = () => (
    <motion.div key="dashboard" variants={contentVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
      <GlassCard>
        <SectionHeader icon={BarChart3} title="Dashboard Section Visibility & Export" color="#BB86FC" badge="Per Plan" />
        <CardContent className="pt-0 space-y-5">
          <p className="text-[10px] text-white/25">Control which dashboard sections and export features are visible per plan. Toggle changes are saved automatically.</p>
          {['basic', 'pro', 'ultimate'].map((plan) => {
            const planVis = sectionVisibility[plan] || {};
            const planExp = exportEnabled[plan] || {};
            const planColor = plan === 'ultimate' ? '#03DAC6' : plan === 'pro' ? '#FFD700' : '#BB86FC';
            const PlanIcon = plan === 'ultimate' ? Sparkles : plan === 'pro' ? Crown : Sparkles;
            return (
              <div key={plan} className="p-4 rounded-2xl bg-white/[0.015] border border-white/[0.04] space-y-4 hover:border-white/[0.08] transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${planColor}10` }}>
                    <PlanIcon className="h-4 w-4" style={{ color: planColor }} />
                  </div>
                  <p className="text-[12px] font-bold text-white/70 uppercase tracking-wider">{plan} Plan</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {dashboardSections.map((section) => (
                    <ToggleRow
                      key={section.key}
                      icon={BarChart3}
                      label={section.label}
                      description=""
                      checked={planVis[section.key] ?? true}
                      onCheckedChange={(val) => handleToggleWithAutoSave((v: boolean) => setSectionVisibility(prev => ({ ...prev, [plan]: { ...prev[plan], [section.key]: v } })), val)}
                      color={planColor}
                    />
                  ))}
                </div>
                {/* Export Features */}
                <div className="pt-3 border-t border-white/[0.04]">
                  <p className="text-[10px] font-bold text-white/30 mb-2 uppercase tracking-wider">Export Features</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <ToggleRow
                      icon={Mail} label="Export PDF" description=""
                      checked={planExp.pdf ?? false}
                      onCheckedChange={(val) => handleToggleWithAutoSave((v: boolean) => setExportEnabled(prev => ({ ...prev, [plan]: { ...prev[plan], pdf: v } })), val)}
                      color="#CF6679"
                    />
                    <ToggleRow
                      icon={Layout} label="Export Excel" description=""
                      checked={planExp.excel ?? false}
                      onCheckedChange={(val) => handleToggleWithAutoSave((v: boolean) => setExportEnabled(prev => ({ ...prev, [plan]: { ...prev[plan], excel: v } })), val)}
                      color="#03DAC6"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </GlassCard>

      {/* Available Plans (from Platform tab - also here for convenience) */}
      <GlassCard>
        <SectionHeader icon={Crown} title="Available Plans Toggle" color="#FFD700" />
        <CardContent className="pt-0">
          <p className="text-[10px] text-white/25 mb-3">Toggle changes are saved automatically.</p>
          <div className="flex items-center gap-3 flex-wrap">
            {['basic', 'pro', 'ultimate'].map((plan) => {
              const isActive = availablePlans.includes(plan);
              const color = plan === 'ultimate' ? '#03DAC6' : plan === 'pro' ? '#FFD700' : '#BB86FC';
              return (
                <button
                  key={plan}
                  onClick={() => {
                    if (isActive && availablePlans.length > 1) setAvailablePlans(availablePlans.filter(p => p !== plan));
                    else if (!isActive) setAvailablePlans([...availablePlans, plan]);
                  }}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 text-left',
                    isActive ? 'border-white/[0.15]' : 'bg-white/[0.015] border-white/[0.06] hover:border-white/[0.12] opacity-40',
                  )}
                  style={isActive ? { backgroundColor: `${color}08`, borderColor: `${color}25` } : undefined}
                >
                  {plan === 'basic' ? <Sparkles className="h-4 w-4" style={{ color: isActive ? '#BB86FC' : 'rgba(255,255,255,0.3)' }} /> : <Crown className="h-4 w-4" style={{ color: isActive ? color : 'rgba(255,255,255,0.3)' }} />}
                  <p className={cn('text-[12px] font-semibold transition-colors capitalize', isActive ? 'text-white/80' : 'text-white/40')}>{plan} Plan</p>
                  {isActive && <Check className="h-3.5 w-3.5 ml-1" style={{ color }} />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </GlassCard>

    </motion.div>
  );

  /* ═══════════════════════════════════════════════════════════════
     TAB 6: SISTEM
     ═══════════════════════════════════════════════════════════════ */
  const TabSistem = () => (
    <motion.div key="sistem" variants={contentVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
      {/* System Health */}
      <GlassCard>
        <SectionHeader icon={Heart} title="System Information" color="#03DAC6" />
        <CardContent className="pt-0">
          {loadingHealth ? (
            <div className="space-y-3">{[1, 2, 3, 4].map((i) => (<div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse" />))}</div>
          ) : systemHealth ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { icon: Heart, label: 'Status', value: systemHealth.status, color: '#03DAC6' },
                { icon: Info, label: 'Version', value: `v${systemHealth.version}`, color: '#BB86FC' },
                { icon: Globe, label: 'Database Size', value: systemHealth.database.size, color: '#FFD700' },
                { icon: Monitor, label: 'Uptime', value: formatUptime(systemHealth.uptime), color: '#03DAC6' },
                { icon: Globe, label: 'DB Tables', value: `${systemHealth.database.tables} tables`, color: '#BB86FC' },
                { icon: Monitor, label: 'Memory', value: `${systemHealth.memory.used} / ${systemHealth.memory.total}`, color: '#FFD700' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${item.color}10` }}>
                    <item.icon className="h-4 w-4" style={{ color: item.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">{item.label}</p>
                    <p className="text-sm font-semibold text-white/70 capitalize truncate">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-white/30 text-[12px] py-6">Unable to load system information</p>
          )}
        </CardContent>
      </GlassCard>

      {/* Sync Plan Limits */}
      <GlassCard>
        <SectionHeader icon={RefreshCw} title="Plan Limits Sync" color="#03DAC6" badge="Maintenance" />
        <CardContent className="pt-0">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#03DAC6]/10 flex items-center justify-center shrink-0"><RefreshCw className="h-4 w-4 text-[#03DAC6]" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-white/70">Sync Plan Limits</p>
                <p className="text-[10px] text-white/30 mt-0.5">Re-sync plan limits and configuration to ensure consistency across all users</p>
              </div>
              <Button
                onClick={handleSyncPlanLimits}
                disabled={isSaving}
                className="adm-action-btn shrink-0 h-9 px-4 text-[11px] font-semibold rounded-lg bg-[#03DAC6]/15 text-[#03DAC6] hover:bg-[#03DAC6]/25 border border-[#03DAC6]/20 transition-all disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                Sync Now
              </Button>
            </div>
          </div>
        </CardContent>
      </GlassCard>

      {/* Danger Zone */}
      <GlassCard className="border-[#CF6679]/15 hover:border-[#CF6679]/25">
        <SectionHeader icon={AlertTriangle} title="Danger Zone" color="#CF6679" badge="Irreversible" />
        <CardContent className="pt-0 space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#CF6679]/[0.03] border border-[#CF6679]/10 hover:bg-[#CF6679]/[0.06] transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[#CF6679]/10 flex items-center justify-center shrink-0"><Trash2 className="h-4 w-4 text-[#CF6679]" /></div>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-white/70">Clear All Activity Logs</p>
                <p className="text-[10px] text-white/30 mt-0.5">Permanently delete all admin activity audit trail entries</p>
              </div>
            </div>
            <Button variant="ghost" onClick={() => setShowClearLogsDialog(true)} className="adm-action-btn shrink-0 h-8 px-3 text-[11px] font-semibold rounded-lg text-[#CF6679] hover:text-[#CF6679] hover:bg-[#CF6679]/10 border border-[#CF6679]/15 transition-all">
              Clear Logs <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#CF6679]/[0.03] border border-[#CF6679]/10 hover:bg-[#CF6679]/[0.06] transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[#CF6679]/10 flex items-center justify-center shrink-0"><RotateCcw className="h-4 w-4 text-[#CF6679]" /></div>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-white/70">Reset Demo Data</p>
                <p className="text-[10px] text-white/30 mt-0.5">Reset platform to default state with sample data</p>
              </div>
            </div>
            <Button variant="ghost" onClick={() => setShowResetDialog(true)} className="adm-action-btn shrink-0 h-8 px-3 text-[11px] font-semibold rounded-lg text-[#CF6679] hover:text-[#CF6679] hover:bg-[#CF6679]/10 border border-[#CF6679]/15 transition-all">
              Reset <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </GlassCard>

    </motion.div>
  );

  /* ── Tab content map ── */
  const tabContent: Record<TabId, () => React.JSX.Element> = {
    umum: TabUmum,
    platform: TabPlatform,
    pricing: TabPricing,
    landing: TabLanding,
    dashboard: TabDashboard,
    sistem: TabSistem,
  };

  const activeTabData = TABS.find(t => t.id === activeTab)!;

  return (
    <div className="relative flex flex-col min-h-0">
      {/* Ambient glow */}
      <div className="adm-ambient-glow adm-ambient-glow-purple pointer-events-none" />
      <div className="adm-ambient-glow adm-ambient-glow-teal pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#03DAC6]/15 to-[#BB86FC]/15 flex items-center justify-center border border-white/[0.06]">
              <Settings className="h-4 w-4 text-[#03DAC6]" />
            </div>
            <h2 className="text-xl font-bold text-white/90 tracking-tight">Settings</h2>
          </div>
          <p className="text-sm text-white/40 ml-[46px]">Manage admin profile and platform configuration</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="adm-tab-bar adm-scroll-mobile relative flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-6 overflow-x-auto">
        <motion.div
          layout
          transition={{ type: 'spring' as const, stiffness: 350, damping: 30 }}
          className="absolute top-1 bottom-1 rounded-lg z-0"
          style={{
            width: `calc((100% - 4px) / ${TABS.length})`,
            left: `calc(${TABS.findIndex(t => t.id === activeTab)} * ((100% - 4px) / ${TABS.length}) + 2px)`,
            backgroundColor: `${activeTabData.color}12`,
            border: `1px solid ${activeTabData.color}25`,
          }}
        />
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative z-10 flex items-center justify-center gap-2 flex-1 px-3 py-2.5 rounded-lg text-[12px] font-semibold transition-all duration-200 min-w-0 adm-tab-item',
                isActive ? 'text-white adm-tab-item-active' : 'text-white/40 hover:text-white/60',
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0')} style={{ color: isActive ? tab.color : undefined }} />
              <span className="hidden sm:inline truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="adm-scroll-mobile flex-1 min-h-0 overflow-y-auto pb-4">
        <AnimatePresence mode="wait">
          {tabContent[activeTab]()}
        </AnimatePresence>
      </div>

      {/* Auto-save Status Indicator */}
      <div className="flex items-center justify-center py-3 mt-auto">
        <AnimatePresence mode="wait">
          {isSaving && (
            <motion.div
              key="saving"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#03DAC6]/[0.06] border border-[#03DAC6]/15"
            >
              <Loader2 className="h-3 w-3 animate-spin text-[#03DAC6]" />
              <span className="text-[11px] font-medium text-[#03DAC6]/70">Menyimpan...</span>
            </motion.div>
          )}
          {isSuccess && !isSaving && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/15"
            >
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-[11px] font-medium text-emerald-400/80">Tersimpan otomatis</span>
            </motion.div>
          )}
          {saveStatus === 'error' && !isSaving && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/[0.08] border border-red-500/15"
            >
              <AlertTriangle className="h-3 w-3 text-red-400" />
              <span className="text-[11px] font-medium text-red-400/80">Gagal menyimpan</span>
              <button onClick={handleSave} className="ml-1 text-[10px] font-semibold text-red-400 underline hover:text-red-300">Coba lagi</button>
            </motion.div>
          )}
          {isIdle && !hasChanges && !isSaving && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-[10px] text-white/15"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-50" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500/50" />
              </span>
              Auto-save aktif
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Clear Logs Dialog */}
      <Dialog open={showClearLogsDialog} onOpenChange={setShowClearLogsDialog}>
        <DialogContent className="adm-dialog-content bg-[#0D0D0D] border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white/90 flex items-center gap-2"><Trash2 className="h-4 w-4 text-[#CF6679]" />Clear Activity Logs</DialogTitle>
            <DialogDescription className="text-white/40">This action will permanently delete all admin activity log entries. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="py-4 px-3 rounded-xl bg-[#CF6679]/[0.04] border border-[#CF6679]/10">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-[#CF6679] mt-0.5 shrink-0" />
              <p className="text-[12px] text-[#CF6679]/70">All activity history including user actions, invite creation, and subscription changes will be lost.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowClearLogsDialog(false)} className="text-white/50 hover:text-white/70 hover:bg-white/[0.04]">Cancel</Button>
            <Button onClick={handleClearLogs} className="bg-[#CF6679] text-white hover:bg-[#CF6679]/90 h-9"><Trash2 className="h-3.5 w-3.5 mr-1.5" />Clear All Logs</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="adm-dialog-content bg-[#0D0D0D] border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white/90 flex items-center gap-2"><RotateCcw className="h-4 w-4 text-[#CF6679]" />Reset Demo Data</DialogTitle>
            <DialogDescription className="text-white/40">This will reset the platform to its default state and create fresh demo data.</DialogDescription>
          </DialogHeader>
          <div className="py-4 px-3 rounded-xl bg-[#CF6679]/[0.04] border border-[#CF6679]/10">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-[#CF6679] mt-0.5 shrink-0" />
              <p className="text-[12px] text-[#CF6679]/70">All current data including users, transactions, and settings will be replaced with demo data. This cannot be undone.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowResetDialog(false)} className="text-white/50 hover:text-white/70 hover:bg-white/[0.04]">Cancel</Button>
            <Button onClick={handleResetDemoData} className="bg-[#CF6679] text-white hover:bg-[#CF6679]/90 h-9"><RotateCcw className="h-3.5 w-3.5 mr-1.5" />Reset to Demo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Change Password Dialog */}
      <Dialog open={showEmailPasswordDialog} onOpenChange={(open) => { if (!open) { setShowEmailPasswordDialog(false); setEmailConfirmPassword(''); } }}>
        <DialogContent className="adm-dialog-content bg-[#0D0D0D] border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white/90 flex items-center gap-2"><Lock className="h-4 w-4 text-[#FFD700]" />Confirm Password to Change Email</DialogTitle>
            <DialogDescription className="text-white/40">Changing your email address requires password verification for security.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 rounded-xl bg-[#FFD700]/[0.04] border border-[#FFD700]/10">
              <p className="text-[11px] text-[#FFD700]/70">Your email will be changed to: <span className="font-semibold">{profileEmail}</span></p>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Current Password</Label>
              <Input type="password" value={emailConfirmPassword} onChange={(e) => setEmailConfirmPassword(e.target.value)} className={inputCls} placeholder="Enter your current password" onKeyDown={(e) => { if (e.key === 'Enter' && emailConfirmPassword) handleSaveProfile(emailConfirmPassword); }} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => { setShowEmailPasswordDialog(false); setEmailConfirmPassword(''); }} className="text-white/50 hover:text-white/70 hover:bg-white/[0.04]">Cancel</Button>
            <Button onClick={() => handleSaveProfile(emailConfirmPassword)} disabled={!emailConfirmPassword || profileSaving} className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90 h-9 font-semibold disabled:opacity-50">
              {profileSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
              Confirm Email Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
