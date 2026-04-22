'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '@/store/useAuthStore';
import { useBusinessStore, type BusinessMode } from '@/store/useBusinessStore';
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
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  ArrowLeftRight,
  Lock,
  Briefcase,
  LineChart,
  Wallet,
  ShoppingCart,
  Receipt,
  Users,
  CreditCard,
  BarChart3,
  Gem,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';
import { NotificationCenter } from '@/components/notification/NotificationCenter';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { KasMasuk } from '@/components/kas/KasMasuk';
import { KasKeluar } from '@/components/kas/KasKeluar';
import { TargetTabungan } from '@/components/target/TargetTabungan';
import { Laporan } from '@/components/laporan/Laporan';
import { ProfileSettings } from '@/components/profile/ProfileSettings';
import { QuickTransaction } from '@/components/transaction/QuickTransaction';
import BusinessRegisterDialog from '@/components/business/BusinessRegisterDialog';
import BusinessDashboard from '@/components/business/BusinessDashboard';
import BusinessCash from '@/components/business/BusinessCash';
import BusinessSales from '@/components/business/BusinessSales';
import BusinessInvoice from '@/components/business/BusinessInvoice';
import BusinessCustomers from '@/components/business/BusinessCustomers';
import BusinessDebts from '@/components/business/BusinessDebts';
import BusinessAllocation from '@/components/business/BusinessAllocation';
import BusinessLaporan from '@/components/business/BusinessLaporan';
import InvestmentDashboard from '@/components/investment/InvestmentDashboard';
import InvestmentPortfolio from '@/components/investment/InvestmentPortfolio';
import TradingJournal from '@/components/investment/TradingJournal';
import InvestmentRegisterDialog from '@/components/investment/InvestmentRegisterDialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { AnnouncementBanner } from '@/components/shared/AnnouncementBanner';

type PageType =
  | 'dashboard' | 'kas-masuk' | 'kas-keluar' | 'target' | 'laporan' | 'profile'
  | 'biz-dashboard' | 'biz-kas' | 'biz-penjualan' | 'biz-invoice' | 'biz-customer'
  | 'biz-hutang' | 'biz-allocation' | 'biz-laporan'
  | 'inv-dashboard' | 'inv-portfolio' | 'inv-journal';

interface NavItem {
  id: PageType;
  label: string;
  icon: LucideIcon;
  desc?: string;
  lock?: boolean;
}

