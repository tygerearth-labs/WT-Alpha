import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

const CONFIG_ID = 'platform';

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
    const { defaultPlan, defaultMaxCategories, defaultMaxSavings, autoSuspendExpired } = body;

    const config = await db.platformConfig.upsert({
      where: { id: CONFIG_ID },
      create: {
        id: CONFIG_ID,
        defaultPlan: defaultPlan ?? 'basic',
        defaultMaxCategories: defaultMaxCategories ?? 10,
        defaultMaxSavings: defaultMaxSavings ?? 3,
        autoSuspendExpired: autoSuspendExpired ?? true,
      },
      update: {
        ...(defaultPlan !== undefined && { defaultPlan }),
        ...(defaultMaxCategories !== undefined && { defaultMaxCategories }),
        ...(defaultMaxSavings !== undefined && { defaultMaxSavings }),
        ...(autoSuspendExpired !== undefined && { autoSuspendExpired }),
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

    if (!plan || !['basic', 'pro'].includes(plan)) {
      return NextResponse.json({ error: 'Plan is required (basic or pro)' }, { status: 400 });
    }

    const config = await db.platformConfig.findUnique({ where: { id: CONFIG_ID } });
    if (!config) {
      return NextResponse.json({ error: 'Platform config not found' }, { status: 404 });
    }

    const multiplier = plan === 'pro' ? 5 : 1;
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
