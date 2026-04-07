'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  FileText,
  Settings,
  LogOut,
} from 'lucide-react';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { KasMasuk } from '@/components/kas/KasMasuk';
import { KasKeluar } from '@/components/kas/KasKeluar';
import { TargetTabungan } from '@/components/target/TargetTabungan';
import { Laporan } from '@/components/laporan/Laporan';
import { ProfileSettings } from '@/components/profile/ProfileSettings';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type PageType = 'dashboard' | 'kas-masuk' | 'kas-keluar' | 'target' | 'laporan' | 'profile';

export function MainLayout() {
  const { user, logout, checkAuth } = useAuthStore();
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      logout();
      toast.success('Logout berhasil');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Gagal logout');
    }
  };

  const navigation = [
    { id: 'dashboard' as PageType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'kas-masuk' as PageType, label: 'Kas Masuk', icon: TrendingUp },
    { id: 'kas-keluar' as PageType, label: 'Kas Keluar', icon: TrendingDown },
    { id: 'target' as PageType, label: 'Target', icon: PiggyBank },
    { id: 'laporan' as PageType, label: 'Laporan', icon: FileText },
    { id: 'profile' as PageType, label: 'Profil', icon: Settings },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'kas-masuk':
        return <KasMasuk />;
      case 'kas-keluar':
        return <KasKeluar />;
      case 'target':
        return <TargetTabungan />;
      case 'laporan':
        return <Laporan />;
      case 'profile':
        return <ProfileSettings />;
      default:
        return <Dashboard />;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const navigateTo = (page: PageType) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden w-full">
      {/* ── Top Header: Logo + Avatar ── */}
      <header className="sticky top-0 z-30 bg-[#0D0D0D]/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.PNG"
              alt="Wealth Tracker Logo"
              className="w-8 h-8"
            />
            <h1 className="text-base font-bold bg-gradient-to-r from-[#BB86FC] via-[#03DAC6] to-[#BB86FC] bg-clip-text text-transparent hidden sm:block">
              Wealth Tracker
            </h1>
          </div>

          {/* User Avatar + Dropdown */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 w-9 p-0 rounded-full">
                <Avatar className="h-8 w-8">
                  {user?.image ? (
                    <AvatarImage
                      src={user.image}
                      alt={user.username}
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="bg-[#BB86FC]/20 text-[#BB86FC] text-xs font-semibold">
                    {user?.username ? getInitials(user.username) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-[#0D0D0D] border-white/[0.06]">
              <DropdownMenuLabel className="text-white/80">
                <p className="font-semibold text-sm">{user?.username || 'User'}</p>
                <p className="text-xs text-white/40 font-normal">{user?.email || ''}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/[0.06]" />
              <DropdownMenuItem onClick={() => navigateTo('profile')} className="text-white/70 focus:text-white focus:bg-white/[0.06]">
                <Settings className="mr-2 h-4 w-4" />
                Pengaturan Profil
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/[0.06]" />
              <DropdownMenuItem onClick={handleLogout} className="text-[#CF6679] focus:text-[#CF6679] focus:bg-[#CF6679]/10">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── Page Content ── */}
      <div className="flex-1 p-3 lg:p-4 overflow-y-auto w-full min-w-0 max-w-full pb-[72px]">
        {renderPage()}
      </div>

      {/* ── Bottom Navigation Bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0D0D0D]/95 backdrop-blur-md border-t border-white/[0.06] safe-area-inset-bottom">
        <div className="flex items-center justify-around px-2 h-[60px]">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className="flex items-center justify-center py-2 px-3 rounded-xl min-w-0 flex-1 transition-all duration-200 active:scale-95"
              >
                <Icon
                  className={cn(
                    'h-5 w-5 transition-all duration-200',
                    isActive ? 'text-[#BB86FC]' : 'text-[#555]',
                  )}
                  strokeWidth={isActive ? 2.2 : 1.5}
                />
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] px-2 py-2 bg-[#0D0D0D]/50 pb-[60px]">
        <div className="text-center text-[11px] text-white/20">
          Creator: Tyger Earth | Ahtjong Labs
        </div>
      </footer>
    </div>
  );
}
