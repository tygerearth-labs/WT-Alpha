import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function verifyOwnership(businessId: string, userId: string) {
  const biz = await db.business.findFirst({ where: { id: businessId, userId } });
  return !!biz;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;
    const { businessId, id } = await params;

    if (!(await verifyOwnership(businessId, userId))) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, phone, email, address, notes, totalInvestment, profitSharePct, status } = body;

    const existing = await db.businessInvestor.findFirst({ where: { id, businessId } });
    if (!existing) {
      return NextResponse.json({ error: 'Investor not found' }, { status: 404 });
    }

    const newTotalInvestment = totalInvestment !== undefined ? (parseFloat(totalInvestment) || 0) : undefined;
    const oldTotalInvestment = existing.totalInvestment;

    const investor = await db.businessInvestor.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(newTotalInvestment !== undefined && { totalInvestment: newTotalInvestment }),
        ...(profitSharePct !== undefined && { profitSharePct: parseFloat(profitSharePct) || 0 }),
        ...(status && ['active', 'inactive'].includes(status) && { status }),
      },
    });

    // Sync BusinessCash entry when totalInvestment changes
    if (newTotalInvestment !== undefined && newTotalInvestment > oldTotalInvestment) {
      const diff = newTotalInvestment - oldTotalInvestment;
      await db.businessCash.create({
        data: {
          businessId,
          type: 'investor',
          amount: diff,
          description: `Modal tambahan dari ${investor.name}`,
          date: new Date(),
          investorId: investor.id,
          source: 'investor',
          category: 'modal_tambahan',
        },
      });
    }

    return NextResponse.json({ investor });
  } catch (error) {
    console.error('Investor PUT error:', error);
    return NextResponse.json({ error: 'Failed to update investor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;
    const { businessId, id } = await params;

    if (!(await verifyOwnership(businessId, userId))) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    await db.businessInvestor.delete({ where: { id } });
    return NextResponse.json({ message: 'Investor deleted' });
  } catch (error) {
    console.error('Investor DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete investor' }, { status: 500 });
  }
}
