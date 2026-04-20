'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

const T = { bg: '#121212', input: '#1E1E1E', primary: '#BB86FC', muted: '#9E9E9E', border: 'rgba(255,255,255,0.08)', text: '#E6E1E5', textSub: '#B3B3B3' };

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
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
          window.location.href = '/admin';
          return;
        }
      }
      else toast.error(data.error || t('auth.loginFailed'));
    } catch { toast.error(t('auth.loginError')); }
    finally { setIsLoading(false); }
  };

  const inputCls = "h-11 rounded-xl text-sm border-0 focus-visible:ring-1";

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      {/* Title */}
      <div className="text-center space-y-1">
        <p className="text-[11px] uppercase tracking-[0.2em] font-semibold" style={{ color: T.muted }}>{t('auth.welcomeBack')}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
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

        {/* Remember me & Forgot password row */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer group/rm select-none">
            <Checkbox
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
              disabled={isLoading}
              className="data-[state=checked]:bg-[#BB86FC] data-[state=checked]:border-[#BB86FC] border-white/20 h-4 w-4 rounded-[4px]"
            />
            <span className="text-[11px] text-white/40 group-hover/rm:text-white/60 transition-colors">
              Remember me
            </span>
          </label>
          <button
            type="button"
            onClick={() => toast.info('Password reset is not available in this demo.')}
            className="text-[11px] text-[#BB86FC]/60 hover:text-[#BB86FC] transition-colors"
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
              'w-full h-11 rounded-xl font-semibold text-sm transition-all duration-300 relative z-20',
              isLoading
                ? 'opacity-90'
                : 'hover:scale-[1.01] active:scale-[0.99]'
            )}
            disabled={isLoading}
            style={{ background: T.primary, color: '#000' }}
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
    </div>
  );
}
