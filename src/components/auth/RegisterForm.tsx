'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader2, Ticket, Crown, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';

const T = { bg: '#121212', input: '#1E1E1E', primary: '#BB86FC', muted: '#9E9E9E', border: 'rgba(255,255,255,0.08)', text: '#E6E1E5', textSub: '#B3B3B3' };

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [inviteInfo, setInviteInfo] = useState<{ plan: string; email?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useAuthStore();
  const { t } = useTranslation();

  // Check for invite token in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    if (token) {
      setInviteToken(token);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error(t('auth.passwordMismatch')); return; }
    if (password.length < 6) { toast.error(t('auth.passwordMinLength')); return; }
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
        // Clean URL
        if (window.location.search.includes('invite=')) {
          window.history.replaceState({}, '', '/register');
        }
      }
      else toast.error(data.error || t('auth.registerFailed'));
    } catch { toast.error(t('auth.registerError')); }
    finally { setIsLoading(false); }
  };

  const inputCls = "h-11 rounded-xl text-sm border-0 focus-visible:ring-1";

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      <div className="text-center space-y-1">
        <p className="text-[11px] uppercase tracking-[0.2em] font-semibold" style={{ color: T.muted }}>{t('auth.createAccount')}</p>
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
