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
} from 'lucide-react';

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
/*  Animated number counter                                            */
/* ------------------------------------------------------------------ */
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useInView();

  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 30);
    return () => clearInterval(timer);
  }, [visible, target]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  LANDING PAGE                                                        */
/* ------------------------------------------------------------------ */
export function LandingPage() {
  const { t } = useTranslation();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  /* ---- Data arrays built inside component for t() access ---- */
  const features = [
    {
      icon: BarChart3,
      title: t('landing.feat1Title'),
      description: t('landing.feat1Desc'),
      color: '#BB86FC',
    },
    {
      icon: ArrowDownLeft,
      title: t('landing.feat2Title'),
      description: t('landing.feat2Desc'),
      color: '#03DAC6',
    },
    {
      icon: ArrowUpRight,
      title: t('landing.feat3Title'),
      description: t('landing.feat3Desc'),
      color: '#CF6679',
    },
    {
      icon: Target,
      title: t('landing.feat4Title'),
      description: t('landing.feat4Desc'),
      color: '#F9A825',
    },
    {
      icon: FileDown,
      title: t('landing.feat5Title'),
      description: t('landing.feat5Desc'),
      color: '#BB86FC',
    },
    {
      icon: Sparkles,
      title: t('landing.feat6Title'),
      description: t('landing.feat6Desc'),
      color: '#03DAC6',
    },
  ];

  const plans = [
    {
      name: t('landing.basicName'),
      price: t('landing.basicPrice'),
      originalPrice: t('landing.basicOriginalPrice'),
      period: '',
      description: t('landing.basicDesc'),
      highlighted: false,
      badge: null,
      features: [
        t('landing.basicF1'),
        t('landing.basicF2'),
        t('landing.basicF3'),
        t('landing.basicF4'),
        t('landing.basicF5'),
        t('landing.basicF6'),
      ],
    },
    {
      name: t('landing.proName'),
      price: t('landing.proPrice'),
      originalPrice: t('landing.proOriginalPrice'),
      period: '',
      description: t('landing.proDesc'),
      highlighted: true,
      badge: t('landing.proBadge'),
      features: [
        t('landing.proF1'),
        t('landing.proF2'),
        t('landing.proF3'),
        t('landing.proF4'),
        t('landing.proF5'),
        t('landing.proF6'),
      ],
    },
  ];

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

  const openAuth = useCallback(() => {
    setAuthOpen(true);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">

      {/* ========== NAVBAR ========== */}
      <nav className="fixed top-0 inset-x-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Wealth Tracker" width={36} height={36} className="rounded-lg" priority />
            <span className="font-bold text-lg tracking-tight">{t('landing.creator')}</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
            <button onClick={() => scrollTo('story')} className="hover:text-foreground transition-colors">{t('landing.navStory')}</button>
            <button onClick={() => scrollTo('features')} className="hover:text-foreground transition-colors">{t('landing.navFeatures')}</button>
            <button onClick={() => scrollTo('pricing')} className="hover:text-foreground transition-colors">{t('landing.navPricing')}</button>
            <button onClick={() => scrollTo('testimonials')} className="hover:text-foreground transition-colors">{t('landing.navReview')}</button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => openAuth()}
              className="rounded-full px-4 sm:px-5 py-2 text-sm font-semibold transition-all hover:scale-105 active:scale-95"
              style={{ background: '#BB86FC', color: '#000' }}
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
          <div className="px-4 py-3 flex flex-col gap-3 text-sm text-muted-foreground">
            <button onClick={() => scrollTo('story')} className="text-left py-1.5 hover:text-foreground transition-colors">{t('landing.navStory')}</button>
            <button onClick={() => scrollTo('features')} className="text-left py-1.5 hover:text-foreground transition-colors">{t('landing.navFeatures')}</button>
            <button onClick={() => scrollTo('pricing')} className="text-left py-1.5 hover:text-foreground transition-colors">{t('landing.navPricing')}</button>
            <button onClick={() => scrollTo('testimonials')} className="text-left py-1.5 hover:text-foreground transition-colors">{t('landing.navReview')}</button>
            <button onClick={() => scrollTo('faq')} className="text-left py-1.5 hover:text-foreground transition-colors">FAQ</button>
          </div>
        </div>
      </nav>

      {/* ========== HERO ========== */}
      <section className="relative min-h-[100dvh] flex flex-col justify-center pt-20 sm:pt-36 pb-10 sm:pb-32 px-4 sm:px-6">
        {/* Gradient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full opacity-20 blur-[120px] animate-pulse" style={{ background: '#BB86FC' }} />
          <div className="absolute top-1/3 -right-32 h-80 w-80 rounded-full opacity-15 blur-[100px] animate-pulse" style={{ background: '#03DAC6', animationDelay: '1s' }} />
          <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full opacity-10 blur-[80px] animate-pulse" style={{ background: '#CF6679', animationDelay: '2s' }} />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <FadeUp>
            <div className="flex justify-center mb-4 sm:mb-8">
              <div className="relative rounded-2xl p-0.5 sm:p-1" style={{ background: 'linear-gradient(135deg, #BB86FC, #03DAC6, #CF6679)' }}>
                <Image src="/logo.png" alt="Wealth Tracker" width={56} height={56} className="rounded-xl sm:rounded-2xl" priority />
              </div>
            </div>
          </FadeUp>

          <FadeUp delay={50}>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] sm:text-xs font-medium mb-4 sm:mb-8 border" style={{ borderColor: 'rgba(187,134,252,0.25)', background: 'rgba(187,134,252,0.08)', color: '#BB86FC' }}>
              <Sparkles className="h-3.5 w-3.5" />
              {t('landing.by')} Tyger Earth Labs
            </div>
          </FadeUp>

          <FadeUp delay={100}>
            <h1 className="text-[28px] sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-3 sm:mb-6">
              <span className="block">{t('landing.heroLine1')}</span>
              <span className="block bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #BB86FC 0%, #03DAC6 50%, #CF6679 100%)' }}>
                {t('landing.heroLine2')}
              </span>
            </h1>
          </FadeUp>

          <FadeUp delay={200}>
            <p className="mx-auto max-w-xl text-[13px] sm:text-lg text-muted-foreground leading-relaxed mb-5 sm:mb-10">
              {t('landing.heroDesc')}
            </p>
          </FadeUp>

          <FadeUp delay={300}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <button
                onClick={() => openAuth()}
                className="group relative w-full sm:w-auto rounded-full px-8 py-3.5 text-sm font-bold transition-all hover:scale-105 active:scale-95 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #BB86FC, #03DAC6)', color: '#000' }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {t('landing.loginNow')}
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            </div>
          </FadeUp>

          <FadeUp delay={400}>
            <p className="mt-3 text-center text-[10px] sm:text-xs text-muted-foreground/60">
              {t('landing.accessNotice')}
            </p>
          </FadeUp>

          {/* Trust badges */}
          <FadeUp delay={500}>
            <div className="mt-6 sm:mt-16 flex flex-wrap items-center justify-center gap-4 sm:gap-10 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: '#03DAC6' }} />
                <span className="text-[11px] sm:text-sm">{t('landing.encrypted')}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: '#BB86FC' }} />
                <span className="text-[11px] sm:text-sm">{t('landing.oneTimePayment')}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: '#CF6679' }} />
                <span className="text-[11px] sm:text-sm">{t('landing.smartInsights')}</span>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ========== STORY SECTION ========== */}
      <section id="story" className="relative py-8 sm:py-28 px-4 sm:px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-3/4 max-w-md" style={{ background: 'linear-gradient(90deg, transparent, rgba(207,102,121,0.3), transparent)' }} />

        <div className="mx-auto max-w-4xl">
          <FadeUp>
            <div className="text-center mb-6 sm:mb-16">
              <p className="inline-block text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] mb-2 sm:mb-3" style={{ color: '#03DAC6' }}>
                {t('landing.storySubtitle')}
              </p>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
                {t('landing.storyTitle1')}
                <span className="block mt-1 bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #BB86FC, #CF6679)' }}>
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
                  className="rounded-2xl p-4 sm:p-6 border transition-all duration-300 sm:hover:scale-[1.01]"
                  style={{ background: 'rgba(18,18,18,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${story.color}33`; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl grid place-items-center [&>*]:block leading-none" style={{ background: `${story.color}18` }}>
                        <story.icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: story.color }} />
                      </div>
                      {i < 3 && <div className="w-px h-4 sm:hidden" style={{ background: `${story.color}25` }} />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-lg font-semibold mb-1 sm:mb-2">{story.title}</h3>
                      <p className="text-muted-foreground text-[12px] sm:text-base leading-relaxed">
                        {story.text}
                      </p>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>

          {/* Statistics */}
          <FadeUp delay={200}>
            <div className="mt-8 sm:mt-16">
              <div className="flex gap-3 overflow-x-auto pb-2 sm:pb-0 sm:grid sm:grid-cols-3 sm:gap-6 scrollbar-hide">
                {[
                  { value: <AnimatedCounter target={73} suffix="%" />, label: t('landing.noTrack') + ' ' + t('landing.statNoTrack'), color: '#CF6679' },
                  { value: <><AnimatedCounter target={2} />x</>, label: t('landing.statMoreSavings'), color: '#03DAC6' },
                  { value: <AnimatedCounter target={30} suffix="%" />, label: t('landing.statAvgSaving'), color: '#BB86FC' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="min-w-[140px] sm:min-w-0 rounded-2xl p-4 sm:p-6 text-center border shrink-0 sm:shrink transition-all duration-300 sm:hover:scale-[1.02]"
                    style={{ background: 'rgba(18,18,18,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}
                  >
                    <div className="text-2xl sm:text-4xl font-extrabold mb-1" style={{ color: stat.color }}>
                      {stat.value}
                    </div>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ========== FEATURES SECTION ========== */}
      <section id="features" className="relative py-8 sm:py-28 px-4 sm:px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-3/4 max-w-md" style={{ background: 'linear-gradient(90deg, transparent, rgba(187,134,252,0.3), transparent)' }} />

        <div className="mx-auto max-w-6xl">
          <FadeUp>
            <div className="text-center mb-6 sm:mb-16">
              <p className="inline-block text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] mb-2 sm:mb-3" style={{ color: '#03DAC6' }}>
                {t('landing.featureSubtitle')}
              </p>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight mb-2 sm:mb-3">
                {t('landing.featureTitle1')}{' '}
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #BB86FC, #03DAC6)' }}>
                  {t('landing.featureTitle2')}
                </span>
              </h2>
              <p className="text-muted-foreground text-[12px] sm:text-base max-w-lg mx-auto">
                {t('landing.featureDesc')}
              </p>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {features.map((feature, i) => (
              <FadeUp key={feature.title} delay={i * 80}>
                <div
                  className="group rounded-2xl p-4 sm:p-6 border transition-all duration-300 sm:hover:scale-[1.02]"
                  style={{ background: 'rgba(18,18,18,0.5)', borderColor: 'rgba(255,255,255,0.06)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${feature.color}33`; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}
                >
                  <div className="flex items-start gap-3 sm:gap-0 sm:flex-col">
                    <div
                      className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl grid place-items-center shrink-0 sm:mb-4 sm:shrink [&>*]:block leading-none transition-transform duration-300 group-hover:scale-110"
                      style={{ background: `${feature.color}18` }}
                    >
                      <feature.icon className="h-5 w-5" style={{ color: feature.color }} />
                    </div>
                    <div className="min-w-0 sm:min-w-auto">
                      <h3 className="text-sm sm:text-lg font-semibold mb-1 sm:mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground text-[12px] sm:text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ========== TESTIMONIALS ========== */}
      <section id="testimonials" className="relative py-8 sm:py-28 px-4 sm:px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-3/4 max-w-md" style={{ background: 'linear-gradient(90deg, transparent, rgba(249,168,37,0.3), transparent)' }} />

        <div className="mx-auto max-w-4xl">
          <FadeUp>
            <div className="text-center mb-6 sm:mb-16">
              <p className="inline-block text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] mb-2 sm:mb-3" style={{ color: '#F9A825' }}>
                {t('landing.reviewSubtitle')}
              </p>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
                {t('landing.reviewTitle1')}{' '}
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #F9A825, #CF6679)' }}>
                  {t('landing.reviewTitle2')}
                </span>
              </h2>
            </div>
          </FadeUp>

          <div className="space-y-3 sm:space-y-6">
            {testimonials.map((tm, i) => (
              <FadeUp key={tm.name} delay={i * 100}>
                <div
                  className="rounded-2xl p-4 sm:p-6 border"
                  style={{ background: 'rgba(18,18,18,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}
                >
                  {/* Stars */}
                  <div className="flex items-center gap-0.5 mb-3">
                    {Array.from({ length: tm.rating }).map((_, si) => (
                      <Star key={si} className="h-3.5 w-3.5 fill-[#F9A825] text-[#F9A825]" />
                    ))}
                  </div>
                  <p className="text-[13px] sm:text-base text-muted-foreground leading-relaxed mb-3 sm:mb-4 italic">
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
      </section>

      {/* ========== PRICING SECTION ========== */}
      <section id="pricing" className="relative py-8 sm:py-28 px-4 sm:px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-3/4 max-w-md" style={{ background: 'linear-gradient(90deg, transparent, rgba(3,218,198,0.3), transparent)' }} />

        <div className="mx-auto max-w-4xl">
          <FadeUp>
            <div className="text-center mb-6 sm:mb-6">
              <p className="inline-block text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] mb-2 sm:mb-3" style={{ color: '#03DAC6' }}>
                {t('landing.pricingSubtitle')}
              </p>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight mb-2 sm:mb-3">
                {t('landing.pricingTitle1')}{' '}
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #03DAC6, #BB86FC)' }}>
                  {t('landing.pricingTitle2')}
                </span>
              </h2>
              <p className="text-muted-foreground text-[12px] sm:text-base max-w-lg mx-auto">
                {t('landing.pricingDesc')}
              </p>
            </div>
          </FadeUp>

          <FadeUp delay={50}>
            <div className="mx-auto max-w-md mb-6 sm:mb-12 rounded-xl p-3 text-center border" style={{ background: 'rgba(187,134,252,0.06)', borderColor: 'rgba(187,134,252,0.15)' }}>
              <div className="flex items-center justify-center gap-2 mb-1">
                <MessageCircle className="h-4 w-4" style={{ color: '#BB86FC' }} />
                <p className="text-xs font-semibold" style={{ color: '#BB86FC' }}>{t('landing.adminRegister')}</p>
              </div>
              <p className="text-[11px]" style={{ color: '#9E9E9E' }}>
                {t('landing.adminRegisterDesc')}
              </p>
            </div>
          </FadeUp>

          <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 items-stretch">
            {plans.map((plan, i) => (
              <FadeUp key={plan.name} delay={i * 120}>
                <div
                  className={`relative rounded-2xl p-5 sm:p-8 border transition-all duration-300 h-full flex flex-col ${
                    plan.highlighted ? '' : ''
                  }`}
                  style={{
                    background: plan.highlighted
                      ? 'linear-gradient(180deg, rgba(187,134,252,0.08) 0%, rgba(18,18,18,0.8) 40%)'
                      : 'rgba(18,18,18,0.5)',
                    borderColor: plan.highlighted
                      ? 'rgba(187,134,252,0.25)'
                      : 'rgba(255,255,255,0.06)',
                    boxShadow: plan.highlighted
                      ? '0 0 60px -15px rgba(187,134,252,0.15)'
                      : 'none',
                  }}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-block rounded-full px-4 py-1 text-[10px] font-bold uppercase tracking-widest" style={{ background: 'linear-gradient(135deg, #BB86FC, #03DAC6)', color: '#000' }}>
                        {plan.badge}
                      </span>
                    </div>
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
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(207,102,121,0.15)', color: '#CF6679' }}>
                      {Math.round((1 - parseFloat(plan.price.replace(/[^0-9]/g, '')) / parseFloat(plan.originalPrice.replace(/[^0-9]/g, ''))) * 100)}% OFF
                    </span>
                    {!plan.period && (
                      <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(3,218,198,0.12)', color: '#03DAC6' }}>
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

                  <button
                    onClick={() => openAuth()}
                    className="w-full rounded-xl py-3 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={
                      plan.highlighted
                        ? { background: 'linear-gradient(135deg, #BB86FC, #03DAC6)', color: '#000' }
                        : { background: 'rgba(255,255,255,0.06)', color: '#E6E1E5' }
                    }
                  >
                    {t('auth.login')}
                  </button>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FAQ SECTION ========== */}
      <section id="faq" className="relative py-8 sm:py-28 px-4 sm:px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-3/4 max-w-md" style={{ background: 'linear-gradient(90deg, transparent, rgba(187,134,252,0.3), transparent)' }} />

        <div className="mx-auto max-w-2xl">
          <FadeUp>
            <div className="text-center mb-6 sm:mb-16">
              <p className="inline-block text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] mb-2 sm:mb-3" style={{ color: '#BB86FC' }}>
                {t('landing.faqSubtitle')}
              </p>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
                {t('landing.faqTitle1')}{' '}
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #BB86FC, #03DAC6)' }}>
                  {t('landing.faqTitle2')}
                </span>
              </h2>
            </div>
          </FadeUp>

          <div className="space-y-2 sm:space-y-3">
            {faqs.map((faq, i) => (
              <FadeUp key={i} delay={i * 60}>
                <div
                  className="rounded-xl border overflow-hidden"
                  style={{ background: 'rgba(18,18,18,0.5)', borderColor: 'rgba(255,255,255,0.06)' }}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-4 py-3.5 sm:px-5 sm:py-4 text-left"
                  >
                    <span className="text-sm sm:text-base font-semibold pr-4">{faq.q}</span>
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300"
                      style={{ transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    />
                  </button>
                  <div
                    className="overflow-hidden transition-all duration-300"
                    style={{ maxHeight: openFaq === i ? '200px' : '0px', opacity: openFaq === i ? 1 : 0 }}
                  >
                    <p className="px-4 pb-3.5 sm:px-5 sm:pb-4 text-[12px] sm:text-sm text-muted-foreground leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FINAL CTA ========== */}
      <section className="relative py-8 sm:py-28 px-4 sm:px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-3/4 max-w-md" style={{ background: 'linear-gradient(90deg, transparent, rgba(207,102,121,0.3), transparent)' }} />
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 h-64 w-96 rounded-full opacity-10 blur-[100px]" style={{ background: '#BB86FC' }} />

        <div className="mx-auto max-w-2xl text-center relative">
          <FadeUp>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3 sm:mb-6">
              {t('landing.ctaTitle1')}{' '}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #BB86FC, #03DAC6, #CF6679)' }}>
                {t('landing.ctaTitle2')}
              </span>
            </h2>
          </FadeUp>

          <FadeUp delay={100}>
            <p className="text-muted-foreground text-[12px] sm:text-lg leading-relaxed mb-5 sm:mb-10">
              {t('landing.ctaDesc')}
            </p>
          </FadeUp>

          <FadeUp delay={200}>
            <button
              onClick={() => openAuth()}
              className="group relative w-full sm:w-auto rounded-full px-10 py-3.5 text-sm sm:text-base font-bold transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #BB86FC, #03DAC6)', color: '#000' }}
            >
              <span className="flex items-center justify-center gap-2">
                {t('landing.ctaButton')}
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          </FadeUp>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="mt-auto border-t py-6 sm:py-10 px-4 sm:px-6" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="Wealth Tracker" width={24} height={24} className="rounded-md" />
              <span className="text-sm font-semibold">{t('landing.creator')}</span>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground text-center">
              Creator: Tyger Earth | Ahtjong Labs
            </p>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} {t('landing.rights')}
            </p>
          </div>
        </div>
      </footer>

      {/* ========== AUTH DIALOG ========== */}
      <Dialog open={authOpen} onOpenChange={(open) => { setAuthOpen(open); if (!open) setAuthMode('login'); }}>
        <DialogContent className="rounded-2xl border-0 p-0 max-w-[420px] mx-auto max-h-[90vh] overflow-y-auto" style={{ background: '#121212' }} showCloseButton={true}>
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-center gap-2.5 mb-1">
              <Image src="/logo.png" alt="Wealth Tracker" width={32} height={32} className="rounded-lg" />
              <DialogTitle className="text-lg font-bold" style={{ color: '#E6E1E5' }}>{t('landing.creator')}</DialogTitle>
            </div>
            <DialogDescription className="text-xs" style={{ color: '#9E9E9E' }}>
              {authMode === 'login' ? t('landing.authLoginDesc') : t('landing.authRegisterDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 pt-4">
            {authMode === 'login' ? <LoginForm /> : <RegisterForm />}
            <div className="mt-5 text-center">
              <p className="text-[11px]" style={{ color: '#9E9E9E' }}>
                {authMode === 'login' ? (
                  <>
                    {t('landing.noAccount')}{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      className="font-semibold underline underline-offset-2"
                      style={{ color: '#BB86FC' }}
                    >
                      {t('landing.switchToRegister')}
                    </button>
                  </>
                ) : (
                  <>
                    {t('landing.alreadyHaveAccount')}{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="font-semibold underline underline-offset-2"
                      style={{ color: '#BB86FC' }}
                    >
                      {t('landing.switchToLogin')}
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
