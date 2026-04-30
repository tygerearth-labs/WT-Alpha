'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  Users,
  UserPlus,
  Shield,
  CreditCard,
  Settings,
  LogOut,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ArrowLeftRight,
  Activity,
  Bell,
  Megaphone,
  HelpCircle,
} from 'lucide-react';
import { AdminDashboard } from './AdminDashboard';
import { AdminUsers } from './AdminUsers';
import { AdminInvites } from './AdminInvites';
import { AdminSubscriptions } from './AdminSubscriptions';
import { AdminActivityLog } from './AdminActivityLog';
import { AdminSettings } from './AdminSettings';
import { AdminAnnouncements } from './AdminAnnouncements';
import { AdminAnalytics } from './AdminAnalytics';
import { AdminOnboardingTour, isTourCompleted, resetTour } from './AdminOnboardingTour';
import { toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AnnouncementBanner } from '@/components/shared/AnnouncementBanner';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from '@/components/ui/command';

export type AdminPage = 'dashboard' | 'users' | 'invites' | 'announcements' | 'subscriptions' | 'access-control' | 'activity-log' | 'settings' | 'analytics';

interface Notification {
  id: string;
  type: 'warning' | 'info' | 'success';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export function AdminLayout() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState<AdminPage>(() => {
    if (typeof window === 'undefined') return 'dashboard';
    const hash = window.location.hash.replace('#', '');
    const validPages: AdminPage[] = ['dashboard', 'users', 'subscriptions', 'analytics', 'settings', 'activity-log', 'announcements', 'invites', 'access-control'];
    if (validPages.includes(hash as AdminPage)) return hash as AdminPage;
    return 'dashboard';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const navigateTo = useCallback((page: AdminPage) => {
    setCurrentPage(page);
    window.location.hash = page;
    setMobileMenuOpen(false);
    setTourActive(false);
  }, []);

  // Sync hash changes (browser back/forward, direct URL)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const validPages: AdminPage[] = ['dashboard', 'users', 'subscriptions', 'analytics', 'settings', 'activity-log', 'announcements', 'invites', 'access-control'];
      if (validPages.includes(hash as AdminPage)) {
        setCurrentPage(hash as AdminPage);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Set initial hash on mount if none exists
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.location.hash) {
      window.location.hash = 'dashboard';
    }
  }, []);

  const handleStartTour = useCallback(() => {
    setTourActive(true);
  }, []);

  const handleTourComplete = useCallback(() => {
    setTourActive(false);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      logout();
      toast.success('Logged out successfully');
      router.replace('/');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  // Fetch notifications from activity log
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/admin/stats');
        if (res.ok) {
          const data = await res.json();
          const notifs: Notification[] = [];
          if (data.usersExpiringSoon > 0) {
            notifs.push({
              id: 'expiring',
              type: 'warning',
              title: 'Expiring Subscriptions',
              message: `${data.usersExpiringSoon} user(s) have subscriptions expiring within 7 days`,
              time: 'Check now',
              read: false,
            });
          }
          if (data.suspendedUsers > 0) {
            notifs.push({
              id: 'suspended',
              type: 'info',
              title: 'Suspended Users',
              message: `${data.suspendedUsers} user(s) currently suspended`,
              time: 'Review',
              read: false,
            });
          }
          if (data.activeInvites > 0) {
            notifs.push({
              id: 'invites',
              type: 'success',
              title: 'Active Invites',
              message: `${data.activeInvites} invite link(s) currently active`,
              time: 'View',
              read: false,
            });
          }
          if (data.totalUsers === 0) {
            notifs.push({
              id: 'no-users',
              type: 'info',
              title: 'Getting Started',
              message: 'No users registered yet. Create an invite link to get started!',
              time: 'Create',
              read: false,
            });
          }
          setNotifications(notifs);
        }
      } catch {}
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const navigation: { id: AdminPage; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'invites', label: 'Invite Links', icon: UserPlus },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'access-control', label: 'Access Control', icon: Shield },
    { id: 'activity-log', label: 'Activity Log', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <AdminDashboard onNavigate={navigateTo} />;
      case 'users': return <AdminUsers />;
      case 'invites': return <AdminInvites />;
      case 'announcements': return <AdminAnnouncements />;
      case 'subscriptions': return <AdminSubscriptions />;
      case 'access-control': return <AdminUsers showAccessControl />;
      case 'activity-log': return <AdminActivityLog />;
      case 'settings': return <AdminSettings />;
      case 'analytics': return <AdminAnalytics />;
      default: return <AdminDashboard onNavigate={navigateTo} />;
    }
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const currentPageLabel = navigation.find(n => n.id === currentPage)?.label || 'Dashboard';

