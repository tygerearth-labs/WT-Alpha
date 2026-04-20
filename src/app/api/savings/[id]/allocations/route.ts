import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// API route for fetching allocation history for a specific savings target
// Fixed for Next.js 16: params is now awaited properly

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { id: targetId } = await params;

    // Fetch allocations with transaction details
    const allocations = await db.allocation.findMany({
      where: {
        targetId,
        userId,
      },
      include: {
        transaction: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format allocations with transaction details
    const formattedAllocations = allocations.map((allocation) => ({
      id: allocation.id,
      targetId: allocation.targetId,
      amount: allocation.amount,
      percentage: allocation.percentage,
      createdAt: allocation.createdAt,
      transaction: {
        id: allocation.transaction.id,
        date: allocation.transaction.date,
        description: allocation.transaction.description,
        amount: allocation.transaction.amount,
        category: {
          name: allocation.transaction.category.name,
          color: allocation.transaction.category.color,
          icon: allocation.transaction.category.icon,
          type: allocation.transaction.category.type,
        },
      },
    }));

    return NextResponse.json({ allocations: formattedAllocations });
  } catch (error) {
    console.error('Error fetching allocations:', error);
    return NextResponse.json({ error: 'Failed to fetch allocations' }, { status: 500 });
  }
}
