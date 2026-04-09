'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Menu,
  X,
  Crown,
  Sparkles,
} from 'lucide-react';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { KasMasuk } from '@/components/kas/KasMasuk';
import { KasKeluar } from '@/components/kas/KasKeluar';
import { TargetTabungan } from '@/components/target/TargetTabungan';
import { Laporan } from '@/components/laporan/Laporan';
import { ProfileSettings } from '@/components/profile/ProfileSettings';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

type PageType = 'dashboard' | 'kas-masuk' | 'kas-keluar' | 'target' | 'laporan' | 'profile';

export function MainLayout() {
  const { user, logout, checkAuth } = useAuthStore();
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [tabletSidebarOpen, setTabletSidebarOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pageKey, setPageKey] = useState(0);
  const { t } = useTranslation();

  const navigateTo = useCallback((page: PageType) => {
    if (page === currentPage) return;
    setIsTransitioning(true);
    setTabletSidebarOpen(false);
    // Small delay to show the progress bar
    setTimeout(() => {
      setCurrentPage(page);
      setPageKey(prev => prev + 1);
      setTimeout(() => setIsTransitioning(false), 400);
    }, 200);
  }, [currentPage]);

  useEffect(() => {
    checkAuth();
  }, []);

  // Close tablet sidebar on outside click
  useEffect(() => {
    if (!tabletSidebarOpen) return;
    const handleResize = () => {
      if (window.innerWidth >= 1024) setTabletSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [tabletSidebarOpen]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      logout();
      toast.success(t('auth.logoutSuccess'));
    } catch (error) {
      console.error('Logout error:', error);
      toast.error(t('auth.logoutFailed'));
    }
  };

  const navigation = [
    { id: 'dashboard' as PageType, label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'kas-masuk' as PageType, label: t('nav.kasMasuk'), icon: TrendingUp },
    { id: 'kas-keluar' as PageType, label: t('nav.kasKeluar'), icon: TrendingDown },
    { id: 'target' as PageType, label: t('nav.target'), icon: PiggyBank },
    { id: 'laporan' as PageType, label: t('nav.laporan'), icon: FileText },
    { id: 'profile' as PageType, label: t('nav.profile'), icon: Settings },
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

  const isPro = user?.plan === 'pro';

  /* ── Shared sidebar nav renderer ── */
  const renderNavItems = (collapsed: boolean, onNavigate?: (page: PageType) => void) => (
    <nav className="relative flex-1 py-4 px-2 space-y-1 overflow-y-auto scrollbar-hide">
      {navigation.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        return (
          <div key={item.id} className="relative group/nav">
            {/* Active indicator bar */}
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
                <div
                  className="w-[3px] h-6 rounded-r-full bg-[#BB86FC]"
                  style={{ boxShadow: '0 0 8px rgba(187,134,252,0.4), 0 0 16px rgba(187,134,252,0.15)' }}
                />
              </div>
            )}

            <button
              onClick={() => (onNavigate ? onNavigate(item.id) : navigateTo(item.id))}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-200 text-left relative overflow-hidden',
                isActive
                  ? 'bg-[#BB86FC]/[0.08] text-[#BB86FC]'
                  : 'text-white/35 hover:text-white/70 hover:bg-white/[0.04]',
                !isActive && 'group-hover/nav:scale-[1.02]',
                'active:scale-[0.98]',
              )}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <div className="absolute inset-0 opacity-100"
                  style={{ background: 'radial-gradient(ellipse at 0% 50%, rgba(187,134,252,0.06) 0%, transparent 70%)' }}
                />
              )}
              {!isActive && (
                <div className="absolute inset-0 opacity-0 group-hover/nav:opacity-100 transition-opacity duration-300"
                  style={{ background: 'radial-gradient(ellipse at 0% 50%, rgba(187,134,252,0.04) 0%, transparent 70%)' }}
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
                {!collapsed && (
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

            {/* Tooltip when collapsed (desktop only) */}
            {collapsed && (
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
  );

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden w-full"
      style={{ '--sidebar-width': sidebarCollapsed ? '64px' : '224px' } as React.CSSProperties}>

      {/* ── Ambient Glow Effects (desktop only) ── */}
      <div
        className="hidden lg:block fixed top-0 left-0 pointer-events-none z-0"
        style={{
          width: '280px',
          height: '280px',
          background: 'radial-gradient(ellipse at 30% 20%, rgba(187,134,252,0.06) 0%, transparent 70%)',
        }}
      />
      <div
        className="hidden lg:block fixed bottom-0 left-0 pointer-events-none z-0"
        style={{
          width: '200px',
          height: '200px',
          background: 'radial-gradient(ellipse at 50% 80%, rgba(3,218,198,0.03) 0%, transparent 70%)',
        }}
      />

      {/* ── Top Header: Logo + Hamburger + Avatar ── */}
      <header className="sticky top-0 z-30 relative">
        {/* Header background with glass morphism */}
        <div className="absolute inset-0 bg-[#0D0D0D]/80 backdrop-blur-xl" />
        {/* Gradient glow border at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#BB86FC]/25 to-transparent" />
        <div
          className="absolute bottom-0 left-1/4 right-1/4 h-[2px] blur-sm pointer-events-none"
          style={{ background: 'linear-gradient(to right, transparent, rgba(187,134,252,0.15), transparent)' }}
        />

        <div className={cn(
          'relative flex items-center justify-between px-4 h-14 transition-all duration-300 ease-in-out',
          'lg:pl-[72px] xl:pl-[72px]',
          !sidebarCollapsed && 'lg:pl-[240px] xl:pl-[280px]',
        )}>
          {/* Left: Logo + Tablet Hamburger */}
          <div className="flex items-center gap-2.5">
            {/* Tablet Hamburger Button — visible only on md (tablet) */}
            <button
              onClick={() => setTabletSidebarOpen(true)}
              className={cn(
                'md:flex hidden items-center justify-center w-9 h-9 rounded-xl transition-all duration-200',
                'lg:hidden',
                'text-white/40 hover:text-white/70 hover:bg-white/[0.06]',
                'active:scale-[0.95]',
              )}
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Logo */}
            <div className="relative">
              <div className="absolute -inset-1 rounded-lg bg-[#BB86FC]/10 blur-md opacity-0 hover:opacity-100 transition-opacity duration-500" />
              <img
                src="/logo.png"
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

          {/* Right: User Avatar + Dropdown */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 w-9 p-0 rounded-full relative group/avatar">
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
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{user?.username || 'User'}</p>
                      {/* Plan badge */}
                      {isPro ? (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
                          style={{ background: 'linear-gradient(135deg, #F9A825, #CF6679)', color: '#000' }}>
                          <Crown className="h-2.5 w-2.5" />
                          Pro
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
                          style={{ background: 'rgba(255,255,255,0.08)', color: '#9E9E9E' }}>
                          <Sparkles className="h-2.5 w-2.5" />
                          Basic
                        </span>
                      )}
                    </div>
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
                <span className="text-[13px]">{t('profile.settingsProfile')}</span>
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

        {/* Keyframes */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          @keyframes progressShimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
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
          {renderNavItems(sidebarCollapsed)}

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
                <span className="text-[11px] font-medium whitespace-nowrap text-white/30">{t('layout.collapse')}</span>
              )}
            </button>
          </div>
        </aside>

        {/* ── Tablet Sidebar Overlay (md: to lg:) ── */}
        {tabletSidebarOpen && (
          <>
            {/* Backdrop */}
            <div
              className="md:block hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setTabletSidebarOpen(false)}
              style={{ animation: 'fadeIn 0.2s ease-out' }}
            />
            {/* Sidebar panel */}
            <aside
              className="md:block hidden fixed top-14 left-0 bottom-0 z-40 w-64 flex-col lg:hidden"
              style={{
                animation: 'slideInLeft 0.25s ease-out',
              }}
            >
              {/* Sidebar background */}
              <div className="absolute inset-0 bg-[#0D0D0D]/95 backdrop-blur-2xl rounded-r-2xl" />
              <div
                className="absolute inset-0 pointer-events-none rounded-r-2xl"
                style={{
                  background: 'linear-gradient(180deg, rgba(187,134,252,0.04) 0%, transparent 30%, transparent 70%, rgba(3,218,198,0.02) 100%)',
                }}
              />
              {/* Right edge glow border */}
              <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-[#BB86FC]/20 via-white/[0.06] to-[#03DAC6]/15" />

              {/* Close button */}
              <div className="relative flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <img src="/logo.PNG" alt="Logo" className="w-6 h-6 rounded-md" />
                  <span className="text-sm font-bold bg-clip-text text-transparent"
                    style={{ backgroundImage: 'linear-gradient(135deg, #BB86FC, #03DAC6)' }}>
                    Wealth Tracker
                  </span>
                </div>
                <button
                  onClick={() => setTabletSidebarOpen(false)}
                  className="flex items-center justify-center w-7 h-7 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all duration-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Nav items */}
              {renderNavItems(false, (page) => {
                setTabletSidebarOpen(false);
                setTimeout(() => navigateTo(page), 100);
              })}

              {/* User plan info at bottom */}
              <div className="relative p-3 border-t border-white/[0.06]">
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{
                  background: isPro ? 'linear-gradient(135deg, rgba(249,168,37,0.08), rgba(207,102,121,0.08))' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isPro ? 'rgba(249,168,37,0.15)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                  {isPro ? (
                    <Crown className="h-4 w-4 shrink-0" style={{ color: '#F9A825' }} />
                  ) : (
                    <Sparkles className="h-4 w-4 shrink-0" style={{ color: '#9E9E9E' }} />
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold" style={{ color: isPro ? '#F9A825' : '#9E9E9E' }}>
                      {isPro ? 'Pro Plan' : 'Basic Plan'}
                    </p>
                    <p className="text-[10px] text-white/30">
                      {isPro ? 'All features unlocked' : 'Upgrade for more features'}
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </>
        )}

        {/* ── Page Content ── */}
        <main
          className={cn(
            'flex-1 p-3 md:p-4 lg:p-6 xl:p-8 overflow-y-auto w-full min-w-0 max-w-full transition-all duration-300 ease-in-out',
            'pb-[72px] lg:pb-8',
            sidebarCollapsed ? 'lg:ml-[64px] xl:ml-[64px]' : 'lg:ml-56 xl:ml-64',
          )}
        >
          {/* Page Transition Progress Bar */}
          {isTransitioning && (
            <div className="fixed top-14 left-0 right-0 z-50 h-[2px]">
              <div
                className="h-full"
                style={{
                  background: 'linear-gradient(90deg, #BB86FC, #03DAC6, #BB86FC)',
                  backgroundSize: '200% 100%',
                  animation: 'progressShimmer 1s ease-in-out infinite',
                  boxShadow: '0 0 12px rgba(187,134,252,0.4), 0 0 4px rgba(3,218,198,0.3)',
                }}
              />
            </div>
          )}
          <div className="max-w-6xl mx-auto">
            <div
              key={pageKey}
              className={cn(
                'transition-opacity duration-300',
                isTransitioning ? 'opacity-0' : 'opacity-100'
              )}
            >
              {renderPage()}
            </div>
          </div>
        </main>
      </div>

      {/* ── Bottom Navigation Bar (mobile only — NOT tablet) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0D0D0D]/95 backdrop-blur-md border-t border-white/[0.06] safe-area-inset-bottom md:hidden">
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

      {/* ── Footer (mobile only — NOT tablet) ── */}
      <footer className="border-t border-white/[0.06] px-2 py-2 bg-[#0D0D0D]/50 pb-[60px] md:hidden">
        <div className="text-center text-[11px] text-white/20">
          Creator: Tyger Earth | Ahtjong Labs
        </div>
      </footer>

      {/* Tablet sidebar animation keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </div>
  );
}
