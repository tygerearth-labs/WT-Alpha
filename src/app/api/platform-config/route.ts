import { NextResponse } from 'next/server';

// Default config returned when DB is unreachable (e.g. Vercel ephemeral FS)
const FALLBACK_CONFIG = {
  basicPlanPrice: 'Gratis',
  proPlanPrice: 'Rp 99.000',
  ultimatePlanPrice: 'Rp 199.000',
  basicPlanFeatures: null,
  proPlanFeatures: null,
  ultimatePlanFeatures: null,
  basicPlanDiscount: null,
  proPlanDiscount: null,
  ultimatePlanDiscount: null,
  basicPlanDiscountLabel: null,
  proPlanDiscountLabel: null,
  ultimatePlanDiscountLabel: null,
  basicPurchaseUrl: null,
  proPurchaseUrl: null,
  ultimatePurchaseUrl: null,
  trialEnabled: true,
  trialDurationDays: 30,
  trialPlan: 'basic',
  whatsappNumber: null,
  registrationOpen: true,
  registrationMessage: null,
  availablePlans: ['basic', 'pro', 'ultimate'],
  sectionVisibility: null,
  exportEnabled: { basic: { pdf: true, excel: true }, pro: { pdf: true, excel: true, csv: true }, ultimate: { pdf: true, excel: true, csv: true, custom: true } },
  landingPageConfig: {
    showStory: true,
    showFeatures: true,
    showTestimonials: true,
    showPricing: true,
    showFaq: true,
    showStats: true,
    heroSubtitle: '',
    customFooterText: '',
  },
  landingPageStats: null,
};

// GET /api/platform-config — Public endpoint for landing page config
export async function GET() {
  try {
    // Dynamic import so that Prisma engine init failure is caught here
    const { db } = await import('@/lib/db');
    const config = await db.platformConfig.findUnique({ where: { id: 'platform' } });
    if (!config) {
      return NextResponse.json(FALLBACK_CONFIG);
    }

    // Parse JSON fields
    let parsedAvailablePlans = ['basic', 'pro', 'ultimate'];
    try { parsedAvailablePlans = config.availablePlans ? JSON.parse(config.availablePlans) : parsedAvailablePlans; } catch {}
    let parsedSectionVisibility = null;
    try { parsedSectionVisibility = config.sectionVisibility ? JSON.parse(config.sectionVisibility) : null; } catch {}
    let parsedExportEnabled = null;
    try { parsedExportEnabled = config.exportEnabled ? JSON.parse(config.exportEnabled) : null; } catch {}
    let parsedLandingPageConfig = {
      showStory: true,
      showFeatures: true,
      showTestimonials: true,
      showPricing: true,
      showFaq: true,
      showStats: true,
      heroSubtitle: '',
      customFooterText: '',
    };
    try {
      if (config.landingPageConfig) {
        parsedLandingPageConfig = { ...parsedLandingPageConfig, ...JSON.parse(config.landingPageConfig) };
      }
    } catch {}
    let parsedLandingStats = null;
    try { parsedLandingStats = config.landingPageStats ? JSON.parse(config.landingPageStats) : null; } catch {}

    // Parse plan features from JSON strings to arrays
    let parsedBasicFeatures: string[] | null = null;
    try { parsedBasicFeatures = config.basicPlanFeatures ? JSON.parse(config.basicPlanFeatures) : null; } catch {}
    let parsedProFeatures: string[] | null = null;
    try { parsedProFeatures = config.proPlanFeatures ? JSON.parse(config.proPlanFeatures) : null; } catch {}
    let parsedUltimateFeatures: string[] | null = null;
    try { parsedUltimateFeatures = config.ultimatePlanFeatures ? JSON.parse(config.ultimatePlanFeatures) : null; } catch {}

    return NextResponse.json({
      basicPlanPrice: config.basicPlanPrice || 'Gratis',
      proPlanPrice: config.proPlanPrice || 'Rp 99.000',
      ultimatePlanPrice: config.ultimatePlanPrice || 'Rp 199.000',
      basicPlanFeatures: parsedBasicFeatures,
      proPlanFeatures: parsedProFeatures,
      ultimatePlanFeatures: parsedUltimateFeatures,
      basicPlanDiscount: config.basicPlanDiscount || null,
      proPlanDiscount: config.proPlanDiscount || null,
      ultimatePlanDiscount: config.ultimatePlanDiscount || null,
      basicPlanDiscountLabel: config.basicPlanDiscountLabel || null,
      proPlanDiscountLabel: config.proPlanDiscountLabel || null,
      ultimatePlanDiscountLabel: config.ultimatePlanDiscountLabel || null,
      basicPurchaseUrl: config.basicPurchaseUrl || null,
      proPurchaseUrl: config.proPurchaseUrl || null,
      ultimatePurchaseUrl: config.ultimatePurchaseUrl || null,
      trialEnabled: config.trialEnabled ?? true,
      trialDurationDays: config.trialDurationDays || 30,
      trialPlan: config.trialPlan || 'basic',
      whatsappNumber: config.whatsappNumber || null,
      registrationOpen: config.registrationOpen ?? true,
      registrationMessage: config.registrationMessage || null,
      availablePlans: parsedAvailablePlans,
      sectionVisibility: parsedSectionVisibility,
      exportEnabled: parsedExportEnabled,
      landingPageConfig: parsedLandingPageConfig,
      landingPageStats: parsedLandingStats,
    });
  } catch (error) {
    // DB unreachable (e.g. SQLite on Vercel ephemeral FS) — return defaults with 200
    console.error('Public platform config error (DB unreachable, using defaults):', error);
    return NextResponse.json(FALLBACK_CONFIG);
  }
}
