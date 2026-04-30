import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

const CONFIG_ID = 'platform';

// JSON string fields that need validation before saving
const JSON_FIELDS = [
  'sectionVisibility',
  'exportEnabled',
  'availablePlans',
  'basicPlanFeatures',
  'proPlanFeatures',
  'ultimatePlanFeatures',
  'landingPageConfig',
  'landingPageStats',
] as const;

function validateJsonField(value: unknown, fieldName: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return `${fieldName} must be a JSON string`;
  try {
    JSON.parse(value);
    return null;
  } catch {
    return `${fieldName} contains invalid JSON`;
  }
}

export async function GET() {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    let config = await db.platformConfig.findUnique({
      where: { id: CONFIG_ID },
    });

    if (!config) {
      config = await db.platformConfig.create({
        data: { id: CONFIG_ID },
      });
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error('PlatformConfig GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch platform config' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const {
      defaultPlan, defaultMaxCategories, defaultMaxSavings, autoSuspendExpired,
      basicPlanFeatures, proPlanFeatures, ultimatePlanFeatures, basicPlanPrice, proPlanPrice, ultimatePlanPrice,
      basicPlanDiscount, proPlanDiscount, ultimatePlanDiscount,
      basicPlanDiscountLabel, proPlanDiscountLabel, ultimatePlanDiscountLabel,
      basicPurchaseUrl, proPurchaseUrl, ultimatePurchaseUrl,
      trialEnabled, trialDurationDays, trialPlan,
      whatsappNumber, registrationOpen, registrationMessage, availablePlans,
      sectionVisibility, exportEnabled,
      landingPageConfig, landingPageStats,
      emailNotifications,
    } = body;

    // Validate JSON string fields before saving
    const jsonFieldValues: Record<string, unknown> = {
      sectionVisibility,
      exportEnabled,
      availablePlans,
      basicPlanFeatures,
      proPlanFeatures,
      ultimatePlanFeatures,
      landingPageConfig,
      landingPageStats,
    };

    for (const fieldName of JSON_FIELDS) {
      const value = jsonFieldValues[fieldName];
      const error = validateJsonField(value, fieldName);
      if (error) {
        return NextResponse.json({ error }, { status: 400 });
      }
    }

    // Build update data object — only include fields that are provided
    const updateData: Record<string, unknown> = {};
    if (defaultPlan !== undefined) updateData.defaultPlan = defaultPlan;
    if (defaultMaxCategories !== undefined) updateData.defaultMaxCategories = defaultMaxCategories;
    if (defaultMaxSavings !== undefined) updateData.defaultMaxSavings = defaultMaxSavings;
    if (autoSuspendExpired !== undefined) updateData.autoSuspendExpired = autoSuspendExpired;
    if (basicPlanFeatures !== undefined) updateData.basicPlanFeatures = basicPlanFeatures;
    if (proPlanFeatures !== undefined) updateData.proPlanFeatures = proPlanFeatures;
    if (ultimatePlanFeatures !== undefined) updateData.ultimatePlanFeatures = ultimatePlanFeatures;
    if (basicPlanPrice !== undefined) updateData.basicPlanPrice = basicPlanPrice;
    if (proPlanPrice !== undefined) updateData.proPlanPrice = proPlanPrice;
    if (ultimatePlanPrice !== undefined) updateData.ultimatePlanPrice = ultimatePlanPrice;
    if (basicPlanDiscount !== undefined) updateData.basicPlanDiscount = basicPlanDiscount;
    if (proPlanDiscount !== undefined) updateData.proPlanDiscount = proPlanDiscount;
    if (ultimatePlanDiscount !== undefined) updateData.ultimatePlanDiscount = ultimatePlanDiscount;
    if (basicPlanDiscountLabel !== undefined) updateData.basicPlanDiscountLabel = basicPlanDiscountLabel;
    if (proPlanDiscountLabel !== undefined) updateData.proPlanDiscountLabel = proPlanDiscountLabel;
    if (ultimatePlanDiscountLabel !== undefined) updateData.ultimatePlanDiscountLabel = ultimatePlanDiscountLabel;
    if (basicPurchaseUrl !== undefined) updateData.basicPurchaseUrl = basicPurchaseUrl;
    if (proPurchaseUrl !== undefined) updateData.proPurchaseUrl = proPurchaseUrl;
    if (ultimatePurchaseUrl !== undefined) updateData.ultimatePurchaseUrl = ultimatePurchaseUrl;
    if (trialEnabled !== undefined) updateData.trialEnabled = trialEnabled;
    if (trialDurationDays !== undefined) updateData.trialDurationDays = trialDurationDays;
    if (trialPlan !== undefined) updateData.trialPlan = trialPlan;
    if (whatsappNumber !== undefined) updateData.whatsappNumber = whatsappNumber;
    if (registrationOpen !== undefined) updateData.registrationOpen = registrationOpen;
    if (registrationMessage !== undefined) updateData.registrationMessage = registrationMessage;
    if (availablePlans !== undefined) updateData.availablePlans = availablePlans;
    if (sectionVisibility !== undefined) updateData.sectionVisibility = sectionVisibility;
    if (exportEnabled !== undefined) updateData.exportEnabled = exportEnabled;
    if (landingPageConfig !== undefined) updateData.landingPageConfig = landingPageConfig;
    if (landingPageStats !== undefined) updateData.landingPageStats = landingPageStats;
    if (emailNotifications !== undefined) {
      // Store emailNotifications as JSON string if it's an object
      updateData.emailNotifications = typeof emailNotifications === 'string' 
        ? emailNotifications 
        : JSON.stringify(emailNotifications);
    }

    // Ensure the config row exists, then update with all fields
    // Using separate create + update avoids TypeScript issues with upsert's create type
    const existing = await db.platformConfig.findUnique({ where: { id: CONFIG_ID } });
    if (!existing) {
      await db.platformConfig.create({
        data: { id: CONFIG_ID },
      });
    }

    // Try the main update
    try {
      await db.platformConfig.update({
        where: { id: CONFIG_ID },
        data: updateData,
      });
    } catch (updateError) {
      // If emailNotifications field doesn't exist in DB yet, try without it
      const errMsg = updateError instanceof Error ? updateError.message : String(updateError);
      console.error('PlatformConfig update error:', errMsg);
      
      if (errMsg.includes('emailNotifications') || errMsg.includes('column')) {
        // Remove emailNotifications and retry
        const fallbackData = { ...updateData };
        delete fallbackData.emailNotifications;
        try {
          await db.platformConfig.update({
            where: { id: CONFIG_ID },
            data: fallbackData,
          });
          // Field will be added on next prisma db push
        } catch (retryError) {
          console.error('PlatformConfig retry error:', retryError);
          return NextResponse.json(
            { error: 'Failed to update platform config. Please run prisma db push to sync schema.', details: errMsg },
            { status: 500 },
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Failed to update platform config', details: errMsg },
          { status: 500 },
        );
      }
    }

    const config = await db.platformConfig.findUnique({ where: { id: CONFIG_ID } });

    // If defaults changed, update existing basic users who haven't been customized
    if (defaultMaxCategories !== undefined || defaultMaxSavings !== undefined) {
      try {
        const users = await db.user.findMany({
          where: { plan: 'basic', status: 'active' },
          select: { id: true },
        });
        if (users.length > 0 && (defaultMaxCategories !== undefined || defaultMaxSavings !== undefined)) {
          await db.user.updateMany({
            where: { id: { in: users.map((u) => u.id) } },
            data: {
              ...(defaultMaxCategories !== undefined && { maxCategories: defaultMaxCategories }),
              ...(defaultMaxSavings !== undefined && { maxSavings: defaultMaxSavings }),
            },
          });
        }
      } catch {
        // Non-critical: don't fail the config update if user sync fails
      }
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error('PlatformConfig PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update platform config' },
      { status: 500 },
    );
  }
}

// POST /api/admin/platform-config — Sync config limits to all users of a specific plan
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { plan } = body;

    if (!plan || !['basic', 'pro', 'ultimate'].includes(plan)) {
      return NextResponse.json({ error: 'Plan is required (basic, pro, or ultimate)' }, { status: 400 });
    }

    const config = await db.platformConfig.findUnique({ where: { id: CONFIG_ID } });
    if (!config) {
      return NextResponse.json({ error: 'Platform config not found' }, { status: 404 });
    }

    const multiplier = plan === 'ultimate' ? 10 : plan === 'pro' ? 5 : 1;
    const result = await db.user.updateMany({
      where: { plan, status: 'active' },
      data: {
        maxCategories: config.defaultMaxCategories * multiplier,
        maxSavings: config.defaultMaxSavings * multiplier,
      },
    });

    return NextResponse.json({
      updated: result.count,
      plan,
      newMaxCategories: config.defaultMaxCategories * multiplier,
      newMaxSavings: config.defaultMaxSavings * multiplier,
    });
  } catch (error) {
    console.error('PlatformConfig sync POST error:', error);
    return NextResponse.json(
      { error: 'Failed to sync plan limits' },
      { status: 500 },
    );
  }
}
