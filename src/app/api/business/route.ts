import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');

    const whereClause: Record<string, unknown> = { userId };
    if (category) whereClause.category = category;

    const businesses = await db.business.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ businesses });
  } catch (error) {
    console.error('Business GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch businesses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const body = await request.json();
    const { name, category, description, address, phone } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      );
    }

    if (!['bisnis', 'investasi'].includes(category)) {
      return NextResponse.json(
        { error: 'Category must be bisnis or investasi' },
        { status: 400 }
      );
    }

    // Prevent duplicate business registration per category per user
    const existing = await db.business.findFirst({
      where: { userId, category },
    });
    if (existing) {
      return NextResponse.json(
        { error: `${category === 'bisnis' ? 'Bisnis' : 'Investasi'} sudah terdaftar untuk akun ini` },
        { status: 409 }
      );
    }

    const business = await db.business.create({
      data: {
        userId,
        name,
        category,
        description,
        address,
        phone,
      },
    });

    return NextResponse.json({ business }, { status: 201 });
  } catch (error) {
    console.error('Business POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create business' },
      { status: 500 }
    );
  }
}
