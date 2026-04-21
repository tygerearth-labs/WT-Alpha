import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { businessId } = await params;

    const business = await db.business.findFirst({
      where: { id: businessId, userId },
      include: {
        customers: true,
        _count: {
          select: {
            invoices: true,
            sales: true,
            cashEntries: true,
            debts: true,
            portfolios: true,
          },
        },
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ business });
  } catch (error) {
    console.error('Business GET by ID error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { businessId } = await params;
    const body = await request.json();
    const { name, category, description, address, phone, isActive } = body;

    const existing = await db.business.findFirst({
      where: { id: businessId, userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (isActive !== undefined) updateData.isActive = isActive;

    const business = await db.business.update({
      where: { id: businessId },
      data: updateData,
    });

    return NextResponse.json({ business });
  } catch (error) {
    console.error('Business PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update business' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { businessId } = await params;

    const existing = await db.business.findFirst({
      where: { id: businessId, userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    await db.business.delete({
      where: { id: businessId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Business DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete business' },
      { status: 500 }
    );
  }
}
