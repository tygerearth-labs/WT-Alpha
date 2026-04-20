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
        basicPlanFeatures: null,
        proPlanFeatures: null,
        basicPlanDiscount: null,
        proPlanDiscount: null,
        basicPlanDiscountLabel: null,
        proPlanDiscountLabel: null,
        basicPurchaseUrl: null,
        proPurchaseUrl: null,
        trialEnabled: true,
        trialDurationDays: 30,
        whatsappNumber: null,
        registrationOpen: true,
        registrationMessage: null,
        availablePlans: ['basic', 'pro'],
        sectionVisibility: null,
        exportEnabled: null,
      });
    }

    // Parse JSON fields
    const parsedAvailablePlans = config.availablePlans ? JSON.parse(config.availablePlans) : ['basic', 'pro'];
    const parsedSectionVisibility = config.sectionVisibility ? JSON.parse(config.sectionVisibility) : null;
    const parsedExportEnabled = config.exportEnabled ? JSON.parse(config.exportEnabled) : null;

    return NextResponse.json({
      basicPlanPrice: config.basicPlanPrice || 'Gratis',
      proPlanPrice: config.proPlanPrice || 'Rp 99.000',
      basicPlanFeatures: config.basicPlanFeatures,
      proPlanFeatures: config.proPlanFeatures,
      basicPlanDiscount: config.basicPlanDiscount || null,
      proPlanDiscount: config.proPlanDiscount || null,
      basicPlanDiscountLabel: config.basicPlanDiscountLabel || null,
      proPlanDiscountLabel: config.proPlanDiscountLabel || null,
      basicPurchaseUrl: config.basicPurchaseUrl || null,
      proPurchaseUrl: config.proPurchaseUrl || null,
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
      basicPlanFeatures: null,
      proPlanFeatures: null,
      basicPlanDiscount: null,
      proPlanDiscount: null,
      basicPlanDiscountLabel: null,
      proPlanDiscountLabel: null,
      basicPurchaseUrl: null,
      proPurchaseUrl: null,
      trialEnabled: true,
      trialDurationDays: 30,
      whatsappNumber: null,
      registrationOpen: true,
      registrationMessage: null,
      availablePlans: ['basic', 'pro'],
      sectionVisibility: null,
      exportEnabled: null,
    }, { status: 500 });
  }
}
