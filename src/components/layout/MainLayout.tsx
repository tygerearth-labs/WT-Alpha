'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  BarChart3,
  Gem,
  BookOpen,
  Palette,
  ArrowDownUp,
  CheckCircle2,
  ChevronDown,
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
import BusinessAllocation from '@/components/business/BusinessAllocation';
import BusinessLaporan from '@/components/business/BusinessLaporan';
import BusinessPnL from '@/components/business/BusinessPnL';
import BusinessForecast from '@/components/business/BusinessForecast';
import BusinessInvoiceSettings from '@/components/business/BusinessInvoiceSettings';
import InvestmentDashboard from '@/components/investment/InvestmentDashboard';
import InvestmentPortfolio from '@/components/investment/InvestmentPortfolio';
import UltimateTradingJournal from '@/components/investment/UltimateTradingJournal';
import InvestmentRegisterDialog from '@/components/investment/InvestmentRegisterDialog';
import QuantMacroPanel from '@/components/investment/QuantMacroPanel';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { AnnouncementBanner } from '@/components/shared/AnnouncementBanner';

type PageType =
  | 'dashboard' | 'kas-masuk' | 'kas-keluar' | 'target' | 'laporan' | 'profile'
  | 'biz-dashboard' | 'biz-kas' | 'biz-penjualan' | 'biz-invoice' | 'biz-customer'
  | 'biz-allocation' | 'biz-laporan' | 'biz-pnl' | 'biz-forecast' | 'biz-invoice-settings'
  | 'inv-dashboard' | 'inv-portfolio' | 'inv-journal' | 'inv-quant' | 'inv-macro';

interface NavItem {
  id: PageType;
  label: string;
  icon: LucideIcon;
  desc?: string;
  lock?: boolean;
}

