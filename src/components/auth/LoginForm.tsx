'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

const T = { bg: '#121212', input: '#1E1E1E', primary: '#BB86FC', muted: '#9E9E9E', border: 'rgba(255,255,255,0.08)', text: '#E6E1E5', textSub: '#B3B3B3' };

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useAuthStore();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        toast.success(t('auth.loginSuccess'));

        if (data.user?.role === 'admin') {
          // Use href instead of reload to avoid Zustand persist race condition
          window.location.href = '/admin';
        } else {
          window.location.href = '/';
        }
        return; // Don't let finally run — page is navigating away
      }
      else toast.error(data.error || t('auth.loginFailed'));
    } catch { toast.error(t('auth.loginError')); }
    finally { setIsLoading(false); }
  };

  const inputCls = "h-11 rounded-xl text-sm border-0 focus-visible:ring-1 premium-input";

  return (
    <div className="relative w-full max-w-sm mx-auto animate-fade-in">
      {/* Ambient glow blob behind the form */}
      <div
        className="absolute -top-16 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full pointer-events-none animate-aurora-pulse"
        style={{ background: 'radial-gradient(circle, rgba(187,134,252,0.08) 0%, transparent 70%)' }}
      />

      {/* Premium glass container */}
      <div
        className="relative rounded-2xl p-6 shadow-premium-md premium-scroll"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Title */}
        <div className="text-center space-y-1">
          <p className="text-[11px] uppercase tracking-[0.2em] font-semibold" style={{ color: T.muted }}>{t('auth.welcomeBack')}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mt-5">
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
            <Label className="text-[11px] font-medium" style={{ color: T.textSub }}>{t('auth.password')}</Label>
            <Input
              id="password" type="password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)}
              required disabled={isLoading}
              className={inputCls}
              style={{ background: T.input, color: T.text, border: `1px solid ${T.border}` }}
            />
          </div>

          {/* Forgot password */}
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => toast.info('Password reset is not available in this demo.')}
              className="text-[11px] text-[#BB86FC]/60 hover:text-[#BB86FC] transition-colors premium-touch"
              tabIndex={isLoading ? -1 : 0}
            >
              Forgot password?
            </button>
          </div>

          {/* Login Button with smooth loading animation */}
          <div className="relative overflow-hidden rounded-xl">
            {/* Shimmer background when loading */}
            {isLoading && (
              <div
                className="absolute inset-0 animate-shimmer pointer-events-none z-10"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                  backgroundSize: '200% 100%',
                }}
              />
            )}
            <Button
              type="submit"
              className={cn(
                'w-full h-12 rounded-xl font-semibold text-sm transition-all duration-300 relative z-20 shadow-premium-sm',
                isLoading
                  ? 'opacity-90'
                  : 'hover:scale-[1.01] active:scale-[0.99] hover:shadow-premium-md'
              )}
              disabled={isLoading}
              style={{ background: 'linear-gradient(135deg, #BB86FC, #9C5CFC)', color: '#000' }}
            >
              <span className={cn(
                'transition-all duration-300',
                isLoading ? 'opacity-0' : 'opacity-100'
              )}>
                {t('auth.loginButton')}
              </span>
              {isLoading && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2 text-[12px]">Signing in...</span>
                </span>
              )}
            </Button>
          </div>
        </form>

        {/* Powered by branding */}
        <div className="mt-6 pt-4 text-center">
          <div className="premium-divider mb-3" />
          <p className="text-[10px] tracking-wider uppercase font-medium" style={{ color: 'rgba(158,158,158,0.35)' }}>
            ✦ Secured by Wealth Tracker
          </p>
        </div>
      </div>
    </div>
  );
}
