import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function verifyDebtOwnership(
  debtId: string,
  businessId: string,
  userId: string
) {
  const debt = await db.businessDebt.findFirst({
    where: { id: debtId, businessId },
    include: { business: { select: { userId: true, phone: true } } },
  });
  return debt?.business.userId === userId ? debt : null;
}

// POST — Generate a WhatsApp reminder message for the debt
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string; debtId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { businessId, debtId } = await params;

    const debt = await verifyDebtOwnership(debtId, businessId, userId);
    if (!debt) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 });
    }

    // Resolve phone number: try customer via referenceId first, fallback to business phone
    let phone = debt.business.phone || '';

    if (debt.referenceId) {
      const sale = await db.businessSale.findUnique({
        where: { id: debt.referenceId },
        include: { customer: { select: { phone: true } } },
      });
      if (sale?.customer?.phone) {
        phone = sale.customer.phone;
      }
    }

    if (!phone) {
      return NextResponse.json(
        { error: 'No phone number found. Please set a phone on the business or link the debt to a sale with a customer.' },
        { status: 400 }
      );
    }

    // Clean phone number: remove non-digit characters, ensure Indonesian format
    const cleanPhone = phone.replace(/\D/g, '');
    // If starts with "0", replace with "62" for international format
    const formattedPhone = cleanPhone.startsWith('0')
      ? `62${cleanPhone.slice(1)}`
      : cleanPhone.startsWith('62')
        ? cleanPhone
        : `62${cleanPhone}`;

    // Format amounts in IDR
    const formatCurrency = (value: number) =>
      new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(value);

    // Format date in Indonesian
    const formatDate = (date: Date) =>
      new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date);

    // Build WhatsApp message
    const dueDateStr = debt.dueDate
      ? formatDate(new Date(debt.dueDate))
      : 'Belum ditentukan';

    const message = [
      `*Reminder Pembayaran Utang*`,
      ``,
      `Yth. *${debt.counterpart}*,`,
      ``,
      `Kami ingin mengingatkan mengenai pembayaran utang Anda dengan rincian sebagai berikut:`,
      ``,
      `💰 *Total Utang:* ${formatCurrency(debt.amount)}`,
      `📉 *Sisa Tagihan:* ${formatCurrency(debt.remaining)}`,
      `📅 *Jatuh Tempo:* ${dueDateStr}`,
      ``,
      `Mohon untuk segera melakukan pembayaran sebelum tanggal jatuh tempo. Jika sudah melakukan pembayaran, mohon konfirmasi kembali.`,
      ``,
      `Terima kasih atas kerjasamanya. 🙏`,
    ].join('\n');

    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

    return NextResponse.json({ message: waUrl });
  } catch (error) {
    console.error('Debt remind POST error:', error);
    return NextResponse.json(
      { error: 'Failed to generate reminder' },
      { status: 500 }
    );
  }
}
