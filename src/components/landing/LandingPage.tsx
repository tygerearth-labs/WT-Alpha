'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { useTranslation } from '@/hooks/useTranslation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  BarChart3,
  ArrowDownLeft,
  ArrowUpRight,
  Target,
  FileDown,
  Sparkles,
  ShieldCheck,
  Check,
  ChevronRight,
  TrendingUp,
  Wallet,
  Zap,
  MessageCircle,
  Star,
  ChevronDown,
  ArrowUp,
  Lock,
} from 'lucide-react';
import { NotificationBell } from '@/components/shared/NotificationBell';

/* ------------------------------------------------------------------ */
/*  Intersection Observer hook                                         */
/* ------------------------------------------------------------------ */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

/* ------------------------------------------------------------------ */
/*  Animated wrapper                                                    */
/* ------------------------------------------------------------------ */
function FadeUp({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Animated number counter (triggered by parent visibility)           */
/* ------------------------------------------------------------------ */
function AnimatedCounter({ target, suffix = '', startOnMount = false }: { target: number; suffix?: string; startOnMount?: boolean }) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  // Use intersection observer as fallback for direct visibility
  const { ref, visible } = useInView(0);
  const shouldStart = startOnMount || visible;

  useEffect(() => {
    if (!shouldStart || started.current || target === 0) return;
    started.current = true;
    const duration = 1400;
    const startTime = performance.now();
    const step = (timestamp: number) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      setCount(current);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    const rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [shouldStart, target]);

  return (
    <span ref={ref} className="inline-block">
      {count}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats section with animated counters                               */
/* ------------------------------------------------------------------ */
function StatsSection({ noTrack, statMoreSavings, statAvgSaving }: { noTrack: string; statMoreSavings: string; statAvgSaving: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    // Use scroll event as fallback for IntersectionObserver
    const checkVisible = () => {
      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight * 0.9 && rect.bottom > 0;
      if (inView) {
        setStarted(true);
        window.removeEventListener('scroll', checkVisible);
      }
    };
    
    // Also try IntersectionObserver
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(el);
    
    // Scroll fallback
    window.addEventListener('scroll', checkVisible, { passive: true });
    // Initial check in case already visible
    checkVisible();
    
    return () => {
      obs.disconnect();
      window.removeEventListener('scroll', checkVisible);
    };
  }, []);

  return (
    <div ref={containerRef} className="mt-10 sm:mt-16">
      <div className="flex gap-3.5 overflow-x-auto pb-3 sm:pb-0 sm:grid sm:grid-cols-3 sm:gap-6 scroll-smooth snap-x snap-mandatory scrollbar-hide">
        {[
          { value: <AnimatedCounter target={73} suffix="%" startOnMount={started} />, label: noTrack, color: '#CF6679' },
          { value: <><AnimatedCounter target={2} startOnMount={started} />x</>, label: statMoreSavings, color: '#03DAC6' },
          { value: <AnimatedCounter target={30} suffix="%" startOnMount={started} />, label: statAvgSaving, color: '#BB86FC' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="min-w-[160px] sm:min-w-0 rounded-2xl p-5 sm:p-6 text-center border shrink-0 sm:shrink transition-all duration-300 sm:hover:scale-[1.02] snap-center sm:snap-none stats-pattern bg-[rgba(18,18,18,0.6)] border-[rgba(255,255,255,0.06)] backdrop-blur-xl"
          >
            <div className="text-3xl sm:text-4xl font-extrabold mb-1.5 tracking-tight" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <p className="text-[11px] sm:text-sm text-muted-foreground leading-snug">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section Separator with decorative glow dots                        */
/* ------------------------------------------------------------------ */
function SectionSeparator({ color }: { color: string }) {
  return (
    <div className="relative flex items-center justify-center py-1">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2" style={{ background: `linear-gradient(90deg, transparent, ${color}30, transparent)` }} />
      <div className="relative flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full" style={{ background: color, opacity: 0.5, animation: 'separatorGlow 3s ease-in-out infinite' }} />
        <div className="h-1 w-1 rounded-full" style={{ background: color, opacity: 0.3, animation: 'separatorGlow 3s ease-in-out infinite 0.5s' }} />
        <div className="h-0.5 w-0.5 rounded-full" style={{ background: color, opacity: 0.2, animation: 'separatorGlow 3s ease-in-out infinite 1s' }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Floating decorative elements for Hero                              */
/* ------------------------------------------------------------------ */
function FloatingDecorations() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Aurora / glow background */}
      <div
        className="absolute top-1/3 left-1/2 h-[500px] w-[500px] rounded-full animate-aurora"
        style={{
          background: 'conic-gradient(from 0deg, rgba(187,134,252,0.12), rgba(3,218,198,0.08), rgba(207,102,121,0.06), rgba(187,134,252,0.12))',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute top-[45%] left-[45%] h-[300px] w-[300px] rounded-full animate-aurora-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(187,134,252,0.1) 0%, transparent 70%)',
        }}
      />
      {/* Gradient orbs */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full opacity-20 blur-[120px] animate-pulse bg-[#BB86FC]" />
      <div className="absolute top-1/3 -right-32 h-80 w-80 rounded-full opacity-15 blur-[100px] animate-pulse" style={{ background: '#03DAC6', animationDelay: '1s' }} />
      <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full opacity-10 blur-[80px] animate-pulse" style={{ background: '#CF6679', animationDelay: '2s' }} />

      {/* Floating dots / circles */}
      <div className="absolute top-[15%] left-[10%] h-2 w-2 rounded-full animate-float-1 bg-[rgba(187,134,252,0.4)]" />
      <div className="absolute top-[25%] right-[15%] h-3 w-3 rounded-full animate-float-2 bg-[rgba(3,218,198,0.3)]" />
      <div className="absolute top-[60%] left-[8%] h-1.5 w-1.5 rounded-full animate-float-3 bg-[rgba(207,102,121,0.35)]" />
      <div className="absolute top-[70%] right-[12%] h-2.5 w-2.5 rounded-full animate-float-4 bg-[rgba(249,168,37,0.3)]" />
      <div className="absolute top-[40%] left-[20%] h-1 w-1 rounded-full animate-float-5 bg-[rgba(187,134,252,0.5)]" />
      <div className="absolute top-[50%] right-[25%] h-1.5 w-1.5 rounded-full animate-float-1" style={{ background: 'rgba(3,218,198,0.4)', animationDelay: '2s' }} />
      <div className="absolute top-[80%] left-[35%] h-2 w-2 rounded-full animate-float-3" style={{ background: 'rgba(207,102,121,0.25)', animationDelay: '1s' }} />
      <div className="absolute top-[20%] left-[70%] h-1 w-1 rounded-full animate-float-2" style={{ background: 'rgba(187,134,252,0.6)', animationDelay: '3s' }} />

      {/* Larger subtle floating rings */}
      <div className="absolute top-[30%] left-[5%] h-16 w-16 rounded-full border animate-float-4" style={{ borderColor: 'rgba(187,134,252,0.08)' }} />
      <div className="absolute top-[55%] right-[8%] h-12 w-12 rounded-full border animate-float-1" style={{ borderColor: 'rgba(3,218,198,0.06)', animationDelay: '4s' }} />
      <div className="absolute bottom-[20%] left-[50%] h-20 w-20 rounded-full border animate-float-2" style={{ borderColor: 'rgba(207,102,121,0.05)', animationDelay: '2s' }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Scroll to top button                                               */
/* ------------------------------------------------------------------ */
function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="animate-scroll-top fixed bottom-6 right-6 z-50 h-11 w-11 rounded-full flex items-center justify-center shadow-lg border transition-transform hover:scale-110 active:scale-95"
      style={{
        background: 'linear-gradient(135deg, #BB86FC, #03DAC6)',
        color: '#000',
        borderColor: 'rgba(187,134,252,0.3)',
        boxShadow: '0 4px 20px rgba(187,134,252,0.3), 0 0 40px rgba(3,218,198,0.1)',
      }}
      aria-label="Scroll to top"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  LANDING PAGE                                                        */
/* ------------------------------------------------------------------ */
export function LandingPage() {
  const { t } = useTranslation();
  // Detect invite token or trial param in URL on initial render (before first paint)
  const [inviteDetected] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return !!params.get('invite') || params.get('trial') === 'true';
  });
  const [authOpen, setAuthOpen] = useState(() => inviteDetected);
  const [authMode, setAuthMode] = useState<'login' | 'register'>(() => inviteDetected ? 'register' : 'login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [platformConfig, setPlatformConfig] = useState<{
    basicPlanPrice: string;
    proPlanPrice: string;
    ultimatePlanPrice: string;
    basicPlanFeatures: string[] | null;
    proPlanFeatures: string[] | null;
    ultimatePlanFeatures: string[] | null;
    basicPlanDiscount: string | null;
    proPlanDiscount: string | null;
    ultimatePlanDiscount: string | null;
    basicPlanDiscountLabel: string | null;
    proPlanDiscountLabel: string | null;
    ultimatePlanDiscountLabel: string | null;
    basicPurchaseUrl: string | null;
    proPurchaseUrl: string | null;
    ultimatePurchaseUrl: string | null;
    trialEnabled: boolean;
    trialDurationDays: number;
    whatsappNumber: string | null;
    registrationOpen: boolean;
    registrationMessage: string | null;
    availablePlans: string[];
    landingPageConfig: {
      showStory: boolean;
      showFeatures: boolean;
      showTestimonials: boolean;
      showPricing: boolean;
      showFaq: boolean;
      showStats: boolean;
      heroSubtitle: string;
      customFooterText: string;
    } | null;
  } | null>(null);

  // Glassmorphism scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch platform config for dynamic plan pricing/features
  useEffect(() => {
    fetch('/api/platform-config')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          // Safely parse JSON fields with try-catch to prevent crashes from malformed data
          let basicPlanFeatures: string[] | null = null;
          let proPlanFeatures: string[] | null = null;
          let ultimatePlanFeatures: string[] | null = null;
          try { basicPlanFeatures = data.basicPlanFeatures ? JSON.parse(data.basicPlanFeatures) : null; } catch { basicPlanFeatures = null; }
          try { proPlanFeatures = data.proPlanFeatures ? JSON.parse(data.proPlanFeatures) : null; } catch { proPlanFeatures = null; }
          try { ultimatePlanFeatures = data.ultimatePlanFeatures ? JSON.parse(data.ultimatePlanFeatures) : null; } catch { ultimatePlanFeatures = null; }

          // Validate purchase URLs — only allow http(s) schemes to prevent javascript: XSS
          const safeUrl = (url: string | null | undefined): string | null => {
            if (!url) return null;
            try { const parsed = new URL(url); return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : null; } catch { return null; }
          };

          // Parse landingPageConfig from API response
          const landingPageConfig = data.landingPageConfig || null;

          setPlatformConfig({
            ...data,
            basicPlanFeatures,
            proPlanFeatures,
            ultimatePlanFeatures,
            basicPlanDiscount: data.basicPlanDiscount || null,
            proPlanDiscount: data.proPlanDiscount || null,
            ultimatePlanDiscount: data.ultimatePlanDiscount || null,
            basicPlanDiscountLabel: data.basicPlanDiscountLabel || null,
            proPlanDiscountLabel: data.proPlanDiscountLabel || null,
            ultimatePlanDiscountLabel: data.ultimatePlanDiscountLabel || null,
            basicPurchaseUrl: safeUrl(data.basicPurchaseUrl),
            proPurchaseUrl: safeUrl(data.proPurchaseUrl),
            ultimatePurchaseUrl: safeUrl(data.ultimatePurchaseUrl),
            whatsappNumber: data.whatsappNumber || null,
            registrationOpen: data.registrationOpen ?? true,
            registrationMessage: data.registrationMessage || null,
            availablePlans: Array.isArray(data.availablePlans) ? data.availablePlans : ['basic', 'pro', 'ultimate'],
            landingPageConfig,
          });
        }
      })
      .catch(() => {});
  }, []);

  /* ---- Landing page section visibility from admin config ---- */
  const lpConfig = platformConfig?.landingPageConfig;
  const visibleSections = {
    story: lpConfig?.showStory ?? true,
    features: lpConfig?.showFeatures ?? true,
    testimonials: lpConfig?.showTestimonials ?? true,
    pricing: lpConfig?.showPricing ?? true,
    faq: lpConfig?.showFaq ?? true,
    stats: lpConfig?.showStats ?? true,
  };

  /* ---- Data arrays built inside component for t() access ---- */
  const features = [
    {
      icon: BarChart3,
      title: t('landing.feat1Title'),
      description: t('landing.feat1Desc'),
      color: '#BB86FC',
      gradient: 'linear-gradient(135deg, rgba(187,134,252,0.2), rgba(187,134,252,0.05))',
    },
    {
      icon: ArrowDownLeft,
      title: t('landing.feat2Title'),
      description: t('landing.feat2Desc'),
      color: '#03DAC6',
      gradient: 'linear-gradient(135deg, rgba(3,218,198,0.2), rgba(3,218,198,0.05))',
    },
    {
      icon: ArrowUpRight,
      title: t('landing.feat3Title'),
      description: t('landing.feat3Desc'),
      color: '#CF6679',
      gradient: 'linear-gradient(135deg, rgba(207,102,121,0.2), rgba(207,102,121,0.05))',
    },
    {
      icon: Target,
      title: t('landing.feat4Title'),
      description: t('landing.feat4Desc'),
      color: '#F9A825',
      gradient: 'linear-gradient(135deg, rgba(249,168,37,0.2), rgba(249,168,37,0.05))',
    },
    {
      icon: FileDown,
      title: t('landing.feat5Title'),
      description: t('landing.feat5Desc'),
      color: '#BB86FC',
      gradient: 'linear-gradient(135deg, rgba(187,134,252,0.2), rgba(187,134,252,0.05))',
    },
    {
      icon: Sparkles,
      title: t('landing.feat6Title'),
      description: t('landing.feat6Desc'),
      color: '#03DAC6',
      gradient: 'linear-gradient(135deg, rgba(3,218,198,0.2), rgba(3,218,198,0.05))',
    },
  ];

  const allPlans = [
    {
      id: 'basic',
      name: t('landing.basicName'),
      price: platformConfig?.basicPlanPrice || t('landing.basicPrice'),
      originalPrice: t('landing.basicOriginalPrice'),
      period: '',
      description: t('landing.basicDesc'),
      highlighted: false,
      badge: null,
      discount: platformConfig?.basicPlanDiscount || null,
      discountLabel: platformConfig?.basicPlanDiscountLabel || null,
      purchaseUrl: platformConfig?.basicPurchaseUrl || null,
      features: platformConfig?.basicPlanFeatures || [
        t('landing.basicF1'),
        t('landing.basicF2'),
        t('landing.basicF3'),
        t('landing.basicF4'),
        t('landing.basicF5'),
        t('landing.basicF6'),
      ],
    },
    {
      id: 'pro',
      name: t('landing.proName'),
      price: platformConfig?.proPlanPrice || t('landing.proPrice'),
      originalPrice: t('landing.proOriginalPrice'),
      period: '',
      description: t('landing.proDesc'),
      highlighted: true,
      badge: t('landing.proBadge'),
      discount: platformConfig?.proPlanDiscount || null,
      discountLabel: platformConfig?.proPlanDiscountLabel || null,
      purchaseUrl: platformConfig?.proPurchaseUrl || null,
      features: platformConfig?.proPlanFeatures || [
        t('landing.proF1'),
        t('landing.proF2'),
        t('landing.proF3'),
        t('landing.proF4'),
        t('landing.proF5'),
        t('landing.proF6'),
      ],
    },
    {
      id: 'ultimate',
      name: t('landing.ultimateName'),
      price: platformConfig?.ultimatePlanPrice || t('landing.ultimatePrice'),
      originalPrice: t('landing.ultimateOriginalPrice'),
      period: '',
      description: t('landing.ultimateDesc'),
      highlighted: false,
      badge: t('landing.ultimateBadge'),
      discount: platformConfig?.ultimatePlanDiscount || null,
      discountLabel: platformConfig?.ultimatePlanDiscountLabel || null,
      purchaseUrl: platformConfig?.ultimatePurchaseUrl || null,
      features: platformConfig?.ultimatePlanFeatures || [
        t('landing.ultimateF1'),
        t('landing.ultimateF2'),
        t('landing.ultimateF3'),
        t('landing.ultimateF4'),
        t('landing.ultimateF5'),
        t('landing.ultimateF6'),
      ],
    },
  ];

  // Filter plans based on admin config
  const plans = allPlans.filter(p => !platformConfig?.availablePlans || platformConfig.availablePlans.includes(p.id));

  const testimonials = [
    {
      name: t('landing.review1Name'),
      role: t('landing.review1Role'),
      text: t('landing.review1Text'),
      rating: 5,
    },
    {
      name: t('landing.review2Name'),
      role: t('landing.review2Role'),
      text: t('landing.review2Text'),
      rating: 5,
    },
    {
      name: t('landing.review3Name'),
      role: t('landing.review3Role'),
      text: t('landing.review3Text'),
      rating: 5,
    },
  ];

  const faqs = [
    {
      q: t('landing.faq1Q'),
      a: t('landing.faq1A'),
    },
    {
      q: t('landing.faq2Q'),
      a: t('landing.faq2A'),
    },
    {
      q: t('landing.faq3Q'),
      a: t('landing.faq3A'),
    },
    {
      q: t('landing.faq4Q'),
      a: t('landing.faq4A'),
    },
  ];

  const stories = [
    { icon: Wallet, color: '#CF6679', title: t('landing.story1Title'), text: t('landing.story1Text') },
    { icon: Sparkles, color: '#BB86FC', title: t('landing.story2Title'), text: t('landing.story2Text') },
    { icon: Target, color: '#03DAC6', title: t('landing.story3Title'), text: t('landing.story3Text') },
    { icon: TrendingUp, color: '#F9A825', title: t('landing.story4Title'), text: t('landing.story4Text') },
  ];

  const openAuth = useCallback((mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode);
    setAuthOpen(true);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden" style={{ scrollBehavior: 'smooth' }}>

      {/* ========== NAVBAR ========== */}
      <nav
        className="fixed top-0 inset-x-0 z-40 transition-all duration-300"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          background: scrolled ? 'rgba(0, 0, 0, 0.72)' : 'transparent',
          backdropFilter: scrolled ? 'blur(24px) saturate(180%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(24px) saturate(180%)' : 'none',
          borderBottom: scrolled
            ? '1px solid rgba(187, 134, 252, 0.12)'
            : '1px solid rgba(255, 255, 255, 0.03)',
          boxShadow: scrolled
            ? '0 1px 24px -4px rgba(187, 134, 252, 0.08), 0 0 0 0 transparent'
            : 'none',
        }}
      >
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Wealth Tracker" width={36} height={36} className="rounded-lg" priority />
            <span className="font-bold text-lg tracking-tight">{t('landing.creator')}</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
            {visibleSections.story && <button onClick={() => scrollTo('story')} className="hover:text-foreground transition-colors">{t('landing.navStory')}</button>}
            {visibleSections.features && <button onClick={() => scrollTo('features')} className="hover:text-foreground transition-colors">{t('landing.navFeatures')}</button>}
            {visibleSections.pricing && <button onClick={() => scrollTo('pricing')} className="hover:text-foreground transition-colors">{t('landing.navPricing')}</button>}
            {visibleSections.testimonials && <button onClick={() => scrollTo('testimonials')} className="hover:text-foreground transition-colors">{t('landing.navReview')}</button>}
            {visibleSections.faq && <button onClick={() => scrollTo('faq')} className="hover:text-foreground transition-colors">FAQ</button>}
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              onClick={() => openAuth()}
              className="rounded-full px-4 sm:px-5 h-10 sm:h-auto text-sm font-semibold transition-all hover:scale-105 active:scale-95 bg-[#BB86FC] text-black"
            >
              {t('auth.login')}
            </button>
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden flex flex-col items-center justify-center gap-1 w-8 h-8"
              aria-label="Toggle menu"
            >
              <span className="block h-0.5 w-5 rounded-full transition-all duration-300" style={{ background: '#E6E1E5', transform: mobileMenuOpen ? 'rotate(45deg) translateY(3.5px)' : 'none' }} />
              <span className="block h-0.5 w-5 rounded-full transition-all duration-300" style={{ background: '#E6E1E5', opacity: mobileMenuOpen ? 0 : 1 }} />
              <span className="block h-0.5 w-5 rounded-full transition-all duration-300" style={{ background: '#E6E1E5', transform: mobileMenuOpen ? 'rotate(-45deg) translateY(-3.5px)' : 'none' }} />
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        <div
          className="sm:hidden overflow-hidden transition-all duration-300 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.06)', maxHeight: mobileMenuOpen ? '240px' : '0px', opacity: mobileMenuOpen ? 1 : 0, background: 'rgba(0,0,0,0.95)' }}
        >
          <div className="px-5 py-4 flex flex-col gap-1 text-sm text-muted-foreground">
            {visibleSections.story && <button onClick={() => scrollTo('story')} className="text-left py-2.5 hover:text-foreground transition-colors rounded-lg hover:bg-white/[0.03]">{t('landing.navStory')}</button>}
            {visibleSections.features && <button onClick={() => scrollTo('features')} className="text-left py-2.5 hover:text-foreground transition-colors rounded-lg hover:bg-white/[0.03]">{t('landing.navFeatures')}</button>}
            {visibleSections.pricing && <button onClick={() => scrollTo('pricing')} className="text-left py-2.5 hover:text-foreground transition-colors rounded-lg hover:bg-white/[0.03]">{t('landing.navPricing')}</button>}
            {visibleSections.testimonials && <button onClick={() => scrollTo('testimonials')} className="text-left py-2.5 hover:text-foreground transition-colors rounded-lg hover:bg-white/[0.03]">{t('landing.navReview')}</button>}
            {visibleSections.faq && <button onClick={() => scrollTo('faq')} className="text-left py-2.5 hover:text-foreground transition-colors rounded-lg hover:bg-white/[0.03]">FAQ</button>}
          </div>
        </div>
      </nav>

      {/* ========== HERO ========== */}
      <section className="relative min-h-[100dvh] flex flex-col justify-center pb-12 sm:pb-32 px-4 sm:px-6" style={{ paddingTop: 'calc(5rem + env(safe-area-inset-top, 0px))' }}>
        <FloatingDecorations />

        <div className="relative mx-auto max-w-4xl text-center">
          <FadeUp>
            <div className="flex justify-center mb-5 sm:mb-8">
              <div className="relative rounded-2xl p-0.5 sm:p-1" style={{ background: 'linear-gradient(135deg, #BB86FC, #03DAC6, #CF6679)' }}>
                <Image src="/logo.png" alt="Wealth Tracker" width={56} height={56} className="rounded-xl sm:rounded-2xl" priority />
              </div>
            </div>
          </FadeUp>

          <FadeUp delay={50}>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] sm:text-xs font-medium mb-5 sm:mb-8 border" style={{ borderColor: 'rgba(187,134,252,0.25)', background: 'rgba(187,134,252,0.08)', color: '#BB86FC' }}>
              <Sparkles className="h-3.5 w-3.5" />
              {t('landing.by')} Ahtjong Labs
            </div>
          </FadeUp>

          <FadeUp delay={100}>
            <h1 className="text-[28px] sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] sm:leading-[1.1] mb-4 sm:mb-6">
              <span className="block">{t('landing.heroLine1')}</span>
              <span
                className="block bg-clip-text text-transparent animate-gradient-text"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #BB86FC 0%, #03DAC6 40%, #CF6679 70%, #BB86FC 100%)',
                  backgroundSize: '200% 200%',
                }}
              >
                {t('landing.heroLine2')}
              </span>
            </h1>
          </FadeUp>

          <FadeUp delay={200}>
            <p className="mx-auto max-w-xl text-sm sm:text-lg text-muted-foreground leading-relaxed mb-6 sm:mb-10">
              {t('landing.heroDesc')}
            </p>
            {lpConfig?.heroSubtitle && (
              <p className="mx-auto max-w-lg text-[12px] sm:text-base font-medium leading-relaxed mb-2 text-[#03DAC6]">
                {lpConfig.heroSubtitle}
              </p>
            )}
          </FadeUp>

          <FadeUp delay={300}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-xs mx-auto sm:max-w-none">
              <button
                onClick={() => openAuth()}
                className="cta-shimmer group relative w-full sm:w-auto h-12 sm:h-auto rounded-full px-8 sm:py-3.5 text-sm font-bold transition-all hover:scale-105 active:scale-95 overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #BB86FC, #03DAC6)',
                  color: '#000',
                  boxShadow: '0 4px 24px rgba(187,134,252,0.25), 0 0 60px rgba(3,218,198,0.08)',
                }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {t('landing.loginNow')}
                  <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </button>
            </div>
          </FadeUp>

          <FadeUp delay={400}>
            <p className="mt-4 text-center text-[10px] sm:text-xs text-muted-foreground/60">
              {t('landing.accessNotice')}
            </p>
          </FadeUp>

          {/* Trust badges */}
          <FadeUp delay={500}>
            <div className="mt-8 sm:mt-16 flex flex-wrap items-center justify-center gap-4 sm:gap-10 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#03DAC6]" />
                <span className="text-[11px] sm:text-sm">{t('landing.encrypted')}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#BB86FC]" />
                <span className="text-[11px] sm:text-sm">{t('landing.oneTimePayment')}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#CF6679]" />
                <span className="text-[11px] sm:text-sm">{t('landing.smartInsights')}</span>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ========== STORY SECTION ========== */}
      {visibleSections.story && <section id="story" className="relative py-12 sm:py-16 lg:py-28 px-4 sm:px-6">
        <SectionSeparator color="#CF6679" />

        <div className="mx-auto max-w-4xl">
          <FadeUp>
            <div className="text-center mb-8 sm:mb-16">
              <p className="inline-block text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] mb-2 sm:mb-3 text-[#03DAC6]">
                {t('landing.storySubtitle')}
              </p>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
                {t('landing.storyTitle1')}
                <span className="block mt-1 bg-clip-text text-transparent animate-gradient-text" style={{ backgroundImage: 'linear-gradient(90deg, #BB86FC, #CF6679, #BB86FC)', backgroundSize: '200% 200%' }}>
                  {t('landing.storyTitle2')}
                </span>
              </h2>
            </div>
          </FadeUp>

          {/* Story cards */}
          <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
            {stories.map((story, i) => (
              <FadeUp key={story.title} delay={i * 100}>
                <div
                  className="relative rounded-2xl p-5 sm:p-6 border transition-all duration-300 sm:hover:scale-[1.01] sm:hover:shadow-lg active:scale-[0.99]"
                  style={{
                    background: 'rgba(18,18,18,0.6)',
                    borderColor: 'rgba(255,255,255,0.06)',
                    borderLeftWidth: '3px',
                    borderLeftColor: story.color,
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = `${story.color}33`;
                    el.style.borderLeftColor = story.color;
                    el.style.boxShadow = `0 8px 32px ${story.color}10`;
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = 'rgba(255,255,255,0.06)';
                    el.style.borderLeftColor = story.color;
                    el.style.boxShadow = 'none';
                  }}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Number indicator */}
                    <div className="shrink-0 hidden sm:flex flex-col items-center">
                      <span
                        className="text-3xl font-black tracking-tighter leading-none"
                        style={{
                          color: story.color,
                          opacity: 0.15,
                        }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    {/* Mobile number badge */}
                    <div className="sm:hidden shrink-0">
                      <span
                        className="inline-flex items-center justify-center text-[10px] font-bold rounded-lg px-1.5 py-0.5"
                        style={{
                          background: `${story.color}15`,
                          color: story.color,
                        }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl grid place-items-center [&>*]:block leading-none" style={{ background: `${story.color}18` }}>
                        <story.icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: story.color }} />
                      </div>
                      {i < 3 && <div className="w-px h-4 sm:hidden" style={{ background: `${story.color}25` }} />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-lg font-semibold mb-1 sm:mb-2">{story.title}</h3>
                      <p className="text-muted-foreground text-[13px] sm:text-base leading-relaxed">
                        {story.text}
                      </p>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>

          {/* Statistics */}
          {visibleSections.stats && <StatsSection
            noTrack={t('landing.noTrack') + ' ' + t('landing.statNoTrack')}
            statMoreSavings={t('landing.statMoreSavings')}
            statAvgSaving={t('landing.statAvgSaving')}
          />}
        </div>
      </section>}

      {/* ========== FEATURES SECTION ========== */}
      {visibleSections.features && <section id="features" className="relative py-12 sm:py-16 lg:py-28 px-4 sm:px-6">
        <SectionSeparator color="#BB86FC" />

        <div className="mx-auto max-w-6xl">
          <FadeUp>
            <div className="text-center mb-8 sm:mb-16">
              <p className="inline-block text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] mb-2 sm:mb-3 text-[#03DAC6]">
                {t('landing.featureSubtitle')}
              </p>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight mb-2 sm:mb-3">
                {t('landing.featureTitle1')}{' '}
                <span className="bg-clip-text text-transparent animate-gradient-text" style={{ backgroundImage: 'linear-gradient(90deg, #BB86FC, #03DAC6, #BB86FC)', backgroundSize: '200% 200%' }}>
                  {t('landing.featureTitle2')}
                </span>
              </h2>
              <p className="text-muted-foreground text-[12px] sm:text-base max-w-lg mx-auto">
                {t('landing.featureDesc')}
              </p>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, i) => (
              <FadeUp key={feature.title} delay={i * 80}>
                <div
                  className="feature-card-glow group rounded-2xl p-5 sm:p-6 border bg-[rgba(18,18,18,0.5)] border-[rgba(255,255,255,0.06)] active:scale-[0.99]"
                  style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = `${feature.color}33`;
                    el.style.boxShadow = `0 12px 40px rgba(0,0,0,0.4), 0 4px 16px ${feature.color}08`;
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = 'rgba(255,255,255,0.06)';
                    el.style.boxShadow = '0 4px 24px rgba(0,0,0,0.2)';
                  }}
                >
                  <div className="flex items-start gap-3 sm:gap-0 sm:flex-col">
                    <div
                      className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl grid place-items-center shrink-0 sm:mb-4 sm:shrink [&>*]:block leading-none transition-transform duration-300 group-hover:scale-110"
                      style={{ background: feature.gradient }}
                    >
                      <feature.icon className="h-5 w-5" style={{ color: feature.color }} />
                    </div>
                    <div className="min-w-0 sm:min-w-auto">
                      <h3 className="text-[13px] sm:text-lg font-semibold mb-1.5 sm:mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground text-[13px] sm:text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>}

      {/* ========== TESTIMONIALS ========== */}
      {visibleSections.testimonials && <section id="testimonials" className="relative py-12 sm:py-16 lg:py-28 px-4 sm:px-6">
        <SectionSeparator color="#F9A825" />

        <div className="mx-auto max-w-4xl">
          <FadeUp>
            <div className="text-center mb-8 sm:mb-16">
              <p className="inline-block text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] mb-2 sm:mb-3 text-[#F9A825]">
                {t('landing.reviewSubtitle')}
              </p>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
                {t('landing.reviewTitle1')}{' '}
                <span className="bg-clip-text text-transparent animate-gradient-text" style={{ backgroundImage: 'linear-gradient(90deg, #F9A825, #CF6679, #F9A825)', backgroundSize: '200% 200%' }}>
                  {t('landing.reviewTitle2')}
                </span>
              </h2>
            </div>
          </FadeUp>

          <div className="space-y-4 sm:space-y-6">
            {testimonials.map((tm, i) => (
              <FadeUp key={tm.name} delay={i * 100}>
                <div
                  className="rounded-2xl p-5 sm:p-6 border transition-all duration-300 hover:border-[rgba(249,168,37,0.2)] bg-[rgba(18,18,18,0.6)] border-[rgba(255,255,255,0.06)] active:scale-[0.99]"
                >
                  {/* Stars */}
                  <div className="flex items-center gap-0.5 mb-3">
                    {Array.from({ length: tm.rating }).map((_, si) => (
                      <Star key={si} className="h-3.5 w-3.5 fill-[#F9A825] text-[#F9A825]" />
                    ))}
                  </div>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-3 sm:mb-4 italic">
                    &ldquo;{tm.text}&rdquo;
                  </p>
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'linear-gradient(135deg, #BB86FC, #03DAC6)', color: '#000' }}>
                      {tm.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{tm.name}</p>
                      <p className="text-[11px] text-muted-foreground">{tm.role}</p>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>}

      {/* ========== PRICING SECTION ========== */}
      {visibleSections.pricing && <section id="pricing" className="relative py-12 sm:py-16 lg:py-28 px-4 sm:px-6">
        <SectionSeparator color="#03DAC6" />

        <div className="mx-auto max-w-4xl">
          <FadeUp>
            <div className="text-center mb-8 sm:mb-8">
              <p className="inline-block text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] mb-2 sm:mb-3 text-[#03DAC6]">
                {t('landing.pricingSubtitle')}
              </p>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight mb-2 sm:mb-3">
                {t('landing.pricingTitle1')}{' '}
                <span className="bg-clip-text text-transparent animate-gradient-text" style={{ backgroundImage: 'linear-gradient(90deg, #03DAC6, #BB86FC, #03DAC6)', backgroundSize: '200% 200%' }}>
                  {t('landing.pricingTitle2')}
                </span>
              </h2>
              <p className="text-muted-foreground text-[12px] sm:text-base max-w-lg mx-auto">
                {t('landing.pricingDesc')}
              </p>
            </div>
          </FadeUp>

          <FadeUp delay={50}>
            {/* Registration Closed Notice */}
            {!platformConfig?.registrationOpen ? (
              <div className="mx-auto max-w-md mb-6 sm:mb-12 rounded-xl p-3 text-center border bg-[rgba(207,102,121,0.08)] border-[rgba(207,102,121,0.2)]">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Lock className="h-4 w-4 text-[#CF6679]" />
                  <p className="text-xs font-semibold text-[#CF6679]">Registration Closed</p>
                </div>
                <p className="text-[11px] text-[#9E9E9E]">
                  {platformConfig?.registrationMessage || 'Registration is currently closed. Please contact the administrator.'}
                </p>
                {/* WhatsApp contact when registration is closed */}
                {platformConfig?.whatsappNumber && (
                  <a
                    href={`https://wa.me/${platformConfig.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Halo, saya ingin mendaftar akun Wealth Tracker')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full text-xs font-semibold transition-all hover:scale-105 active:scale-95 bg-[#25D366] text-white"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Hubungi via WhatsApp
                  </a>
                )}
              </div>
            ) : platformConfig?.whatsappNumber ? (
              /* WhatsApp Contact for Registration */
              <div className="mx-auto max-w-md mb-6 sm:mb-12 rounded-xl p-3 text-center border bg-[rgba(37,211,102,0.06)] border-[rgba(37,211,102,0.15)]">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <MessageCircle className="h-4 w-4 text-[#25D366]" />
                  <p className="text-xs font-semibold text-[#25D366]">Daftar via WhatsApp</p>
                </div>
                <p className="text-[11px] mb-2 text-[#9E9E9E]">
                  Ingin berlangganan plan Basic atau Pro? Hubungi kami via WhatsApp
                </p>
                <a
                  href={`https://wa.me/${platformConfig.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Halo, saya ingin mendaftar akun Wealth Tracker')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all hover:scale-105 active:scale-95 bg-[#25D366] text-white"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Chat WhatsApp
                </a>
              </div>
            ) : (
              /* Default registration info when no WhatsApp */
              <div className="mx-auto max-w-md mb-6 sm:mb-12 rounded-xl p-3 text-center border bg-[rgba(187,134,252,0.06)] border-[rgba(187,134,252,0.15)]">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <MessageCircle className="h-4 w-4 text-[#BB86FC]" />
                  <p className="text-xs font-semibold text-[#BB86FC]">{t('landing.adminRegister')}</p>
                </div>
                <p className="text-[11px] text-[#9E9E9E]">
                  {t('landing.adminRegisterDesc')}
                </p>
              </div>
            )}
          </FadeUp>

          {/* Trial notice */}
          {platformConfig?.trialEnabled && (
            <FadeUp delay={75}>
              <div className="mx-auto max-w-md mb-6 sm:mb-10 text-center">
                <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 border bg-[rgba(3,218,198,0.08)] border-[rgba(3,218,198,0.2)]">
                  <Zap className="h-4 w-4 text-[#03DAC6]" />
                  <p className="text-xs font-semibold text-[#03DAC6]">
                    Free {platformConfig.trialDurationDays}-day trial included with registration!
                  </p>
                </div>
              </div>
            </FadeUp>
          )}

          <div className={`space-y-5 ${plans.length >= 3 ? 'sm:space-y-0 sm:grid sm:grid-cols-3' : 'sm:space-y-0 sm:grid sm:grid-cols-2'} sm:gap-6 items-stretch`}>
            {plans.map((plan, i) => (
              <FadeUp key={plan.name} delay={i * 120}>
                <div
                  className={`relative rounded-2xl p-5 sm:p-8 pricing-card-hover h-full flex flex-col active:scale-[0.99] ${
                    plan.highlighted ? '' : ''
                  }`}
                  style={{
                    background: plan.highlighted
                      ? 'linear-gradient(180deg, rgba(187,134,252,0.08) 0%, rgba(18,18,18,0.8) 40%)'
                      : 'rgba(18,18,18,0.5)',
                    borderColor: plan.highlighted
                      ? 'rgba(187,134,252,0.25)'
                      : 'rgba(255,255,255,0.06)',
                    borderWidth: plan.highlighted ? '2px' : '1px',
                    boxShadow: plan.highlighted
                      ? '0 0 60px -15px rgba(187,134,252,0.2), 0 8px 32px rgba(0,0,0,0.3)'
                      : '0 4px 24px rgba(0,0,0,0.15)',
                  }}
                >
                  {/* Discount badge */}
                  {plan.discount && (
                    <div className="absolute -top-3 right-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest" style={{ background: 'linear-gradient(135deg, #CF6679, #F9A825)', color: '#fff' }}>
                        <Zap className="h-3 w-3 fill-current" />
                        {plan.discountLabel || plan.discount}
                      </span>
                    </div>
                  )}

                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-4 py-1 text-[10px] font-bold uppercase tracking-widest" style={{ background: 'linear-gradient(135deg, #BB86FC, #03DAC6)', color: '#000' }}>
                        <Star className="h-3 w-3 fill-current" />
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  {/* Gradient border glow effect for featured card */}
                  {plan.highlighted && (
                    <div
                      className="pointer-events-none absolute -inset-px rounded-2xl"
                      style={{
                        background: 'linear-gradient(135deg, rgba(187,134,252,0.3), rgba(3,218,198,0.15), rgba(187,134,252,0.05))',
                        backgroundSize: '200% 200%',
                        animation: 'gradientShift 6s ease-in-out infinite',
                        zIndex: -1,
                        filter: 'blur(1px)',
                      }}
                    />
                  )}

                  <div className="mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-semibold mb-1">{plan.name}</h3>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">{plan.description}</p>
                  </div>

                  <div className="mb-4 sm:mb-6 flex items-baseline gap-2 flex-wrap">
                    <span className="text-2xl sm:text-4xl font-extrabold">{plan.price}</span>
                    {plan.originalPrice && (
                      <span className="text-sm sm:text-base line-through text-white/30">{plan.originalPrice}</span>
                    )}
                    {!plan.period && (
                      <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(3,218,198,0.12)] text-[#03DAC6]">
                        {t('landing.oneTime')}
                      </span>
                    )}
                  </div>

                  <ul className="space-y-2.5 sm:space-y-3 mb-6 sm:mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[13px] sm:text-sm">
                        <Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: plan.highlighted ? '#03DAC6' : '#9E9E9E' }} />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Plan action button: Purchase URL or WhatsApp contact */}
                  {plan.purchaseUrl ? (
                    <a
                      href={plan.purchaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cta-shimmer w-full block text-center rounded-xl h-12 sm:h-auto sm:py-3 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden relative"
                      style={
                        plan.highlighted
                          ? { background: 'linear-gradient(135deg, #BB86FC, #03DAC6)', color: '#000', boxShadow: '0 4px 20px rgba(187,134,252,0.2)' }
                          : { background: 'rgba(255,255,255,0.06)', color: '#E6E1E5' }
                      }
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {t('landing.getStarted')}
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </a>
                  ) : platformConfig?.whatsappNumber ? (
                    <a
                      href={`https://wa.me/${platformConfig.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo, saya tertarik berlangganan ${plan.name}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 rounded-xl h-12 sm:h-auto sm:py-3 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] bg-[#25D366] text-white"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Chat WhatsApp
                    </a>
                  ) : (
                    <button
                      onClick={() => openAuth()}
                      className="cta-shimmer w-full rounded-xl h-12 sm:h-auto sm:py-3 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden relative"
                      style={
                        plan.highlighted
                          ? { background: 'linear-gradient(135deg, #BB86FC, #03DAC6)', color: '#000', boxShadow: '0 4px 20px rgba(187,134,252,0.2)' }
                          : { background: 'rgba(255,255,255,0.06)', color: '#E6E1E5' }
                      }
                    >
                      <span className="relative z-10">{t('auth.login')}</span>
                    </button>
                  )}
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>}

      {/* ========== FAQ SECTION ========== */}
      {visibleSections.faq && <section id="faq" className="relative py-12 sm:py-16 lg:py-28 px-4 sm:px-6">
        <SectionSeparator color="#BB86FC" />

        <div className="mx-auto max-w-2xl">
          <FadeUp>
            <div className="text-center mb-8 sm:mb-16">
              <p className="inline-block text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] mb-2 sm:mb-3 text-[#BB86FC]">
                {t('landing.faqSubtitle')}
              </p>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
                {t('landing.faqTitle1')}{' '}
                <span className="bg-clip-text text-transparent animate-gradient-text" style={{ backgroundImage: 'linear-gradient(90deg, #BB86FC, #03DAC6, #BB86FC)', backgroundSize: '200% 200%' }}>
                  {t('landing.faqTitle2')}
                </span>
              </h2>
            </div>
          </FadeUp>

          <div className="space-y-3 sm:space-y-4">
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <FadeUp key={i} delay={i * 60}>
                  <div
                    className="rounded-2xl border overflow-hidden transition-all duration-300"
                    style={{
                      background: isOpen ? 'rgba(187,134,252,0.04)' : 'rgba(18,18,18,0.5)',
                      borderColor: isOpen ? 'rgba(187,134,252,0.2)' : 'rgba(255,255,255,0.06)',
                      boxShadow: isOpen ? '0 4px 24px rgba(187,134,252,0.06)' : 'none',
                    }}
                  >
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between px-5 py-4 sm:px-5 sm:py-4 text-left transition-colors duration-200 hover:bg-white/[0.02] min-h-[3.25rem]"
                    >
                      <span className="text-sm sm:text-base font-semibold pr-4">{faq.q}</span>
                      <ChevronDown
                        className="h-5 w-5 shrink-0 transition-all duration-300"
                        style={{
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          color: isOpen ? '#BB86FC' : '#9E9E9E',
                        }}
                      />
                    </button>
                    <div
                      className="overflow-hidden transition-all duration-400 ease-out"
                      style={{
                        maxHeight: isOpen ? '300px' : '0px',
                        opacity: isOpen ? 1 : 0,
                        transition: isOpen
                          ? 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-out'
                          : 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.15s ease-out',
                      }}
                    >
                      <div className="px-5 pb-4 sm:px-5 sm:pb-4 border-t border-[rgba(187,134,252,0.08)]">
                        <p className="text-sm sm:text-sm text-muted-foreground leading-relaxed pt-3">
                          {faq.a}
                        </p>
                      </div>
                    </div>
                  </div>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>}

      {/* ========== FINAL CTA ========== */}
      <section className="relative py-12 sm:py-16 lg:py-28 px-4 sm:px-6">
        <SectionSeparator color="#CF6679" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 h-64 w-96 rounded-full opacity-10 blur-[100px] animate-aurora" style={{ background: 'conic-gradient(from 0deg, #BB86FC, #03DAC6, #CF6679, #BB86FC)' }} />

        <div className="mx-auto max-w-2xl text-center relative">
          <FadeUp>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4 sm:mb-6">
              {t('landing.ctaTitle1')}{' '}
              <span
                className="bg-clip-text text-transparent animate-gradient-text"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #BB86FC, #03DAC6, #CF6679, #BB86FC)',
                  backgroundSize: '300% 300%',
                }}
              >
                {t('landing.ctaTitle2')}
              </span>
            </h2>
          </FadeUp>

          <FadeUp delay={100}>
            <p className="text-muted-foreground text-sm sm:text-lg leading-relaxed mb-6 sm:mb-10">
              {t('landing.ctaDesc')}
            </p>
          </FadeUp>

          <FadeUp delay={200}>
            <button
              onClick={() => openAuth()}
              className="cta-shimmer group relative w-full sm:w-auto h-12 sm:h-auto rounded-full px-10 sm:py-3.5 text-sm sm:text-base font-bold transition-all hover:scale-105 active:scale-95 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #BB86FC, #03DAC6)',
                color: '#000',
                boxShadow: '0 4px 30px rgba(187,134,252,0.25), 0 0 60px rgba(3,218,198,0.08)',
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {t('landing.ctaButton')}
                <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </button>
          </FadeUp>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="mt-auto border-t py-8 sm:py-10 px-4 sm:px-6 border-[rgba(255,255,255,0.06)]">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="Wealth Tracker" width={24} height={24} className="rounded-md" />
              <span className="text-sm font-semibold">{t('landing.creator')}</span>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground text-center">
              Creator: Tyger Earth | Ahtjong Labs
            </p>
            {lpConfig?.customFooterText && (
              <p className="text-[11px] sm:text-xs text-muted-foreground text-center max-w-md">
                {lpConfig.customFooterText}
              </p>
            )}
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} {t('landing.rights')}
            </p>
          </div>
        </div>
      </footer>

      {/* ========== SCROLL TO TOP ========== */}
      <ScrollToTopButton />

      {/* ========== AUTH DIALOG ========== */}
      <Dialog open={authOpen} onOpenChange={(open) => {
        setAuthOpen(open);
        if (!open) setAuthMode('login');
      }}>
        <DialogContent className="rounded-2xl border-0 p-0 max-w-[420px] mx-auto bg-[#121212]" showCloseButton={true}>
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-center gap-2.5 mb-1">
              <Image src="/logo.png" alt="Wealth Tracker" width={32} height={32} className="rounded-lg" />
              <DialogTitle className="text-lg font-bold text-[#E6E1E5]">{t('landing.creator')}</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#9E9E9E]">
              {authMode === 'login' ? t('landing.authDesc') : t('auth.createAccount')}
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 pt-4">
            {authMode === 'login' ? (
              <LoginForm />
            ) : (
              <RegisterForm />
            )}
            <div className="mt-5 text-center">
              {authMode === 'login' ? (
                <p className="text-[11px] text-[#9E9E9E]">
                  {t('landing.noAccountHint')}{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('register')}
                    className="font-semibold hover:underline text-[#BB86FC]"
                  >
                    {t('auth.register')}
                  </button>
                </p>
              ) : (
                <p className="text-[11px] text-[#9E9E9E]">
                  {t('auth.hasAccount')}{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="font-semibold hover:underline text-[#BB86FC]"
                  >
                    {t('auth.login')}
                  </button>
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
