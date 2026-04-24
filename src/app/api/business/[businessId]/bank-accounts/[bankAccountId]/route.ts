import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function verifyOwnership(businessId: string, userId: string) {
  const biz = await db.business.findFirst({ where: { id: businessId, userId } });
  return !!biz;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; bankAccountId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;
    const { businessId, bankAccountId } = await params;

    if (!(await verifyOwnership(businessId, userId))) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const body = await request.json();
    const { bankName, accountNumber, accountHolder, isDefault } = body;

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

    // If setting as default, unset all other defaults first
    if (isDefault === true) {
      await db.businessBankAccount.updateMany({
        where: { businessId, isDefault: true, id: { not: bankAccountId } },
        data: { isDefault: false },
      });
    }

    const bankAccount = await db.businessBankAccount.update({
      where: { id: bankAccountId, businessId },
      data: {
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim(),
        isDefault: isDefault === true,
      },
    });

    return NextResponse.json({ bankAccount });
  } catch (error) {
    console.error('Bank account PUT error:', error);
    return NextResponse.json({ error: 'Failed to update bank account' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; bankAccountId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;
    const { businessId, bankAccountId } = await params;

    if (!(await verifyOwnership(businessId, userId))) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const deleted = await db.businessBankAccount.delete({
      where: { id: bankAccountId, businessId },
    });

    // If the deleted account was default, set the first remaining as default
    if (deleted.isDefault) {
      const firstRemaining = await db.businessBankAccount.findFirst({
        where: { businessId },
        orderBy: { displayOrder: 'asc' },
      });
      if (firstRemaining) {
        await db.businessBankAccount.update({
          where: { id: firstRemaining.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Bank account DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete bank account' }, { status: 500 });
  }
}
