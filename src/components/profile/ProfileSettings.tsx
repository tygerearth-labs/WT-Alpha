'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  User, Trash2, Loader2, LogOut, Camera, Shield, Globe, Coins, Crown, Sparkles,
  Calendar, AlertTriangle, CheckCircle2, BadgeCheck, ArrowRight,
  Activity, Tag, PiggyBank, Clock, FileDown,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/useAuthStore';
import { useI18nStore } from '@/store/useI18nStore';
import { CURRENCIES, POPULAR_CURRENCIES, type CurrencyCode } from '@/lib/currency';
import type { Locale } from '@/i18n';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import { ProfileSkeleton } from '@/components/shared/PageSkeleton';

const T_THEME = {
  bg: '#121212', input: '#1E1E1E', primary: '#BB86FC', secondary: '#03DAC6',
  destructive: '#CF6679', warning: '#F9A825', muted: '#9E9E9E',
  border: 'rgba(255,255,255,0.06)', borderHover: 'rgba(255,255,255,0.12)',
  text: '#E6E1E5', textSub: '#B3B3B3',
};

const LOCALE_OPTIONS: { value: Locale; flag: string; label: string }[] = [
  { value: 'id', flag: '🇮🇩', label: 'Bahasa Indonesia' },
  { value: 'en', flag: '🇬🇧', label: 'English' },
];

interface UserData {
  id: string; email: string; username: string; image: string | null;
  locale?: string; currency?: string; plan?: string; createdAt?: string;
}

interface ActivityStats {
  totalTransactions: number;
  totalCategories: number;
  totalSavingsTargets: number;
}