export function MainLayout() {
  const { user, logout } = useAuthStore();
  const { mode, setMode, businesses, setBusinesses, setActiveBusiness, activeBusiness, setLoading: setBizLoading } = useBusinessStore();
  const activeBusinessId = activeBusiness?.id || '';
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

  // Listen for biz-navigate and notif-navigate events from child components / notifications
  useEffect(() => {
    const VALID_PAGES = new Set<string>([
      'dashboard','kas-masuk','kas-keluar','target','laporan','profile',
      'biz-dashboard','biz-kas','biz-penjualan','biz-invoice','biz-customer',
      'biz-allocation','biz-laporan','biz-pnl','biz-forecast','biz-invoice-settings',
      'inv-dashboard','inv-portfolio','inv-journal','inv-quant','inv-macro',
    ]);
    const handler = (e: Event) => {
      const { page } = (e as CustomEvent).detail;
      if (page && VALID_PAGES.has(page) && page !== currentPage) {
        navigateTo(page as PageType);
      }
    };
    window.addEventListener('biz-navigate', handler);
    window.addEventListener('notif-navigate', handler);
    return () => {
      window.removeEventListener('biz-navigate', handler);
      window.removeEventListener('notif-navigate', handler);
    };
  }, [currentPage, navigateTo]);

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
    // Always set mode & page first so sidebar nav updates immediately
    setMode(newMode);
    setActiveBusiness(existingBiz || null);
    setCurrentPage(newMode === 'bisnis' ? 'biz-dashboard' : 'inv-dashboard');
    setPageKey(prev => prev + 1);
    if (!existingBiz) {
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
    { id: 'biz-kas', label: 'Cashflow', icon: Wallet, desc: 'Arus Kas & Piutang' },
    { id: 'biz-penjualan', label: t('biz.penjualan'), icon: ShoppingCart, desc: 'Penjualan' },
    { id: 'biz-invoice', label: t('biz.invoice'), icon: Receipt, desc: 'Invoice' },
    { id: 'biz-customer', label: t('biz.customers'), icon: Users, desc: 'Pelanggan' },
    { id: 'biz-allocation', label: t('biz.autoAllocation'), icon: ArrowLeftRight, desc: 'Alokasi ke Pribadi' },
    { id: 'biz-laporan', label: t('biz.bizLaporan'), icon: BarChart3, desc: 'Laporan' },
    { id: 'biz-pnl', label: 'Laba Rugi', icon: TrendingUp, desc: 'Laporan Laba Rugi' },
    { id: 'biz-forecast', label: 'Proyeksi Kas', icon: LineChart, desc: 'Proyeksi Arus Kas' },
    { id: 'biz-invoice-settings', label: t('biz.invoiceSettings'), icon: Palette, desc: 'Template & Branding' },
  ], [t]);

  const investmentNav: NavItem[] = useMemo(() => [
    { id: 'inv-dashboard', label: t('inv.invDashboard'), icon: LineChart, desc: t('inv.dashGuideDashboard').split(' — ')[0] },
    { id: 'inv-portfolio', label: t('inv.portfolios'), icon: Gem, desc: t('inv.dashGuidePortfolio').split(' — ')[0] },
    { id: 'inv-quant', label: 'Quant & Market', icon: TrendingUp, desc: t('inv.dashGuideQuant').split(' — ')[0] },
    { id: 'inv-journal', label: t('inv.tradingJournal'), icon: BookOpen, desc: t('inv.dashGuideJournal').split(' — ')[0] },
  ], [t]);

  const navigation = useMemo(() => {
    if (mode === 'bisnis') return businessNav;
    if (mode === 'investasi') return investmentNav;
    return personalNav;
  }, [mode, personalNav, businessNav, investmentNav]);

  // Check registered categories
  const hasBisnis = businesses.some(b => b.category === 'bisnis');
  const hasInvestasi = businesses.some(b => b.category === 'investasi');

  const renderPage = () => {
    if (mode === 'bisnis') {
      if (!hasBisnis) {
        return (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Briefcase className="h-12 w-12 text-[#03DAC6]/30 mx-auto mb-3" />
              <p className="text-white/50 text-sm">{t('biz.registerFirst') || 'Silakan daftarkan Bisnis terlebih dahulu'}</p>
            </div>
          </div>
        );
      }
      switch (currentPage) {
        case 'biz-dashboard': return <BusinessDashboard />;
        case 'biz-kas': return <BusinessCash />;
        case 'biz-penjualan': return <BusinessSales />;
        case 'biz-invoice': return <BusinessInvoice />;
        case 'biz-customer': return <BusinessCustomers />;
        case 'biz-allocation': return <BusinessAllocation />;
        case 'biz-laporan': return <BusinessLaporan />;
        case 'biz-pnl': return <BusinessPnL />;
        case 'biz-forecast': return <BusinessForecast />;
        case 'biz-invoice-settings': return <BusinessInvoiceSettings />;
        default: return <BusinessDashboard />;
      }
    }
    if (mode === 'investasi') {
      if (!hasInvestasi) {
        return (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <LineChart className="h-12 w-12 text-[#FFD700]/30 mx-auto mb-3" />
              <p className="text-white/50 text-sm">{t('inv.registerFirst') || 'Silakan daftarkan Investasi terlebih dahulu'}</p>
            </div>
          </div>
        );
      }
      switch (currentPage) {
        case 'inv-dashboard': return <InvestmentDashboard />;
        case 'inv-portfolio': return <InvestmentPortfolio />;
        case 'inv-quant': return <QuantMacroPanel />;
        case 'inv-macro': return <QuantMacroPanel />;
        case 'inv-journal': return <UltimateTradingJournal businessId={activeBusinessId} />;
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

  /* ── Mode-aware color helper ── */
  const modeColor = (m: string) =>
    m === 'bisnis' ? '#03DAC6' : m === 'investasi' ? '#FFD700' : '#BB86FC';
  const modeColorClass = (m: string) =>
    m === 'bisnis' ? 'text-[#03DAC6]' : m === 'investasi' ? 'text-[#FFD700]' : 'text-[#BB86FC]';

  /* ── Mode Switch Component (Dropdown) ── */
  const modeList: { key: BusinessMode; icon: LucideIcon; label: string }[] = [
    { key: 'personal', icon: LayoutDashboard, label: t('biz.personal') },
    { key: 'bisnis', icon: Briefcase, label: t('nav.bisnis') },
    { key: 'investasi', icon: Gem, label: t('nav.investasi') },
  ];

  const activeModeItem = modeList.find(m => m.key === mode) || modeList[0];
  const ActiveModeIcon = activeModeItem.icon;

  const ModeSwitch = ({ collapsed }: { collapsed: boolean }) => (
    <div className={cn('pb-3 mb-1', collapsed ? 'px-1.5' : 'px-2')}>
      {collapsed ? (
        /* Collapsed: icon-only buttons stacked vertically */
        <div className="flex flex-col gap-1">
          {modeList.map((m) => {
            const isActive = mode === m.key;
            const isLocked = m.key !== 'personal' && !isUltimate;
            const isRegistered = m.key === 'bisnis' ? hasBisnis : m.key === 'investasi' ? hasInvestasi : true;
            const Icon = m.icon;
            return (
              <button
                key={m.key}
                onClick={() => handleModeSwitch(m.key)}
                className={cn(
                  'relative w-10 h-10 grid place-items-center mx-auto rounded-lg border transition-all duration-200',
                  isActive
                    ? 'border-white/[0.1]'
                    : 'border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04]',
                  isActive ? modeColorClass(m.key) : 'text-white/30 hover:text-white/55',
                  isLocked && 'opacity-25 pointer-events-none',
                )}
                title={m.label}
              >
                {isLocked && <Lock className="absolute -top-0.5 -right-0.5 h-2 w-2 text-[#FFD700]/50" />}
                <Icon className={cn('h-4 w-4', isActive && 'drop-shadow-[0_0_4px_currentColor]')} strokeWidth={isActive ? 2.2 : 1.5} />
                {isRegistered && m.key !== 'personal' && isUltimate && (
                  <span className="absolute -top-0.5 -right-0.5 h-[7px] w-[7px] rounded-full" style={{ background: '#03DAC6', boxShadow: '0 0 6px rgba(3,218,198,0.6)' }} />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        /* Expanded: compact dropdown selector */
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-2 w-full px-3 py-2 rounded-xl transition-all duration-200 border',
                'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1]',
                'active:scale-[0.97]',
              )}
            >
              <div className={cn('grid place-items-center w-7 h-7 rounded-lg shrink-0 transition-all duration-200', modeColorClass(mode))}
                style={{ background: `${modeColor(mode)}15` }}>
                <ActiveModeIcon className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
              <span className={cn('text-[11px] font-bold uppercase tracking-wide flex-1 text-left', modeColorClass(mode))}>
                {activeModeItem.label}
              </span>
              <div className="flex items-center gap-1">
                {mode !== 'personal' && (
                  <CheckCircle2 className="h-3 w-3 opacity-60" style={{ color: modeColor(mode) }} />
                )}
                <ChevronDown className="h-3 w-3 text-white/25" />
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="bottom"
            align="center"
            className="w-[200px] bg-[#0D0D0D]/95 backdrop-blur-xl border-white/[0.08] rounded-xl p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
          >
            {modeList.map((m) => {
              const isActive = mode === m.key;
              const isLocked = m.key !== 'personal' && !isUltimate;
              const isRegistered = m.key === 'bisnis' ? hasBisnis : m.key === 'investasi' ? hasInvestasi : true;
              const Icon = m.icon;
              return (
                <DropdownMenuItem
                  key={m.key}
                  onClick={() => handleModeSwitch(m.key)}
                  disabled={isLocked}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors',
                    isActive
                      ? 'bg-white/[0.06]'
                      : 'hover:bg-white/[0.04]',
                    isLocked ? 'opacity-30 cursor-not-allowed' : '',
                  )}
                >
                  <div className={cn(
                    'grid place-items-center w-7 h-7 rounded-lg shrink-0 transition-all',
                    isActive ? modeColorClass(m.key) : 'text-white/30',
                  )}
                    style={{ background: isActive ? `${modeColor(m.key)}15` : 'transparent' }}>
                    <Icon className="h-3.5 w-3.5" strokeWidth={isActive ? 2 : 1.5} />
                  </div>
                  <span className={cn(
                    'text-[12px] font-semibold flex-1',
                    isActive ? modeColorClass(m.key) : 'text-white/50',
                  )}>
                    {m.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isLocked && <Lock className="h-3 w-3 text-[#FFD700]/40" />}
                    {!isLocked && isRegistered && m.key !== 'personal' && isUltimate && (
                      <CheckCircle2 className="h-3 w-3" style={{ color: isActive ? modeColor(m.key) : 'rgba(3,218,198,0.4)' }} />
                    )}
                    {isActive && (
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: modeColor(mode) }} />
                    )}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  /* ── Shared sidebar nav renderer ── */
  const renderNavItems = (collapsed: boolean, onNavigate?: (page: PageType) => void) => {
    const activeColor = modeColor(mode);
    const activeColorRgb = mode === 'bisnis' ? '3,218,198' : mode === 'investasi' ? '255,215,0' : '187,134,252';
    return (
    <nav className="relative flex-1 py-4 px-2 space-y-0.5 overflow-y-auto scrollbar-hide">
      <ModeSwitch collapsed={collapsed} />
      {navigation.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        return (
          <div key={item.id} className="relative group/nav">
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
                <div className="w-[3px] h-6 rounded-r-full"
                  style={{ background: activeColor, boxShadow: `0 0 8px rgba(${activeColorRgb},0.4), 0 0 16px rgba(${activeColorRgb},0.15)` }} />
              </div>
            )}
            <button
              onClick={() => (onNavigate ? onNavigate(item.id) : navigateTo(item.id))}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-200 text-left relative overflow-hidden',
                isActive ? 'text-[#BB86FC]' : 'text-white/35 hover:text-white/70 hover:bg-white/[0.04]',
                !isActive && 'group-hover/nav:translate-x-1',
                'active:scale-[0.97]',
              )}
              style={isActive ? {
                background: `rgba(${activeColorRgb}, 0.08)`,
                color: activeColor,
              } : undefined}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <div className="absolute inset-0 opacity-100"
                  style={{ background: `radial-gradient(ellipse at 0% 50%, rgba(${activeColorRgb}, 0.06) 0%, transparent 70%)` }} />
              )}
              {!isActive && (
                <div className="absolute inset-0 opacity-0 group-hover/nav:opacity-100 transition-opacity duration-300"
                  style={{ background: `radial-gradient(ellipse at 0% 50%, rgba(${activeColorRgb}, 0.04) 0%, transparent 70%)` }} />
              )}
              <div className="relative flex items-center gap-3 w-full">
                <Icon className={cn(
                  'h-[18px] w-[18px] shrink-0 transition-all duration-200',
                  isActive ? 'drop-shadow-[0_0_4px_currentColor]' : 'text-white/25 group-hover/nav:text-white/60',
                )} strokeWidth={isActive ? 2.2 : 1.5} />
                {!collapsed && (
                  <span className={cn(
                    'text-[13px] font-medium whitespace-nowrap transition-all duration-200',
                    isActive ? '' : 'text-white/45 group-hover/nav:text-white/80',
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
  };

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
        <div className="absolute inset-0 bg-[#0D0D0D]/100 backdrop-blur-xl" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#BB86FC]/25 to-transparent" />
        <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] blur-sm pointer-events-none"
          style={{ background: 'linear-gradient(to right, transparent, rgba(187,134,252,0.15), transparent)' }} />
        <div className={cn(
          'relative flex items-center justify-between px-4 h-14 transition-all duration-300 ease-in-out',
          'lg:pl-[72px] xl:pl-[72px]', !sidebarCollapsed && 'lg:pl-[240px] xl:pl-[280px]',
        )}>
          <div className="flex items-center gap-2.5">
            <button onClick={() => setTabletSidebarOpen(true)}
              className={cn('md:flex hidden items-center justify-center w-10 h-10 rounded-xl transition-all duration-200', 'lg:hidden', 'text-white/40 hover:text-white/70 hover:bg-white/[0.06]', 'active:scale-[0.95]', 'border border-white/[0.06] hover:border-white/[0.12]')}
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
                <Button variant="ghost" className="h-10 w-10 p-0 rounded-full relative group/avatar">
                  <div className="absolute -inset-0.5 rounded-full opacity-60 group-hover/avatar:opacity-100 transition-opacity duration-300" style={{ background: `conic-gradient(from 0deg, ${modeColor(mode)}40, transparent 60%, ${modeColor(mode)}40)`, padding: '1.5px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }} />
                  <Avatar className="relative h-8 w-8 ring-1 ring-white/[0.08] group-hover/avatar:ring-white/[0.15] transition-all duration-300">
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
                    <DropdownMenuItem onClick={() => { window.location.href = '/admin'; }} className="text-[#03DAC6]/100 focus:text-[#03DAC6] focus:bg-[#03DAC6]/10 rounded-lg mx-1 my-0.5 cursor-pointer transition-colors">
                      <ArrowLeftRight className="mr-2.5 h-4 w-4 text-[#03DAC6]/50" />
                      <span className="text-[13px]">Switch to Admin</span>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator className="bg-white/[0.06] my-1" />
                <DropdownMenuItem onClick={handleLogout} className="text-[#CF6679]/100 focus:text-[#CF6679] focus:bg-[#CF6679]/10 rounded-lg mx-1 my-0.5 cursor-pointer transition-colors">
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
                      {monthlyStats.income >= 1000000 ? `${((monthlyStats.income ?? 0) / 1000000).toFixed(1)}M` : monthlyStats.income >= 1000 ? `${((monthlyStats.income ?? 0) / 1000).toFixed(0)}K` : monthlyStats.income}
                    </span>
                  </div>
                  <div className="w-px h-8 bg-white/[0.06]" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      <ArrowDownRight className="h-3 w-3 text-[#CF6679]" />
                      <span className="text-[9px] text-white/40 uppercase tracking-wider font-medium">{t('dashboard.expense')}</span>
                    </div>
                    <span className="text-[11px] font-bold text-[#CF6679] tabular-nums truncate block">
                      {monthlyStats.expense >= 1000000 ? `${((monthlyStats.expense ?? 0) / 1000000).toFixed(1)}M` : monthlyStats.expense >= 1000 ? `${((monthlyStats.expense ?? 0) / 1000).toFixed(0)}K` : monthlyStats.expense}
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
              <div className="md:block hidden fixed inset-0 z-30 lg:hidden transition-opacity duration-300" onClick={() => setTabletSidebarOpen(false)} style={{ animation: 'fadeIn 0.3s ease-out', background: 'radial-gradient(ellipse at left center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.4) 100%)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} />
              <aside className="md:block hidden fixed left-0 bottom-0 z-40 w-72 flex-col lg:hidden"
                style={{ top: 'calc(var(--header-offset, 3.5rem) + var(--announcement-height, 0px))', animation: 'slideInLeft 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}>
                <div className="absolute inset-0 bg-[#0D0D0D]/95 backdrop-blur-2xl rounded-r-2xl" />
                <div className="absolute inset-0 pointer-events-none rounded-r-2xl" style={{ background: `linear-gradient(180deg, ${modeColor(mode)}08 0%, transparent 30%, transparent 70%, ${modeColor(mode)}04 100%)` }} />
                <div className="absolute top-0 right-0 bottom-0 w-px overflow-hidden">
                  <div className="absolute inset-0 h-full animate-divider-shimmer" style={{ background: 'linear-gradient(180deg, #BB86FC 0%, transparent 30%, transparent 70%, #03DAC6 100%)', backgroundSize: '100% 200%' }} />
                </div>
                <div className="relative flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <Image src="/logo.png" alt="Logo" width={24} height={24} className="rounded-md" />
                    <span className="text-sm font-bold bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #BB86FC, #03DAC6)' }}>Wealth Tracker</span>
                  </div>
                  <button onClick={() => setTabletSidebarOpen(false)} className="grid place-items-center w-8 h-8 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.08] border border-white/[0.04] hover:border-white/[0.1] transition-all duration-200 active:scale-[0.92] [&>*]:block leading-none">
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
          <main className={cn('flex-1 p-3 md:p-4 lg:p-6 xl:p-8 overflow-y-auto overflow-x-hidden w-full min-w-0 max-w-full transition-all duration-300 ease-in-out scrollbar-hide safe-bottom',
            'pb-[90px] lg:pb-8', sidebarCollapsed ? 'lg:ml-[64px] xl:ml-[64px]' : 'lg:ml-56 xl:ml-64')}>
            {isTransitioning && (
              <div className="fixed left-0 right-0 z-50 h-[2px]" style={{ top: 'calc(var(--header-offset, 3.5rem) + var(--announcement-height, 0px))' }}>
                <div className="h-full animate-pulse" style={{ background: modeColor(mode), boxShadow: `0 0 12px ${modeColor(mode)}66` }} />
              </div>
            )}
            <div className="max-w-6xl mx-auto overflow-x-hidden">
              <div key={pageKey} className={cn('transition-opacity duration-300', isTransitioning ? 'opacity-0' : 'opacity-100')}>
                {renderPage()}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Bottom Navigation (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden safe-bottom"
        style={{ background: 'rgba(13, 13, 13, 0.82)', backdropFilter: 'blur(32px) saturate(200%)', WebkitBackdropFilter: 'blur(32px) saturate(200%)' }}>
        {/* Subtle top gradient line */}
        <div className="absolute top-0 left-0 right-0 h-px z-10" style={{ background: `linear-gradient(90deg, transparent 0%, ${modeColor(mode)}30 20%, ${modeColor(mode)}50 50%, ${modeColor(mode)}30 80%, transparent 100%)` }} />
        <div className="absolute top-0 left-1/4 right-1/4 h-[3px] pointer-events-none" style={{ background: `linear-gradient(90deg, transparent, ${modeColor(mode)}18, transparent)`, filter: 'blur(2px)' }} />
        {/* Mobile Mode Switch */}
        <div className="relative flex items-center gap-0.5 px-2 py-1.5 border-b border-white/[0.04]">
          {/* Sliding pill */}
          <div
            className="absolute top-[4px] bottom-[4px] rounded-lg transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{
              width: `calc((100% - 20px) / 3)`,
              left: `calc(${modeList.findIndex(m => m.key === mode)} * ((100% - 20px) / 3) + 10px)`,
              background: `${modeColor(mode)}15`,
              border: `1px solid ${modeColor(mode)}20`,
              boxShadow: `0 0 16px ${modeColor(mode)}15, inset 0 0 8px ${modeColor(mode)}08`,
            }}
          />
          {modeList.map((m) => {
            const isActive = mode === m.key;
            const isLocked = m.key !== 'personal' && !isUltimate;
            const isRegistered = m.key === 'bisnis' ? hasBisnis : m.key === 'investasi' ? hasInvestasi : true;
            const Icon = m.icon;
            return (
              <button key={m.key} onClick={() => handleModeSwitch(m.key)}
                className={cn(
                  'relative z-10 flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all duration-200',
                  isActive ? modeColorClass(m.key) : 'text-white/25',
                  isLocked && 'opacity-25 pointer-events-none',
                )}>
                <Icon className={cn('h-3.5 w-3.5 shrink-0', isActive && 'drop-shadow-[0_0_3px_currentColor]')} strokeWidth={isActive ? 2.2 : 1.5} />
                <span className="text-[10px] font-bold tracking-wide">{m.label}</span>
                {isRegistered && m.key !== 'personal' && isUltimate && (
                  <CheckCircle2 className="h-2.5 w-2.5 shrink-0 opacity-60" />
                )}
                {isLocked && <Lock className="absolute -top-0.5 -right-0.5 h-2 w-2 text-[#FFD700]/50" />}
              </button>
            );
          })}
        </div>
        {/* Mobile page nav items — scrollable */}
        <div className="flex items-center px-1 h-[46px] overflow-x-auto scrollbar-hide">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button key={item.id} onClick={() => navigateTo(item.id)}
                className="relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl min-w-[56px] shrink-0 transition-all duration-200 active:scale-[0.88] active:opacity-70">
                {isActive && (
                  <div className="absolute -top-0 left-1/2 -translate-x-1/2">
                    <div className="w-6 h-[2.5px] rounded-full animate-pulse" style={{ background: modeColor(mode), boxShadow: `0 0 10px ${modeColor(mode)}88, 0 0 20px ${modeColor(mode)}44` }} />
                  </div>
                )}
                <Icon className={cn(
                  'h-5 w-5 transition-all duration-200',
                  isActive ? 'drop-shadow-[0_0_6px_currentColor]' : 'text-[#555]',
                )} strokeWidth={isActive ? 2.2 : 1.5} style={isActive ? { color: modeColor(mode) } : undefined} />
                <span className={cn(
                  'text-[10px] mt-0.5 font-medium truncate w-full text-center leading-tight',
                  isActive ? '' : 'text-white/25',
                )} style={isActive ? { color: modeColor(mode) } : undefined}>{item.label}</span>
                {item.lock && <Lock className="absolute top-0 right-1 h-2 w-2 text-[#FFD700]/40" />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer (mobile) */}
      <footer className="px-2 py-2 pb-[80px] md:hidden" style={{ background: 'linear-gradient(to bottom, transparent, rgba(13,13,13,0.6))' }}>
        <div className="text-center text-[10px] text-white/15">Creator: Tyger Earth | Ahtjong Labs</div>
      </footer>

      {/* Dialogs */}
      <BusinessRegisterDialog
        open={showBizRegister}
        onOpenChange={(o) => { setShowBizRegister(o); if (!o) {
          // Only reset to personal if registration was cancelled (no business exists yet)
          const bizExists = useBusinessStore.getState().businesses.some(b => b.category === 'bisnis');
          if (!bizExists) { setMode('personal'); setCurrentPage('dashboard'); setPageKey(prev => prev + 1); }
        }}}
        onSuccess={() => {
          // Navigate to biz dashboard — businesses store already updated by dialog handleSubmit
          const biz = useBusinessStore.getState().businesses.find(b => b.category === 'bisnis');
          if (biz) setActiveBusiness(biz);
          setMode('bisnis');
          setCurrentPage('biz-dashboard');
          setPageKey(prev => prev + 1);
        }}
      />
      <InvestmentRegisterDialog
        open={showInvRegister}
        onOpenChange={(o) => { setShowInvRegister(o); if (!o) {
          const bizExists = useBusinessStore.getState().businesses.some(b => b.category === 'investasi');
          if (!bizExists) { setMode('personal'); setCurrentPage('dashboard'); setPageKey(prev => prev + 1); }
        }}}
        onSuccess={() => {
          // Navigate to inv dashboard — businesses store already updated by dialog handleSubmit
          const biz = useBusinessStore.getState().businesses.find(b => b.category === 'investasi');
          if (biz) setActiveBusiness(biz);
          setMode('investasi');
          setCurrentPage('inv-dashboard');
          setPageKey(prev => prev + 1);
        }}
      />
      {quickTransactionVisible && mode === 'personal' && <QuickTransaction />}
    </div>
  );
}
