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
  ChevronLeft,
  ChevronRight,
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

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
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden w-full"
      style={{ '--sidebar-width': sidebarCollapsed ? '64px' : '224px' } as React.CSSProperties}>

      {/* ── Ambient Glow Effects (desktop only) ── */}
      {/* Purple glow behind sidebar top */}
      <div
        className="hidden lg:block fixed top-0 left-0 pointer-events-none z-0"
        style={{
          width: '280px',
          height: '280px',
          background: 'radial-gradient(ellipse at 30% 20%, rgba(187,134,252,0.06) 0%, transparent 70%)',
        }}
      />
      {/* Teal glow bottom-right of sidebar */}
      <div
        className="hidden lg:block fixed bottom-0 left-0 pointer-events-none z-0"
        style={{
          width: '200px',
          height: '200px',
          background: 'radial-gradient(ellipse at 50% 80%, rgba(3,218,198,0.03) 0%, transparent 70%)',
        }}
      />

      {/* ── Top Header: Logo + Avatar ── */}
      <header className="sticky top-0 z-30 relative">
        {/* Header background with glass morphism */}
        <div className="absolute inset-0 bg-[#0D0D0D]/80 backdrop-blur-xl" />
        {/* Gradient glow border at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#BB86FC]/25 to-transparent" />
        {/* Secondary subtle glow line */}
        <div
          className="absolute bottom-0 left-1/4 right-1/4 h-[2px] blur-sm pointer-events-none"
          style={{ background: 'linear-gradient(to right, transparent, rgba(187,134,252,0.15), transparent)' }}
        />

        <div className={cn(
          'relative flex items-center justify-between px-4 h-14 transition-all duration-300 ease-in-out',
          'lg:pl-[72px] xl:pl-[72px]',
          !sidebarCollapsed && 'lg:pl-[240px] xl:pl-[280px]',
        )}>
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            {/* Logo image with subtle ring glow */}
            <div className="relative">
              <div className="absolute -inset-1 rounded-lg bg-[#BB86FC]/10 blur-md opacity-0 hover:opacity-100 transition-opacity duration-500" />
              <img
                src="/logo.PNG"
                alt="Wealth Tracker Logo"
                className="relative w-8 h-8 rounded-md"
              />
            </div>
            <h1
              className="text-base font-bold hidden sm:block bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(135deg, #BB86FC 0%, #03DAC6 40%, #BB86FC 80%, #03DAC6 100%)',
                backgroundSize: '200% 200%',
                animation: 'gradientShift 4s ease-in-out infinite',
              }}
            >
              Wealth Tracker
            </h1>
          </div>

          {/* User Avatar + Dropdown */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 w-9 p-0 rounded-full relative group/avatar">
                {/* Subtle ring glow around avatar */}
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#BB86FC]/20 to-[#03DAC6]/20 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300 blur-sm" />
                <Avatar className="relative h-8 w-8 ring-1 ring-white/[0.08] group-hover/avatar:ring-[#BB86FC]/30 transition-all duration-300">
                  {user?.image ? (
                    <AvatarImage
                      src={user.image}
                      alt={user.username}
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="bg-[#BB86FC]/15 text-[#BB86FC] text-xs font-semibold border border-[#BB86FC]/10">
                    {user?.username ? getInitials(user.username) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-[#0D0D0D]/95 backdrop-blur-xl border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] shadow-black/30"
            >
              <DropdownMenuLabel className="text-white/80 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-[#BB86FC]/15 flex items-center justify-center text-[#BB86FC] text-xs font-semibold shrink-0">
                    {user?.username ? getInitials(user.username) : 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{user?.username || 'User'}</p>
                    <p className="text-[11px] text-white/35 font-normal truncate">{user?.email || ''}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/[0.06] my-1" />
              <DropdownMenuItem
                onClick={() => navigateTo('profile')}
                className="text-white/60 focus:text-white focus:bg-white/[0.05] rounded-lg mx-1 my-0.5 cursor-pointer transition-colors"
              >
                <Settings className="mr-2.5 h-4 w-4 text-white/30" />
                <span className="text-[13px]">Pengaturan Profil</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/[0.06] my-1" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-[#CF6679]/80 focus:text-[#CF6679] focus:bg-[#CF6679]/8 rounded-lg mx-1 my-0.5 cursor-pointer transition-colors"
              >
                <LogOut className="mr-2.5 h-4 w-4 text-[#CF6679]/50" />
                <span className="text-[13px]">Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Keyframes for gradient animation */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
        `}} />
      </header>

      {/* ── Body: Sidebar + Content ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Desktop Sidebar (lg: and up) ── */}
        <aside
          className={cn(
            'hidden lg:flex flex-col fixed top-14 left-0 bottom-0 z-20 transition-all duration-300 ease-in-out',
            sidebarCollapsed ? 'w-[64px]' : 'w-56 xl:w-64',
          )}
          style={{ '--sidebar-width': sidebarCollapsed ? '64px' : '224px' } as React.CSSProperties}
        >
          {/* Sidebar glass background */}
          <div className="absolute inset-0 bg-[#0D0D0D]/60 backdrop-blur-2xl" />
          {/* Subtle gradient overlay for depth */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, rgba(187,134,252,0.03) 0%, transparent 30%, transparent 70%, rgba(3,218,198,0.02) 100%)',
            }}
          />
          {/* Right edge glow border */}
          <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-[#BB86FC]/10 via-white/[0.04] to-[#03DAC6]/8" />

          {/* Nav items */}
          <nav className="relative flex-1 py-4 px-2 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <div key={item.id} className="relative group/nav">
                  {/* Active indicator bar - glowing left edge */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
                      <div
                        className="w-[3px] h-6 rounded-r-full bg-[#BB86FC]"
                        style={{ boxShadow: '0 0 8px rgba(187,134,252,0.4), 0 0 16px rgba(187,134,252,0.15)' }}
                      />
                    </div>
                  )}

                  <button
                    onClick={() => navigateTo(item.id)}
                    className={cn(
                      'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-200 text-left relative overflow-hidden',
                      isActive
                        ? 'bg-[#BB86FC]/[0.08] text-[#BB86FC]'
                        : 'text-white/35 hover:text-white/70 hover:bg-white/[0.04]',
                      !isActive && 'group-hover/nav:scale-[1.02]',
                      'active:scale-[0.98]',
                    )}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    {/* Hover glow effect for active item */}
                    {isActive && (
                      <div className="absolute inset-0 opacity-100"
                        style={{
                          background: 'radial-gradient(ellipse at 0% 50%, rgba(187,134,252,0.06) 0%, transparent 70%)',
                        }}
                      />
                    )}
                    {/* Hover glow effect for inactive items */}
                    {!isActive && (
                      <div className="absolute inset-0 opacity-0 group-hover/nav:opacity-100 transition-opacity duration-300"
                        style={{
                          background: 'radial-gradient(ellipse at 0% 50%, rgba(187,134,252,0.04) 0%, transparent 70%)',
                        }}
                      />
                    )}

                    <div className="relative flex items-center gap-3 w-full">
                      <Icon
                        className={cn(
                          'h-[18px] w-[18px] shrink-0 transition-all duration-200',
                          isActive
                            ? 'text-[#BB86FC] drop-shadow-[0_0_4px_rgba(187,134,252,0.3)]'
                            : 'text-white/25 group-hover/nav:text-white/60 group-hover/nav:drop-shadow-[0_0_4px_rgba(255,255,255,0.1)]',
                        )}
                        strokeWidth={isActive ? 2.2 : 1.5}
                      />
                      {!sidebarCollapsed && (
                        <span
                          className={cn(
                            'text-[13px] font-medium whitespace-nowrap transition-all duration-200',
                            isActive ? 'text-[#BB86FC]' : 'text-white/45 group-hover/nav:text-white/80',
                          )}
                        >
                          {item.label}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Tooltip when collapsed */}
                  {sidebarCollapsed && (
                    <div
                      className={cn(
                        'absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none',
                        'px-2.5 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap',
                        'opacity-0 group-hover/nav:opacity-100 transition-all duration-200',
                        'translate-x-1 group-hover/nav:translate-x-0',
                        'bg-[#1A1A2E]/95 backdrop-blur-lg border border-white/[0.08]',
                        isActive ? 'text-[#BB86FC]' : 'text-white/70',
                        'shadow-[0_4px_16px_rgba(0,0,0,0.4)]',
                      )}
                    >
                      {/* Tooltip arrow */}
                      <div
                        className={cn(
                          'absolute right-full top-1/2 -translate-y-1/2 w-2 h-2 rotate-45',
                          'bg-[#1A1A2E]/95 border-l border-b border-white/[0.08]',
                        )}
                      />
                      {item.label}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Collapse toggle */}
          <div className="relative p-2 border-t border-white/[0.04]">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={cn(
                'flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl transition-all duration-200',
                'text-white/25 hover:text-white/50',
                'hover:bg-white/[0.04]',
                'active:scale-[0.96]',
              )}
            >
              {/* Subtle animated toggle icon */}
              <div className={cn(
                'flex items-center justify-center w-6 h-6 rounded-md transition-all duration-200',
                'hover:bg-[#BB86FC]/10 hover:text-[#BB86FC] group/toggle',
              )}>
                {sidebarCollapsed ? (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover/toggle:translate-x-0.5" />
                ) : (
                  <ChevronLeft className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover/toggle:-translate-x-0.5" />
                )}
              </div>
              {!sidebarCollapsed && (
                <span className="text-[11px] font-medium whitespace-nowrap text-white/30">Collapse</span>
              )}
            </button>
          </div>
        </aside>

        {/* ── Page Content ── */}
        <main
          className={cn(
            'flex-1 p-3 lg:p-6 xl:p-8 overflow-y-auto w-full min-w-0 max-w-full transition-all duration-300 ease-in-out',
            'pb-[72px] lg:pb-8',
            sidebarCollapsed ? 'lg:ml-[64px] xl:ml-[64px]' : 'lg:ml-56 xl:ml-64',
          )}
        >
          <div className="max-w-6xl mx-auto">
            {renderPage()}
          </div>
        </main>
      </div>

      {/* ── Bottom Navigation Bar (mobile/tablet only) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0D0D0D]/95 backdrop-blur-md border-t border-white/[0.06] safe-area-inset-bottom lg:hidden">
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

      {/* ── Footer (mobile/tablet only) ── */}
      <footer className="border-t border-white/[0.06] px-2 py-2 bg-[#0D0D0D]/50 pb-[60px] lg:hidden">
        <div className="text-center text-[11px] text-white/20">
          Creator: Tyger Earth | Ahtjong Labs
        </div>
      </footer>
    </div>
  );
}
