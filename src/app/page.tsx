'use client';

import { useEffect, useRef } from 'react';
import { useSyncExternalStore } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { LoadingScreen } from '@/components/loading/LoadingScreen';
import { MainLayout } from '@/components/layout/MainLayout';
import { LandingPage } from '@/components/landing/LandingPage';
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';
import { AnnouncementBanner } from '@/components/shared/AnnouncementBanner';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

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

const LOADING_TIMEOUT_MS = 10000;

/**
 * Home Page (/) — User panel ONLY.
 */
export default function Home() {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const forceStopLoading = useAuthStore((s) => s.forceStopLoading);
  const user = useAuthStore((s) => s.user);
  const isLoading = useIsLoading();
  const isAuthenticated = useIsAuthenticated();
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    checkAuth();
    fallbackTimerRef.current = setTimeout(() => {
      const state = useAuthStore.getState();
      if (state.isLoading) {
        console.warn('Auth check timed out after 10s — forcing loading to stop');
        forceStopLoading();
      }
    }, LOADING_TIMEOUT_MS);
    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, [checkAuth, forceStopLoading]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') !== 'user') {
        const timer = setTimeout(() => {
          const currentParams = new URLSearchParams(window.location.search);
          if (currentParams.get('view') !== 'user') {
            window.location.href = '/admin';
          }
        }, 100);
        return () => clearTimeout(timer);
      }
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

  if (user?.role === 'admin') {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    if (params?.get('view') !== 'user') {
      return <LoadingScreen />;
    }
  }

  return (
    <ErrorBoundary>
      <AnnouncementBanner />
      <MainLayout />
      <PWAInstallPrompt />
    </ErrorBoundary>
  );
}
