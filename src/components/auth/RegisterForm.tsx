'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const T = { bg: '#121212', input: '#1E1E1E', primary: '#BB86FC', muted: '#9E9E9E', border: 'rgba(255,255,255,0.08)', text: '#E6E1E5', textSub: '#B3B3B3' };

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error('Password tidak cocok'); return; }
    if (password.length < 6) { toast.error('Password minimal 6 karakter'); return; }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });
      const data = await res.json();
      if (res.ok) { setUser(data.user); toast.success('Registrasi berhasil!'); window.location.href = '/'; }
      else toast.error(data.error || 'Registrasi gagal');
    } catch { toast.error('Terjadi kesalahan saat registrasi'); }
    finally { setIsLoading(false); }
  };

  const inputCls = "h-11 rounded-xl text-sm border-0 focus-visible:ring-1";

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      {/* Title */}
      <div className="text-center space-y-1">
        <p className="text-[11px] uppercase tracking-[0.2em] font-semibold" style={{ color: T.muted }}>Buat Akun Baru</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
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
          <Label className="text-[11px] font-medium" style={{ color: T.textSub }}>Username</Label>
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
            <Label className="text-[11px] font-medium" style={{ color: T.textSub }}>Password</Label>
            <Input
              id="password" type="password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)}
              required disabled={isLoading}
              className={inputCls}
              style={{ background: T.input, color: T.text, border: `1px solid ${T.border}` }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium" style={{ color: T.textSub }}>Ulangi</Label>
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
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Daftar'}
        </Button>
      </form>
    </div>
  );
}
