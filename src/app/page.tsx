'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { LoadingScreen } from '@/components/loading/LoadingScreen';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/layout/MainLayout';

export default function Home() {
  const { isAuthenticated, isLoading, checkAuth, user } = useAuthStore();
  const [showLogin, setShowLogin] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []); // Hanya jalankan sekali saat mount

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Whealth Tracker
            </h1>
            <p className="text-muted-foreground">Kelola keuangan Anda dengan bijak</p>
          </div>
          {showLogin ? <LoginForm /> : <RegisterForm />}
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => setShowLogin(!showLogin)}
              className="text-primary hover:text-primary/80"
            >
              {showLogin ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Login'}
            </Button>
          </div>
          <div className="text-center text-xs text-muted-foreground">
            Creator: Tyger Earth | Ahtjong Labs
          </div>
        </div>
      </div>
    );
  }

  return <MainLayout />;
}
// Trigger compilation at Sun Feb  1 15:35:55 UTC 2026
// Compilation check Sun Feb  1 15:38:37 UTC 2026
// Trigger check Sun Feb  1 20:12:41 UTC 2026
// Final compile check Sun Feb  1 20:13:52 UTC 2026
