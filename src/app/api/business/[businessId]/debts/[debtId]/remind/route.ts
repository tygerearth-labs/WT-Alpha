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

// POST — Generate a WhatsApp reminder/invoice message for the debt
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

    // Load full debt with payments for running bill and installment tracking
    const debtWithPayments = await db.businessDebt.findUnique({
      where: { id: debtId },
      include: {
        payments: {
          select: { amount: true, paymentDate: true },
          orderBy: { paymentDate: 'asc' },
        },
      },
    });
    const debtPayments = debtWithPayments?.payments || [];
    const totalPaidSoFar = debtPayments.reduce((sum, p) => sum + p.amount, 0);
    const paidInstallmentCount = debtPayments.length;

    // Resolve phone number: try customer via referenceId first, then match by counterpart name, fallback to business phone
    let phone = debt.business.phone || '';

    // Look up the sale linked via referenceId, and from the sale find the invoice
    const saleResult = debt.referenceId
      ? await db.businessSale.findUnique({
          where: { id: debt.referenceId },
          include: {
            customer: { select: { phone: true, name: true } },
          },
        })
      : null;

    const customerPhone = saleResult?.customer?.phone || null;

    // From the sale, find the linked invoice
    const invoiceResult = saleResult?.invoiceId
      ? await db.businessInvoice.findUnique({
          where: { id: saleResult.invoiceId },
        })
      : null;

    if (customerPhone) {
      phone = customerPhone;
    }

    // If still no phone, try to find customer by matching counterpart name
    if (!phone && debt.counterpart) {
      const customer = await db.businessCustomer.findFirst({
        where: {
          businessId,
          name: debt.counterpart,
          phone: { not: null },
        },
        select: { phone: true },
      });
      if (customer?.phone) {
        phone = customer.phone;
      }
    }

    if (!phone) {
      return NextResponse.json(
        { error: 'No phone number found. Please set a phone on the business or link the debt to a sale with a customer.' },
        { status: 400 }
      );
    }

    // Fetch default bank account for the business
    const defaultBankAccount = await db.businessBankAccount.findFirst({
      where: { businessId, isDefault: true },
    });

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

    // Build bank account info block
    const buildBankInfo = () => {
      if (!defaultBankAccount) return null;
      return [
        `🏦 *Informasi Rekening Pembayaran:*`,
        `Bank: *${defaultBankAccount.bankName}*`,
        `No. Rekening: *${defaultBankAccount.accountNumber}*`,
        `Atas Nama: *${defaultBankAccount.accountHolder}*`,
      ].join('\n');
    };

    const bankInfoBlock = buildBankInfo();

    let message: string;

    if (debt.type === 'piutang') {
      // Build running bill section
      const isInstallment = debt.installmentPeriod && debt.installmentPeriod > 0;
      const installmentProgressLine = isInstallment
        ? `📈 *Progres Cicilan:* Cicilan ke-${paidInstallmentCount} dari ${debt.installmentPeriod}`
        : '';
      const runningBillLines = [
        ``,
        `📊 *Running Bill:*`,
        `Total Tagihan: ${formatCurrency(debt.amount)}`,
        debt.downPayment ? `Uang Muka (DP): ${formatCurrency(debt.downPayment)}` : '',
        `Sudah Dibayar: ${formatCurrency(totalPaidSoFar)}`,
        `Sisa Tagihan: ${formatCurrency(debt.remaining)}`,
        installmentProgressLine,
        debt.nextInstallmentDate
          ? `Cicilan Berikutnya: ${formatDate(new Date(debt.nextInstallmentDate))}`
          : '',
      ].filter(Boolean).join('\n');

      if (invoiceResult) {
        // ── Invoice-based message ──
        const invoiceStatus = {
          pending: 'Belum Dibayar',
          paid: 'Lunas',
          cancelled: 'Dibatalkan',
          overdue: 'Terlambat',
        }[invoiceResult.status] || invoiceResult.status;

        const invoiceDueStr = invoiceResult.dueDate
          ? formatDate(new Date(invoiceResult.dueDate))
          : 'Belum ditentukan';

        const installmentDetailLines = isInstallment
          ? [
              ``,
              `📋 *Detail Cicilan:*`,
              `Cicilan ke-${paidInstallmentCount} dari ${debt.installmentPeriod}`,
              `Cicilan per bulan: ${formatCurrency(debt.installmentAmount || 0)}`,
              debt.nextInstallmentDate
                ? `Jatuh Tempo Cicilan Berikutnya: ${formatDate(new Date(debt.nextInstallmentDate))}`
                : '',
            ].join('\n')
          : '';

        message = [
          `*INVOICE / TAGIHAN PEMBAYARAN*`,
          ``,
          `Halo *${debt.counterpart}*, 👋`,
          ``,
          `Berikut tagihan kami yang perlu diselesaikan:`,
          ``,
          `🧾 *Nomor Invoice:* ${invoiceResult.invoiceNumber}`,
          `💰 *Total Tagihan:* ${formatCurrency(invoiceResult.total)}`,
          `📅 *Jatuh Tempo:* ${invoiceDueStr}`,
          `📊 *Status:* ${invoiceStatus}`,
          installmentDetailLines,
          runningBillLines,
          ``,
        ].join('\n');

        if (bankInfoBlock) {
          message += bankInfoBlock + '\n';
        }

        message += [
          ``,
          `Mohon untuk segera melakukan pembayaran sesuai nominal yang tertera. Jika sudah melakukan pembayaran, mohon konfirmasi kembali agar kami bisa update datanya. 😊`,
          ``,
          `Terima kasih atas kepercayaan dan kerjasamanya! 🙏`,
        ].join('\n');
      } else {
        // ── No invoice: use debt details with full bill info ──
        const dueDateStr = debt.dueDate
          ? formatDate(new Date(debt.dueDate))
          : 'Belum ditentukan';

        const installmentDetailLines = isInstallment
          ? [
              ``,
              `📋 *Detail Cicilan:*`,
              `Cicilan ke-${paidInstallmentCount} dari ${debt.installmentPeriod}`,
              `Cicilan per bulan: ${formatCurrency(debt.installmentAmount || 0)}`,
              debt.downPayment ? `Uang Muka (DP): ${formatCurrency(debt.downPayment)}` : '',
              debt.nextInstallmentDate
                ? `Jatuh Tempo Cicilan Berikutnya: ${formatDate(new Date(debt.nextInstallmentDate))}`
                : '',
            ].join('\n')
          : '';

        message = [
          `*TAGIHAN PEMBAYARAN*`,
          ``,
          `Halo *${debt.counterpart}*, 👋`,
          ``,
          `Berikut tagihan kami yang belum lunas:`,
          ``,
          `💰 *Total Piutang:* ${formatCurrency(debt.amount)}`,
          `📅 *Jatuh Tempo:* ${dueDateStr}`,
          installmentDetailLines,
          runningBillLines,
          ``,
        ].join('\n');

        if (bankInfoBlock) {
          message += bankInfoBlock + '\n';
        }

        message += [
          ``,
          `Mohon untuk segera melakukan pembayaran sebelum tanggal jatuh tempo ya. Jika sudah melakukan pembayaran, mohon konfirmasi kembali agar kami bisa update datanya. 😊`,
          ``,
          `Terima kasih atas kepercayaan dan kerjasamanya! 🙏`,
        ].join('\n');
      }
    } else {
      // ── Hutang: reminding about our own debt to pay ──
      const dueDateStr = debt.dueDate
        ? formatDate(new Date(debt.dueDate))
        : 'Belum ditentukan';

      message = [
        `*Reminder Pembayaran Utang*`,
        ``,
        `Yth. *${debt.counterpart}*,`,
        ``,
        `Kami ingin mengingatkan mengenai pembayaran utang kami dengan rincian sebagai berikut:`,
        ``,
        `💰 *Total Utang:* ${formatCurrency(debt.amount)}`,
        `📉 *Sisa Tagihan:* ${formatCurrency(debt.remaining)}`,
        `📅 *Jatuh Tempo:* ${dueDateStr}`,
        ``,
      ].join('\n');

      if (bankInfoBlock) {
        message += bankInfoBlock + '\n';
      }

      message += [
        ``,
        `Kami akan segera melakukan pembayaran sebelum tanggal jatuh tempo. Mohon maaf atas keterlambatan jika ada.`,
        ``,
        `Terima kasih atas kerjasamanya. 🙏`,
      ].join('\n');
    }

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
