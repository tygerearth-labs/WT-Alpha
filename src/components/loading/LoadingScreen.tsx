'use client';

import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium text-foreground/80">Memuat...</p>
      </div>
    </div>
  );
}
