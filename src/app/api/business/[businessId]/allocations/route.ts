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
      include: {
        sale: {
          select: { id: true, description: true, amount: true },
        },
      },
      orderBy: { allocatedAt: 'desc' },
    });

    // If any allocation has targetType=savings_target, fetch the savings target info
    const savingsTargetIds = allocations
      .filter(a => a.targetType === 'savings_target' && a.targetId)
      .map(a => a.targetId!);

    let savingsTargets: Record<string, { name: string; targetAmount: number; currentAmount: number }> = {};
    if (savingsTargetIds.length > 0) {
      const targets = await db.savingsTarget.findMany({
        where: { id: { in: savingsTargetIds } },
        select: { id: true, name: true, targetAmount: true, currentAmount: true },
      });
      savingsTargets = Object.fromEntries(targets.map(t => [t.id, { name: t.name, targetAmount: t.targetAmount, currentAmount: t.currentAmount }]));
    }

    // Enrich allocations with savings target info
    const enrichedAllocations = allocations.map(a => ({
      ...a,
      savingsTarget: a.targetType === 'savings_target' && a.targetId
        ? savingsTargets[a.targetId] || null
        : null,
    }));

    return NextResponse.json({ allocations: enrichedAllocations });
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
    const { saleId, amount, percentage, personalNote, targetType, targetId } = body;

    if (!amount && !percentage) {
      return NextResponse.json(
        { error: 'Amount or percentage is required' },
        { status: 400 }
      );
    }

    // Validate targetType
    const validTargetTypes = ['business', 'personal_cash_in', 'savings_target'];
    const resolvedTargetType = validTargetTypes.includes(targetType) ? targetType : 'business';

    // Validate savings_target
    if (resolvedTargetType === 'savings_target') {
      if (!targetId) {
        return NextResponse.json(
          { error: 'Target savings is required when allocating to savings target' },
          { status: 400 }
        );
      }
      const savingsTarget = await db.savingsTarget.findFirst({
        where: { id: targetId, userId },
      });
      if (!savingsTarget) {
        return NextResponse.json(
          { error: 'Savings target not found' },
          { status: 404 }
        );
      }
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

    // Calculate final amount: percentage-based or nominal
    let finalAmount = parseFloat(amount) || 0;
    const pct = parseFloat(percentage) || 0;

    // If percentage is set and we have a sale, calculate from sale amount
    if (pct > 0 && saleId) {
      const sale = await db.businessSale.findFirst({
        where: { id: saleId, businessId },
        select: { amount: true },
      });
      if (sale) {
        finalAmount = (sale.amount * pct) / 100;
      }
    } else if (pct > 0 && !finalAmount) {
      return NextResponse.json(
        { error: 'Provide a sale to calculate percentage from, or use a fixed amount' },
        { status: 400 }
      );
    }

    // Create the allocation record
    const allocation = await db.businessIncomeAllocation.create({
      data: {
        businessId,
        saleId: saleId || null,
        targetType: resolvedTargetType,
        targetId: resolvedTargetType === 'savings_target' ? targetId : null,
        amount: finalAmount,
        percentage: pct,
        personalNote: personalNote || null,
      },
    });

    // If targetType is personal_cash_in or savings_target, create a personal transaction
    if ((resolvedTargetType === 'personal_cash_in' || resolvedTargetType === 'savings_target') && finalAmount > 0) {
      // Find or create a default income category for business allocations
      const categoryName = 'Alokasi Bisnis';
      let category = await db.category.findFirst({
        where: { name: categoryName, type: 'income', userId },
      });
      if (!category) {
        // Check if user has reached category limit
        const user = await db.user.findUnique({
          where: { id: userId },
          select: { maxCategories: true },
        });
        if (user) {
          const catCount = await db.category.count({ where: { userId } });
          if (catCount >= user.maxCategories) {
            // Use any existing income category as fallback
            category = await db.category.findFirst({
              where: { type: 'income', userId },
            });
          }
        }
        if (!category) {
          category = await db.category.create({
            data: {
              name: categoryName,
              type: 'income',
              color: '#10b981',
              icon: 'Building2',
              userId,
            },
          });
        }
      }

      if (resolvedTargetType === 'savings_target' && targetId) {
        // Create transaction with allocation to savings target
        await db.$transaction([
          db.transaction.create({
            data: {
              type: 'income',
              amount: finalAmount,
              description: `Alokasi dari bisnis — ${personalNote || 'Pendapatan bisnis'}`,
              categoryId: category.id,
              userId,
              allocation: {
                create: {
                  targetId: targetId,
                  userId,
                  amount: finalAmount,
                  percentage: 100,
                },
              },
            },
          }),
          db.savingsTarget.update({
            where: { id: targetId },
            data: { currentAmount: { increment: finalAmount } },
          }),
        ]);
      } else {
        // Create a simple income transaction (personal cash in)
        await db.transaction.create({
          data: {
            type: 'income',
            amount: finalAmount,
            description: `Alokasi bisnis ke kas pribadi — ${personalNote || 'Pendapatan bisnis'}`,
            categoryId: category.id,
            userId,
          },
        });
      }
    }

    return NextResponse.json({ allocation }, { status: 201 });
  } catch (error) {
    console.error('Allocations POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create allocation' },
      { status: 500 }
    );
  }
}
