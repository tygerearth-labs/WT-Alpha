import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function verifyOwnership(businessId: string, userId: string) {
  const biz = await db.business.findFirst({ where: { id: businessId, userId } });
  return !!biz;
}

const MAX_BANK_ACCOUNTS = 5;

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

    const bankAccounts = await db.businessBankAccount.findMany({
      where: { businessId },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({ bankAccounts });
  } catch (error) {
    console.error('Bank accounts GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch bank accounts' }, { status: 500 });
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
    const { bankName, accountNumber, accountHolder, isDefault, displayOrder } = body;

    // Validate required fields
    if (!bankName || !bankName.trim()) {
      return NextResponse.json({ error: 'Bank name is required' }, { status: 400 });
    }
    if (!accountNumber || !accountNumber.trim()) {
      return NextResponse.json({ error: 'Account number is required' }, { status: 400 });
    }
    if (!accountHolder || !accountHolder.trim()) {
      return NextResponse.json({ error: 'Account holder name is required' }, { status: 400 });
    }

    // Check max bank accounts limit
    const existingCount = await db.businessBankAccount.count({
      where: { businessId },
    });
    if (existingCount >= MAX_BANK_ACCOUNTS) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_BANK_ACCOUNTS} bank accounts allowed per business` },
        { status: 400 }
      );
    }

    // If setting as default, unset all other defaults first
    if (isDefault === true) {
      await db.businessBankAccount.updateMany({
        where: { businessId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const bankAccount = await db.businessBankAccount.create({
      data: {
        businessId,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim(),
        isDefault: isDefault === true,
        displayOrder: typeof displayOrder === 'number' ? displayOrder : existingCount,
      },
    });

    return NextResponse.json({ bankAccount }, { status: 201 });
  } catch (error) {
    console.error('Bank accounts POST error:', error);
    return NextResponse.json({ error: 'Failed to create bank account' }, { status: 500 });
  }
}
