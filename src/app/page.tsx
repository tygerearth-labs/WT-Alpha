'use client';

import { useEffect, useRef } from 'react';
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

const LOADING_TIMEOUT_MS = 10000; // Force stop loading after 10 seconds

/**
 * Home Page (/) — User panel ONLY.
 * 
 * Admin panel is completely separated at /admin route.
 * If an admin user lands here, they are redirected to /admin.
 * Admin components are NEVER imported or bundled here.
 */
export default function Home() {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const forceStopLoading = useAuthStore((s) => s.forceStopLoading);
  const user = useAuthStore((s) => s.user);
  const isLoading = useIsLoading();
  const isAuthenticated = useIsAuthenticated();
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check auth on mount
  useEffect(() => {
    checkAuth();

    // Fallback timeout — if loading takes more than 10 seconds, force stop
    fallbackTimerRef.current = setTimeout(() => {
      const state = useAuthStore.getState();
      if (state.isLoading) {
        console.warn('Auth check timed out after 10s — forcing loading to stop');
        forceStopLoading();
      }
    }, LOADING_TIMEOUT_MS);

    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
    };
  }, [checkAuth, forceStopLoading]);

  // If admin user lands on /, hard redirect to /admin
  // Use window.location for hard redirect — cannot be intercepted by React
  // Exception: if ?view=user is present, admin can preview the user view
  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') !== 'user') {
        // Small delay to ensure URL params are fully resolved
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
        <div className="mt-14">
          <AnnouncementBanner />
        </div>
        <LandingPage />
        <PWAInstallPrompt />
      </>
    );
  }

  // Admin users should be redirected, show loading while redirect happens
  // Exception: admin previewing user view (?view=user)
  if (user?.role === 'admin') {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    if (params?.get('view') !== 'user') {
      return <LoadingScreen />;
    }
  }

  return (
    <>
      <MainLayout />
      <PWAInstallPrompt />
    </>
  );
}
