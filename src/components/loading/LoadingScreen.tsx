'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';

export function LoadingScreen() {
  const [progress, setProgress] = useState(0);
  const { t } = useTranslation();
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    const stages = [
      { at: 0, text: t('loadingScreen.verifying') },
      { at: 25, text: t('loadingScreen.preparing') },
      { at: 50, text: t('loadingScreen.loadingDashboard') },
      { at: 75, text: t('loadingScreen.almostDone') },
      { at: 95, text: t('loadingScreen.welcome') },
    ];

    let current = 0;
    const interval = setInterval(() => {
      // Variable speed — slow in middle, fast at start and end
      const remaining = 100 - current;
      const speed = remaining > 60 ? 4 : remaining > 20 ? 2 : remaining > 5 ? 1 : 0.5;
      current = Math.min(current + Math.random() * speed + 0.3, 100);
      setProgress(Math.round(current));

      // Update status text based on progress
      const stage = [...stages].reverse().find((s) => current >= s.at);
      if (stage) setStatusText(stage.text);

      if (current >= 100) {
        clearInterval(interval);
      }
    }, 60);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-8">
      {/* Logo */}
      <div className="relative mb-8">
        <div
          className="absolute -inset-3 rounded-2xl blur-xl opacity-20"
          style={{ background: 'linear-gradient(135deg, #BB86FC, #03DAC6)' }}
        />
        <div
          className="relative rounded-2xl p-1"
          style={{ background: 'linear-gradient(135deg, #BB86FC, #03DAC6, #CF6679)' }}
        >
          <Image
            src="/logo.PNG"
            alt="Wealth Tracker"
            width={64}
            height={64}
            className="rounded-xl"
            priority
          />
        </div>
      </div>

      {/* App name */}
      <h1
        className="text-xl font-bold mb-1 bg-clip-text text-transparent"
        style={{
          backgroundImage: 'linear-gradient(135deg, #BB86FC 0%, #03DAC6 50%, #CF6679 100%)',
          backgroundSize: '200% 200%',
          animation: 'gradientShift 3s ease-in-out infinite',
        }}
      >
        Wealth Tracker
      </h1>

      {/* Status text */}
      <p className="text-sm text-muted-foreground mb-8 h-5">{statusText}</p>

      {/* Progress bar container */}
      <div className="w-full max-w-[280px]">
        {/* Track */}
        <div
          className="h-[6px] rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          {/* Fill */}
          <div
            className="h-full rounded-full transition-all duration-100 ease-out relative"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #BB86FC, #03DAC6)',
            }}
          >
            {/* Glow effect on the leading edge */}
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full blur-md"
              style={{
                background: '#03DAC6',
                opacity: progress > 0 && progress < 100 ? 0.6 : 0,
                transition: 'opacity 0.3s',
              }}
            />
          </div>
        </div>

        {/* Percentage */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-[11px] text-muted-foreground/60">{t('loadingScreen.loadingLabel')}</span>
          <span
            className="text-[11px] font-semibold tabular-nums"
            style={{ color: progress >= 100 ? '#03DAC6' : '#9E9E9E' }}
          >
            {progress}%
          </span>
        </div>
      </div>

      {/* Keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}} />
    </div>
  );
}