  // Auto-start tour on first visit
  useEffect(() => {
    if (!isTourCompleted()) {
      const timer = setTimeout(() => {
        setTourActive(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Command palette keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderNavItems = (collapsed: boolean) => (
    <nav className="relative flex-1 py-4 px-2 space-y-1 overflow-y-auto">
      {navigation.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        return (
          <div key={item.id} className="relative group/nav">
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
                <div className="w-[3px] h-6 rounded-r-full bg-[#03DAC6]"
                  style={{ boxShadow: '0 0 8px rgba(3,218,198,0.4)' }} />
              </div>
            )}
            <button
              onClick={() => navigateTo(item.id)}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-200 text-left relative overflow-hidden adm-list-item',
                isActive
                  ? 'bg-[#03DAC6]/[0.08] text-[#03DAC6] adm-list-item-accent'
                  : 'text-white/35 hover:text-white/70 hover:bg-white/[0.04]',
                !isActive && 'group-hover/nav:scale-[1.02]',
                'active:scale-[0.98]',
              )}
              title={collapsed ? item.label : undefined}
              data-tour={item.id === 'users' ? 'nav-users' : item.id === 'activity-log' ? 'nav-activity-log' : item.id === 'settings' ? 'nav-settings' : undefined}
            >
              {isActive && (
                <div className="absolute inset-0 opacity-100"
                  style={{ background: 'radial-gradient(ellipse at 0% 50%, rgba(3,218,198,0.06) 0%, transparent 70%)' }} />
              )}
              <div className="relative flex items-center gap-3 w-full">
                <Icon className={cn(
                  'h-[18px] w-[18px] shrink-0 transition-all duration-200',
                  isActive ? 'text-[#03DAC6] drop-shadow-[0_0_4px_rgba(3,218,198,0.3)]' : 'text-white/25 group-hover/nav:text-white/60',
                )} strokeWidth={isActive ? 2.2 : 1.5} />
                {!collapsed && (
                  <span className={cn(
                    'text-[13px] font-medium whitespace-nowrap transition-all duration-200',
                    isActive ? 'text-[#03DAC6]' : 'text-white/45 group-hover/nav:text-white/80',
                  )}>
                    {item.label}
                  </span>
                )}
                {!collapsed && item.badge && (
                  <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#03DAC6]/15 text-[#03DAC6]">
                    {item.badge}
                  </span>
                )}
              </div>
            </button>

            {collapsed && (
              <div className={cn(
                'absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none',
                'px-2.5 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap',
                'opacity-0 group-hover/nav:opacity-100 transition-all duration-200',
                'translate-x-1 group-hover/nav:translate-x-0',
                'bg-[#1A1A2E]/95 backdrop-blur-lg border border-white/[0.08]',
                'text-white/70 shadow-[0_4px_16px_rgba(0,0,0,0.4)]',
              )}>
                <div className={cn(
                  'absolute right-full top-1/2 -translate-y-1/2 w-2 h-2 rotate-45',
                  'bg-[#1A1A2E]/95 border-l border-b border-white/[0.08]',
                )} />
                {item.label}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A] overflow-x-hidden w-full"
      style={{
        '--sidebar-width': sidebarCollapsed ? '64px' : '224px',
        '--header-offset': 'calc(3.5rem + env(safe-area-inset-top, 0px))',
      } as React.CSSProperties}>

      {/* Ambient Glow */}
      <div className="hidden lg:block fixed top-0 left-0 pointer-events-none z-0 adm-ambient-glow"
        style={{ width: '280px', height: '280px', background: 'radial-gradient(ellipse at 30% 20%, rgba(3,218,198,0.05) 0%, transparent 70%)' }} />
      <div className="hidden lg:block fixed bottom-0 right-0 pointer-events-none z-0 adm-ambient-glow adm-ambient-glow-purple"
        style={{ width: '200px', height: '200px', background: 'radial-gradient(ellipse at 70% 80%, rgba(187,134,252,0.03) 0%, transparent 70%)' }} />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 adm-section-header" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="absolute inset-0 bg-[#0D0D0D]/100 backdrop-blur-xl" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#03DAC6]/25 to-transparent" />
        <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] blur-sm pointer-events-none"
          style={{ background: 'linear-gradient(to right, transparent, rgba(3,218,198,0.15), transparent)' }} />

        <div className={cn(
          'relative flex items-center justify-between px-4 sm:px-6 h-14 transition-all duration-300 ease-in-out',
          sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[240px] xl:pl-[272px]',
        )}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={cn(
                'md:flex hidden items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 lg:hidden',
                'text-white/40 hover:text-white/70 hover:bg-white/[0.06] active:scale-[0.95]',
              )}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="relative flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#03DAC6]/15 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-[#03DAC6]" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-base font-bold bg-clip-text text-transparent adm-gradient-text"
                    style={{ backgroundImage: 'linear-gradient(135deg, #03DAC6 0%, #BB86FC 50%, #03DAC6 100%)', backgroundSize: '200% 200%', animation: 'gradientShift 4s ease-in-out infinite' }}>
                    Admin Panel
                  </h1>
                </div>
              </div>
              {/* Breadcrumb */}
              <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
                <span className="text-white/15">/</span>
                <span className="text-white/40 font-medium">{currentPageLabel}</span>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Switch to User View Button — prominent */}
            <Button
              variant="outline"
              className="h-8 gap-1.5 text-[11px] font-semibold rounded-lg border-[#BB86FC]/20 text-[#BB86FC] hover:bg-[#BB86FC]/10 hover:text-[#BB86FC] bg-[#BB86FC]/5 transition-all"
              onClick={() => { window.location.href = '/?view=user'; }}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">User View</span>
            </Button>
            {/* Help / Tour Button */}
            <Button
              variant="ghost"
              className="h-9 w-9 p-0 rounded-xl text-white/30 hover:text-[#BB86FC] hover:bg-[#BB86FC]/[0.06] transition-all"
              onClick={handleStartTour}
              title="Start onboarding tour"
            >
              <HelpCircle className="h-[18px] w-[18px]" />
            </Button>
            {/* Notifications Bell */}
            <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 w-9 p-0 rounded-xl relative group/bell text-white/40 hover:text-white/60 hover:bg-white/[0.04]">
                  <Bell className="h-[18px] w-[18px]" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#CF6679] text-[8px] font-bold text-white flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-80 bg-[#0D0D0D]/95 backdrop-blur-xl border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-0"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                  <span className="text-sm font-semibold text-white/80">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#03DAC6]/10 text-[#03DAC6]">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-white/25 text-[12px]">
                    <Bell className="h-6 w-6 mx-auto mb-2 text-white/10" />
                    No notifications
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((n) => (
                      <button
                        key={n.id}
                        className="w-full text-left px-4 py-3 hover:bg-white/[0.03] transition-colors border-b border-white/[0.03] last:border-0"
                        onClick={() => {
                          setNotifOpen(false);
                          if (n.id === 'expiring' || n.id === 'suspended') navigateTo('users');
                          if (n.id === 'invites' || n.id === 'no-users') navigateTo('invites');
                        }}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                            n.type === 'warning' ? 'bg-[#FFD700]/10' :
                            n.type === 'success' ? 'bg-[#03DAC6]/10' : 'bg-[#BB86FC]/10',
                          )}>
                            {n.type === 'warning' && <Shield className="h-3.5 w-3.5 text-[#FFD700]" />}
                            {n.type === 'success' && <Activity className="h-3.5 w-3.5 text-[#03DAC6]" />}
                            {n.type === 'info' && <Bell className="h-3.5 w-3.5 text-[#BB86FC]" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-white/70">{n.title}</p>
                            <p className="text-[11px] text-white/35 mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[9px] text-[#03DAC6]/50 mt-1">{n.time}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="hidden sm:inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-md"
              style={{ background: 'linear-gradient(135deg, #032E20, #0A1628)', color: '#03DAC6', border: '1px solid rgba(3,218,198,0.2)', boxShadow: '0 0 10px rgba(3,218,198,0.06)' }}>
              <Shield className="h-2.5 w-2.5" />
              ADMIN
            </span>

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 w-9 p-0 rounded-full relative group/avatar">
                  <Avatar className="relative h-8 w-8 ring-1 ring-white/[0.08] group-hover/avatar:ring-[#03DAC6]/30 transition-all duration-300">
                    {user?.image && <AvatarImage src={user.image} alt={user.username} className="object-cover" />}
                    <AvatarFallback className="bg-[#03DAC6]/15 text-[#03DAC6] text-xs font-semibold border border-[#03DAC6]/10">
                      {user?.username ? getInitials(user.username) : 'A'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-[#0D0D0D]/95 backdrop-blur-xl border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
              >
                <DropdownMenuLabel className="text-white/80 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-[#03DAC6]/15 flex items-center justify-center text-[#03DAC6] text-xs font-semibold shrink-0">
                      {user?.username ? getInitials(user.username) : 'A'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{user?.username || 'Admin'}</p>
                      </div>
                      <p className="text-[11px] text-white/35 truncate">{user?.email || ''}</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/[0.06] my-1" />
                <DropdownMenuItem
                  onClick={() => { window.location.href = '/?view=user'; }}
                  className="text-white/60 focus:text-white focus:bg-white/[0.05] rounded-lg mx-1 cursor-pointer"
                >
                  <ArrowLeftRight className="mr-2.5 h-4 w-4 text-white/30" />
                  <span className="text-[13px]">Switch to User View</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/[0.06] my-1" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-[#CF6679]/100 focus:text-[#CF6679] focus:bg-[#CF6679]/10 rounded-lg mx-1 cursor-pointer"
                >
                  <LogOut className="mr-2.5 h-4 w-4 text-[#CF6679]/50" />
                  <span className="text-[13px]">Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>


      </header>

      {/* ── Announcement Banner (fixed below header) ── */}
      <AnnouncementBanner />

      {/* ── Body ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden announcement-pt" style={{ paddingTop: 'calc(var(--header-offset, 3.5rem) + var(--announcement-height, 0px))' }}>
        {/* Desktop Sidebar */}
        <aside className={cn(
          'hidden lg:flex flex-col fixed left-0 bottom-0 z-20 transition-all duration-300 ease-in-out',
          sidebarCollapsed ? 'w-[64px]' : 'w-56 xl:w-64',
        )}
          style={{ top: 'calc(var(--header-offset, 3.5rem) + var(--announcement-height, 0px))' }}>
          <div className="absolute inset-0 bg-[#0D0D0D]/60 backdrop-blur-2xl" />
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, rgba(3,218,198,0.03) 0%, transparent 30%, transparent 70%, rgba(187,134,252,0.02) 100%)' }} />
          <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-[#03DAC6]/10 via-white/[0.04] to-[#BB86FC]/10" />

          {renderNavItems(sidebarCollapsed)}

          {/* Collapse toggle */}
          <div className="relative p-2 border-t border-white/[0.04]">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={cn(
                'flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl transition-all duration-200',
                'text-white/25 hover:text-white/50 hover:bg-white/[0.04] active:scale-[0.96]',
              )}
            >
              <div className={cn(
                'grid place-items-center w-6 h-6 rounded-md transition-all duration-200 [&>*]:block leading-none',
                'hover:bg-[#03DAC6]/10 hover:text-[#03DAC6] group/toggle',
              )}>
                {sidebarCollapsed
                  ? <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                  : <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
                }
              </div>
              {!sidebarCollapsed && (
                <span className="text-[11px] font-medium whitespace-nowrap text-white/30">Collapse</span>
              )}
            </button>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <>
            <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileMenuOpen(false)} />
            <aside className="fixed left-0 bottom-0 z-40 w-64 flex-col md:hidden"
              style={{ top: 'calc(var(--header-offset, 3.5rem) + var(--announcement-height, 0px))', animation: 'slideInLeft 0.25s ease-out' }}>
              <div className="absolute inset-0 bg-[#0D0D0D]/95 backdrop-blur-2xl rounded-r-2xl" />
              <div className="absolute inset-0 pointer-events-none rounded-r-2xl"
                style={{ background: 'linear-gradient(180deg, rgba(3,218,198,0.04) 0%, transparent 30%, transparent 70%, rgba(187,134,252,0.02) 100%)' }} />
              <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-[#03DAC6]/20 via-white/[0.06] to-[#BB86FC]/15" />

              <div className="relative flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[#03DAC6]" />
                  <span className="text-sm font-bold bg-clip-text text-transparent"
                    style={{ backgroundImage: 'linear-gradient(135deg, #03DAC6, #BB86FC)' }}>
                    Admin Panel
                  </span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)}
                  className="grid place-items-center w-7 h-7 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all [&>*]:block leading-none">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {renderNavItems(false)}
            </aside>
          </>
        )}

        {/* Page Content */}
        <main className={cn(
          'flex-1 p-3 md:p-4 lg:p-6 xl:p-8 overflow-y-scroll w-full min-w-0 max-w-full transition-all duration-300 ease-in-out adm-content-card',
          'pb-[76px] lg:pb-8',
          sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[232px] xl:ml-[264px]',
        )}>
          <div className="max-w-7xl mx-auto">
            <div key={currentPage} className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              <TooltipProvider delayDuration={200}>{renderPage()}</TooltipProvider>
            </div>
          </div>
        </main>
      </div>
      </div>

      {/* Bottom Navigation Bar (mobile only) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0D0D0D]/95 backdrop-blur-md border-t border-white/[0.06] max-md:flex hidden flex-col">
        <div
          ref={scrollRef}
          className="flex items-stretch overflow-x-auto px-1 gap-0.5"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={cn(
                  'relative flex flex-col items-center justify-center min-w-[56px] max-w-[72px] flex-1 py-2 px-1 rounded-xl transition-all duration-200 active:scale-95 shrink-0 adm-tab-item',
                  isActive && 'adm-tab-item-active',
                )}
              >
                {isActive && (
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full bg-[#03DAC6]"
                    style={{ boxShadow: '0 0 6px rgba(3,218,198,0.4)' }} />
                )}
                <Icon className={cn(
                  'h-[18px] w-[18px] transition-all duration-200 mb-0.5',
                  isActive ? 'text-[#03DAC6] drop-shadow-[0_0_4px_rgba(3,218,198,0.3)]' : 'text-white/30',
                )} strokeWidth={isActive ? 2.2 : 1.5} />
                <span className={cn(
                  'text-[9px] font-medium leading-tight text-center truncate w-full',
                  isActive ? 'text-[#03DAC6]' : 'text-white/30',
                )}>
                  {item.label.length > 6 ? item.label.slice(0, 5) + '…' : item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Command Palette (Cmd+K) */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}
        className="bg-[#0D0D0D] border-white/[0.08] shadow-[0_16px_64px_rgba(0,0,0,0.6)]">
        <CommandInput placeholder="Search pages..." className="text-white/80 placeholder:text-white/25" />
        <CommandList>
          <CommandEmpty className="text-white/25 text-[12px] py-6">No pages found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.id}
                  value={item.label}
                  onSelect={() => {
                    navigateTo(item.id);
                    setCommandOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 text-white/60 data-[selected=true]:bg-[#03DAC6]/10 data-[selected=true]:text-[#03DAC6] cursor-pointer rounded-lg mx-1 my-0.5"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[13px] font-medium">{item.label}</span>
                  {currentPage === item.id && (
                    <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#03DAC6]/10 text-[#03DAC6]">
                      Current
                    </span>
                  )}
                  <CommandShortcut className="hidden sm:inline text-white/15">
                    {item.id === 'dashboard' ? '⌘1' :
                     item.id === 'users' ? '⌘2' :
                     item.id === 'invites' ? '⌘3' :
                     item.id === 'announcements' ? '⌘4' :
                     item.id === 'subscriptions' ? '⌘5' :
                     item.id === 'access-control' ? '⌘6' :
                     item.id === 'activity-log' ? '⌘7' :
                     item.id === 'settings' ? '⌘8' : ''}
                  </CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
        <div className="border-t border-white/[0.06] px-4 py-2.5 flex items-center justify-between">
          <span className="text-[10px] text-white/20 flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[9px] font-mono text-white/30">↑↓</kbd>
            Navigate
          </span>
          <span className="text-[10px] text-white/20 flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[9px] font-mono text-white/30">↵</kbd>
            Open
            <span className="mx-1">·</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[9px] font-mono text-white/30">Esc</kbd>
            Close
          </span>
        </div>
      </CommandDialog>

      {/* Onboarding Tour */}
      <AdminOnboardingTour isActive={tourActive} onTourComplete={handleTourComplete} />


    </div>
  );
}