export function ProfileSettings() {
  const { user, logout, setUser } = useAuthStore();
  const { t, locale: currentLocale, setLocale } = useTranslation();
  const { currency: currentCurrency, setCurrency } = useI18nStore();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [imageError, setImageError] = useState('');
  const [profileForm, setProfileForm] = useState({ username: '', image: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStats>({
    totalTransactions: 0, totalCategories: 0, totalSavingsTargets: 0,
  });

  const selectStyle = {
    background: T_THEME.input,
    color: T_THEME.text,
    border: `1px solid ${T_THEME.border}`,
  };

  // Group currencies: popular first, then alphabetical
  const currencyGroups = useMemo(() => {
    const popular = POPULAR_CURRENCIES.map(code => CURRENCIES[code]).filter(Boolean);
    const others = Object.values(CURRENCIES)
      .filter(c => !POPULAR_CURRENCIES.includes(c.code))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { popular, others };
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setUserData(data.user);
        setProfileForm({ username: data.user.username, image: data.user.image || '' });
        if (data.user.image) setAvatarPreview(data.user.image);
      }
    } catch { toast.error(t('profile.loadError')); }
    finally { setIsLoading(false); }
  };

  const fetchActivityStats = async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        const txCount = data.monthlyTrends?.reduce((sum: number, m: { transactionCount: number }) => sum + m.transactionCount, 0) || 0;
        const savingsCount = data.savingsTargets?.length || 0;
        const catCount = data.expenseByCategory?.length || 0;
        setActivityStats({
          totalTransactions: txCount,
          totalCategories: catCount,
          totalSavingsTargets: savingsCount,
        });
      }
    } catch {
      // Activity stats are optional — silently fail
    }
  };

  useEffect(() => {
    fetchUserData();
    fetchActivityStats();
  }, []);

  // Live avatar preview
  useEffect(() => {
    const url = profileForm.image.trim();
    if (url) {
      setAvatarPreview(url);
    } else {
      setAvatarPreview(userData?.image || null);
    }
  }, [profileForm.image, userData?.image]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileForm.username.trim().length < 3) {
      toast.error(t('profile.usernameMinChars') || 'Username must be at least 3 characters');
      return;
    }
    setIsUpdating(true);
    setImageError('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: profileForm.username.trim(), image: profileForm.image.trim() || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setUserData(data.user);
        setProfileForm({ username: data.user.username, image: data.user.image || '' });
        toast.success(t('profile.updateSuccess'));
      } else {
        const err = await res.json();
        toast.error(err.error || t('profile.updateError'));
      }
    } catch { toast.error(t('common.error')); }
    finally { setIsUpdating(false); }
  };

  const handleUpdatePreferences = async (newLocale: Locale, newCurrency: CurrencyCode) => {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: newLocale, currency: newCurrency }),
      });
      if (res.ok) {
        setLocale(newLocale);
        setCurrency(newCurrency);
        toast.success(t('profile.updateSuccess'));
      } else {
        const err = await res.json();
        toast.error(err.error || t('profile.updateError'));
      }
    } catch { toast.error(t('common.error')); }
    finally { setIsUpdating(false); }
  };

  const handleLanguageChange = (value: string) => {
    const newLocale = value as Locale;
    handleUpdatePreferences(newLocale, currentCurrency);
  };

  const handleCurrencyChange = (value: string) => {
    const newCurrency = value as CurrencyCode;
    handleUpdatePreferences(currentLocale, newCurrency);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error(t('auth.passwordMismatch')); return; }
    if (passwordForm.newPassword.length < 6) { toast.error(t('auth.passwordMinLength')); return; }
    setIsUpdating(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }),
      });
      if (res.ok) { toast.success(t('profile.updateSuccess')); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }
      else { const err = await res.json(); toast.error(err.error || t('profile.passwordError')); }
    } catch { toast.error(t('common.error')); }
    finally { setIsUpdating(false); }
  };

  const handleExportData = () => {
    toast.info(t('profile.comingSoon'));
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error(t('profile.passwordRequired') || 'Password is required to delete account');
      return;
    }
    setIsDeleting(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (res.ok) {
        logout();
        toast.success(t('profile.accountDeleted') || 'Account deleted successfully');
      } else {
        const err = await res.json();
        toast.error(err.error || t('profile.deleteError') || 'Failed to delete account');
      }
    } catch {
      toast.error(t('common.error') || 'An error occurred');
    } finally {
      setIsDeleting(false);
      setDeleteDialog(false);
      setDeletePassword('');
    }
  };

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); logout(); toast.success(t('auth.logoutSuccess')); }
    catch { toast.error(t('auth.logoutFailed')); }
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const inputCls = 'bg-white/[0.04] border-white/[0.08] rounded-xl h-11 text-sm focus:border-white/15 focus:ring-0 transition-colors';
  const inputStyle = { background: T_THEME.input, color: T_THEME.text, border: `1px solid ${T_THEME.border}` };

  // Format member since date
  const memberSince = useMemo(() => {
    if (!userData?.createdAt) return '';
    const date = new Date(userData.createdAt);
    return date.toLocaleDateString(currentLocale === 'id' ? 'id-ID' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  }, [userData?.createdAt, currentLocale]);

  // Member duration in days
  const memberDays = useMemo(() => {
    if (!userData?.createdAt) return 0;
    const created = new Date(userData.createdAt);
    const now = new Date();
    return Math.max(Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)), 0);
  }, [userData?.createdAt]);

  const isPro = user?.plan === 'pro';

  if (isLoading || !userData) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="px-4 sm:px-6 space-y-5 max-w-2xl lg:max-w-3xl mx-auto">
      {/* ══════════════════════════════════════════════════════════
          1. PROFILE HEADER CARD
          ══════════════════════════════════════════════════════════ */}
      <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
        <div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 shadow-lg shadow-black/20" style={{ background: T_THEME.bg, border: `1px solid ${T_THEME.border}` }}>
          {/* Ambient glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: `linear-gradient(135deg, ${T_THEME.primary}, ${T_THEME.secondary})` }} />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: T_THEME.secondary }} />

          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar with decorative gradient ring + pulse animation */}
            <div className="relative shrink-0">
              <motion.div
                className="absolute -inset-2 rounded-full"
                style={{ background: 'linear-gradient(135deg, var(--secondary) 0%, var(--primary) 50%, var(--warning) 100%)' }}
                animate={{ scale: [1, 1.08, 1], opacity: [0.2, 0.35, 0.2] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="relative rounded-full p-[3px]"
                style={{ background: 'linear-gradient(135deg, #BB86FC 0%, #03DAC6 100%)' }}
              >
                <div className="rounded-full p-[2px]" style={{ background: T_THEME.bg }}>
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2" style={{ borderColor: T_THEME.border }}>
                    {avatarPreview ? <AvatarImage src={avatarPreview} alt={userData.username} className="object-cover" /> : null}
                    <AvatarFallback className="text-2xl sm:text-3xl font-bold" style={{ background: `${T_THEME.primary}20`, color: T_THEME.primary }}>
                      {getInitials(userData.username)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              {/* Gradient background behind avatar */}
              <div className="absolute -inset-6 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${T_THEME.primary}08 0%, transparent 70%)` }} />
              {/* Camera badge */}
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full grid place-items-center [&>*]:block leading-none shadow-lg" style={{ background: T_THEME.primary }}>
                <Camera className="h-3.5 w-3.5" style={{ color: '#000' }} />
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2.5 mb-1">
                <h2 className="text-xl sm:text-2xl font-bold truncate" style={{ color: T_THEME.text }}>{userData.username}</h2>
                {/* Plan Badge */}
                <div className="relative group/badge shrink-0">
                  {isPro && (
                    <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-amber-500/30 via-rose-500/30 to-purple-500/30 blur-sm opacity-60 group-hover/badge:opacity-100 transition-opacity" />
                  )}
                  <div
                    className="relative flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[10px] tracking-wide"
                    style={{
                      background: isPro ? 'linear-gradient(135deg, #1a1207, #1a0a14, #0f0a1a)' : 'linear-gradient(135deg, #0D0D0D, #1a1a1a)',
                      color: isPro ? '#FFD700' : '#888',
                      border: isPro ? '1px solid rgba(255,215,0,0.25)' : '1px solid rgba(255,255,255,0.06)',
                      boxShadow: isPro ? '0 0 12px rgba(255,215,0,0.08), inset 0 1px 0 rgba(255,215,0,0.1)' : 'none',
                    }}
                  >
                    {isPro ? (
                      <>
                        <Crown className="h-3 w-3" style={{ color: '#FFD700', filter: 'drop-shadow(0 0 3px rgba(255,215,0,0.4))' }} />
                        <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #FFD700, #FFA500, #FF6B6B)' }}>PRO</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" style={{ color: '#888' }} />
                        <span>BASIC</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-sm truncate mb-1" style={{ color: T_THEME.muted }}>{userData.email}</p>

              <div className="flex items-center justify-center sm:justify-start gap-4 text-xs" style={{ color: T_THEME.textSub }}>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" style={{ color: T_THEME.secondary }} />
                  <span>{memberSince}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" style={{ color: T_THEME.primary }} />
                  <span>{memberDays} {t('profile.days')}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0 justify-center sm:justify-start">
              <a href="#account-settings" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="h-12 w-full sm:w-auto px-4 rounded-xl text-xs font-medium gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ borderColor: `${T_THEME.primary}40`, color: T_THEME.primary, background: 'transparent' }}
                >
                  <User className="h-3.5 w-3.5" />
                  {t('profile.editProfile')}
                </Button>
              </a>
              <button onClick={handleLogout} className="p-3 sm:p-2 rounded-xl transition-all hover:scale-[1.05] active:scale-[0.95] min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0" style={{ background: `${T_THEME.destructive}10` }}>
                <LogOut className="h-4 w-4" style={{ color: T_THEME.destructive }} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════
          2. ACCOUNT SETTINGS SECTION
          ══════════════════════════════════════════════════════════ */}
      <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
        <div id="account-settings" className="relative rounded-2xl overflow-hidden" style={{ background: T_THEME.bg, border: `1px solid ${T_THEME.border}` }}>
          <div className="p-4 sm:p-5 pb-0">
            <div className="flex items-center gap-2">
              <div className="grid place-items-center w-8 h-8 rounded-lg [&>*]:block leading-none" style={{ background: `${T_THEME.primary}15` }}>
                <User className="h-4 w-4" style={{ color: T_THEME.primary }} />
              </div>
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wider" style={{ color: T_THEME.text }}>{t('profile.accountSettings')}</p>
                <p className="text-[11px] font-medium text-white/50">{t('profile.editProfileDesc')}</p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Username */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-white/50">{t('auth.username')}</Label>
                  <Input
                    id="username" value={profileForm.username}
                    onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                    required minLength={3}
                    className={inputCls} style={inputStyle}
                  />
                  <p className="text-[10px]" style={{ color: T_THEME.muted }}>{t('profile.usernameMinChars')}</p>
                </div>

                {/* Email (disabled) */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-white/50">{t('auth.email')}</Label>
                  <Input id="email" value={userData.email} disabled className={inputCls} style={{ ...inputStyle, opacity: 0.5 }} />
                  <p className="text-[10px] flex items-center gap-1" style={{ color: T_THEME.muted }}>
                    <BadgeCheck className="h-3 w-3" style={{ color: T_THEME.secondary }} />
                    {t('profile.emailNote')}
                  </p>
                </div>
              </div>

              {/* Avatar URL */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-white/50">{t('profile.avatarUrl')}</Label>
                <Input
                  id="image" value={profileForm.image}
                  onChange={(e) => { setProfileForm({ ...profileForm, image: e.target.value }); setImageError(''); }}
                  placeholder="https://example.com/avatar.jpg"
                  className={inputCls}
                  style={{ ...inputStyle, ...(imageError ? { borderColor: T_THEME.destructive } : {}) }}
                />
                {imageError && <p className="text-[10px] mt-1" style={{ color: T_THEME.destructive }}>{imageError}</p>}
              </div>

              <Button type="submit" disabled={isUpdating} className="w-full h-12 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.01] active:scale-[0.99]" style={{ background: 'linear-gradient(135deg, var(--secondary), var(--primary))' }}>
                {isUpdating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t('profile.saving')}</> : t('common.save')}
              </Button>
            </form>

            {/* Section divider */}
            <div className="h-px bg-white/[0.06] my-6" />

            {/* Change Password */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="grid place-items-center w-8 h-8 rounded-lg [&>*]:block leading-none" style={{ background: `${T_THEME.secondary}15` }}>
                  <Shield className="h-4 w-4" style={{ color: T_THEME.secondary }} />
                </div>
                <div>
                  <p className="text-[13px] font-bold uppercase tracking-wider" style={{ color: T_THEME.text }}>{t('profile.changePassword')}</p>
                  <p className="text-[11px] font-medium text-white/50">{t('profile.passwordNote')}</p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-white/50">{t('profile.oldPassword')}</Label>
                  <Input
                    id="currentPassword" type="password" placeholder="••••••••"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    required className={inputCls} style={inputStyle}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-white/50">{t('profile.newPassword')}</Label>
                    <Input
                      id="newPassword" type="password" placeholder="••••••••"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      required minLength={6}
                      className={inputCls} style={inputStyle}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-white/50">{t('profile.confirmPassword')}</Label>
                    <Input
                      id="confirmPassword" type="password" placeholder="••••••••"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      required minLength={6}
                      className={inputCls} style={inputStyle}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={isUpdating} className="w-full h-12 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.01] active:scale-[0.99]" style={{ background: 'linear-gradient(135deg, var(--secondary), var(--primary))' }}>
                  {isUpdating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t('profile.saving')}</> : t('profile.changePassword')}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════
          3. PREFERENCES SECTION
          ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Language Selector */}
        <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
          <div className="relative rounded-2xl p-4 sm:p-5 overflow-hidden" style={{ background: T_THEME.bg, border: `1px solid ${T_THEME.border}` }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="grid place-items-center w-8 h-8 rounded-lg [&>*]:block leading-none" style={{ background: `${T_THEME.primary}15` }}>
                <Globe className="h-4 w-4" style={{ color: T_THEME.primary }} />
              </div>
              <p className="text-[13px] font-bold uppercase tracking-wider" style={{ color: T_THEME.text }}>{t('profile.language')}</p>
            </div>
            <p className="text-[11px] font-medium text-white/50 mb-3">{t('profile.languageDesc')}</p>
            <div className="space-y-2">
              {LOCALE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleLanguageChange(opt.value)}
                  disabled={isUpdating}
                  className="flex items-center gap-2.5 p-3.5 rounded-xl text-sm font-medium transition-all text-left w-full min-h-[48px]"
                  style={{
                    background: currentLocale === opt.value ? `${T_THEME.primary}15` : `white/[0.04]`,
                    border: `1.5px solid ${currentLocale === opt.value ? T_THEME.primary : 'rgba(255,255,255,0.08)'}`,
                    color: currentLocale === opt.value ? T_THEME.primary : T_THEME.text,
                  }}
                >
                  <span className="text-lg">{opt.flag}</span>
                  <span className="flex-1">{opt.label}</span>
                  {currentLocale === opt.value && (
                    <CheckCircle2 className="h-4 w-4" style={{ color: T_THEME.primary }} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Currency Selector */}
        <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
          <div className="relative rounded-2xl p-4 sm:p-5 overflow-hidden" style={{ background: T_THEME.bg, border: `1px solid ${T_THEME.border}` }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="grid place-items-center w-8 h-8 rounded-lg [&>*]:block leading-none" style={{ background: `${T_THEME.secondary}15` }}>
                <Coins className="h-4 w-4" style={{ color: T_THEME.secondary }} />
              </div>
              <p className="text-[13px] font-bold uppercase tracking-wider" style={{ color: T_THEME.text }}>{t('profile.currency')}</p>
            </div>
            <p className="text-[11px] font-medium text-white/50 mb-3">{t('profile.currencyDesc')}</p>

            {/* Current currency display */}
            <div className="flex items-center gap-3 p-3 rounded-xl mb-3" style={{ background: `${T_THEME.secondary}08`, border: `1px solid ${T_THEME.secondary}20` }}>
              <div className="text-2xl">{CURRENCIES[currentCurrency]?.symbol || '💰'}</div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: T_THEME.text }}>
                  {CURRENCIES[currentCurrency]?.name || currentCurrency}
                </p>
                <p className="text-[10px] truncate" style={{ color: T_THEME.textSub }}>
                  {new Intl.NumberFormat(CURRENCIES[currentCurrency]?.locale || 'en-US', {
                    style: 'currency', currency: currentCurrency,
                  }).format(1234567.89)}
                </p>
              </div>
            </div>

            <Select value={currentCurrency} onValueChange={handleCurrencyChange} disabled={isUpdating}>
              <SelectTrigger className="w-full h-11 rounded-xl text-sm border-0 focus:ring-0" style={selectStyle}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] rounded-xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}>
                <SelectGroup>
                  <SelectLabel className="px-2 py-1 text-[10px] uppercase tracking-wider" style={{ color: T_THEME.muted }}>
                    {currentLocale === 'id' ? '📊 Populer' : '📊 Popular'}
                  </SelectLabel>
                  {currencyGroups.popular.map((cur) => (
                    <SelectItem key={cur.code} value={cur.code} className="rounded-lg py-2 text-sm cursor-pointer" style={{ color: T_THEME.text }}>
                      <span className="font-medium">{cur.symbol} {cur.code}</span>
                      <span className="text-muted-foreground ml-2 text-xs">— {cur.name}</span>
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel className="px-2 py-1 text-[10px] uppercase tracking-wider" style={{ color: T_THEME.muted }}>
                    {currentLocale === 'id' ? '🌍 Lainnya' : '🌍 Others'}
                  </SelectLabel>
                  {currencyGroups.others.map((cur) => (
                    <SelectItem key={cur.code} value={cur.code} className="rounded-lg py-2 text-sm cursor-pointer" style={{ color: T_THEME.text }}>
                      <span className="font-medium">{cur.symbol} {cur.code}</span>
                      <span className="text-muted-foreground ml-2 text-xs">— {cur.name}</span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          4. DATA & PRIVACY SECTION
          ══════════════════════════════════════════════════════════ */}
      <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
        <div className="relative rounded-2xl p-4 sm:p-5 overflow-hidden" style={{ background: T_THEME.bg, border: `1px solid ${T_THEME.border}` }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="grid place-items-center w-8 h-8 rounded-lg [&>*]:block leading-none" style={{ background: `${T_THEME.warning}15` }}>
              <Shield className="h-4 w-4" style={{ color: T_THEME.warning }} />
            </div>
            <div>
              <p className="text-[13px] font-bold uppercase tracking-wider" style={{ color: T_THEME.text }}>{t('profile.dataPrivacy')}</p>
              <p className="text-[11px] font-medium text-white/50">{t('profile.dataPrivacyDesc')}</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {/* Export Data */}
            <button
              onClick={handleExportData}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all hover:scale-[1.01] active:scale-[0.99] min-h-[48px]"
              style={{ background: 'white/[0.04]', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="grid place-items-center w-9 h-9 rounded-lg shrink-0 [&>*]:block leading-none" style={{ background: `${T_THEME.primary}15` }}>
                <FileDown className="h-4 w-4" style={{ color: T_THEME.primary }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: T_THEME.text }}>{t('profile.exportData')}</p>
                <p className="text-[11px] font-medium text-white/50">{t('profile.exportDataDesc')}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0" style={{ color: T_THEME.muted }} />
            </button>

            {/* Section divider */}
            <div className="h-px bg-white/[0.06]" />

            {/* Delete Account */}
            <div className="p-3.5 rounded-xl" style={{ background: `${T_THEME.destructive}06`, border: `1px solid ${T_THEME.destructive}15` }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="grid place-items-center w-9 h-9 rounded-lg shrink-0 [&>*]:block leading-none" style={{ background: `${T_THEME.destructive}15` }}>
                  <Trash2 className="h-4 w-4" style={{ color: T_THEME.destructive }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: T_THEME.destructive }}>{t('profile.deleteAccount')}</p>
                  <p className="text-[11px] font-medium text-white/50">{t('profile.deleteAccountWarning')}</p>
                </div>
              </div>
              <button
                onClick={() => setDeleteDialog(true)}
                className="w-full text-xs font-semibold py-3 rounded-xl flex items-center justify-center gap-1.5 text-white transition-all hover:scale-[1.01] active:scale-[0.99] min-h-[48px]"
                style={{ background: 'linear-gradient(135deg, var(--destructive), #991B1B)', border: `1px solid ${T_THEME.destructive}25` }}
              >
                <Trash2 className="h-3.5 w-3.5" /> {t('profile.deleteAccount')}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════
          5. ACTIVITY SUMMARY SECTION
          ══════════════════════════════════════════════════════════ */}
      <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
        <div className="relative rounded-2xl p-4 sm:p-5 overflow-hidden" style={{ background: T_THEME.bg, border: `1px solid ${T_THEME.border}` }}>
          {/* Subtle gradient background overlay */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(3,218,198,0.02) 0%, rgba(187,134,252,0.02) 100%)' }} />

          <div className="relative flex items-center gap-2 mb-4">
            <div className="grid place-items-center w-8 h-8 rounded-lg [&>*]:block leading-none" style={{ background: `${T_THEME.secondary}15` }}>
              <Activity className="h-4 w-4" style={{ color: T_THEME.secondary }} />
            </div>
            <p className="text-[13px] font-bold uppercase tracking-wider" style={{ color: T_THEME.text }}>{t('profile.activitySummary')}</p>
          </div>

          <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Transactions */}
            <motion.div whileHover={{ scale: 1.02 }} className="p-3.5 rounded-xl text-center" style={{ background: 'white/[0.04]', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="grid place-items-center w-9 h-9 mx-auto rounded-lg mb-2 [&>*]:block leading-none" style={{ background: `${T_THEME.primary}15` }}>
                <Tag className="h-4 w-4" style={{ color: T_THEME.primary }} />
              </div>
              <p className="text-xl sm:text-2xl font-bold tabular-nums" style={{ color: T_THEME.text }}>{activityStats.totalTransactions}</p>
              <p className="text-[10px] mt-0.5 font-medium text-white/50">{t('profile.totalTransactions')}</p>
            </motion.div>

            {/* Total Categories */}
            <motion.div whileHover={{ scale: 1.02 }} className="p-3.5 rounded-xl text-center" style={{ background: 'white/[0.04]', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="grid place-items-center w-9 h-9 mx-auto rounded-lg mb-2 [&>*]:block leading-none" style={{ background: `${T_THEME.secondary}15` }}>
                <Tag className="h-4 w-4" style={{ color: T_THEME.secondary }} />
              </div>
              <p className="text-xl sm:text-2xl font-bold tabular-nums" style={{ color: T_THEME.text }}>{activityStats.totalCategories}</p>
              <p className="text-[10px] mt-0.5 font-medium text-white/50">{t('profile.totalCategories')}</p>
            </motion.div>

            {/* Total Savings Targets */}
            <motion.div whileHover={{ scale: 1.02 }} className="p-3.5 rounded-xl text-center" style={{ background: 'white/[0.04]', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="grid place-items-center w-9 h-9 mx-auto rounded-lg mb-2 [&>*]:block leading-none" style={{ background: `${T_THEME.warning}15` }}>
                <PiggyBank className="h-4 w-4" style={{ color: T_THEME.warning }} />
              </div>
              <p className="text-xl sm:text-2xl font-bold tabular-nums" style={{ color: T_THEME.text }}>{activityStats.totalSavingsTargets}</p>
              <p className="text-[10px] mt-0.5 font-medium text-white/50">{t('profile.totalSavingsTargets')}</p>
            </motion.div>

            {/* Member Duration */}
            <motion.div whileHover={{ scale: 1.02 }} className="p-3.5 rounded-xl text-center" style={{ background: 'white/[0.04]', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="grid place-items-center w-9 h-9 mx-auto rounded-lg mb-2 [&>*]:block leading-none" style={{ background: `linear-gradient(135deg, ${T_THEME.primary}15, ${T_THEME.secondary}15)` }}>
                <Clock className="h-4 w-4" style={{ color: T_THEME.primary }} />
              </div>
              <p className="text-xl sm:text-2xl font-bold tabular-nums" style={{ color: T_THEME.text }}>{memberDays}</p>
              <p className="text-[10px] mt-0.5 font-medium text-white/50">{t('profile.days')}</p>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════
          DELETE ACCOUNT DIALOG
          ══════════════════════════════════════════════════════════ */}
      <AlertDialog open={deleteDialog} onOpenChange={(open) => { setDeleteDialog(open); if (!open) setDeletePassword(''); }}>
        <AlertDialogContent className="bg-[#141414] border-white/[0.08] rounded-2xl max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="grid place-items-center w-10 h-10 rounded-xl shrink-0 [&>*]:block leading-none" style={{ background: `${T_THEME.destructive}15` }}>
                <AlertTriangle className="h-5 w-5" style={{ color: T_THEME.destructive }} />
              </div>
              <AlertDialogTitle className="text-white text-base">{t('profile.deleteAccountTitle')}</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-[#9E9E9E] text-sm leading-relaxed">
              {t('profile.deleteAccountDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5 my-2">
            <Label className="text-[11px] font-medium text-white/50">{t('profile.oldPassword') || 'Current Password'}</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </div>
          {/* Section divider */}
          <div className="h-px bg-white/[0.06]" />
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <AlertDialogCancel className="flex-1 bg-white/[0.06] text-white border-white/[0.08] hover:bg-white/[0.1] rounded-xl h-12 order-2 sm:order-1">
              {t('profile.cancelDelete')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting || !deletePassword}
              className="flex-1 rounded-xl h-12 font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 order-1 sm:order-2"
              style={{ background: 'linear-gradient(135deg, var(--destructive), #991B1B)' }}
            >
              {isDeleting ? <><Loader2 className="h-4 w-4 animate-spin inline mr-1.5" />Deleting...</> : <><Trash2 className="h-4 w-4 inline mr-1.5" />{t('profile.deleteAccount')}</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
