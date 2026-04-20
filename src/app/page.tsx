'use client';

import { useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { LoadingScreen } from '@/components/loading/LoadingScreen';
import { MainLayout } from '@/components/layout/MainLayout';
import { LandingPage } from '@/components/landing/LandingPage';
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';
import { AnnouncementBanner } from '@/components/shared/AnnouncementBanner';

function useIsAuthenticated() {
  return useSyncExternalStore(
    (callback) => useAuthStore.subscribe(callback),
    () => useAuthStore.getState().isAuthenticated,
    () => false,
  );
}

function useIsLoading() {
  return useSyncExternalStore(
    (callback) => useAuthStore.subscribe(callback),
    () => useAuthStore.getState().isLoading,
    () => true,
  );
}

/**
 * Home Page (/) — User panel ONLY.
 * 
 * Admin panel is completely separated at /admin route.
 * If an admin user lands here, they are redirected to /admin.
 * Admin components are NEVER imported or bundled here.
 */
export default function Home() {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const user = useAuthStore((s) => s.user);
  const isLoading = useIsLoading();
  const isAuthenticated = useIsAuthenticated();

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // If admin user lands on /, hard redirect to /admin
  // Use window.location for hard redirect — cannot be intercepted by React
  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      window.location.href = '/admin';
    }
  }, [isAuthenticated, user?.role]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <>
        <AnnouncementBanner />
        <LandingPage />
        <PWAInstallPrompt />
      </>
    );
  }

  // Admin users should be redirected, show loading while redirect happens
  if (user?.role === 'admin') {
    return <LoadingScreen />;
  }

  return (
    <>
      <AnnouncementBanner />
      <MainLayout />
      <PWAInstallPrompt />
    </>
  );
}
