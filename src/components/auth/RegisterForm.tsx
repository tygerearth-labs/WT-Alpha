'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader2, Ticket, Lock, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';

const T = { bg: '#121212', input: '#1E1E1E', primary: '#BB86FC', muted: '#9E9E9E', border: 'rgba(255,255,255,0.08)', text: '#E6E1E5', textSub: '#B3B3B3' };

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  const [trialEnabled, setTrialEnabled] = useState(false);
  const [trialDurationDays, setTrialDurationDays] = useState(0);
  const [trialPlan, setTrialPlan] = useState('basic');
  const [configLoaded, setConfigLoaded] = useState(false);
  const { setUser } = useAuthStore();
  const { t } = useTranslation();

  // Check for invite token in URL on mount and fetch registration config
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    if (token) {
      setInviteToken(token);
    }

    // Fetch platform config for registration status
    fetch('/api/platform-config')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setRegistrationOpen(data.registrationOpen ?? true);
          setRegistrationMessage(data.registrationMessage || '');
          setWhatsappNumber(data.whatsappNumber || null);
          setTrialEnabled(data.trialEnabled ?? false);
          setTrialDurationDays(data.trialDurationDays || 0);
          setTrialPlan(data.trialPlan || 'basic');
        }
        setConfigLoaded(true);
      })
      .catch(() => {
        setConfigLoaded(true);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error(t('auth.passwordMismatch')); return; }
    if (password.length < 8) { toast.error(t('auth.passwordMinLength')); return; }
    setIsLoading(true);
    try {
      const body: Record<string, string> = { email, username, password };
      if (inviteToken.trim()) body.inviteToken = inviteToken.trim();

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        toast.success(t('auth.registerSuccess'));
        // Clean URL — remove invite param but stay on current page
        if (window.location.search.includes('invite=')) {
          const url = new URL(window.location.href);
          url.searchParams.delete('invite');
          window.history.replaceState({}, '', url.pathname);
        }
      } else if (data.registrationClosed) {
        toast.error(data.error || 'Registration is currently closed');
      }
      else toast.error(data.error || t('auth.registerFailed'));
    } catch { toast.error(t('auth.registerError')); }
    finally { setIsLoading(false); }
  };

  const inputCls = "h-11 rounded-xl text-sm border-0 focus-visible:ring-1";

  const trialBadge = trialEnabled && !inviteToken ? {
    label: `Free ${trialDurationDays}-day ${trialPlan === 'pro' ? 'Pro' : trialPlan === 'ultimate' ? 'Ultimate' : 'Basic'} trial`,
  } : null;

  // Show registration closed message
  if (configLoaded && !registrationOpen) {
    return (
      <div className="w-full max-w-sm mx-auto space-y-6">
        <div className="text-center space-y-1">
          <p className="text-[11px] uppercase tracking-[0.2em] font-semibold" style={{ color: T.muted }}>{t('auth.createAccount')}</p>
        </div>

        <div className="rounded-xl p-5 text-center" style={{ background: 'rgba(207,102,121,0.08)', border: '1px solid rgba(207,102,121,0.2)' }}>
          <Lock className="h-8 w-8 mx-auto mb-3" style={{ color: '#CF6679' }} />
          <p className="text-sm font-semibold mb-2" style={{ color: '#CF6679' }}>Registration Closed</p>
          <p className="text-[12px] leading-relaxed" style={{ color: '#9E9E9E' }}>
            {registrationMessage || 'Registration is currently closed. Please contact the administrator.'}
          </p>
          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Halo, saya ingin mendaftar akun Wealth Tracker')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 rounded-full text-xs font-semibold transition-all hover:scale-105 active:scale-95"
              style={{ background: '#25D366', color: '#fff' }}
            >
              <MessageCircle className="h-4 w-4" />
              Hubungi via WhatsApp
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      <div className="text-center space-y-1">
        <p className="text-[11px] uppercase tracking-[0.2em] font-semibold" style={{ color: T.muted }}>{t('auth.createAccount')}</p>
        {trialBadge && (
          <Badge className="mx-auto text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-[#03DAC6]/10 border border-[#03DAC6]/20 text-[#03DAC6]">
            {trialBadge.label}
          </Badge>
        )}
      </div>

      {/* Invite Token Section */}
      <div className="p-3 rounded-xl" style={{ background: 'rgba(187,134,252,0.06)', border: '1px solid rgba(187,134,252,0.12)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Ticket className="h-3.5 w-3.5 text-[#BB86FC]" />
          <Label className="text-[11px] font-medium text-[#BB86FC]/70">Invite Code (optional)</Label>
        </div>
        <Input
          type="text" placeholder="Enter invite code..."
          value={inviteToken} onChange={(e) => setInviteToken(e.target.value.toUpperCase())}
          disabled={isLoading}
          className={inputCls}
          style={{ background: 'rgba(0,0,0,0.2)', color: T.text, border: '1px solid rgba(187,134,252,0.15)' }}
        />
        {inviteToken && (
          <div className="flex items-center gap-1.5 mt-2">
            <Badge variant="outline" className="text-[9px] font-bold uppercase px-2 py-0.5 bg-[#BB86FC]/5 border-[#BB86FC]/15 text-[#BB86FC]">
              <Ticket className="h-2 w-2 mr-1 inline" />
              Code applied
            </Badge>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium" style={{ color: T.textSub }}>{t('auth.email')}</Label>
          <Input
            id="email" type="email" placeholder="email@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
            required disabled={isLoading}
            className={inputCls}
            style={{ background: T.input, color: T.text, border: `1px solid ${T.border}` }}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium" style={{ color: T.textSub }}>{t('auth.username')}</Label>
          <Input
            id="username" type="text" placeholder="username"
            value={username} onChange={(e) => setUsername(e.target.value)}
            required disabled={isLoading}
            className={inputCls}
            style={{ background: T.input, color: T.text, border: `1px solid ${T.border}` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium" style={{ color: T.textSub }}>{t('auth.password')}</Label>
            <Input
              id="password" type="password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)}
              required disabled={isLoading}
              className={inputCls}
              style={{ background: T.input, color: T.text, border: `1px solid ${T.border}` }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium" style={{ color: T.textSub }}>{t('auth.confirmPassword')}</Label>
            <Input
              id="confirmPassword" type="password" placeholder="••••••••"
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              required disabled={isLoading}
              className={inputCls}
              style={{ background: T.input, color: T.text, border: `1px solid ${T.border}` }}
            />
          </div>
        </div>
        <Button
          type="submit" className="w-full h-11 rounded-xl font-semibold text-sm"
          disabled={isLoading}
          style={{ background: T.primary, color: '#000' }}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('auth.register')}
        </Button>
      </form>
    </div>
  );
}
