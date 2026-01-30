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
  }, [checkAuth]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Wealth Tracker
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
            Tyger Earth | Ahtjong Labs
          </div>
        </div>
      </div>
    );
  }

  return <MainLayout />;
}
