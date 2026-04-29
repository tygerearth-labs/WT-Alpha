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
    const customerId = searchParams.get('customerId');
    const paymentMethod = searchParams.get('paymentMethod');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), 100);

    if (isNaN(page) || page < 1 || isNaN(pageSize) || pageSize < 1) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    const whereClause: Record<string, unknown> = { businessId };
    if (customerId) whereClause.customerId = customerId;
    if (paymentMethod) whereClause.paymentMethod = paymentMethod;

    const sales = await db.businessSale.findMany({
      where: whereClause,
      include: {
        customer: {
          select: { id: true, name: true },
        },
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // For installment sales, compute realizedAmount from linked piutang debt payments
    // Collect all installment sale IDs
    const installmentSaleIds = sales
      .filter((s) => s.installmentTempo && s.installmentTempo > 0)
      .map((s) => s.id);

    // Batch fetch debts linked to these sales via referenceId
    let debtPaymentMap = new Map<string, number>(); // saleId -> total paid installments sum
    if (installmentSaleIds.length > 0) {
      const linkedDebts = await db.businessDebt.findMany({
        where: {
          businessId,
          type: 'piutang',
          referenceId: { in: installmentSaleIds },
        },
        include: {
          payments: {
            select: { amount: true },
          },
        },
      });

      for (const debt of linkedDebts) {
        if (debt.referenceId) {
          const totalPaid = debt.payments.reduce((sum, p) => sum + p.amount, 0);
          debtPaymentMap.set(debt.referenceId, totalPaid);
        }
      }
    }

    // Attach realizedAmount to each sale
    const salesWithRealized = sales.map((sale) => {
      const saleObj = sale as Record<string, unknown>;
      if (sale.installmentTempo && sale.installmentTempo > 0) {
        // Installment sale: realizedAmount = downPayment + sum of paid installments
        const paidInstallments = debtPaymentMap.get(sale.id) || 0;
        saleObj.realizedAmount = (sale.downPayment || 0) + paidInstallments;
      } else {
        // Non-installment: realizedAmount = amount
        saleObj.realizedAmount = sale.amount;
      }
      return saleObj;
    });

    // Summary using realizedAmount for installment sales
    const tunaiSales = sales.filter((s) => !s.installmentTempo || s.installmentTempo <= 0);
    const cicilanSales = sales.filter((s) => s.installmentTempo && s.installmentTempo > 0);
    const tunaiTotal = tunaiSales.reduce((sum, s) => sum + s.amount, 0);
    let cicilanRealizedTotal = 0;
    let cicilanFullTotal = 0;
    let cicilanRemainingTotal = 0;
    let cicilanDPTotal = 0;
    let cicilanInstallmentsTotal = 0;

    for (const s of cicilanSales) {
      const dp = s.downPayment || 0;
      const paidInstallments = debtPaymentMap.get(s.id) || 0;
      const realized = dp + paidInstallments;
      cicilanRealizedTotal += realized;
      cicilanFullTotal += s.amount;
      cicilanRemainingTotal += s.amount - realized;
      cicilanDPTotal += dp;
      cicilanInstallmentsTotal += paidInstallments;
    }

    const totalRealized = tunaiTotal + cicilanRealizedTotal;

    const summary = {
      totalPenjualan: tunaiTotal + cicilanFullTotal,
      totalTerealisasi: totalRealized,
      totalBelumTerealisasi: cicilanRemainingTotal,
      jumlahTransaksi: sales.length,
      tunai: { jumlah: tunaiSales.length, total: tunaiTotal },
      cicilan: {
        jumlah: cicilanSales.length,
        totalProduk: cicilanFullTotal,
        totalTerealisasi: cicilanRealizedTotal,
        totalDPDiterima: cicilanDPTotal,
        totalCicilanDiterima: cicilanInstallmentsTotal,
        totalSisa: cicilanRemainingTotal,
      },
    };

    return NextResponse.json({
      sales: salesWithRealized,
      summary,
      pagination: { page, pageSize, hasMore: sales.length === pageSize },
    });
  } catch (error) {
    console.error('Sales GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales' },
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
    const { customerId, invoiceId, description, amount, date, paymentMethod, notes,
        downPayment, downPaymentPct, installmentTempo, installmentAmount, investorSharePct, installmentDueDate } = body;

    if (!description || amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'Description and amount are required' },
        { status: 400 }
      );
    }

    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Verify customer belongs to this business if provided
    if (customerId) {
      const customer = await db.businessCustomer.findFirst({
        where: { id: customerId, businessId },
      });
      if (!customer) {
        return NextResponse.json(
          { error: 'Customer not found for this business' },
          { status: 404 }
        );
      }
    }

    // Verify invoice exists and belongs to this business if provided
    if (invoiceId) {
      const invoice = await db.businessInvoice.findFirst({
        where: { id: invoiceId, businessId },
      });
      if (!invoice) {
        return NextResponse.json(
          { error: 'Invoice not found for this business' },
          { status: 404 }
        );
      }
    }

    const numTempo = installmentTempo ? parseInt(String(installmentTempo)) : null;
    const numDP = downPayment ? parseFloat(String(downPayment)) : null;
    const numInstAmount = installmentAmount ? parseFloat(String(installmentAmount)) : null;

    // Auto-generate invoice for installment sales if no invoiceId is provided
    let finalInvoiceId = invoiceId;
    const isInstallment = numTempo && numTempo > 0;
    if (isInstallment && !finalInvoiceId) {
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      const invoiceDueDate = installmentDueDate
        ? new Date(installmentDueDate)
        : (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d; })();

      const invoiceItems = JSON.stringify([
        { description, qty: 1, price: numAmount, total: numAmount },
      ]);

      const invoice = await db.businessInvoice.create({
        data: {
          businessId,
          invoiceNumber,
          customerId: customerId || null,
          items: invoiceItems,
          subtotal: numAmount,
          tax: 0,
          discount: 0,
          total: numAmount,
          status: 'pending',
          dueDate: invoiceDueDate,
        },
      });
      finalInvoiceId = invoice.id;
    }

    const sale = await db.businessSale.create({
      data: {
        businessId,
        customerId,
        invoiceId: finalInvoiceId,
        description,
        amount: numAmount,
        date: date ? new Date(date) : new Date(),
        paymentMethod,
        notes,
        downPayment: numDP,
        downPaymentPct: downPaymentPct ? parseFloat(String(downPaymentPct)) : null,
        installmentTempo: numTempo,
        installmentAmount: numInstAmount,
        investorSharePct: investorSharePct ? parseFloat(String(investorSharePct)) : null,
      },
      include: {
        customer: {
          select: { id: true, name: true },
        },
      },
    });

    // Auto-create piutang debt for installment sales
    if (numTempo && numTempo > 0) {
      const remaining = numAmount - (numDP || 0);
      try {
        // Get customer name as counterpart
        let counterpart = description;
        if (customerId) {
          const cust = await db.businessCustomer.findUnique({ where: { id: customerId } });
          if (cust) counterpart = cust.name;
        }
        // Use the installment due date or fallback to 1 month from now
        const piutangDueDate = installmentDueDate ? new Date(installmentDueDate) : (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d; })();
        const nextDate = new Date(piutangDueDate.getTime());

        const createdDebt = await db.businessDebt.create({
          data: {
            businessId,
            type: 'piutang',
            counterpart,
            amount: remaining,
            remaining,
            description: `Cicilan: ${description}`,
            status: 'active',
            downPayment: numDP || 0,
            installmentAmount: numInstAmount || (numTempo > 0 ? remaining / numTempo : 0),
            installmentPeriod: numTempo,
            nextInstallmentDate: nextDate,
            dueDate: piutangDueDate,
            referenceId: sale.id,
          },
        });
      } catch (piutangErr) {
        console.error('Auto-create piutang error:', piutangErr);
      }
    }

    // Auto-create BusinessCash entry for investor share (pemasukan ke dana investor)
    const numInvestorSharePct = investorSharePct ? parseFloat(String(investorSharePct)) : 0;
    if (numInvestorSharePct > 0) {
      try {
        if (isInstallment && numDP && numDP > 0) {
          // Installment sale: credit investor share from DP only
          const investorDpShare = numDP * (numInvestorSharePct / 100);
          if (investorDpShare > 0) {
            await db.businessCash.create({
              data: {
                businessId,
                type: 'investor',
                amount: investorDpShare,
                description: `Bagian investor (${numInvestorSharePct}%) dari DP: ${description}`,
                category: 'investor_pendapatan',
                date: date ? new Date(date) : new Date(),
                referenceId: sale.id,
                notes: `Investor share ${numInvestorSharePct}% dari DP penjualan cicilan`,
              },
            });
          }
        } else if (!isInstallment) {
          // Non-installment (lunas): credit full investor share
          const investorShare = numAmount * (numInvestorSharePct / 100);
          if (investorShare > 0) {
            await db.businessCash.create({
              data: {
                businessId,
                type: 'investor',
                amount: investorShare,
                description: `Bagian investor (${numInvestorSharePct}%) dari penjualan: ${description}`,
                category: 'investor_pendapatan',
                date: date ? new Date(date) : new Date(),
                referenceId: sale.id,
                notes: `Investor share ${numInvestorSharePct}% dari penjualan lunas`,
              },
            });
          }
        }
      } catch (cashErr) {
        console.error('Auto-create investor cash entry error:', cashErr);
      }
    }

    // Create notification for new sale
    try {
      const formattedAmount = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(numAmount);

      await db.notification.create({
        data: {
          userId,
          type: 'income',
          title: 'Penjualan Baru',
          message: `Penjualan ${formattedAmount} — ${description}`,
          amount: numAmount,
          actionUrl: 'biz-penjualan',
        },
      });
    } catch (notifError) {
      console.error('Sale notification error:', notifError);
    }

    // Attach realizedAmount to the created sale
    const saleObj = sale as Record<string, unknown>;
    if (isInstallment) {
      saleObj.realizedAmount = numDP || 0; // Just created, only DP received so far
    } else {
      saleObj.realizedAmount = numAmount;
    }

    return NextResponse.json({ sale: saleObj }, { status: 201 });
  } catch (error) {
    console.error('Sales POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create sale' },
      { status: 500 }
    );
  }
}
