import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function verifyOwnership(businessId: string, userId: string) {
  const biz = await db.business.findFirst({ where: { id: businessId, userId } });
  return !!biz;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;
    const { businessId } = await params;

    if (!(await verifyOwnership(businessId, userId))) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const investors = await db.businessInvestor.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });

    const summary = await db.businessInvestor.aggregate({
      where: { businessId, status: 'active' },
      _sum: { totalInvestment: true, profitSharePct: true },
      _count: true,
    });

    return NextResponse.json({
      investors,
      summary: {
        activeCount: summary._count,
        totalInvestment: summary._sum.totalInvestment || 0,
        avgSharePct: summary._count > 0 ? Math.round(((summary._sum.profitSharePct || 0) / summary._count) * 100) / 100 : 0,
      },
    });
  } catch (error) {
    console.error('Investors GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch investors' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;
    const { businessId } = await params;

    if (!(await verifyOwnership(businessId, userId))) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, phone, email, address, notes, totalInvestment, profitSharePct } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Investor name is required' }, { status: 400 });
    }

    const investor = await db.businessInvestor.create({
      data: {
        businessId,
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        notes: notes?.trim() || null,
        totalInvestment: parseFloat(totalInvestment) || 0,
        profitSharePct: parseFloat(profitSharePct) || 0,
      },
    });

    return NextResponse.json({ investor }, { status: 201 });
  } catch (error) {
    console.error('Investors POST error:', error);
    return NextResponse.json({ error: 'Failed to create investor' }, { status: 500 });
  }
}