export function MainLayout() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const { mode, setMode, businesses, setBusinesses, activeBusiness, setActiveBusiness, setLoading: setBizLoading } = useBusinessStore();
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tabletSidebarOpen, setTabletSidebarOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pageKey, setPageKey] = useState(0);
  const [monthlyStats, setMonthlyStats] = useState<{ income: number; expense: number } | null>(null);
  const [quickTransactionVisible, setQuickTransactionVisible] = useState(true);
  const [showBizRegister, setShowBizRegister] = useState(false);
  const [showInvRegister, setShowInvRegister] = useState(false);
  const { t } = useTranslation();

  const isUltimate = user?.plan === 'ultimate';
  const isPro = user?.plan === 'pro';
  const isBasic = user?.plan === 'basic';

  // Check if admin is viewing as user
  const isAdminPreview = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return user?.role === 'admin' && params.get('view') === 'user';
  }, [user?.role]);

  // Fetch businesses on mount
  useEffect(() => {
    if (!user?.id || !isUltimate) return;
    const fetchBusinesses = async () => {
      try {
        setBizLoading(true);
        const res = await fetch('/api/business');
        if (res.ok) {
          const data = await res.json();
          setBusinesses(data.businesses || []);
        }
      } catch { /* silent */ } finally { setBizLoading(false); }
    };
    fetchBusinesses();
  }, [user?.id, isUltimate, setBusinesses, setBizLoading]);

  const navigateTo = useCallback((page: PageType) => {
    if (page === currentPage) return;
    setIsTransitioning(true);
    setTabletSidebarOpen(false);
    setTimeout(() => {
      setCurrentPage(page);
      setPageKey(prev => prev + 1);
      setTimeout(() => setIsTransitioning(false), 400);
    }, 200);
  }, [currentPage]);

  // Fetch current month stats for sidebar mini bar
  useEffect(() => {
    if (mode !== 'personal') return;
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const data = await res.json();
          if (data.monthlyComparison) {
            setMonthlyStats({
              income: data.monthlyComparison.currentMonthIncome || 0,
              expense: data.monthlyComparison.currentMonthExpense || 0,
            });
          }
          if (data.sectionVisibility) {
            const plan = user?.plan || 'basic';
            const planConfig = data.sectionVisibility[plan];
            if (planConfig && 'quickTransaction' in planConfig) {
              setQuickTransactionVisible(planConfig.quickTransaction === true);
            }
          }
        }
      } catch { /* silent */ }
    };
    fetchStats();
  }, [user?.plan, mode]);

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

  // Handle mode switch
  const handleModeSwitch = useCallback((newMode: BusinessMode) => {
    if (newMode === 'personal') {
      setMode('personal');
      setActiveBusiness(null);
      setCurrentPage('dashboard');
      setPageKey(prev => prev + 1);
      return;
    }
    if (!isUltimate) {
      toast.error(t('biz.ultimateOnly'));
      return;
    }
    const cat = newMode === 'bisnis' ? 'bisnis' : 'investasi';
    const existingBiz = businesses.find(b => b.category === cat);
    if (existingBiz) {
      setActiveBusiness(existingBiz);
      setMode(newMode);
      setCurrentPage(newMode === 'bisnis' ? 'biz-dashboard' : 'inv-dashboard');
      setPageKey(prev => prev + 1);
    } else {
      if (newMode === 'bisnis') setShowBizRegister(true);
      else setShowInvRegister(true);
    }
  }, [isUltimate, businesses, setMode, setActiveBusiness, t]);

  // Navigation items
  const personalNav: NavItem[] = useMemo(() => [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, desc: t('layout.navDescDashboard') },
    { id: 'kas-masuk', label: t('nav.kasMasuk'), icon: TrendingUp, desc: t('layout.navDescKasMasuk') },
    { id: 'kas-keluar', label: t('nav.kasKeluar'), icon: TrendingDown, desc: t('layout.navDescKasKeluar') },
    { id: 'target', label: t('nav.target'), icon: PiggyBank, desc: t('layout.navDescTarget') },
    { id: 'laporan', label: t('nav.laporan'), icon: FileText, desc: t('layout.navDescLaporan'), lock: isBasic },
    { id: 'profile', label: t('nav.profile'), icon: Settings, desc: t('layout.navDescProfile') },
  ], [t, isBasic]);

  const businessNav: NavItem[] = useMemo(() => [
    { id: 'biz-dashboard', label: t('biz.bizDashboard'), icon: Briefcase, desc: 'Dashboard Bisnis' },
    { id: 'biz-kas', label: t('biz.kasBesar'), icon: Wallet, desc: 'Kas & Pengeluaran' },
    { id: 'biz-penjualan', label: t('biz.penjualan'), icon: ShoppingCart, desc: 'Penjualan' },
    { id: 'biz-invoice', label: t('biz.invoice'), icon: Receipt, desc: 'Invoice' },
    { id: 'biz-customer', label: t('biz.customers'), icon: Users, desc: 'Pelanggan' },
    { id: 'biz-hutang', label: t('biz.hutangPiutang'), icon: CreditCard, desc: 'Hutang & Piutang' },
    { id: 'biz-allocation', label: t('biz.autoAllocation'), icon: ArrowLeftRight, desc: 'Alokasi ke Pribadi' },
    { id: 'biz-laporan', label: t('biz.bizLaporan'), icon: BarChart3, desc: 'Laporan' },
  ], [t]);

  const investmentNav: NavItem[] = useMemo(() => [
    { id: 'inv-dashboard', label: t('inv.invDashboard'), icon: LineChart, desc: 'Dashboard Investasi' },
    { id: 'inv-portfolio', label: t('inv.portfolios'), icon: Gem, desc: 'Portofolio' },
    { id: 'inv-journal', label: t('inv.tradingJournal'), icon: BookOpen, desc: 'Trading Journal' },
  ], [t]);

  const navigation = useMemo(() => {
    if (mode === 'bisnis') return businessNav;
    if (mode === 'investasi') return investmentNav;
    return personalNav;
  }, [mode, personalNav, businessNav, investmentNav]);

  const renderPage = () => {
    if (mode === 'bisnis') {
      if (!businesses.find(b => b.category === 'bisnis')) {
        return <BusinessRegisterDialog open={showBizRegister} onOpenChange={(o) => { setShowBizRegister(o); if (!o) { setMode('personal'); setCurrentPage('dashboard'); } }} />;
      }
      switch (currentPage) {
        case 'biz-dashboard': return <BusinessDashboard />;
        case 'biz-kas': return <BusinessCash />;
        case 'biz-penjualan': return <BusinessSales />;
        case 'biz-invoice': return <BusinessInvoice />;
        case 'biz-customer': return <BusinessCustomers />;
        case 'biz-hutang': return <BusinessDebts />;
        case 'biz-allocation': return <BusinessAllocation />;
        case 'biz-laporan': return <BusinessLaporan />;
        default: return <BusinessDashboard />;
      }
    }
    if (mode === 'investasi') {
      if (!businesses.find(b => b.category === 'investasi')) {
        return <InvestmentRegisterDialog open={showInvRegister} onOpenChange={(o) => { setShowInvRegister(o); if (!o) { setMode('personal'); setCurrentPage('dashboard'); } }} />;
      }
      switch (currentPage) {
        case 'inv-dashboard': return <InvestmentDashboard />;
        case 'inv-portfolio': return <InvestmentPortfolio />;
        case 'inv-journal': return <TradingJournal />;
        default: return <InvestmentDashboard />;
      }
    }
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'kas-masuk': return <KasMasuk />;
      case 'kas-keluar': return <KasKeluar />;
      case 'target': return <TargetTabungan />;
      case 'laporan': return <Laporan />;
      case 'profile': return <ProfileSettings />;
      default: return <Dashboard />;
    }
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getPlanBadge = () => {
    if (isUltimate) return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-[0.15em] px-2 py-[3px] rounded-md shrink-0"
        style={{ background: 'linear-gradient(135deg, #1a0a14, #14071e)', color: '#03DAC6', border: '1px solid rgba(3,218,198,0.25)', boxShadow: '0 0 10px rgba(3,218,198,0.08)' }}>
        <Gem className="h-2.5 w-2.5" />
        <span>ULTIMATE</span>
      </span>
    );
    if (isPro) return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-[0.15em] px-2 py-[3px] rounded-md shrink-0"
        style={{ background: 'linear-gradient(135deg, #1a1207, #1a0a14)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.2)', boxShadow: '0 0 10px rgba(255,215,0,0.06)' }}>
        <Crown className="h-2.5 w-2.5" style={{ filter: 'drop-shadow(0 0 2px rgba(255,215,0,0.5))' }} />
        <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #FFD700, #FFA500)' }}>PRO</span>
      </span>
    );
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-[2px] rounded-md shrink-0"
        style={{ background: 'rgba(255,255,255,0.04)', color: '#666', border: '1px solid rgba(255,255,255,0.05)' }}>
        <Sparkles className="h-2 w-2" /><span>BASIC</span>
      </span>
    );
  };

  /* ── Mode Switch Component ── */
  const ModeSwitch = ({ collapsed }: { collapsed: boolean }) => (
    <div className={cn('px-2 pb-3 mb-2', !collapsed && 'px-3')}>
      <div className={cn('flex items-center gap-0.5 p-0.5 rounded-xl bg-white/[0.03] border border-white/[0.04]', collapsed && 'flex-col')}>
        {(['personal', 'bisnis', 'investasi'] as const).map((m) => (
          <button
            key={m}
            onClick={() => handleModeSwitch(m)}
            className={cn(
              'relative text-[10px] font-semibold rounded-lg transition-all duration-200',
              collapsed ? 'p-2 mx-auto' : 'flex-1 py-1.5',
              mode === m
                ? m === 'personal' ? 'bg-[#BB86FC]/20 text-[#BB86FC] shadow-sm'
                  : m === 'bisnis' ? 'bg-[#03DAC6]/20 text-[#03DAC6] shadow-sm'
                  : 'bg-[#FFD700]/20 text-[#FFD700] shadow-sm'
                : 'text-white/35 hover:text-white/60',
              m !== 'personal' && !isUltimate && 'opacity-30 pointer-events-none',
            )}
            title={collapsed ? (m === 'personal' ? t('biz.personal') : m === 'bisnis' ? t('nav.bisnis') : t('nav.investasi')) : undefined}
          >
            {m !== 'personal' && !isUltimate && <Lock className="absolute -top-0.5 -right-0.5 h-2 w-2 text-[#FFD700]/60" />}
            {collapsed ? (
              m === 'personal' ? <LayoutDashboard className="h-3.5 w-3.5" />
                : m === 'bisnis' ? <Briefcase className="h-3.5 w-3.5" />
                : <Gem className="h-3.5 w-3.5" />
            ) : (
              m === 'personal' ? t('biz.personal') : m === 'bisnis' ? t('nav.bisnis') : t('nav.investasi')
            )}
          </button>
        ))}
      </div>
    </div>
  );

  /* ── Shared sidebar nav renderer ── */
  const renderNavItems = (collapsed: boolean, onNavigate?: (page: PageType) => void) => (
    <nav className="relative flex-1 py-4 px-2 space-y-1 overflow-y-auto scrollbar-hide">
      <ModeSwitch collapsed={collapsed} />
      {navigation.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        return (
          <div key={item.id} className="relative group/nav">
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
                <div className="w-[3px] h-6 rounded-r-full bg-[#BB86FC]"
                  style={{ boxShadow: '0 0 8px rgba(187,134,252,0.4), 0 0 16px rgba(187,134,252,0.15)' }} />
              </div>
            )}
            <button
              onClick={() => (onNavigate ? onNavigate(item.id) : navigateTo(item.id))}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-200 text-left relative overflow-hidden',
                isActive ? 'bg-[#BB86FC]/[0.08] text-[#BB86FC]' : 'text-white/35 hover:text-white/70 hover:bg-white/[0.04]',
                !isActive && 'group-hover/nav:translate-x-1 group-hover/nav:shadow-[0_0_12px_rgba(187,134,252,0.08)]',
                'active:scale-[0.97]',
              )}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <div className="absolute inset-0 opacity-100"
                  style={{ background: 'radial-gradient(ellipse at 0% 50%, rgba(187,134,252,0.06) 0%, transparent 70%)' }} />
              )}
              {!isActive && (
                <div className="absolute inset-0 opacity-0 group-hover/nav:opacity-100 transition-opacity duration-300"
                  style={{ background: 'radial-gradient(ellipse at 0% 50%, rgba(187,134,252,0.04) 0%, transparent 70%)' }} />
              )}
              <div className="relative flex items-center gap-3 w-full">
                <Icon className={cn(
                  'h-[18px] w-[18px] shrink-0 transition-all duration-200',
                  isActive ? 'text-[#BB86FC] drop-shadow-[0_0_4px_rgba(187,134,252,0.3)]' : 'text-white/25 group-hover/nav:text-white/60',
                )} strokeWidth={isActive ? 2.2 : 1.5} />
                {!collapsed && (
                  <span className={cn(
                    'text-[13px] font-medium whitespace-nowrap transition-all duration-200',
                    isActive ? 'text-[#BB86FC]' : 'text-white/45 group-hover/nav:text-white/80',
                  )}>{item.label}</span>
                )}
                {!collapsed && item.lock && (
                  <Lock className="h-3 w-3 ml-auto shrink-0 text-[#FFD700]/50" />
                )}
              </div>
            </button>
            {collapsed && (
              <div className={cn(
                'absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none',
                'px-2.5 py-2 rounded-lg whitespace-nowrap max-w-[180px]',
                'opacity-0 group-hover/nav:opacity-100 transition-all duration-200',
                'translate-x-1 group-hover/nav:translate-x-0',
                'bg-[#1A1A2E]/95 backdrop-blur-lg border border-white/[0.08] rounded-xl',
                isActive ? 'text-[#BB86FC]' : 'text-white/70',
                'shadow-[0_4px_16px_rgba(0,0,0,0.4)]',
              )}>
                <div className={cn('absolute right-full top-1/2 -translate-y-1/2 w-2 h-2 rotate-45', 'bg-[#1A1A2E]/95 border-l border-b border-white/[0.08]')} />
                <div className="text-center">
                  <p className="text-[12px] font-semibold">{item.label}</p>
                  <p className={cn('text-[10px] leading-tight', isActive ? 'text-[#BB86FC]/50' : 'text-white/30')}>{item.desc}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden w-full"
      style={{ '--sidebar-width': sidebarCollapsed ? '64px' : '224px', '--header-offset': 'calc(3.5rem + env(safe-area-inset-top, 0px))' } as React.CSSProperties}>

      {/* Ambient Glow */}
      <div className="hidden lg:block fixed top-0 left-0 pointer-events-none z-0"
        style={{ width: '280px', height: '280px', background: 'radial-gradient(ellipse at 30% 20%, rgba(187,134,252,0.06) 0%, transparent 70%)' }} />
      <div className="hidden lg:block fixed bottom-0 left-0 pointer-events-none z-0"
        style={{ width: '200px', height: '200px', background: 'radial-gradient(ellipse at 50% 80%, rgba(3,218,198,0.03) 0%, transparent 70%)' }} />

      {/* Admin Preview Banner */}
      {isAdminPreview && (
        <div className="relative z-20 flex items-center justify-center gap-2 px-4 py-2 border-b" style={{ background: 'rgba(3,218,198,0.08)', borderColor: 'rgba(3,218,198,0.2)' }}>
          <Shield className="h-3.5 w-3.5 text-[#03DAC6] shrink-0" />
          <span className="text-[12px] font-medium text-[#03DAC6]">Admin Preview Mode</span>
          <button onClick={() => window.location.href = '/admin'}
            className="ml-2 inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-[#03DAC6]/15 text-[#03DAC6] hover:bg-[#03DAC6]/25 transition-colors">
            <ArrowLeftRight className="h-3 w-3" /> Back to Admin
          </button>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="absolute inset-0 bg-[#0D0D0D]/80 backdrop-blur-xl" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#BB86FC]/25 to-transparent" />
        <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] blur-sm pointer-events-none"
          style={{ background: 'linear-gradient(to right, transparent, rgba(187,134,252,0.15), transparent)' }} />
        <div className={cn(
          'relative flex items-center justify-between px-4 h-14 transition-all duration-300 ease-in-out',
          'lg:pl-[72px] xl:pl-[72px]', !sidebarCollapsed && 'lg:pl-[240px] xl:pl-[280px]',
        )}>
          <div className="flex items-center gap-2.5">
            <button onClick={() => setTabletSidebarOpen(true)}
              className={cn('md:flex hidden items-center justify-center w-9 h-9 rounded-xl transition-all duration-200', 'lg:hidden', 'text-white/40 hover:text-white/70 hover:bg-white/[0.06]', 'active:scale-[0.95]')}
              aria-label="Open sidebar">
              <Menu className="h-5 w-5" />
            </button>
            <div className="relative">
              <div className="absolute -inset-1 rounded-lg bg-[#BB86FC]/10 blur-md opacity-0 hover:opacity-100 transition-opacity duration-500" />
              <Image src="/logo.png" alt="Wealth Tracker Logo" width={32} height={32} className="relative rounded-md" />
            </div>
            <h1 className="text-base font-bold hidden sm:block bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #BB86FC 0%, #03DAC6 40%, #BB86FC 80%, #03DAC6 100%)', backgroundSize: '200% 200%', animation: 'gradientShift 4s ease-in-out infinite' }}>
              Wealth Tracker
            </h1>
            {(isUltimate || isPro) && !isBasic && (
              <span className="hidden sm:inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-[0.15em] px-1.5 py-[2px] rounded-md"
                style={{ background: isUltimate ? 'linear-gradient(135deg, #1a0a14, #14071e)' : 'linear-gradient(135deg, #1a1207, #1a0a14)',
                  color: isUltimate ? '#03DAC6' : '#FFD700', border: `1px solid ${isUltimate ? 'rgba(3,218,198,0.25)' : 'rgba(255,215,0,0.2)'}` }}>
                {isUltimate ? <Gem className="h-2.5 w-2.5" /> : <Crown className="h-2.5 w-2.5" style={{ filter: 'drop-shadow(0 0 2px rgba(255,215,0,0.5))' }} />}
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: isUltimate ? 'linear-gradient(135deg, #03DAC6, #03DAC6)' : 'linear-gradient(135deg, #FFD700, #FFA500)' }}>
                  {isUltimate ? 'ULTIMATE' : 'PRO'}
                </span>
              </span>
            )}
            {/* Mode indicator in header */}
            {mode !== 'personal' && isUltimate && (
              <span className="hidden sm:inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-2 py-[2px] rounded-md"
                style={{ background: mode === 'bisnis' ? 'rgba(3,218,198,0.1)' : 'rgba(255,215,0,0.1)',
                  color: mode === 'bisnis' ? '#03DAC6' : '#FFD700',
                  border: `1px solid ${mode === 'bisnis' ? 'rgba(3,218,198,0.2)' : 'rgba(255,215,0,0.2)'}` }}>
                {mode === 'bisnis' ? t('nav.bisnis') : t('nav.investasi')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 w-9 p-0 rounded-full relative group/avatar">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#BB86FC]/20 to-[#03DAC6]/20 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300 blur-sm" />
                  <Avatar className="relative h-8 w-8 ring-1 ring-white/[0.08] group-hover/avatar:ring-[#BB86FC]/30 transition-all duration-300">
                    {user?.image ? <AvatarImage src={user.image} alt={user.username} className="object-cover" /> : null}
                    <AvatarFallback className="bg-[#BB86FC]/15 text-[#BB86FC] text-xs font-semibold border border-[#BB86FC]/10">
                      {user?.username ? getInitials(user.username) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#0D0D0D]/95 backdrop-blur-xl border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] shadow-black/30">
                <DropdownMenuLabel className="text-white/80 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-[#BB86FC]/15 flex items-center justify-center text-[#BB86FC] text-xs font-semibold shrink-0">
                      {user?.username ? getInitials(user.username) : 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{user?.username || 'User'}</p>
                        {getPlanBadge()}
                      </div>
                      <p className="text-[11px] text-white/35 font-normal truncate">{user?.email || ''}</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/[0.06] my-1" />
                <DropdownMenuItem onClick={() => navigateTo('profile')} className="text-white/60 focus:text-white focus:bg-white/[0.05] rounded-lg mx-1 my-0.5 cursor-pointer transition-colors">
                  <Settings className="mr-2.5 h-4 w-4 text-white/30" />
                  <span className="text-[13px]">{t('profile.settingsProfile')}</span>
                </DropdownMenuItem>
                {user?.role === 'admin' && (
                  <>
                    <DropdownMenuSeparator className="bg-white/[0.06] my-1" />
                    <DropdownMenuItem onClick={() => { window.location.href = '/admin'; }} className="text-[#03DAC6]/80 focus:text-[#03DAC6] focus:bg-[#03DAC6]/8 rounded-lg mx-1 my-0.5 cursor-pointer transition-colors">
                      <ArrowLeftRight className="mr-2.5 h-4 w-4 text-[#03DAC6]/50" />
                      <span className="text-[13px]">Switch to Admin</span>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator className="bg-white/[0.06] my-1" />
                <DropdownMenuItem onClick={handleLogout} className="text-[#CF6679]/80 focus:text-[#CF6679] focus:bg-[#CF6679]/8 rounded-lg mx-1 my-0.5 cursor-pointer transition-colors">
                  <LogOut className="mr-2.5 h-4 w-4 text-[#CF6679]/50" />
                  <span className="text-[13px]">{t('layout.logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <AnnouncementBanner />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden announcement-pt" style={{ paddingTop: 'calc(var(--header-offset, 3.5rem) + var(--announcement-height, 0px))' }}>

          {/* Desktop Sidebar */}
          <aside className={cn('hidden lg:flex flex-col fixed left-0 bottom-0 z-20 transition-all duration-300 ease-in-out', sidebarCollapsed ? 'w-[64px]' : 'w-56 xl:w-64')}
            style={{ '--sidebar-width': sidebarCollapsed ? '64px' : '224px', top: 'calc(var(--header-offset, 3.5rem) + var(--announcement-height, 0px))' } as React.CSSProperties}>
            <div className="absolute inset-0 backdrop-blur-2xl" style={{ background: 'linear-gradient(180deg, #0F0A1A 0%, #0D0D0D 25%, #0A0F0D 75%, #0D0D0D 100%)' }} />
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(187,134,252,0.04) 0%, transparent 25%, transparent 75%, rgba(3,218,198,0.03) 100%)' }} />
            <div className="absolute top-0 right-0 bottom-0 w-px overflow-hidden">
              <div className="absolute inset-0 h-full animate-divider-shimmer"
                style={{ background: 'linear-gradient(180deg, #BB86FC 0%, transparent 30%, transparent 70%, #03DAC6 100%)', backgroundSize: '100% 200%' }} />
            </div>
            {renderNavItems(sidebarCollapsed)}
            {/* Mini Stats */}
            {monthlyStats && !sidebarCollapsed && mode === 'personal' && (
              <div className="relative px-2 pb-1">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      <ArrowUpRight className="h-3 w-3 text-[#03DAC6]" />
                      <span className="text-[9px] text-white/40 uppercase tracking-wider font-medium">{t('dashboard.income')}</span>
                    </div>
                    <span className="text-[11px] font-bold text-[#03DAC6] tabular-nums truncate block">
                      {monthlyStats.income >= 1000000 ? `${(monthlyStats.income / 1000000).toFixed(1)}M` : monthlyStats.income >= 1000 ? `${(monthlyStats.income / 1000).toFixed(0)}K` : monthlyStats.income}
                    </span>
                  </div>
                  <div className="w-px h-8 bg-white/[0.06]" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      <ArrowDownRight className="h-3 w-3 text-[#CF6679]" />
                      <span className="text-[9px] text-white/40 uppercase tracking-wider font-medium">{t('dashboard.expense')}</span>
                    </div>
                    <span className="text-[11px] font-bold text-[#CF6679] tabular-nums truncate block">
                      {monthlyStats.expense >= 1000000 ? `${(monthlyStats.expense / 1000000).toFixed(1)}M` : monthlyStats.expense >= 1000 ? `${(monthlyStats.expense / 1000).toFixed(0)}K` : monthlyStats.expense}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {/* Collapse toggle */}
            <div className="relative p-2 border-t border-white/[0.04]">
              <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={cn('flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl transition-all duration-200', 'text-white/25 hover:text-white/50', 'hover:bg-white/[0.04]', 'active:scale-[0.96]')}>
                <div className={cn('grid place-items-center w-6 h-6 rounded-md transition-all duration-200 [&>*]:block leading-none', 'hover:bg-[#BB86FC]/10 hover:text-[#BB86FC] group/toggle')}>
                  {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5 shrink-0" /> : <ChevronLeft className="h-3.5 w-3.5 shrink-0" />}
                </div>
                {!sidebarCollapsed && <span className="text-[11px] font-medium whitespace-nowrap text-white/30">{t('layout.collapse')}</span>}
              </button>
            </div>
          </aside>

          {/* Tablet Sidebar */}
          {tabletSidebarOpen && (
            <>
              <div className="md:block hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setTabletSidebarOpen(false)} style={{ animation: 'fadeIn 0.2s ease-out' }} />
              <aside className="md:block hidden fixed left-0 bottom-0 z-40 w-64 flex-col lg:hidden"
                style={{ top: 'calc(var(--header-offset, 3.5rem) + var(--announcement-height, 0px))', animation: 'slideInLeft 0.25s ease-out' }}>
                <div className="absolute inset-0 bg-[#0D0D0D]/95 backdrop-blur-2xl rounded-r-2xl" />
                <div className="absolute inset-0 pointer-events-none rounded-r-2xl" style={{ background: 'linear-gradient(180deg, rgba(187,134,252,0.04) 0%, transparent 30%, transparent 70%, rgba(3,218,198,0.02) 100%)' }} />
                <div className="absolute top-0 right-0 bottom-0 w-px overflow-hidden">
                  <div className="absolute inset-0 h-full animate-divider-shimmer" style={{ background: 'linear-gradient(180deg, #BB86FC 0%, transparent 30%, transparent 70%, #03DAC6 100%)', backgroundSize: '100% 200%' }} />
                </div>
                <div className="relative flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <Image src="/logo.png" alt="Logo" width={24} height={24} className="rounded-md" />
                    <span className="text-sm font-bold bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #BB86FC, #03DAC6)' }}>Wealth Tracker</span>
                  </div>
                  <button onClick={() => setTabletSidebarOpen(false)} className="grid place-items-center w-7 h-7 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all duration-200 [&>*]:block leading-none">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {renderNavItems(false, (page) => { setTabletSidebarOpen(false); setTimeout(() => navigateTo(page), 100); })}
                <div className="relative p-3 border-t border-white/[0.06]">
                  <div className="flex items-center gap-2 px-3 py-2.5 mx-2 mb-2 rounded-xl"
                    style={{ background: isUltimate ? 'linear-gradient(135deg, rgba(3,218,198,0.06), rgba(187,134,252,0.06))' : isPro ? 'linear-gradient(135deg, rgba(255,215,0,0.06), rgba(207,102,121,0.06))' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isUltimate ? 'rgba(3,218,198,0.12)' : isPro ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.04)'}` }}>
                    {isUltimate ? <Gem className="h-4 w-4 shrink-0" style={{ color: '#03DAC6' }} /> : isPro ? <Crown className="h-4 w-4 shrink-0" style={{ color: '#FFD700' }} /> : <Sparkles className="h-4 w-4 shrink-0" style={{ color: '#666' }} />}
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold" style={{ color: isUltimate ? '#03DAC6' : isPro ? '#FFD700' : '#888' }}>{isUltimate ? 'ULTIMATE' : isPro ? 'PRO' : 'BASIC'}</p>
                      <p className="text-[9px]" style={{ color: isUltimate ? 'rgba(3,218,198,0.5)' : isPro ? 'rgba(255,215,0,0.5)' : '#555' }}>{isUltimate ? 'Bisnis & Investasi' : isPro ? t('layout.planFullAccess') : t('layout.planLimited')}</p>
                    </div>
                  </div>
                </div>
              </aside>
            </>
          )}

          {/* Page Content */}
          <main className={cn('flex-1 p-3 md:p-4 lg:p-6 xl:p-8 overflow-y-auto w-full min-w-0 max-w-full transition-all duration-300 ease-in-out',
            'pb-[72px] lg:pb-8', sidebarCollapsed ? 'lg:ml-[64px] xl:ml-[64px]' : 'lg:ml-56 xl:ml-64')}>
            {isTransitioning && (
              <div className="fixed left-0 right-0 z-50 h-[2px]" style={{ top: 'calc(var(--header-offset, 3.5rem) + var(--announcement-height, 0px))' }}>
                <div className="h-full" style={{ background: 'linear-gradient(90deg, #BB86FC, #03DAC6, #BB86FC)', backgroundSize: '200% 100%', animation: 'progressShimmer 1s ease-in-out infinite', boxShadow: '0 0 12px rgba(187,134,252,0.4), 0 0 4px rgba(3,218,198,0.3)' }} />
              </div>
            )}
            <div className="max-w-6xl mx-auto">
              <div key={pageKey} className={cn('transition-opacity duration-300', isTransitioning ? 'opacity-0' : 'opacity-100')}>
                {renderPage()}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Bottom Navigation (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.06] safe-area-inset-bottom md:hidden"
        style={{ background: 'rgba(13, 13, 13, 0.82)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' }}>
        {/* Mobile Mode Switch */}
        {isUltimate && (
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-white/[0.04]">
            {(['personal', 'bisnis', 'investasi'] as const).map((m) => (
              <button key={m} onClick={() => handleModeSwitch(m)}
                className={cn('flex-1 text-[10px] font-semibold py-1 rounded-lg transition-all',
                  mode === m ? (m === 'personal' ? 'bg-[#BB86FC]/20 text-[#BB86FC]' : m === 'bisnis' ? 'bg-[#03DAC6]/20 text-[#03DAC6]' : 'bg-[#FFD700]/20 text-[#FFD700]')
                    : 'text-white/30')}>
                {m === 'personal' ? t('biz.personal') : m === 'bisnis' ? t('nav.bisnis') : t('nav.investasi')}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center justify-around px-2 h-[52px]">
          {navigation.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button key={item.id} onClick={() => navigateTo(item.id)}
                className="relative grid place-items-center py-1.5 px-2 rounded-xl min-w-0 flex-1 transition-all duration-200 active:scale-95 [&>*]:block leading-none">
                {isActive && (
                  <div className="absolute -top-0 left-1/2 -translate-x-1/2">
                    <div className="w-4 h-[3px] rounded-full bg-[#BB86FC]" style={{ boxShadow: '0 0 8px rgba(187,134,252,0.5), 0 2px 4px rgba(187,134,252,0.3)' }} />
                  </div>
                )}
                <div className="relative">
                  <Icon className={cn('h-4.5 w-4.5 transition-all duration-200', isActive ? 'text-[#BB86FC] drop-shadow-[0_0_6px_rgba(187,134,252,0.4)]' : 'text-[#555]')} strokeWidth={isActive ? 2.2 : 1.5} />
                  {item.lock && <Lock className="absolute -top-1 -right-1 h-2 w-2 text-[#FFD700]/50" />}
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer (mobile) */}
      <footer className="border-t border-white/[0.06] px-2 py-2 bg-[#0D0D0D]/50 pb-[60px] md:hidden">
        <div className="text-center text-[11px] text-white/20">Creator: Tyger Earth | Ahtjong Labs</div>
      </footer>

      {/* Dialogs */}
      <BusinessRegisterDialog open={showBizRegister} onOpenChange={(o) => { setShowBizRegister(o); if (!o) { setMode('personal'); setCurrentPage('dashboard'); } }} />
      <InvestmentRegisterDialog open={showInvRegister} onOpenChange={(o) => { setShowInvRegister(o); if (!o) { setMode('personal'); setCurrentPage('dashboard'); } }} />
      {quickTransactionVisible && mode === 'personal' && <QuickTransaction />}
    </div>
  );
}
