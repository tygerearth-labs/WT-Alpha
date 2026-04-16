'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { LoadingScreen } from '@/components/loading/LoadingScreen';
import { MainLayout } from '@/components/layout/MainLayout';
import { LandingPage } from '@/components/landing/LandingPage';
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';

export default function Home() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <>
        <LandingPage />
        <PWAInstallPrompt />
      </>
    );
  }

  return (
    <>
      <MainLayout />
      <PWAInstallPrompt />
    </>
  );
}
