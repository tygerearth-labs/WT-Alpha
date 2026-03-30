'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const T = { bg: '#121212', input: '#1E1E1E', primary: '#BB86FC', muted: '#9E9E9E', border: 'rgba(255,255,255,0.08)', text: '#E6E1E5', textSub: '#B3B3B3' };

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useAuthStore();

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
      if (res.ok) { setUser(data.user); toast.success('Login berhasil!'); }
      else toast.error(data.error || 'Login gagal');
    } catch { toast.error('Terjadi kesalahan saat login'); }
    finally { setIsLoading(false); }
  };

  const inputCls = "h-11 rounded-xl text-sm border-0 focus-visible:ring-1";

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      {/* Title */}
      <div className="text-center space-y-1">
        <p className="text-[11px] uppercase tracking-[0.2em] font-semibold" style={{ color: T.muted }}>Selamat Datang Kembali</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium" style={{ color: T.textSub }}>Email</Label>
          <Input
            id="email" type="email" placeholder="email@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
            required disabled={isLoading}
            className={inputCls}
            style={{ background: T.input, color: T.text, border: `1px solid ${T.border}` }}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium" style={{ color: T.textSub }}>Password</Label>
          <Input
            id="password" type="password" placeholder="••••••••"
            value={password} onChange={(e) => setPassword(e.target.value)}
            required disabled={isLoading}
            className={inputCls}
            style={{ background: T.input, color: T.text, border: `1px solid ${T.border}` }}
          />
        </div>
        <Button
          type="submit" className="w-full h-11 rounded-xl font-semibold text-sm"
          disabled={isLoading}
          style={{ background: T.primary, color: '#000' }}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Masuk'}
        </Button>
      </form>
    </div>
  );
}
