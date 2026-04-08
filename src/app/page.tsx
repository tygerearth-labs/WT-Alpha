'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { LoadingScreen } from '@/components/loading/LoadingScreen';
import { MainLayout } from '@/components/layout/MainLayout';
import { LandingPage } from '@/components/landing/LandingPage';

export default function Home() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []); // Hanya jalankan sekali saat mount

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return <MainLayout />;
}
