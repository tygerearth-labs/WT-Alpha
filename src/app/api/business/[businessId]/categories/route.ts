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

    const type = request.nextUrl.searchParams.get('type') || '';
    const where: Record<string, unknown> = { businessId, isActive: true };
    if (type && ['pemasukan', 'pengeluaran', 'produk'].includes(type)) {
      where.type = type;
    }

    const categories = await db.businessCategory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Categories GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
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
    const { type, name, color, icon } = body;

    if (!type || !['pemasukan', 'pengeluaran', 'produk'].includes(type)) {
      return NextResponse.json({ error: 'Valid type is required (pemasukan/pengeluaran/produk)' }, { status: 400 });
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const existing = await db.businessCategory.findFirst({
      where: { businessId, type, name: name.trim(), isActive: true },
    });
    if (existing) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 409 });
    }

    const category = await db.businessCategory.create({
      data: {
        businessId,
        type,
        name: name.trim(),
        color: color || '#03DAC6',
        icon: icon || null,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Categories POST error:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
