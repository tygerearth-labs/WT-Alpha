'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { LoadingScreen } from '@/components/loading/LoadingScreen';

/**
 * Admin Page — Completely isolated from the user panel.
 * 
 * Security layers:
 * 1. Next.js middleware (middleware.ts) verifies cookie + DB role at edge
 * 2. This component does a fresh API call to /api/auth/me and verifies role === 'admin'
 * 3. If role is NOT admin, immediately redirects to / (user panel)
 * 4. Admin components are NEVER imported by the user page
 */
export default function AdminPage() {
  const router = useRouter();
  const [verified, setVerified] = useState(false);
  const [denied, setDenied] = useState(false);
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    async function verifyAdmin() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          // Not authenticated — redirect to login
          router.replace('/');
          return;
        }
        const data = await res.json();
        const role = data.user?.role;

        if (role !== 'admin') {
          // Regular user trying to access /admin — BLOCKED
          setDenied(true);
          setTimeout(() => router.replace('/'), 1500);
          return;
        }

        // Verified: set user in store and show admin panel
        useAuthStore.getState().setUser(data.user);
        setVerified(true);
      } catch {
        router.replace('/');
      }
    }

    verifyAdmin();
  }, [router, checkAuth]);

  // Loading state while verifying
  if (!verified && !denied) {
    return <LoadingScreen />;
  }

  // Access denied — brief message before redirect
  if (denied) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center space-y-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white/80">Akses Ditolak</h2>
          <p className="text-sm text-white/40">Anda tidak memiliki izin admin.</p>
          <p className="text-xs text-white/20">Mengalihkan...</p>
        </div>
      </div>
    );
  }

  // Fully verified — render admin panel
  return (
    <>
      <AdminLayout />
    </>
  );
}
