import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function verifyInvoiceOwnership(id: string, userId: string) {
  const invoice = await db.businessInvoice.findFirst({
    where: { id },
    include: { business: { select: { userId: true } } },
  });
  return invoice?.business.userId === userId ? invoice : null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { id } = await params;

    const invoice = await verifyInvoiceOwnership(id, userId);
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      customerId,
      invoiceNumber,
      date,
      dueDate,
      items,
      subtotal,
      tax,
      discount,
      total,
      status,
      notes,
    } = body;

    const updateData: Record<string, unknown> = {};
    if (invoiceNumber !== undefined) updateData.invoiceNumber = invoiceNumber;
    if (date !== undefined) updateData.date = date ? new Date(date) : new Date();
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (items !== undefined) updateData.items = typeof items === 'string' ? items : JSON.stringify(items);
    if (subtotal !== undefined) updateData.subtotal = parseFloat(subtotal) || 0;
    if (tax !== undefined) updateData.tax = parseFloat(tax) || 0;
    if (discount !== undefined) updateData.discount = parseFloat(discount) || 0;
    if (total !== undefined) updateData.total = parseFloat(total) || 0;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (customerId !== undefined) updateData.customerId = customerId;

    const updated = await db.businessInvoice.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: { id: true, name: true },
        },
      },
    });

    // If status changed to paid, create notification
    if (status === 'paid' && invoice.status !== 'paid') {
      try {
        const formattedAmount = new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
        }).format(updated.total);

        await db.notification.create({
          data: {
            userId,
            type: 'invoice',
            title: 'Invoice Dibayar! ✅',
            message: `Invoice ${updated.invoiceNumber} sebesar ${formattedAmount} telah dibayar.`,
            amount: updated.total,
            actionUrl: '/dashboard',
          },
        });
      } catch (notifError) {
        console.error('Invoice paid notification error:', notifError);
      }
    }

    return NextResponse.json({ invoice: updated });
  } catch (error) {
    console.error('Invoice PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
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

    const { id } = await params;

    const invoice = await verifyInvoiceOwnership(id, userId);
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    await db.businessInvoice.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Invoice DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
