import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function verifyOwnership(businessId: string, userId: string) {
  const biz = await db.business.findFirst({ where: { id: businessId, userId } });
  return !!biz;
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

    if (!(await verifyOwnership(businessId, userId))) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const investors = await db.businessInvestor.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });

    const summary = await db.businessInvestor.aggregate({
      where: { businessId, status: 'active' },
      _sum: { totalInvestment: true, profitSharePct: true },
      _count: true,
    });

    // ══════════════════════════════════════════════════
    // ── Investor Income History ──────────────────────
    // ══════════════════════════════════════════════════

    // 1. Investor cash entries (modal masuk)
    const investorCashEntries = await db.businessCash.findMany({
      where: { businessId, type: 'investor' },
      orderBy: { date: 'desc' },
      include: {
        investor: { select: { id: true, name: true } },
      },
    });

    // 2. Sales with investor share
    const investorSales = await db.businessSale.findMany({
      where: {
        businessId,
        investorSharePct: { gt: 0 },
      },
      include: {
        customer: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });

    // 3. Debt payments for installment sales with investor share
    const installmentSaleIds = investorSales
      .filter((s) => s.installmentTempo && s.installmentTempo > 0)
      .map((s) => s.id);

    let debtPaymentsWithShare: Array<{
      id: string;
      amount: number;
      paymentDate: Date;
      debt: {
        referenceId: string | null;
        counterpart: string;
      };
      saleSharePct: number;
      customerName: string;
      saleDescription: string;
      saleId: string;
    }> = [];

    if (installmentSaleIds.length > 0) {
      // Build a map of saleId -> investorSharePct
      const saleShareMap = new Map<string, number>();
      const saleCustomerMap = new Map<string, string>();
      const saleDescMap = new Map<string, string>();
      for (const s of investorSales) {
        saleShareMap.set(s.id, s.investorSharePct || 0);
        saleCustomerMap.set(s.id, s.customer?.name || '');
        saleDescMap.set(s.id, s.description);
      }

      const linkedDebts = await db.businessDebt.findMany({
        where: {
          businessId,
          type: 'piutang',
          referenceId: { in: installmentSaleIds },
        },
        include: {
          payments: {
            select: {
              id: true,
              amount: true,
              paymentDate: true,
            },
            orderBy: { paymentDate: 'desc' },
          },
        },
      });

      for (const debt of linkedDebts) {
        if (!debt.referenceId) continue;
        const sharePct = saleShareMap.get(debt.referenceId) || 0;
        if (sharePct <= 0) continue;

        for (const payment of debt.payments) {
          debtPaymentsWithShare.push({
            id: payment.id,
            amount: payment.amount,
            paymentDate: payment.paymentDate,
            debt: {
              referenceId: debt.referenceId,
              counterpart: debt.counterpart,
            },
            saleSharePct: sharePct,
            customerName: saleCustomerMap.get(debt.referenceId) || debt.counterpart,
            saleDescription: saleDescMap.get(debt.referenceId) || debt.description || '',
            saleId: debt.referenceId,
          });
        }
      }
    }

    // Build investorHistory array
    const investorHistory: Array<{
      id: string;
      date: string;
      type: 'modal_masuk' | 'dp_penjualan' | 'penjualan_lunas' | 'cicilan_diterima';
      description: string;
      amount: number;
      investorId?: string;
      investorName?: string;
      saleId?: string;
      customerName?: string;
    }> = [];

    // modal_masuk entries
    for (const entry of investorCashEntries) {
      investorHistory.push({
        id: `cash-${entry.id}`,
        date: entry.date.toISOString(),
        type: 'modal_masuk',
        description: entry.description || `Modal dari ${entry.investor?.name || 'Investor'}`,
        amount: entry.amount,
        investorId: entry.investorId || undefined,
        investorName: entry.investor?.name || undefined,
      });
    }

    // dp_penjualan and penjualan_lunas entries
    for (const sale of investorSales) {
      const sharePct = sale.investorSharePct || 0;
      const isInstallment = sale.installmentTempo && sale.installmentTempo > 0;

      if (isInstallment && sale.downPayment && sale.downPayment > 0) {
        investorHistory.push({
          id: `dp-${sale.id}`,
          date: sale.date.toISOString(),
          type: 'dp_penjualan',
          description: `DP: ${sale.description}`,
          amount: sale.downPayment * (sharePct / 100),
          saleId: sale.id,
          customerName: sale.customer?.name || undefined,
        });
      }

      if (!isInstallment) {
        investorHistory.push({
          id: `sale-${sale.id}`,
          date: sale.date.toISOString(),
          type: 'penjualan_lunas',
          description: sale.description,
          amount: sale.amount * (sharePct / 100),
          saleId: sale.id,
          customerName: sale.customer?.name || undefined,
        });
      }
    }

    // cicilan_diterima entries
    for (const dp of debtPaymentsWithShare) {
      investorHistory.push({
        id: `ccl-${dp.id}`,
        date: dp.paymentDate.toISOString(),
        type: 'cicilan_diterima',
        description: `Cicilan: ${dp.saleDescription}`,
        amount: dp.amount * (dp.saleSharePct / 100),
        saleId: dp.saleId,
        customerName: dp.customerName || undefined,
      });
    }

    // Sort by date descending, limit to last 100
    investorHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const limitedHistory = investorHistory.slice(0, 100);

    return NextResponse.json({
      investors,
      summary: {
        activeCount: summary._count,
        totalInvestment: summary._sum.totalInvestment || 0,
        avgSharePct: summary._count > 0 ? Math.round(((summary._sum.profitSharePct || 0) / summary._count) * 100) / 100 : 0,
      },
      investorHistory: limitedHistory,
    });
  } catch (error) {
    console.error('Investors GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch investors' }, { status: 500 });
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
    const { name, phone, email, address, notes, totalInvestment, profitSharePct } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Investor name is required' }, { status: 400 });
    }

    const investor = await db.businessInvestor.create({
      data: {
        businessId,
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        notes: notes?.trim() || null,
        totalInvestment: parseFloat(totalInvestment) || 0,
        profitSharePct: parseFloat(profitSharePct) || 0,
      },
    });

    return NextResponse.json({ investor }, { status: 201 });
  } catch (error) {
    console.error('Investors POST error:', error);
    return NextResponse.json({ error: 'Failed to create investor' }, { status: 500 });
  }
}
