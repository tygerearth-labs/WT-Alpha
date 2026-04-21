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

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const whereClause: Record<string, unknown> = { businessId };
    if (type) whereClause.type = type;
    if (status) whereClause.status = status;

    const debts = await db.businessDebt.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    // Check for debts due soon (within 3 days) and create notifications
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const dueSoonDebts = debts.filter(
      (d) =>
        d.dueDate &&
        d.status === 'active' &&
        new Date(d.dueDate) <= threeDaysFromNow &&
        new Date(d.dueDate) >= now
    );

    for (const debt of dueSoonDebts) {
      try {
        const typeLabel = debt.type === 'hutang' ? 'Hutang' : 'Piutang';
        const formattedAmount = new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
        }).format(debt.remaining);

        await db.notification.create({
          data: {
            userId,
            type: 'debt',
            title: `${typeLabel} Jatuh Tempo!`,
            message: `${typeLabel} kepada ${debt.counterpart} sebesar ${formattedAmount} jatuh tempo pada ${new Date(debt.dueDate!).toLocaleDateString('id-ID')}.`,
            amount: debt.remaining,
            actionUrl: '/dashboard',
          },
        });
      } catch (notifError) {
        console.error('Debt notification error:', notifError);
      }
    }

    return NextResponse.json({ debts });
  } catch (error) {
    console.error('Debts GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debts' },
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
    const { type, counterpart, amount, dueDate, description, status } = body;

    if (!type || !counterpart || !amount) {
      return NextResponse.json(
        { error: 'Type, counterpart, and amount are required' },
        { status: 400 }
      );
    }

    if (!['hutang', 'piutang'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be hutang or piutang' },
        { status: 400 }
      );
    }

    const numAmount = parseFloat(amount) || 0;

    const debt = await db.businessDebt.create({
      data: {
        businessId,
        type,
        counterpart,
        amount: numAmount,
        remaining: numAmount,
        dueDate: dueDate ? new Date(dueDate) : null,
        description,
        status: status || 'active',
      },
    });

    // Check if due date is within 3 days and notify
    if (debt.dueDate) {
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      if (debt.dueDate <= threeDaysFromNow && debt.dueDate >= now) {
        try {
          const typeLabel = debt.type === 'hutang' ? 'Hutang' : 'Piutang';
          const formattedAmount = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
          }).format(debt.remaining);

          await db.notification.create({
            data: {
              userId,
              type: 'debt',
              title: `${typeLabel} Jatuh Tempo Segera!`,
              message: `${typeLabel} kepada ${debt.counterpart} sebesar ${formattedAmount} jatuh tempo pada ${debt.dueDate.toLocaleDateString('id-ID')}.`,
              amount: debt.remaining,
              actionUrl: '/dashboard',
            },
          });
        } catch (notifError) {
          console.error('Debt due notification error:', notifError);
        }
      }
    }

    return NextResponse.json({ debt }, { status: 201 });
  } catch (error) {
    console.error('Debts POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create debt' },
      { status: 500 }
    );
  }
}
