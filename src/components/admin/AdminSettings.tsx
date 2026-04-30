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
  Moon,
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';

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

  // Handle toggle click with animation
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
      style={{
        backgroundColor: checked ? activeColor : 'rgba(255,255,255,0.1)',
      }}
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

/* ── Framer-motion variants ── */
const contentVariants = {
  enter: { opacity: 0, y: 12, transition: { duration: 0.25, ease: 'easeOut' as const } },
  center: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: 'easeIn' as const } },
};

export function AdminSettings() {
  const { t } = useTranslation();
  /* ── All state variables (unchanged) ── */
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

  /* ── Tab state ── */
  const [activeTab, setActiveTab] = useState<TabId>('umum');

  /* ── Save status: idle | saving | success | error ── */
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  /* ── Ref to store original values for dirty tracking ── */
  const originalValuesRef = useRef<string>('');
  const [hasChanges, setHasChanges] = useState(false);

  /* ── Serialize current values for comparison ── */
  const currentValues = useMemo(() => {
    return JSON.stringify({
      defaultPlan,
      defaultCategoryLimit,
      defaultSavingsLimit,
      autoSuspend,
      basicPlanPrice,
      proPlanPrice,
      ultimatePlanPrice,
      basicPlanFeatures,
      proPlanFeatures,
      ultimatePlanFeatures,
      trialEnabled,
      trialDurationDays,
      trialPlan,
      whatsappNumber,
      registrationOpen,
      registrationMessage,
      availablePlans,
      basicPlanDiscount,
      proPlanDiscount,
      basicPlanDiscountLabel,
      proPlanDiscountLabel,
      ultimatePlanDiscount,
      ultimatePlanDiscountLabel,
      basicPurchaseUrl,
      proPurchaseUrl,
      ultimatePurchaseUrl,
      emailNotifNewUser,
      emailNotifExpiry,
      emailNotifInviteUsage,
      emailNotifDailySummary,
      landingPageConfig,
      landingStats,
      sectionVisibility,
      exportEnabled,
    });
  }, [
    defaultPlan, defaultCategoryLimit, defaultSavingsLimit, autoSuspend,
    emailNotifNewUser, emailNotifExpiry, emailNotifInviteUsage, emailNotifDailySummary,
    basicPlanPrice, proPlanPrice, ultimatePlanPrice,
    basicPlanFeatures, proPlanFeatures, ultimatePlanFeatures,
    trialEnabled, trialDurationDays, trialPlan,
    whatsappNumber, registrationOpen, registrationMessage,
    availablePlans, basicPlanDiscount, proPlanDiscount,
    basicPlanDiscountLabel, proPlanDiscountLabel,
    ultimatePlanDiscount, ultimatePlanDiscountLabel,
    basicPurchaseUrl, proPurchaseUrl, ultimatePurchaseUrl,
    emailNotifNewUser, emailNotifExpiry, emailNotifInviteUsage, emailNotifDailySummary,
    landingPageConfig, landingStats, sectionVisibility, exportEnabled,
  ]);

  /* ── Track dirty state via effect (ref access is safe in effects) ── */
  useEffect(() => {
    if (configLoaded && originalValuesRef.current === '') {
      originalValuesRef.current = currentValues;
    }
    if (originalValuesRef.current !== '') {
      setHasChanges(currentValues !== originalValuesRef.current);
    }
  }, [configLoaded, currentValues]);

  /* ── Fetch system health ── */
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/admin/system-health');
        if (res.ok) {
          const data = await res.json();
          setSystemHealth(data);
        }
      } catch {}
      setLoadingHealth(false);
    };
    fetchHealth();
  }, []);

  /* ── Fetch platform config on mount ── */
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
            // Parse JSON features to newline-separated text
            try {
              const basicFeats = data.config.basicPlanFeatures ? JSON.parse(data.config.basicPlanFeatures) : [];
              setBasicPlanFeatures(Array.isArray(basicFeats) ? basicFeats.join('\n') : '');
            } catch { setBasicPlanFeatures(''); }
            try {
              const proFeats = data.config.proPlanFeatures ? JSON.parse(data.config.proPlanFeatures) : [];
              setProPlanFeatures(Array.isArray(proFeats) ? proFeats.join('\n') : '');
            } catch { setProPlanFeatures(''); }
            try {
              const ultimateFeats = data.config.ultimatePlanFeatures ? JSON.parse(data.config.ultimatePlanFeatures) : [];
              setUltimatePlanFeatures(Array.isArray(ultimateFeats) ? ultimateFeats.join('\n') : '');
            } catch { setUltimatePlanFeatures(''); }
            setTrialEnabled(data.config.trialEnabled ?? true);
            setTrialDurationDays(String(data.config.trialDurationDays ?? 30));
            setTrialPlan(data.config.trialPlan || 'basic');
            setWhatsappNumber(data.config.whatsappNumber || '');
            setRegistrationOpen(data.config.registrationOpen ?? true);
            setRegistrationMessage(data.config.registrationMessage || '');
            try {
              const parsed = data.config.availablePlans ? JSON.parse(data.config.availablePlans) : ['basic', 'pro', 'ultimate'];
              setAvailablePlans(Array.isArray(parsed) ? parsed : ['basic', 'pro', 'ultimate']);
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
            const defaultSectionVisibility = {
              basic: { budget: true, healthScore: true, tips: true, spendingTrend: true, topCategories: true, monthlySummary: true, savingsOverview: true, quickTransaction: false, exportPdf: false, exportExcel: false },
              pro: { budget: true, healthScore: true, tips: true, spendingTrend: true, topCategories: true, monthlySummary: true, savingsOverview: true, quickTransaction: true, exportPdf: true, exportExcel: true },
              ultimate: { budget: true, healthScore: true, tips: true, spendingTrend: true, topCategories: true, monthlySummary: true, savingsOverview: true, quickTransaction: true, exportPdf: true, exportExcel: true },
            };
            try {
              const sv = data.config.sectionVisibility ? JSON.parse(data.config.sectionVisibility) : null;
              const merged = sv && typeof sv === 'object' ? { ...defaultSectionVisibility, ...sv, ultimate: sv.ultimate || defaultSectionVisibility.ultimate } : defaultSectionVisibility;
              setSectionVisibility(merged);
            } catch {
              setSectionVisibility(defaultSectionVisibility);
            }
            const defaultExportEnabled = {
              basic: { pdf: false, excel: false },
              pro: { pdf: true, excel: true },
              ultimate: { pdf: true, excel: true },
            };
            try {
              const ee = data.config.exportEnabled ? JSON.parse(data.config.exportEnabled) : null;
              const mergedEe = ee && typeof ee === 'object' ? { ...defaultExportEnabled, ...ee, ultimate: ee.ultimate || defaultExportEnabled.ultimate } : defaultExportEnabled;
              setExportEnabled(mergedEe);
            } catch {
              setExportEnabled(defaultExportEnabled);
            }
            // Parse landingPageStats
            let parsedLandingStats = [
              { value: '73%', label: 'Accuracy Rate' },
              { value: '2x', label: 'Faster Tracking' },
              { value: '30%', label: 'Time Saved' },
            ];
            try {
              if (data.config.landingPageStats) {
                parsedLandingStats = JSON.parse(data.config.landingPageStats);
              }
            } catch {}
            setLandingStats(parsedLandingStats);
            // Parse landingPageConfig
            const defaultLandingPageConfig = {
              showStory: true,
              showFeatures: true,
              showTestimonials: true,
              showPricing: true,
              showFaq: true,
              showStats: true,
              heroSubtitle: '',
              customFooterText: '',
            };
            try {
              const lpc = data.config.landingPageConfig ? JSON.parse(data.config.landingPageConfig) : null;
              if (lpc && typeof lpc === 'object') {
                setLandingPageConfig({ ...defaultLandingPageConfig, ...lpc });
              }
            } catch {
              // keep defaults
            }
            // Parse email notifications
            try {
              const en = data.config.emailNotifications ? JSON.parse(data.config.emailNotifications) : null;
              if (en && typeof en === 'object') {
                setEmailNotifNewUser(en.newUser ?? true);
                setEmailNotifExpiry(en.expiry ?? true);
                setEmailNotifInviteUsage(en.inviteUsage ?? false);
                setEmailNotifDailySummary(en.dailySummary ?? false);
              }
            } catch {
              // keep defaults
            }
            setConfigLoaded(true);
          }
        }
      } catch {
        setConfigLoaded(true);
      }
    };
    fetchConfig();
  }, []);



  /* ── Manual save function ── */
  const handleSave = useCallback(async () => {
    if (!hasChanges) return;
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/admin/platform-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultPlan,
          defaultMaxCategories: parseInt(defaultCategoryLimit, 10) || 10,
          defaultMaxSavings: parseInt(defaultSavingsLimit, 10) || 3,
          autoSuspendExpired: autoSuspend,
          basicPlanPrice,
          proPlanPrice,
          basicPlanFeatures: JSON.stringify(basicPlanFeatures.split('\n').map(f => f.trim()).filter(Boolean)),
          proPlanFeatures: JSON.stringify(proPlanFeatures.split('\n').map(f => f.trim()).filter(Boolean)),
          trialEnabled,
          trialDurationDays: parseInt(trialDurationDays, 10) || 30,
          trialPlan,
          whatsappNumber,
          registrationOpen,
          registrationMessage,
          availablePlans: JSON.stringify(availablePlans),
          basicPlanDiscount,
          proPlanDiscount,
          basicPlanDiscountLabel,
          proPlanDiscountLabel,
          ultimatePlanPrice,
          ultimatePlanFeatures: JSON.stringify(ultimatePlanFeatures.split('\n').map(f => f.trim()).filter(Boolean)),
          ultimatePlanDiscount,
          ultimatePlanDiscountLabel,
          ultimatePurchaseUrl,
          basicPurchaseUrl,
          proPurchaseUrl,
          sectionVisibility: JSON.stringify(sectionVisibility),
          exportEnabled: JSON.stringify(exportEnabled),
          landingPageConfig: JSON.stringify(landingPageConfig),
          landingPageStats: JSON.stringify(landingStats),
          emailNotifications: JSON.stringify({ newUser: emailNotifNewUser, expiry: emailNotifExpiry, inviteUsage: emailNotifInviteUsage, dailySummary: emailNotifDailySummary }),
        }),
      });
      if (res.ok) {
        setSaveStatus('success');
        originalValuesRef.current = currentValues;
        toast.success('Pengaturan tersimpan', { duration: 2000 });
        setHasChanges(false);
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        toast.error('Gagal menyimpan pengaturan');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch {
      setSaveStatus('error');
      toast.error('Gagal menyimpan pengaturan');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [
    hasChanges, currentValues, defaultPlan, defaultCategoryLimit, defaultSavingsLimit, autoSuspend,
    basicPlanPrice, proPlanPrice, basicPlanFeatures, proPlanFeatures, trialEnabled,
    trialDurationDays, trialPlan, whatsappNumber, registrationOpen, registrationMessage,
    availablePlans, basicPlanDiscount, proPlanDiscount, basicPlanDiscountLabel, proPlanDiscountLabel,
    basicPurchaseUrl, proPurchaseUrl, ultimatePlanPrice, ultimatePlanFeatures,
    ultimatePlanDiscount, ultimatePlanDiscountLabel, ultimatePurchaseUrl,
    sectionVisibility, exportEnabled, landingPageConfig, landingStats,
    emailNotifNewUser, emailNotifExpiry, emailNotifInviteUsage, emailNotifDailySummary,
  ]);

  /* ── Fetch user profile on mount ── */
  useEffect(() => {
    const fetchProfile = async () => {
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
    };
    fetchProfile();
  }, []);

  const handleSaveProfile = async (password?: string) => {
    setProfileSaving(true);
    try {
      const body: Record<string, string> = { username: profileName };
      if (password) {
        body.currentPassword = password;
        body.email = profileEmail;
      }
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success('Profile updated', { description: 'Name and email saved successfully.' });
        setShowEmailPasswordDialog(false);
        setEmailConfirmPassword('');
      } else {
        const data = await res.json();
        toast.error('Failed to update profile', { description: data.error || 'Server error.' });
      }
    } catch {
      toast.error('Failed to update profile', { description: 'Network error.' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleProfileSaveClick = () => {
    // Check if email has changed from the initially fetched value
    const initiallyFetched = localStorage.getItem('wt-admin-original-email');
    if (profileEmail !== (initiallyFetched || 'admin@wealthtracker.com')) {
      setShowEmailPasswordDialog(true);
    } else {
      handleSaveProfile();
    }
  };

  const handleClearLogs = async () => {
    setShowClearLogsDialog(false);
    try {
      const res = await fetch('/api/admin/activity-log', { method: 'DELETE' });
      if (res.ok) {
        toast.success('Activity logs cleared', { description: 'All activity logs have been deleted.' });
      } else {
        toast.error('Failed to clear logs', { description: 'Server returned an error.' });
      }
    } catch {
      toast.error('Failed to clear logs', { description: 'Network error.' });
    }
  };

  const handleResetDemoData = async () => {
    setShowResetDialog(false);
    try {
      const res = await fetch('/api/admin/system-health', { method: 'DELETE' });
      if (res.ok) {
        toast.success('Demo data reset', { description: 'All demo data has been cleared.' });
        window.location.reload();
      } else {
        toast.error('Failed to reset data', { description: 'Server returned an error.' });
      }
    } catch {
      toast.error('Failed to reset data', { description: 'Network error.' });
    }
  };



  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  /* ──────────────────────────────────────────────────────────────
     SHARED JSX HELPERS
  ────────────────────────────────────────────────────────────── */

  /* Plan selector dropdown (used in Platform and Pricing tabs) */
  const PlanSelector = ({ value, onChange, label, className }: { value: string; onChange: (v: string) => void; label?: string; className?: string }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn('bg-white/[0.03] border-white/[0.08] text-white/80 h-10 text-sm focus:ring-[#03DAC6]/10 focus:border-[#03DAC6]/30', className)}>
        <SelectValue placeholder="Select plan" />
      </SelectTrigger>
      <SelectContent className="bg-[#0D0D0D] border-white/[0.08]">
        <SelectItem value="basic" className="text-white/70 focus:bg-white/[0.06] focus:text-white">
          <div className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-white/40" />Basic Plan</div>
        </SelectItem>
        <SelectItem value="pro" className="text-white/70 focus:bg-white/[0.06] focus:text-white">
          <div className="flex items-center gap-2"><Sun className="h-3 w-3 text-[#FFD700]" />Pro Plan</div>
        </SelectItem>
        <SelectItem value="ultimate" className="text-white/70 focus:bg-white/[0.06] focus:text-white">
          <div className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-[#03DAC6]" />Ultimate Plan</div>
        </SelectItem>
      </SelectContent>
    </Select>
  );

  const inputCls = 'adm-form-input bg-white/[0.03] border-white/[0.08] text-white/80 h-10 text-sm focus:border-[#03DAC6]/30 focus:ring-[#03DAC6]/10 placeholder:text-white/15';
  const textareaCls = 'w-full rounded-lg bg-white/[0.03] border border-white/[0.08] text-white/80 text-sm px-3 py-2 focus:border-[#03DAC6]/30 focus:ring-1 focus:ring-[#03DAC6]/10 focus:outline-none placeholder:text-white/15 resize-none';

  /* ──────────────────────────────────────────────────────────────
     TAB CONTENT COMPONENTS
  ────────────────────────────────────────────────────────────── */

  /* ── Tab 1: Umum ── */
  const TabUmum = () => (
    <motion.div key="umum" variants={contentVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
      {/* Profile Section */}
      <Card className="adm-content-card bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
        <CardHeader className="pb-4">
          <CardTitle className="adm-section-header text-sm font-semibold text-white/70 flex items-center gap-2">
            <User className="adm-section-header-icon h-4 w-4 text-[#03DAC6]" />
            Profile
            <Badge variant="outline" className="adm-badge text-[9px] font-semibold px-1.5 py-0 bg-white/[0.02] border-white/[0.06] text-white/30 ml-auto">
              Admin
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#03DAC6]/20 to-[#BB86FC]/20 flex items-center justify-center text-[#03DAC6] text-lg font-bold border border-white/[0.06] shrink-0">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-white/85">Admin</p>
              <p className="text-[12px] text-white/35 truncate">admin@wealthtracker.com</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="outline" className="adm-badge text-[8px] font-bold uppercase px-1.5 py-0 border-[#03DAC6]/20 text-[#03DAC6] bg-[#03DAC6]/5">
                  <Shield className="h-2 w-2 mr-0.5 inline" />Admin
                </Badge>
                <span className="text-[10px] text-white/20">Joined {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
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
          <Button onClick={handleProfileSaveClick} disabled={profileSaving} className="adm-action-btn h-9 px-4 text-[12px] font-semibold rounded-lg bg-[#03DAC6]/15 text-[#03DAC6] hover:bg-[#03DAC6]/25 border border-[#03DAC6]/20 transition-all disabled:opacity-50">
            {profileSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
            Save Profile
          </Button>
          <p className="text-[10px] text-white/20">Changing email requires password confirmation</p>
        </CardContent>
      </Card>

      {/* Appearance Section */}
      <Card className="adm-content-card bg-white/[0.02] border-white/[0.06]">
        <CardHeader className="pb-4">
          <CardTitle className="adm-section-header text-sm font-semibold text-white/70 flex items-center gap-2">
            <Palette className="adm-section-header-icon h-4 w-4 text-[#BB86FC]" />
            {t('admin.settings.appearance')}
          </CardTitle>
        </CardHeader>
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
      </Card>
    </motion.div>
  );

  /* ── Tab 2: Platform ── */
  const TabPlatform = () => (
    <motion.div key="platform" variants={contentVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
      {/* Platform Settings */}
      <Card className="adm-content-card bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
        <CardHeader className="pb-4">
          <CardTitle className="adm-section-header text-sm font-semibold text-white/70 flex items-center gap-2">
            <Globe className="adm-section-header-icon h-4 w-4 text-[#FFD700]" />
            Platform Settings
            <Badge variant="outline" className="adm-badge text-[9px] font-semibold px-1.5 py-0 bg-[#FFD700]/5 border-[#FFD700]/15 text-[#FFD700]/70 ml-auto">Configuration</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-5">
          {/* Default User Plan */}
          <div className="space-y-2">
            <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Default User Plan</Label>
            <PlanSelector value={defaultPlan} onChange={setDefaultPlan} className="w-full sm:w-64" />
            <p className="text-[10px] text-white/20">Plan assigned to new users who register without an invite</p>
          </div>
          {/* Default Limits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Default Category Limit</Label>
              <Select value={defaultCategoryLimit} onValueChange={setDefaultCategoryLimit}>
                <SelectTrigger className={cn('w-full', inputCls)}><SelectValue placeholder="Select limit" /></SelectTrigger>
                <SelectContent className="bg-[#0D0D0D] border-white/[0.08]">
                  {[5, 10, 15, 20, 25, 30].map((v) => (
                    <SelectItem key={v} value={String(v)} className="text-white/70 focus:bg-white/[0.06] focus:text-white">{v} categories</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Default Savings Limit</Label>
              <Select value={defaultSavingsLimit} onValueChange={setDefaultSavingsLimit}>
                <SelectTrigger className={cn('w-full', inputCls)}><SelectValue placeholder="Select limit" /></SelectTrigger>
                <SelectContent className="bg-[#0D0D0D] border-white/[0.08]">
                  {[1, 3, 5, 10, 15].map((v) => (
                    <SelectItem key={v} value={String(v)} className="text-white/70 focus:bg-white/[0.06] focus:text-white">{v} savings targets</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Auto Suspend Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#FFD700]/10 flex items-center justify-center"><AlertTriangle className="h-4 w-4 text-[#FFD700]" /></div>
              <div>
                <p className="text-[12px] font-semibold text-white/70">Auto-Suspend Expired Subscriptions</p>
                <p className="text-[10px] text-white/30 mt-0.5">Automatically downgrade users when their Pro subscription expires</p>
              </div>
            </div>
            <AnimatedSwitch checked={autoSuspend} onCheckedChange={setAutoSuspend} activeColor="#FFD700" />
          </div>
        </CardContent>
      </Card>

      {/* Registration & WhatsApp Configuration */}
      <Card className="adm-content-card bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
        <CardHeader className="pb-4">
          <CardTitle className="adm-section-header text-sm font-semibold text-white/70 flex items-center gap-2">
            <MessageCircle className="adm-section-header-icon h-4 w-4 text-[#25D366]" />
            Registration & WhatsApp
            <Badge variant="outline" className="adm-badge text-[9px] font-semibold px-1.5 py-0 bg-[#25D366]/5 border-[#25D366]/15 text-[#25D366]/70 ml-auto">Contact & Access</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-5">
          {/* Registration Open/Close */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#03DAC6]/10 flex items-center justify-center">
                  {registrationOpen ? <Unlock className="h-4 w-4 text-[#03DAC6]" /> : <Lock className="h-4 w-4 text-[#CF6679]" />}
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-white/70">Registration Open</p>
                  <p className="text-[10px] text-white/30 mt-0.5">
                    {registrationOpen ? 'New users can register through the sign-up form' : 'Registration is closed — new users cannot sign up'}
                  </p>
                </div>
              </div>
              <AnimatedSwitch checked={registrationOpen} onCheckedChange={setRegistrationOpen} activeColor={registrationOpen ? '#03DAC6' : '#CF6679'} />
            </div>
            {!registrationOpen && (
              <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Closed Registration Message</Label>
                <textarea value={registrationMessage} onChange={(e) => setRegistrationMessage(e.target.value)} rows={2} className={cn(textareaCls, 'focus:border-[#CF6679]/30 focus:ring-[#CF6679]/10')} placeholder="Registration is currently closed. Please contact the administrator." />
                <p className="text-[10px] text-white/20">Message shown to users when they try to register</p>
              </div>
            )}
          </div>
          {/* WhatsApp Number */}
          <div className="space-y-2">
            <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="h-3 w-3 text-[#25D366]/50" /> WhatsApp Number for Registration
            </Label>
            <Input value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} className={cn(inputCls, 'focus:border-[#25D366]/30 focus:ring-[#25D366]/10')} placeholder="6281234567890" />
            <p className="text-[10px] text-white/20">
              WhatsApp number shown on landing page for users who want to subscribe. Include country code without + (e.g., 6281234567890)
            </p>
            {whatsappNumber && (
              <div className="p-3 rounded-xl bg-[#25D366]/5 border border-[#25D366]/10 space-y-2">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" />
                  <p className="text-[11px] font-semibold text-white/70">Preview — WhatsApp Contact</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 rounded-lg bg-black/20 border border-white/[0.06] text-[11px] text-white/50 font-mono truncate">
                    {typeof window !== 'undefined' ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}` : `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`}
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
          {/* Available Plans Toggle */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-3">
            <div className="flex items-center gap-2">
              <Crown className="h-3.5 w-3.5 text-[#FFD700]/60" />
              <p className="text-[11px] font-semibold text-white/70">Available Plans on Landing Page</p>
            </div>
            <p className="text-[10px] text-white/25">Select which plans are displayed and available for subscription on the landing page</p>
            <div className="flex items-center gap-3 flex-wrap">
              {['basic', 'pro', 'ultimate'].map((plan) => {
                const isActive = availablePlans.includes(plan);
                return (
                  <button
                    key={plan}
                    onClick={() => {
                      if (isActive && availablePlans.length > 1) {
                        setAvailablePlans(availablePlans.filter(p => p !== plan));
                      } else if (!isActive) {
                        setAvailablePlans([...availablePlans, plan]);
                      }
                    }}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 text-left',
                      isActive ? 'bg-[#FFD700]/[0.06] border-[#FFD700]/25' : 'bg-white/[0.015] border-white/[0.06] hover:border-white/[0.12] opacity-40',
                    )}
                  >
                    {plan === 'basic' ? <Sparkles className={cn('h-4 w-4', isActive ? 'text-white/60' : 'text-white/30')} /> : <Crown className={cn('h-4 w-4', isActive ? 'text-[#FFD700]' : 'text-white/30')} />}
                    <div>
                      <p className={cn('text-[12px] font-semibold transition-colors capitalize', isActive ? 'text-white/80' : 'text-white/40')}>{plan} Plan</p>
                      <p className="text-[9px] text-white/20">{plan === 'basic' ? 'Free tier' : 'Premium tier'}</p>
                    </div>
                    {isActive && <Check className="h-3.5 w-3.5 text-[#FFD700] ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  /* ── Tab 3: Pricing ── */
  const TabPricing = () => (
    <motion.div key="pricing" variants={contentVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
      {/* Plan & Trial Configuration */}
      <Card className="adm-content-card bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
        <CardHeader className="pb-4">
          <CardTitle className="adm-section-header text-sm font-semibold text-white/70 flex items-center gap-2">
            <Crown className="adm-section-header-icon h-4 w-4 text-[#FFD700]" />
            Plan & Trial Configuration
            <Badge variant="outline" className="adm-badge text-[9px] font-semibold px-1.5 py-0 bg-[#FFD700]/5 border-[#FFD700]/15 text-[#FFD700]/70 ml-auto">Pricing & Trial</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-5">
          {/* Plan Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-white/30" /> Basic Plan Price</Label>
              <Input value={basicPlanPrice} onChange={(e) => setBasicPlanPrice(e.target.value)} className={inputCls} placeholder="Gratis" />
              <p className="text-[10px] text-white/20">Display price for basic plan on landing page</p>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider flex items-center gap-1.5"><Crown className="h-3 w-3 text-[#FFD700]/50" /> Pro Plan Price</Label>
              <Input value={proPlanPrice} onChange={(e) => setProPlanPrice(e.target.value)} className={inputCls} placeholder="Rp 99.000" />
              <p className="text-[10px] text-white/20">Display price for pro plan on landing page</p>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-[#03DAC6]/50" /> Ultimate Plan Price</Label>
              <Input value={ultimatePlanPrice} onChange={(e) => setUltimatePlanPrice(e.target.value)} className={inputCls} placeholder="Rp 199.000" />
              <p className="text-[10px] text-white/20">Display price for ultimate plan on landing page</p>
            </div>
          </div>
          {/* Plan Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Basic Plan Features</Label>
              <textarea value={basicPlanFeatures} onChange={(e) => setBasicPlanFeatures(e.target.value)} rows={5} className={textareaCls} placeholder="Track expenses\nCategory management\n3 savings targets" />
              <p className="text-[10px] text-white/20">One feature per line. Shown on landing page.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Pro Plan Features</Label>
              <textarea value={proPlanFeatures} onChange={(e) => setProPlanFeatures(e.target.value)} rows={5} className={textareaCls} placeholder="Everything in Basic\nUnlimited categories\n15 savings targets\nPriority support" />
              <p className="text-[10px] text-white/20">One feature per line. Shown on landing page.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Ultimate Plan Features</Label>
              <textarea value={ultimatePlanFeatures} onChange={(e) => setUltimatePlanFeatures(e.target.value)} rows={5} className={textareaCls} placeholder="Everything in Pro\nBusiness module\nInvestment module\nLive charts\nTrading journal" />
              <p className="text-[10px] text-white/20">One feature per line. Shown on landing page.</p>
            </div>
          </div>
          {/* Trial Settings */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#03DAC6]/10 flex items-center justify-center"><Gift className="h-4 w-4 text-[#03DAC6]" /></div>
                <div>
                  <p className="text-[12px] font-semibold text-white/70">Free Trial for New Users</p>
                  <p className="text-[10px] text-white/30 mt-0.5">Give new registrants a trial subscription without an invite</p>
                </div>
              </div>
              <AnimatedSwitch checked={trialEnabled} onCheckedChange={setTrialEnabled} activeColor="#03DAC6" />
            </div>
            {trialEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/[0.04]">
                <div className="space-y-2">
                  <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider flex items-center gap-1.5"><Timer className="h-3 w-3 text-[#BB86FC]/50" /> Trial Duration</Label>
                  <Select value={trialDurationDays} onValueChange={setTrialDurationDays}>
                    <SelectTrigger className={cn('w-full', inputCls)}><SelectValue placeholder="Select duration" /></SelectTrigger>
                    <SelectContent className="bg-[#0D0D0D] border-white/[0.08]">
                      {[7, 14, 30, 60, 90].map((d) => (
                        <SelectItem key={d} value={String(d)} className="text-white/70 focus:bg-white/[0.06] focus:text-white">{d} days</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-white/20">How long the trial lasts from registration</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Trial Plan</Label>
                  <PlanSelector value={trialPlan} onChange={setTrialPlan} />
                  <p className="text-[10px] text-white/20">Which plan the trial gives access to</p>
                </div>
              </div>
            )}
            {/* Free Trial Registration Link */}
            {trialEnabled && (
              <div className="p-3 rounded-xl bg-[#03DAC6]/5 border border-[#03DAC6]/10 space-y-2">
                <div className="flex items-center gap-2">
                  <Gift className="h-3.5 w-3.5 text-[#03DAC6]" />
                  <p className="text-[11px] font-semibold text-white/70">Free Trial Registration Link</p>
                </div>
                <p className="text-[10px] text-white/30">
                  Share this link to let users register with a {trialDurationDays}-day free {trialPlan} trial.
                  No invite code required — anyone who registers through the normal sign-up form will automatically receive the trial.
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 rounded-lg bg-black/20 border border-white/[0.06] text-[11px] text-white/50 font-mono truncate">
                    {typeof window !== 'undefined' ? `${window.location.origin}/?trial=true` : '/?trial=true'}
                  </div>
                  <Button variant="outline" size="sm" className="adm-action-btn h-8 text-[10px] gap-1.5 bg-[#03DAC6]/10 border-[#03DAC6]/20 text-[#03DAC6] hover:bg-[#03DAC6]/20 shrink-0" onClick={() => {
                    const url = `${window.location.origin}/?trial=true`;
                    navigator.clipboard.writeText(url).then(() => toast.success('Trial registration link copied!')).catch(() => toast.info(`Link: ${url}`));
                  }}>
                    <Copy className="h-3 w-3" /> Copy
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Discount & Purchase Link Configuration */}
      <Card className="adm-content-card bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
        <CardHeader className="pb-4">
          <CardTitle className="adm-section-header text-sm font-semibold text-white/70 flex items-center gap-2">
            <Crown className="adm-section-header-icon h-4 w-4 text-[#FFD700]" />
            Discount & Purchase Links
            <Badge variant="outline" className="adm-badge text-[9px] font-semibold px-1.5 py-0 bg-[#FFD700]/5 border-[#FFD700]/15 text-[#FFD700]/70 ml-auto">Pricing</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-5">
          {/* Discount Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-white/30" /> Basic Plan Discount</Label>
              <Input value={basicPlanDiscount} onChange={(e) => setBasicPlanDiscount(e.target.value)} className={inputCls} placeholder="20% or Rp 20.000" />
              <Input value={basicPlanDiscountLabel} onChange={(e) => setBasicPlanDiscountLabel(e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white/80 h-8 text-xs focus:border-[#03DAC6]/30 focus:ring-[#03DAC6]/10 placeholder:text-white/15" placeholder="Diskon Early Bird" />
              <p className="text-[10px] text-white/20">Discount amount + label for basic plan</p>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider flex items-center gap-1.5"><Crown className="h-3 w-3 text-[#FFD700]/50" /> Pro Plan Discount</Label>
              <Input value={proPlanDiscount} onChange={(e) => setProPlanDiscount(e.target.value)} className={inputCls} placeholder="30% or Rp 30.000" />
              <Input value={proPlanDiscountLabel} onChange={(e) => setProPlanDiscountLabel(e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white/80 h-8 text-xs focus:border-[#03DAC6]/30 focus:ring-[#03DAC6]/10 placeholder:text-white/15" placeholder="Diskon Launching" />
              <p className="text-[10px] text-white/20">Discount amount + label for pro plan</p>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-[#03DAC6]/50" /> Ultimate Plan Discount</Label>
              <Input value={ultimatePlanDiscount} onChange={(e) => setUltimatePlanDiscount(e.target.value)} className={inputCls} placeholder="40% or Rp 40.000" />
              <Input value={ultimatePlanDiscountLabel} onChange={(e) => setUltimatePlanDiscountLabel(e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white/80 h-8 text-xs focus:border-[#03DAC6]/30 focus:ring-[#03DAC6]/10 placeholder:text-white/15" placeholder="Diskon Premium" />
              <p className="text-[10px] text-white/20">Discount amount + label for ultimate plan</p>
            </div>
          </div>
          {/* External Purchase URLs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-white/30" /> Basic Plan Purchase URL</Label>
              <Input value={basicPurchaseUrl} onChange={(e) => setBasicPurchaseUrl(e.target.value)} className={inputCls} placeholder="https://example.com/basic" />
              <p className="text-[10px] text-white/20">External link for purchasing basic plan (shown on landing page)</p>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider flex items-center gap-1.5"><Crown className="h-3 w-3 text-[#FFD700]/50" /> Pro Plan Purchase URL</Label>
              <Input value={proPurchaseUrl} onChange={(e) => setProPurchaseUrl(e.target.value)} className={inputCls} placeholder="https://example.com/pro" />
              <p className="text-[10px] text-white/20">External link for purchasing pro plan (shown on landing page)</p>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-[#03DAC6]/50" /> Ultimate Plan Purchase URL</Label>
              <Input value={ultimatePurchaseUrl} onChange={(e) => setUltimatePurchaseUrl(e.target.value)} className={inputCls} placeholder="https://example.com/ultimate" />
              <p className="text-[10px] text-white/20">External link for purchasing ultimate plan (shown on landing page)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  /* ── Tab 4: Landing Page ── */
  const TabLanding = () => (
    <motion.div key="landing" variants={contentVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
      <Card className="adm-content-card bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
        <CardHeader className="pb-4">
          <CardTitle className="adm-section-header text-sm font-semibold text-white/70 flex items-center gap-2">
            <Layout className="adm-section-header-icon h-4 w-4 text-[#03DAC6]" />
            Landing Page
            <Badge variant="outline" className="adm-badge text-[9px] font-semibold px-1.5 py-0 bg-[#03DAC6]/5 border-[#03DAC6]/15 text-[#03DAC6]/70 ml-auto">Visibility</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-5">
          {/* Section Visibility Toggles */}
          <div className="space-y-2">
            <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Section Visibility</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'showStory' as const, label: 'Story Section', desc: 'Show the story/brand narrative section', color: '#BB86FC' },
                { key: 'showFeatures' as const, label: 'Features Section', desc: 'Show the feature highlights grid', color: '#03DAC6' },
                { key: 'showTestimonials' as const, label: 'Testimonials Section', desc: 'Show user reviews/testimonials', color: '#FFD700' },
                { key: 'showPricing' as const, label: 'Pricing Section', desc: 'Show plan pricing cards', color: '#03DAC6' },
                { key: 'showFaq' as const, label: 'FAQ Section', desc: 'Show frequently asked questions', color: '#BB86FC' },
                { key: 'showStats' as const, label: 'Statistics Section', desc: 'Show the animated statistics counters', color: '#CF6679' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div>
                    <p className="text-[12px] font-semibold text-white/70">{item.label}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">{item.desc}</p>
                  </div>
                  <AnimatedSwitch checked={landingPageConfig[item.key]} onCheckedChange={(val) => setLandingPageConfig((prev) => ({ ...prev, [item.key]: val }))} activeColor={item.color} />
                </div>
              ))}
            </div>
          </div>
          {/* Custom Text Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Hero Subtitle</Label>
              <Input value={landingPageConfig.heroSubtitle} onChange={(e) => setLandingPageConfig((prev) => ({ ...prev, heroSubtitle: e.target.value }))} className={inputCls} placeholder="Custom subtitle text below the hero title" />
              <p className="text-[10px] text-white/20">Custom subtitle text below the hero title</p>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Custom Footer Text</Label>
              <Input value={landingPageConfig.customFooterText} onChange={(e) => setLandingPageConfig((prev) => ({ ...prev, customFooterText: e.target.value }))} className={inputCls} placeholder="Custom text displayed in the footer area" />
              <p className="text-[10px] text-white/20">Custom text displayed in the footer area</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Landing Page Stats */}
      <Card className="adm-content-card bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
        <CardHeader className="pb-4">
          <CardTitle className="adm-section-header text-sm font-semibold text-white/70 flex items-center gap-2">
            <BarChart3 className="adm-section-header-icon h-4 w-4 text-[#CF6679]" />
            Statistics Section
            <Badge variant="outline" className="adm-badge text-[9px] font-semibold px-1.5 py-0 bg-[#CF6679]/5 border-[#CF6679]/15 text-[#CF6679]/70 ml-auto">Stats Config</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <p className="text-[10px] text-white/25">Configure the stat items displayed in the landing page statistics section.</p>
          <div className="space-y-3">
            {landingStats.map((stat, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex flex-col items-center gap-1 pt-1">
                  <button
                    type="button"
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] text-white/30 hover:text-white/60 transition-colors"
                    onClick={() => {
                      if (landingStats.length > 1) {
                        setLandingStats(prev => prev.filter((_, i) => i !== idx));
                      }
                    }}
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
                    <Input
                      value={stat.value}
                      onChange={(e) => {
                        const updated = [...landingStats];
                        updated[idx] = { ...updated[idx], value: e.target.value };
                        setLandingStats(updated);
                      }}
                      className={inputCls}
                      placeholder="e.g. 73%"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Label</Label>
                    <Input
                      value={stat.label}
                      onChange={(e) => {
                        const updated = [...landingStats];
                        updated[idx] = { ...updated[idx], label: e.target.value };
                        setLandingStats(updated);
                      }}
                      className={inputCls}
                      placeholder="e.g. Accuracy Rate"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-9 text-[11px] font-medium rounded-lg border-dashed border-white/[0.1] text-white/40 hover:text-white/70 hover:border-white/[0.2] hover:bg-white/[0.02]"
            onClick={() => {
              setLandingStats(prev => [...prev, { value: '', label: '' }]);
            }}
          >
            <ChevronRight className="h-3 w-3 mr-1" />
            Add Stat Item
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );

  /* ── Tab 5: Dashboard ── */
  const TabDashboard = () => (
    <motion.div key="dashboard" variants={contentVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
      <Card className="adm-content-card bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
        <CardHeader className="pb-4">
          <CardTitle className="adm-section-header text-sm font-semibold text-white/70 flex items-center gap-2">
            <BarChart3 className="adm-section-header-icon h-4 w-4 text-[#BB86FC]" />
            Dashboard Section Visibility & Export
            <Badge variant="outline" className="adm-badge text-[9px] font-semibold px-1.5 py-0 bg-[#BB86FC]/5 border-[#BB86FC]/15 text-[#BB86FC]/70 ml-auto">Per Plan</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-5">
          <p className="text-[10px] text-white/25">Control which dashboard sections and export features are visible to users based on their plan.</p>
          {['basic', 'pro', 'ultimate'].map((plan) => {
            const planVis = sectionVisibility[plan] || {};
            const planExp = exportEnabled[plan] || {};
            return (
              <div key={plan} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-4">
                <div className="flex items-center gap-2">
                  {plan === 'ultimate' ? <Sparkles className="h-3.5 w-3.5 text-[#03DAC6]/60" /> : plan === 'pro' ? <Crown className="h-3.5 w-3.5 text-[#FFD700]/60" /> : <Sparkles className="h-3.5 w-3.5 text-white/30" />}
                  <p className="text-[11px] font-semibold text-white/70 uppercase">{plan} Plan</p>
                </div>
                {/* Dashboard Sections */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { key: 'budget', label: 'Budget Tracker' },
                    { key: 'healthScore', label: 'Financial Health Score' },
                    { key: 'tips', label: 'Financial Tips' },
                    { key: 'spendingTrend', label: 'Spending Trend' },
                    { key: 'topCategories', label: 'Top Categories' },
                    { key: 'monthlySummary', label: 'Monthly Summary' },
                    { key: 'savingsOverview', label: 'Savings Overview' },
                    { key: 'quickTransaction', label: 'Quick Transaction' },
                  ].map((section) => (
                    <div key={section.key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.01] border border-white/[0.03]">
                      <span className="text-[11px] font-medium text-white/50">{section.label}</span>
                      <AnimatedSwitch checked={planVis[section.key] ?? true} onCheckedChange={(val) => setSectionVisibility(prev => ({ ...prev, [plan]: { ...prev[plan], [section.key]: val } }))} activeColor={plan === 'ultimate' ? '#03DAC6' : plan === 'pro' ? '#FFD700' : '#03DAC6'} />
                    </div>
                  ))}
                </div>
                {/* Export Features */}
                <div className="pt-2 border-t border-white/[0.04]">
                  <p className="text-[10px] font-medium text-white/30 mb-2 uppercase tracking-wider">Export Features</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-between flex-1 px-3 py-2 rounded-lg bg-white/[0.01] border border-white/[0.03]">
                      <span className="text-[11px] font-medium text-white/50">Export PDF</span>
                      <AnimatedSwitch checked={planExp.pdf ?? false} onCheckedChange={(val) => setExportEnabled(prev => ({ ...prev, [plan]: { ...prev[plan], pdf: val } }))} activeColor="#CF6679" />
                    </div>
                    <div className="flex items-center justify-between flex-1 px-3 py-2 rounded-lg bg-white/[0.01] border border-white/[0.03]">
                      <span className="text-[11px] font-medium text-white/50">Export Excel</span>
                      <AnimatedSwitch checked={planExp.excel ?? false} onCheckedChange={(val) => setExportEnabled(prev => ({ ...prev, [plan]: { ...prev[plan], excel: val } }))} activeColor="#03DAC6" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );

  /* ── Tab 6: Sistem ── */
  const TabSistem = () => (
    <motion.div key="sistem" variants={contentVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
      {/* System Information */}
      <Card className="adm-content-card bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
        <CardHeader className="pb-4">
          <CardTitle className="adm-section-header text-sm font-semibold text-white/70 flex items-center gap-2">
            <Heart className="adm-section-header-icon h-4 w-4 text-[#CF6679]" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loadingHealth ? (
            <div className="space-y-3">{[1, 2, 3, 4].map((i) => (<div key={i} className="h-12 rounded-xl bg-white/[0.03] animate-pulse" />))}</div>
          ) : systemHealth ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="w-9 h-9 rounded-lg bg-[#03DAC6]/10 flex items-center justify-center"><Heart className="h-4 w-4 text-[#03DAC6]" /></div>
                <div className="flex-1"><p className="text-[10px] text-white/30 uppercase tracking-wider">Status</p><p className="text-sm font-semibold text-[#03DAC6] capitalize">{systemHealth.status}</p></div>
              </div>
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="w-9 h-9 rounded-lg bg-[#BB86FC]/10 flex items-center justify-center"><Info className="h-4 w-4 text-[#BB86FC]" /></div>
                <div className="flex-1"><p className="text-[10px] text-white/30 uppercase tracking-wider">Version</p><p className="text-sm font-semibold text-white/70">v{systemHealth.version}</p></div>
              </div>
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="w-9 h-9 rounded-lg bg-[#FFD700]/10 flex items-center justify-center"><Globe className="h-4 w-4 text-[#FFD700]" /></div>
                <div className="flex-1"><p className="text-[10px] text-white/30 uppercase tracking-wider">Database Size</p><p className="text-sm font-semibold text-white/70">{systemHealth.database.size}</p></div>
              </div>
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="w-9 h-9 rounded-lg bg-[#03DAC6]/10 flex items-center justify-center"><Monitor className="h-4 w-4 text-[#03DAC6]" /></div>
                <div className="flex-1"><p className="text-[10px] text-white/30 uppercase tracking-wider">Uptime</p><p className="text-sm font-semibold text-white/70">{formatUptime(systemHealth.uptime)}</p></div>
              </div>
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="w-9 h-9 rounded-lg bg-[#BB86FC]/10 flex items-center justify-center"><Globe className="h-4 w-4 text-[#BB86FC]" /></div>
                <div className="flex-1"><p className="text-[10px] text-white/30 uppercase tracking-wider">DB Tables</p><p className="text-sm font-semibold text-white/70">{systemHealth.database.tables} tables</p></div>
              </div>
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="w-9 h-9 rounded-lg bg-[#FFD700]/10 flex items-center justify-center"><Monitor className="h-4 w-4 text-[#FFD700]" /></div>
                <div className="flex-1"><p className="text-[10px] text-white/30 uppercase tracking-wider">Memory</p><p className="text-sm font-semibold text-white/70">{systemHealth.memory.used} / {systemHealth.memory.total}</p></div>
              </div>
            </div>
          ) : (
            <p className="text-center text-white/30 text-[12px] py-6">Unable to load system information</p>
          )}
        </CardContent>
      </Card>

      {/* Email Notification Settings */}
      <Card className="adm-content-card bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
        <CardHeader className="pb-4">
          <CardTitle className="adm-section-header text-sm font-semibold text-white/70 flex items-center gap-2">
            <Mail className="adm-section-header-icon h-4 w-4 text-[#03DAC6]" />
            {t('admin.settings.emailNotifications')}
            <Badge variant="outline" className="adm-badge text-[9px] font-semibold px-1.5 py-0 bg-[#03DAC6]/5 border-[#03DAC6]/15 text-[#03DAC6]/70 ml-auto">Alerts</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[#03DAC6]/10 flex items-center justify-center shrink-0"><User className="h-4 w-4 text-[#03DAC6]" /></div>
              <div className="min-w-0"><p className="text-[12px] font-semibold text-white/70">New User Registration</p><p className="text-[10px] text-white/30 mt-0.5">Receive an email when a new user joins the platform</p></div>
            </div>
            <AnimatedSwitch checked={emailNotifNewUser} onCheckedChange={setEmailNotifNewUser} activeColor="#03DAC6" />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[#FFD700]/10 flex items-center justify-center shrink-0"><AlertTriangle className="h-4 w-4 text-[#FFD700]" /></div>
              <div className="min-w-0"><p className="text-[12px] font-semibold text-white/70">Subscription Expiry Warnings</p><p className="text-[10px] text-white/30 mt-0.5">Get alerts 7 days before a user's Pro plan expires</p></div>
            </div>
            <AnimatedSwitch checked={emailNotifExpiry} onCheckedChange={setEmailNotifExpiry} activeColor="#FFD700" />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[#BB86FC]/10 flex items-center justify-center shrink-0"><BellRing className="h-4 w-4 text-[#BB86FC]" /></div>
              <div className="min-w-0"><p className="text-[12px] font-semibold text-white/70">Invite Token Usage Alerts</p><p className="text-[10px] text-white/30 mt-0.5">Notify when an invite token is used to register</p></div>
            </div>
            <AnimatedSwitch checked={emailNotifInviteUsage} onCheckedChange={setEmailNotifInviteUsage} activeColor="#BB86FC" />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[#CF6679]/10 flex items-center justify-center shrink-0"><BarChart3 className="h-4 w-4 text-[#CF6679]" /></div>
              <div className="min-w-0"><p className="text-[12px] font-semibold text-white/70">Daily Activity Summary</p><p className="text-[10px] text-white/30 mt-0.5">Receive a daily digest of platform activity and metrics</p></div>
            </div>
            <AnimatedSwitch checked={emailNotifDailySummary} onCheckedChange={setEmailNotifDailySummary} activeColor="#CF6679" />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="adm-content-card bg-white/[0.02] border-[#CF6679]/15 hover:border-[#CF6679]/25 transition-colors hover:shadow-[0_4px_20px_rgba(207,102,121,0.08)]">
        <CardHeader className="pb-4">
          <CardTitle className="adm-section-header text-sm font-semibold text-[#CF6679]/80 flex items-center gap-2">
            <AlertTriangle className="adm-section-header-icon h-4 w-4 text-[#CF6679]" />
            Danger Zone
            <Badge variant="outline" className="adm-badge text-[9px] font-semibold px-1.5 py-0 bg-[#CF6679]/5 border-[#CF6679]/15 text-[#CF6679]/70 ml-auto">Irreversible</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#CF6679]/[0.03] border border-[#CF6679]/10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[#CF6679]/10 flex items-center justify-center shrink-0"><Trash2 className="h-4 w-4 text-[#CF6679]" /></div>
              <div className="min-w-0"><p className="text-[12px] font-semibold text-white/70">Clear All Activity Logs</p><p className="text-[10px] text-white/30 mt-0.5">Permanently delete all admin activity audit trail entries</p></div>
            </div>
            <Button variant="ghost" onClick={() => setShowClearLogsDialog(true)} className="adm-action-btn shrink-0 h-8 px-3 text-[11px] font-semibold rounded-lg text-[#CF6679] hover:text-[#CF6679] hover:bg-[#CF6679]/10 border border-[#CF6679]/15 transition-all">
              Clear Logs <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#CF6679]/[0.03] border border-[#CF6679]/10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[#CF6679]/10 flex items-center justify-center shrink-0"><RotateCcw className="h-4 w-4 text-[#CF6679]" /></div>
              <div className="min-w-0"><p className="text-[12px] font-semibold text-white/70">Reset Demo Data</p><p className="text-[10px] text-white/30 mt-0.5">Reset platform to default state with sample data</p></div>
            </div>
            <Button variant="ghost" onClick={() => setShowResetDialog(true)} className="adm-action-btn shrink-0 h-8 px-3 text-[11px] font-semibold rounded-lg text-[#CF6679] hover:text-[#CF6679] hover:bg-[#CF6679]/10 border border-[#CF6679]/15 transition-all">
              Reset <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  /* ── Map tab id to component ── */
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
      {/* Ambient glow effects */}
      <div className="adm-ambient-glow adm-ambient-glow-purple pointer-events-none" />
      <div className="adm-ambient-glow adm-ambient-glow-teal pointer-events-none" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#03DAC6]/10 flex items-center justify-center">
              <User className="h-4 w-4 text-[#03DAC6]" />
            </div>
            <h2 className="text-xl font-bold text-white/90">Settings</h2>
          </div>
          <p className="text-sm text-white/40">Manage your admin profile and platform configuration</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="adm-tab-bar adm-scroll-mobile relative flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-6 overflow-x-auto">
        {/* Animated slide indicator */}
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
              <Icon className={cn('h-4 w-4 shrink-0', isActive ? '' : '')} style={{ color: isActive ? tab.color : undefined }} />
              <span className="hidden sm:inline truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="adm-scroll-mobile flex-1 min-h-0 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {tabContent[activeTab]()}
        </AnimatePresence>
      </div>

      {/* Sticky Save Button */}
      <div className="sticky bottom-0 left-0 right-0 pt-4 pb-2 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D] to-transparent z-20">
        <motion.button
          type="button"
          disabled={!hasChanges || saveStatus === 'saving'}
          onClick={handleSave}
          animate={
            saveStatus === 'error'
              ? { x: [0, -6, 6, -4, 4, -2, 2, 0] }
              : saveStatus === 'success'
              ? { scale: [1, 1.02, 1] }
              : {}
          }
          transition={{ duration: 0.4 }}
          className={cn(
            'adm-action-btn w-full h-12 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2',
            !hasChanges && saveStatus === 'idle'
              ? 'bg-white/[0.04] text-white/25 cursor-not-allowed border border-white/[0.06]'
              : saveStatus === 'saving'
              ? 'bg-gradient-to-r from-[#03DAC6] to-[#BB86FC] text-white cursor-wait'
              : saveStatus === 'success'
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white'
              : saveStatus === 'error'
              ? 'bg-gradient-to-r from-red-500/80 to-red-400/80 text-white'
              : 'bg-gradient-to-r from-[#03DAC6] to-[#BB86FC] text-white hover:shadow-[0_4px_20px_rgba(3,218,198,0.3)] hover:scale-[1.01] active:scale-[0.99]',
          )}
        >
          {saveStatus === 'saving' && (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          )}
          {saveStatus === 'success' && (
            <>
              <Check className="h-4 w-4" />
              Tersimpan!
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <AlertTriangle className="h-4 w-4" />
              Gagal! Coba lagi
            </>
          )}
          {saveStatus === 'idle' && !hasChanges && (
            <>Tidak ada perubahan</>
          )}
          {saveStatus === 'idle' && hasChanges && (
            <>
              <Check className="h-4 w-4" />
              Simpan Perubahan
            </>
          )}
        </motion.button>
      </div>

      {/* Clear Logs Dialog */}
      <Dialog open={showClearLogsDialog} onOpenChange={setShowClearLogsDialog}>
        <DialogContent className="adm-dialog-content bg-[#0D0D0D] border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white/90 flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-[#CF6679]" />
              Clear Activity Logs
            </DialogTitle>
            <DialogDescription className="text-white/40">
              This action will permanently delete all admin activity log entries. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 px-3 rounded-xl bg-[#CF6679]/[0.04] border border-[#CF6679]/10">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-[#CF6679] mt-0.5 shrink-0" />
              <p className="text-[12px] text-[#CF6679]/70">
                All activity history including user actions, invite creation, and subscription changes will be lost.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowClearLogsDialog(false)} className="text-white/50 hover:text-white/70 hover:bg-white/[0.04]">Cancel</Button>
            <Button onClick={handleClearLogs} className="bg-[#CF6679] text-white hover:bg-[#CF6679]/90 h-9">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Clear All Logs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Demo Data Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="adm-dialog-content bg-[#0D0D0D] border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white/90 flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-[#CF6679]" />
              Reset Demo Data
            </DialogTitle>
            <DialogDescription className="text-white/40">
              This will reset the platform to its default state and create fresh demo data.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 px-3 rounded-xl bg-[#CF6679]/[0.04] border border-[#CF6679]/10">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-[#CF6679] mt-0.5 shrink-0" />
              <p className="text-[12px] text-[#CF6679]/70">
                All current data including users, transactions, and settings will be replaced with demo data. This cannot be undone.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowResetDialog(false)} className="text-white/50 hover:text-white/70 hover:bg-white/[0.04]">Cancel</Button>
            <Button onClick={handleResetDemoData} className="bg-[#CF6679] text-white hover:bg-[#CF6679]/90 h-9">
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset to Demo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Email Change Password Confirmation Dialog */}
      <Dialog open={showEmailPasswordDialog} onOpenChange={(open) => { if (!open) { setShowEmailPasswordDialog(false); setEmailConfirmPassword(''); } }}>
        <DialogContent className="adm-dialog-content bg-[#0D0D0D] border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white/90 flex items-center gap-2">
              <Lock className="h-4 w-4 text-[#FFD700]" />
              Confirm Password to Change Email
            </DialogTitle>
            <DialogDescription className="text-white/40">
              Changing your email address requires password verification for security.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 rounded-xl bg-[#FFD700]/[0.04] border border-[#FFD700]/10">
              <p className="text-[11px] text-[#FFD700]/70">
                Your email will be changed to: <span className="font-semibold">{profileEmail}</span>
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Current Password</Label>
              <Input
                type="password"
                value={emailConfirmPassword}
                onChange={(e) => setEmailConfirmPassword(e.target.value)}
                className={inputCls}
                placeholder="Enter your current password"
                onKeyDown={(e) => { if (e.key === 'Enter' && emailConfirmPassword) handleSaveProfile(emailConfirmPassword); }}
              />
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
