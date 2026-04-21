import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function verifyBusinessOwnership(businessId: string, userId: string) {
  const business = await db.business.findFirst({
    where: { id: businessId, userId },
  });
  return !!business;
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

    const ownsBusiness = await verifyBusinessOwnership(businessId, userId);
    if (!ownsBusiness) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const allocations = await db.businessIncomeAllocation.findMany({
      where: { businessId },
      orderBy: { allocatedAt: 'desc' },
    });

    return NextResponse.json({ allocations });
  } catch (error) {
    console.error('Allocations GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch allocations' },
      { status: 500 }
    );
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

    const ownsBusiness = await verifyBusinessOwnership(businessId, userId);
    if (!ownsBusiness) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { saleId, amount, percentage, personalNote } = body;

    if (!amount || !percentage) {
      return NextResponse.json(
        { error: 'Amount and percentage are required' },
        { status: 400 }
      );
    }

    // Verify sale belongs to this business if provided
    if (saleId) {
      const sale = await db.businessSale.findFirst({
        where: { id: saleId, businessId },
      });
      if (!sale) {
        return NextResponse.json(
          { error: 'Sale not found for this business' },
          { status: 404 }
        );
      }
    }

    const allocation = await db.businessIncomeAllocation.create({
      data: {
        businessId,
        saleId,
        amount: parseFloat(amount) || 0,
        percentage: parseFloat(percentage) || 0,
        personalNote,
      },
    });

    return NextResponse.json({ allocation }, { status: 201 });
  } catch (error) {
    console.error('Allocations POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create allocation' },
      { status: 500 }
    );
  }
}
