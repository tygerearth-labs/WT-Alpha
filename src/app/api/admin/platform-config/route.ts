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
] as const;

function validateJsonField(value: unknown, fieldName: string): string | null {
  if (value === undefined || value === null) return null; // null/undefined is fine
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

    // Create defaults if not exists
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
    } = body;

    // Validate JSON string fields before saving
    const jsonFieldValues: Record<string, unknown> = {
      sectionVisibility,
      exportEnabled,
      availablePlans,
      basicPlanFeatures,
      proPlanFeatures,
      ultimatePlanFeatures,
    };

    for (const fieldName of JSON_FIELDS) {
      const value = jsonFieldValues[fieldName];
      const error = validateJsonField(value, fieldName);
      if (error) {
        return NextResponse.json({ error }, { status: 400 });
      }
    }

    const config = await db.platformConfig.upsert({
      where: { id: CONFIG_ID },
      create: {
        id: CONFIG_ID,
        defaultPlan: defaultPlan ?? 'basic',
        defaultMaxCategories: defaultMaxCategories ?? 10,
        defaultMaxSavings: defaultMaxSavings ?? 3,
        autoSuspendExpired: autoSuspendExpired ?? true,
        basicPlanFeatures: basicPlanFeatures ?? null,
        proPlanFeatures: proPlanFeatures ?? null,
        basicPlanPrice: basicPlanPrice ?? 'Gratis',
        proPlanPrice: proPlanPrice ?? 'Rp 99.000',
        ultimatePlanPrice: ultimatePlanPrice ?? 'Rp 199.000',
        ultimatePlanFeatures: ultimatePlanFeatures ?? null,
        basicPlanDiscount: basicPlanDiscount ?? null,
        proPlanDiscount: proPlanDiscount ?? null,
        ultimatePlanDiscount: ultimatePlanDiscount ?? null,
        basicPlanDiscountLabel: basicPlanDiscountLabel ?? null,
        proPlanDiscountLabel: proPlanDiscountLabel ?? null,
        ultimatePlanDiscountLabel: ultimatePlanDiscountLabel ?? null,
        basicPurchaseUrl: basicPurchaseUrl ?? null,
        proPurchaseUrl: proPurchaseUrl ?? null,
        ultimatePurchaseUrl: ultimatePurchaseUrl ?? null,
        trialEnabled: trialEnabled ?? true,
        trialDurationDays: trialDurationDays ?? 30,
        trialPlan: trialPlan ?? 'basic',
        whatsappNumber: whatsappNumber ?? null,
        registrationOpen: registrationOpen ?? true,
        registrationMessage: registrationMessage ?? null,
        availablePlans: availablePlans ?? '["basic","pro"]',
        sectionVisibility: sectionVisibility ?? null,
        exportEnabled: exportEnabled ?? null,
      },
      update: {
        ...(defaultPlan !== undefined && { defaultPlan }),
        ...(defaultMaxCategories !== undefined && { defaultMaxCategories }),
        ...(defaultMaxSavings !== undefined && { defaultMaxSavings }),
        ...(autoSuspendExpired !== undefined && { autoSuspendExpired }),
        ...(basicPlanFeatures !== undefined && { basicPlanFeatures }),
        ...(proPlanFeatures !== undefined && { proPlanFeatures }),
        ...(basicPlanPrice !== undefined && { basicPlanPrice }),
        ...(proPlanPrice !== undefined && { proPlanPrice }),
        ...(ultimatePlanPrice !== undefined && { ultimatePlanPrice }),
        ...(ultimatePlanFeatures !== undefined && { ultimatePlanFeatures }),
        ...(basicPlanDiscount !== undefined && { basicPlanDiscount }),
        ...(proPlanDiscount !== undefined && { proPlanDiscount }),
        ...(ultimatePlanDiscount !== undefined && { ultimatePlanDiscount }),
        ...(basicPlanDiscountLabel !== undefined && { basicPlanDiscountLabel }),
        ...(proPlanDiscountLabel !== undefined && { proPlanDiscountLabel }),
        ...(ultimatePlanDiscountLabel !== undefined && { ultimatePlanDiscountLabel }),
        ...(basicPurchaseUrl !== undefined && { basicPurchaseUrl }),
        ...(proPurchaseUrl !== undefined && { proPurchaseUrl }),
        ...(ultimatePurchaseUrl !== undefined && { ultimatePurchaseUrl }),
        ...(trialEnabled !== undefined && { trialEnabled }),
        ...(trialDurationDays !== undefined && { trialDurationDays }),
        ...(trialPlan !== undefined && { trialPlan }),
        ...(whatsappNumber !== undefined && { whatsappNumber }),
        ...(registrationOpen !== undefined && { registrationOpen }),
        ...(registrationMessage !== undefined && { registrationMessage }),
        ...(availablePlans !== undefined && { availablePlans }),
        ...(sectionVisibility !== undefined && { sectionVisibility }),
        ...(exportEnabled !== undefined && { exportEnabled }),
      },
    });

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
