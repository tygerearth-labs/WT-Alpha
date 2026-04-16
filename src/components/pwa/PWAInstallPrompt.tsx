'use client';

import { useState, useEffect, useMemo } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  const isDismissed = useMemo(() => {
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      const dismissedTime = parseInt(wasDismissed, 10);
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      return Date.now() - dismissedTime < oneWeek;
    }
    return false;
  }, []);

  const isStandalone = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches;
  }, []);

  useEffect(() => {
    if (isDismissed || isStandalone) return;

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration failed silently
      });
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isDismissed, isStandalone]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', String(Date.now()));
  };

  if (!showPrompt || isDismissed) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 md:bottom-6 md:left-auto md:right-6 md:w-80 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div
        className="rounded-2xl p-4 border backdrop-blur-xl shadow-2xl"
        style={{
          background: 'rgba(18, 18, 18, 0.95)',
          borderColor: 'rgba(187, 134, 252, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 60px rgba(187, 134, 252, 0.05)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl grid place-items-center shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(187,134,252,0.15), rgba(3,218,198,0.15))' }}
          >
            <Smartphone className="h-5 w-5" style={{ color: '#BB86FC' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: '#E6E1E5' }}>
              Install Wealth Tracker
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#9E9E9E' }}>
              Tambahkan ke home screen untuk akses cepat &amp; offline
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg transition-colors hover:bg-white/5"
          >
            <X className="h-4 w-4" style={{ color: '#9E9E9E' }} />
          </button>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={handleInstall}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #BB86FC, #03DAC6)', color: '#000' }}
          >
            <Download className="h-4 w-4" />
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-xl py-2.5 px-4 text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#9E9E9E' }}
          >
            Nanti
          </button>
        </div>
      </div>
    </div>
  );
}
