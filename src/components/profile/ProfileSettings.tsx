'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Lock, Trash2, Loader2, LogOut, Camera, Shield, Globe, Coins, Crown, Sparkles } from 'lucide-react';
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

interface UserData { id: string; email: string; username: string; image: string | null; locale?: string; currency?: string; }

export function ProfileSettings() {
  const { user, logout, setUser } = useAuthStore();
  const { t, locale: currentLocale, setLocale } = useTranslation();
  const { currency: currentCurrency, setCurrency } = useI18nStore();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageError, setImageError] = useState('');
  const [profileForm, setProfileForm] = useState({ username: '', image: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [activeSection, setActiveSection] = useState<'profile' | 'preferences' | 'security'>('profile');

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

  useState(() => { /* fetch */ });

  const fetchUserData = async () => {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setUserData(data.user);
        setProfileForm({ username: data.user.username, image: data.user.image || '' });
      }
    } catch { toast.error(t('profile.loadError')); }
    finally { setIsLoading(false); }
  };

  // Fetch on mount
  const initialized = useState(false);
  if (!initialized[0] && typeof window !== 'undefined') {
    initialized[0] = true;
    fetchUserData();
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setImageError('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: profileForm.username, image: profileForm.image.trim() || null }),
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

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch('/api/profile', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: deletePassword }) });
      if (res.ok) { toast.success(t('profile.deleteSuccess')); logout(); }
      else { const err = await res.json(); toast.error(err.error || t('profile.deleteError')); }
    } catch { toast.error(t('common.error')); }
    finally { setIsDeleting(false); setDeleteDialog(false); setDeletePassword(''); }
  };

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); logout(); toast.success(t('auth.logoutSuccess')); }
    catch { toast.error(t('auth.logoutFailed')); }
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const inputCls = "h-10 rounded-xl text-sm border-0 focus-visible:ring-1";
  const inputStyle = { background: T_THEME.input, color: T_THEME.text, border: `1px solid ${T_THEME.border}` };

  if (isLoading || !userData) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="space-y-5 max-w-2xl lg:max-w-3xl mx-auto">
      {/* Profile Header */}
      <div className="flex items-center gap-4 lg:gap-6 p-4 lg:p-5 rounded-2xl relative overflow-hidden" style={{ background: T_THEME.bg, border: `1px solid ${T_THEME.border}` }}>
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-15 blur-2xl pointer-events-none" style={{ background: T_THEME.primary }} />
        <div className="relative shrink-0">
          <Avatar className="h-14 w-14 sm:h-16 sm:w-16 lg:h-20 lg:w-20 border-2" style={{ borderColor: `${T_THEME.primary}40` }}>
            {userData.image ? <AvatarImage src={userData.image} alt={userData.username} className="object-cover" /> : null}
            <AvatarFallback className="text-lg sm:text-xl lg:text-2xl" style={{ background: `${T_THEME.primary}20`, color: T_THEME.primary }}>
              {getInitials(userData.username)}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 lg:w-6 lg:h-6 rounded-full grid place-items-center [&>*]:block leading-none" style={{ background: T_THEME.primary }}>
            <Camera className="h-2.5 w-2.5 lg:h-3 lg:w-3" style={{ color: '#000' }} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm sm:text-base lg:text-lg truncate" style={{ color: T_THEME.text }}>{userData.username}</p>
          <p className="text-xs lg:text-sm truncate" style={{ color: T_THEME.muted }}>{userData.email}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${T_THEME.primary}15`, color: T_THEME.primary }}>
              {currentLocale === 'id' ? '🇮🇩 ID' : '🇬🇧 EN'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${T_THEME.secondary}15`, color: T_THEME.secondary }}>
              {CURRENCIES[currentCurrency]?.symbol || currentCurrency} {currentCurrency}
            </span>
            {/* Plan Badge — Premium Style */}
            <div className="relative group/badge">
              {/* Glow effect for Pro */}
              {user?.plan === 'pro' && (
                <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-amber-500/30 via-rose-500/30 to-purple-500/30 blur-sm opacity-60 group-hover/badge:opacity-100 transition-opacity" />
              )}
              <div
                className="relative flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold text-[10px] tracking-wide transition-all duration-300"
                style={{
                  background: user?.plan === 'pro'
                    ? 'linear-gradient(135deg, #1a1207 0%, #1a0a14 50%, #0f0a1a 100%)'
                    : 'linear-gradient(135deg, #0D0D0D 0%, #1a1a1a 100%)',
                  color: user?.plan === 'pro' ? '#FFD700' : '#888',
                  border: user?.plan === 'pro'
                    ? '1px solid rgba(255,215,0,0.25)'
                    : '1px solid rgba(255,255,255,0.06)',
                  boxShadow: user?.plan === 'pro'
                    ? '0 0 12px rgba(255,215,0,0.08), inset 0 1px 0 rgba(255,215,0,0.1)'
                    : 'none',
                }}
              >
                {user?.plan === 'pro' ? (
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
        </div>
        <button onClick={handleLogout} className="p-2 lg:p-2.5 rounded-xl transition-colors shrink-0" style={{ background: `${T_THEME.destructive}10` }}>
          <LogOut className="h-4 w-4 lg:h-5 lg:w-5" style={{ color: T_THEME.destructive }} />
        </button>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: `${T_THEME.bg}`, border: `1px solid ${T_THEME.border}` }}>
        {([
          ['profile', User, t('nav.profile')],
          ['preferences', Globe, t('profile.language')],
          ['security', Lock, t('profile.security')],
        ] as const).map(([key, Icon, label]) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
            style={{
              background: activeSection === key ? `${T_THEME.primary}15` : 'transparent',
              color: activeSection === key ? T_THEME.primary : T_THEME.muted,
            }}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Profile Section */}
      {activeSection === 'profile' && (
        <form onSubmit={handleUpdateProfile} className="space-y-4 p-4 lg:p-5 rounded-2xl" style={{ background: T_THEME.bg, border: `1px solid ${T_THEME.border}` }}>
          <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: T_THEME.muted }}>{t('profile.profileInfo')}</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium" style={{ color: T_THEME.textSub }}>{t('auth.username')}</Label>
              <Input
                id="username" value={profileForm.username}
                onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                required className={inputCls} style={inputStyle}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium" style={{ color: T_THEME.textSub }}>{t('auth.email')}</Label>
              <Input id="email" value={userData.email} disabled className={inputCls} style={{ ...inputStyle, opacity: 0.5 }} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium" style={{ color: T_THEME.textSub }}>{t('profile.avatarUrl')}</Label>
            <Input
              id="image" value={profileForm.image}
              onChange={(e) => { setProfileForm({ ...profileForm, image: e.target.value }); setImageError(''); }}
              placeholder="https://example.com/avatar.jpg"
              className={inputCls}
              style={{ ...inputStyle, ...(imageError ? { borderColor: T_THEME.destructive } : {}) }}
            />
            {imageError && <p className="text-[10px]" style={{ color: T_THEME.destructive }}>{imageError}</p>}
          </div>

          <Button type="submit" disabled={isUpdating} className="w-full h-10 lg:h-11 rounded-xl font-semibold text-sm lg:text-base" style={{ background: T_THEME.primary, color: '#000' }}>
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.save')}
          </Button>
        </form>
      )}

      {/* Preferences Section - Language & Currency */}
      {activeSection === 'preferences' && (
        <div className="space-y-4">
          {/* Language Picker */}
          <div className="space-y-4 p-4 lg:p-5 rounded-2xl" style={{ background: T_THEME.bg, border: `1px solid ${T_THEME.border}` }}>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" style={{ color: T_THEME.primary }} />
              <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: T_THEME.muted }}>{t('profile.language')}</p>
            </div>
            <p className="text-[11px]" style={{ color: T_THEME.textSub }}>{t('profile.languageDesc')}</p>
            <div className="grid grid-cols-2 gap-2">
              {LOCALE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleLanguageChange(opt.value)}
                  disabled={isUpdating}
                  className="flex items-center gap-2.5 p-3 rounded-xl text-sm font-medium transition-all text-left"
                  style={{
                    background: currentLocale === opt.value ? `${T_THEME.primary}15` : `${T_THEME.input}`,
                    border: `1.5px solid ${currentLocale === opt.value ? T_THEME.primary : T_THEME.border}`,
                    color: currentLocale === opt.value ? T_THEME.primary : T_THEME.text,
                  }}
                >
                  <span className="text-lg">{opt.flag}</span>
                  <span>{opt.label}</span>
                  {currentLocale === opt.value && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${T_THEME.primary}25`, color: T_THEME.primary }}>
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Currency Picker */}
          <div className="space-y-4 p-4 lg:p-5 rounded-2xl" style={{ background: T_THEME.bg, border: `1px solid ${T_THEME.border}` }}>
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4" style={{ color: T_THEME.secondary }} />
              <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: T_THEME.muted }}>{t('profile.currency')}</p>
            </div>
            <p className="text-[11px]" style={{ color: T_THEME.textSub }}>{t('profile.currencyDesc')}</p>

            {/* Current currency display */}
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: `${T_THEME.secondary}08`, border: `1px solid ${T_THEME.secondary}20` }}>
              <div className="text-2xl">{CURRENCIES[currentCurrency]?.symbol || '💰'}</div>
              <div>
                <p className="text-sm font-semibold" style={{ color: T_THEME.text }}>
                  {CURRENCIES[currentCurrency]?.name || currentCurrency}
                </p>
                <p className="text-[10px]" style={{ color: T_THEME.textSub }}>
                  {new Intl.NumberFormat(CURRENCIES[currentCurrency]?.locale || 'en-US', {
                    style: 'currency',
                    currency: currentCurrency,
                  }).format(1234567.89)}
                </p>
              </div>
            </div>

            {/* Currency Select Dropdown */}
            <Select value={currentCurrency} onValueChange={handleCurrencyChange} disabled={isUpdating}>
              <SelectTrigger
                className="w-full h-10 rounded-xl text-sm border-0 focus:ring-1"
                style={selectStyle}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] rounded-xl" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}>
                {/* Popular currencies */}
                <SelectGroup>
                  <SelectLabel className="px-2 py-1 text-[10px] uppercase tracking-wider" style={{ color: T_THEME.muted }}>
                    {currentLocale === 'id' ? '📊 Populer' : '📊 Popular'}
                  </SelectLabel>
                  {currencyGroups.popular.map((cur) => (
                    <SelectItem
                      key={cur.code}
                      value={cur.code}
                      className="rounded-lg py-2 text-sm cursor-pointer"
                      style={{ color: T_THEME.text }}
                    >
                      <span className="font-medium">{cur.symbol} {cur.code}</span>
                      <span className="text-muted-foreground ml-2 text-xs">— {cur.name}</span>
                    </SelectItem>
                  ))}
                </SelectGroup>

                {/* Other currencies */}
                <SelectGroup>
                  <SelectLabel className="px-2 py-1 text-[10px] uppercase tracking-wider" style={{ color: T_THEME.muted }}>
                    {currentLocale === 'id' ? '🌍 Lainnya' : '🌍 Others'}
                  </SelectLabel>
                  {currencyGroups.others.map((cur) => (
                    <SelectItem
                      key={cur.code}
                      value={cur.code}
                      className="rounded-lg py-2 text-sm cursor-pointer"
                      style={{ color: T_THEME.text }}
                    >
                      <span className="font-medium">{cur.symbol} {cur.code}</span>
                      <span className="text-muted-foreground ml-2 text-xs">— {cur.name}</span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Security Section */}
      {activeSection === 'security' && (
        <div className="space-y-4">
          {/* Change Password */}
          <form onSubmit={handleChangePassword} className="space-y-3.5 p-4 lg:p-5 rounded-2xl" style={{ background: T_THEME.bg, border: `1px solid ${T_THEME.border}` }}>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4" style={{ color: T_THEME.primary }} />
              <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: T_THEME.muted }}>{t('profile.changePassword')}</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium" style={{ color: T_THEME.textSub }}>{t('profile.oldPassword')}</Label>
              <Input
                id="currentPassword" type="password" placeholder="••••••••"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required className={inputCls} style={inputStyle}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium" style={{ color: T_THEME.textSub }}>{t('profile.newPassword')}</Label>
                <Input
                  id="newPassword" type="password" placeholder="••••••••"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required minLength={6}
                  className={inputCls} style={inputStyle}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium" style={{ color: T_THEME.textSub }}>{t('common.confirm')}</Label>
                <Input
                  id="confirmPassword" type="password" placeholder="••••••••"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required minLength={6}
                  className={inputCls} style={inputStyle}
                />
              </div>
            </div>
            <Button type="submit" disabled={isUpdating} className="w-full h-10 rounded-xl font-semibold text-sm" style={{ background: T_THEME.primary, color: '#000' }}>
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : t('profile.changePassword')}
            </Button>
          </form>

          {/* Danger Zone */}
          <div className="p-4 rounded-2xl" style={{ background: `${T_THEME.destructive}06`, border: `1px solid ${T_THEME.destructive}15` }}>
            <div className="flex items-center gap-2 mb-2">
              <Trash2 className="h-4 w-4" style={{ color: T_THEME.destructive }} />
              <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: T_THEME.destructive }}>{t('profile.dangerZone')}</p>
            </div>
            <p className="text-[11px] mb-3" style={{ color: T_THEME.textSub }}>
              {t('profile.deleteAccountDesc')}
            </p>
            <button
              onClick={() => setDeleteDialog(true)}
              className="w-full text-[11px] font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              style={{ background: `${T_THEME.destructive}15`, color: T_THEME.destructive, border: `1px solid ${T_THEME.destructive}25` }}
            >
              <Trash2 className="h-3.5 w-3.5" /> {t('profile.deleteAccount')}
            </button>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent className="bg-[#0D0D0D] border-white/[0.06] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">{t('profile.deleteAccountTitle')}</AlertDialogTitle>
            <AlertDialogDescription className="text-[#9E9E9E]">
              {t('profile.deleteAccountDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-3">
            <Input
              id="deletePassword" type="password" placeholder={t('auth.password')}
              value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)}
              className={inputCls} style={inputStyle}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/[0.06] text-white border-white/[0.08] hover:bg-white/[0.1] rounded-xl">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount} disabled={isDeleting || !deletePassword}
              className="rounded-xl"
              style={{ background: T_THEME.destructive, color: '#fff' }}
            >
              {isDeleting ? t('profile.deleting') : t('profile.deleteAccount')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
