import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/platform-config — Public endpoint for landing page config
export async function GET() {
  try {
    const config = await db.platformConfig.findUnique({ where: { id: 'platform' } });
    if (!config) {
      return NextResponse.json({
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
        whatsappNumber: null,
        registrationOpen: true,
        registrationMessage: null,
        availablePlans: ['basic', 'pro', 'ultimate'],
        sectionVisibility: null,
        exportEnabled: null,
      });
    }

    // Parse JSON fields
    const parsedAvailablePlans = config.availablePlans ? JSON.parse(config.availablePlans) : ['basic', 'pro', 'ultimate'];
    const parsedSectionVisibility = config.sectionVisibility ? JSON.parse(config.sectionVisibility) : null;
    const parsedExportEnabled = config.exportEnabled ? JSON.parse(config.exportEnabled) : null;

    return NextResponse.json({
      basicPlanPrice: config.basicPlanPrice || 'Gratis',
      proPlanPrice: config.proPlanPrice || 'Rp 99.000',
      ultimatePlanPrice: config.ultimatePlanPrice || 'Rp 199.000',
      basicPlanFeatures: config.basicPlanFeatures,
      proPlanFeatures: config.proPlanFeatures,
      ultimatePlanFeatures: config.ultimatePlanFeatures,
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
      whatsappNumber: config.whatsappNumber || null,
      registrationOpen: config.registrationOpen ?? true,
      registrationMessage: config.registrationMessage || null,
      availablePlans: parsedAvailablePlans,
      sectionVisibility: parsedSectionVisibility,
      exportEnabled: parsedExportEnabled,
    });
  } catch (error) {
    console.error('Public platform config error:', error);
    return NextResponse.json({
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
      whatsappNumber: null,
      registrationOpen: true,
      registrationMessage: null,
      availablePlans: ['basic', 'pro', 'ultimate'],
      sectionVisibility: null,
      exportEnabled: null,
    }, { status: 500 });
  }
}
