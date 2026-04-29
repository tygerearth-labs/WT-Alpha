import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { businessId } = await params;

    // Verify business belongs to user
    const business = await db.business.findFirst({
      where: { id: businessId, userId },
    });
    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'full'; // 'sales', 'cash', 'debts', 'invoices', 'portfolio', 'full'
    const startDate = searchParams.get('startDate') || searchParams.get('from');
    const endDate = searchParams.get('endDate') || searchParams.get('to');

    const dateFilter: Record<string, Date> | undefined =
      startDate || endDate
        ? {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {}),
          }
        : undefined;

    const report: Record<string, unknown> = {
      businessName: business.name,
      businessCategory: business.category,
      generatedAt: new Date().toISOString(),
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    };

    if (type === 'full' || type === 'sales') {
      const sales = await db.businessSale.findMany({
        where: {
          businessId,
          ...(dateFilter ? { date: dateFilter } : {}),
        },
        orderBy: { date: 'asc' },
        include: {
          customer: { select: { name: true } },
        },
      });

      const totalSales = sales.reduce((sum, s) => sum + s.amount, 0);

      // ── salesBreakdown: tunai vs cicilan ──
      const tunaiSales = sales.filter((s) => !s.installmentTempo || s.installmentTempo <= 0);
      const cicilanSales = sales.filter((s) => s.installmentTempo && s.installmentTempo > 0);

      // For cicilan sales, compute realized amounts from linked piutang debt payments
      const cicilanSaleIds = cicilanSales.map((s) => s.id);
      let debtPaymentMap = new Map<string, { totalPaid: number; dp: number; remaining: number }>();
      if (cicilanSaleIds.length > 0) {
        const linkedDebts = await db.businessDebt.findMany({
          where: {
            businessId,
            type: 'piutang',
            referenceId: { in: cicilanSaleIds },
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
            debtPaymentMap.set(debt.referenceId, {
              totalPaid,
              dp: debt.downPayment || 0,
              remaining: debt.remaining,
            });
          }
        }
      }

      const tunaiTotal = tunaiSales.reduce((sum, s) => sum + s.amount, 0);
      let cicilanTotalProduct = 0;
      let cicilanTotalDP = 0;
      let cicilanTotalInstallments = 0;
      let cicilanTotalRemaining = 0;
      for (const s of cicilanSales) {
        cicilanTotalProduct += s.amount;
        const dp = s.downPayment || 0;
        const debtInfo = debtPaymentMap.get(s.id);
        const installmentsPaid = debtInfo ? debtInfo.totalPaid : 0;
        cicilanTotalDP += dp;
        cicilanTotalInstallments += installmentsPaid;
        cicilanTotalRemaining += debtInfo ? debtInfo.remaining : (s.amount - dp);
      }

      report.sales = {
        data: sales.map((s) => {
          const isInstallment = s.installmentTempo && s.installmentTempo > 0;
          const dp = s.downPayment || 0;
          const debtInfo = isInstallment ? debtPaymentMap.get(s.id) : undefined;
          const realized = isInstallment
            ? dp + (debtInfo?.totalPaid || 0)
            : s.amount;
          const sisa = isInstallment
            ? (debtInfo?.remaining ?? (s.amount - dp))
            : 0;
          return {
            tanggal: new Date(s.date).toLocaleDateString('id-ID'),
            pelanggan: s.customer?.name || '-',
            deskripsi: s.description,
            jumlah: s.amount,
            metodePembayaran: s.paymentMethod || '-',
            catatan: s.notes || '',
            tipe: isInstallment ? 'cicilan' : 'tunai',
            downPayment: isInstallment ? dp : undefined,
            realizedAmount: realized,
            sisaPiutang: isInstallment ? sisa : 0,
          };
        }),
        summary: {
          totalPenjualan: totalSales,
          jumlahTransaksi: sales.length,
          rataRata: sales.length > 0 ? totalSales / sales.length : 0,
        },
        salesBreakdown: {
          tunai: {
            jumlahTransaksi: tunaiSales.length,
            total: tunaiTotal,
          },
          cicilan: {
            jumlahTransaksi: cicilanSales.length,
            totalProduk: cicilanTotalProduct,
            totalDPDiterima: cicilanTotalDP,
            totalCicilanDiterima: cicilanTotalInstallments,
            totalTerealisasi: cicilanTotalDP + cicilanTotalInstallments,
            totalSisa: cicilanTotalRemaining,
          },
        },
      };
    }

    if (type === 'full' || type === 'cash') {
      const cashEntries = await db.businessCash.findMany({
        where: {
          businessId,
          ...(dateFilter ? { date: dateFilter } : {}),
        },
        orderBy: { date: 'asc' },
      });

      const totalKasBesar = cashEntries
        .filter((c) => c.type === 'kas_besar')
        .reduce((sum, c) => sum + c.amount, 0);
      const totalKasKecil = cashEntries
        .filter((c) => c.type === 'kas_kecil')
        .reduce((sum, c) => sum + c.amount, 0);
      const totalKasKeluar = cashEntries
        .filter((c) => c.type === 'kas_keluar')
        .reduce((sum, c) => sum + c.amount, 0);

      report.cash = {
        data: cashEntries.map((c) => ({
          tanggal: new Date(c.date).toLocaleDateString('id-ID'),
          tipe: c.type,
          jumlah: c.amount,
          deskripsi: c.description,
          kategori: c.category || '-',
          catatan: c.notes || '',
        })),
        summary: {
          totalKasBesar,
          totalKasKecil,
          totalKasKeluar,
          saldoBersih: totalKasBesar + totalKasKecil - totalKasKeluar,
        },
      };
    }

    if (type === 'full' || type === 'debts') {
      const debts = await db.businessDebt.findMany({
        where: { businessId },
        orderBy: { createdAt: 'asc' },
        include: {
          payments: {
            select: { amount: true, paymentDate: true, paymentMethod: true },
            orderBy: { paymentDate: 'asc' },
          },
        },
      });

      const totalHutang = debts
        .filter((d) => d.type === 'hutang')
        .reduce((sum, d) => sum + d.remaining, 0);
      const totalPiutang = debts
        .filter((d) => d.type === 'piutang')
        .reduce((sum, d) => sum + d.remaining, 0);

      report.debts = {
        data: debts.map((d) => ({
          tipe: d.type,
          pihak: d.counterpart,
          jumlah: d.amount,
          sisa: d.remaining,
          tanggalJatuhTempo: d.dueDate ? new Date(d.dueDate).toLocaleDateString('id-ID') : '-',
          status: d.status,
          deskripsi: d.description || '',
        })),
        summary: {
          totalHutang,
          totalPiutang,
          totalDebt: debts.reduce((sum, d) => sum + d.amount, 0),
          activeDebts: debts.filter((d) => d.status === 'active').length,
        },
      };

      // ── piutangDetail: all piutang debts with payment status, categorized by status ──
      const piutangDebts = debts.filter((d) => d.type === 'piutang');
      const piutangDetail = {
        berjalan: piutangDebts
          .filter((d) => d.status === 'active' || d.status === 'partially_paid')
          .map((d) => {
            const paidAmount = d.payments.reduce((sum, p) => sum + p.amount, 0);
            return {
              id: d.id,
              pihak: d.counterpart,
              jumlah: d.amount,
              dibayar: paidAmount,
              sisa: d.remaining,
              tanggalJatuhTempo: d.dueDate ? new Date(d.dueDate).toLocaleDateString('id-ID') : '-',
              status: d.status,
              jumlahCicilan: d.installmentPeriod,
              tempoTerbayar: d.payments.length,
            };
          }),
        menunggak: piutangDebts
          .filter((d) => d.status === 'overdue')
          .map((d) => {
            const paidAmount = d.payments.reduce((sum, p) => sum + p.amount, 0);
            return {
              id: d.id,
              pihak: d.counterpart,
              jumlah: d.amount,
              dibayar: paidAmount,
              sisa: d.remaining,
              tanggalJatuhTempo: d.dueDate ? new Date(d.dueDate).toLocaleDateString('id-ID') : '-',
              status: d.status,
              jumlahCicilan: d.installmentPeriod,
              tempoTerbayar: d.payments.length,
            };
          }),
        selesai: piutangDebts
          .filter((d) => d.status === 'paid')
          .map((d) => {
            const paidAmount = d.payments.reduce((sum, p) => sum + p.amount, 0);
            return {
              id: d.id,
              pihak: d.counterpart,
              jumlah: d.amount,
              dibayar: paidAmount,
              sisa: d.remaining,
              tanggalJatuhTempo: d.dueDate ? new Date(d.dueDate).toLocaleDateString('id-ID') : '-',
              status: d.status,
            };
          }),
        ringkasan: {
          totalBerjalan: piutangDebts.filter((d) => d.status === 'active' || d.status === 'partially_paid').length,
          totalMenunggak: piutangDebts.filter((d) => d.status === 'overdue').length,
          totalSelesai: piutangDebts.filter((d) => d.status === 'paid').length,
          nominalBerjalan: piutangDebts.filter((d) => d.status === 'active' || d.status === 'partially_paid').reduce((s, d) => s + d.remaining, 0),
          nominalMenunggak: piutangDebts.filter((d) => d.status === 'overdue').reduce((s, d) => s + d.remaining, 0),
          nominalSelesai: piutangDebts.filter((d) => d.status === 'paid').reduce((s, d) => s + d.amount, 0),
        },
      };
      report.piutangDetail = piutangDetail;

      // ── hutangDetail: all hutang debts with payment status ──
      const hutangDebts = debts.filter((d) => d.type === 'hutang');
      const hutangDetail = {
        aktif: hutangDebts
          .filter((d) => d.status === 'active' || d.status === 'partially_paid')
          .map((d) => {
            const paidAmount = d.payments.reduce((sum, p) => sum + p.amount, 0);
            return {
              id: d.id,
              pihak: d.counterpart,
              jumlah: d.amount,
              dibayar: paidAmount,
              sisa: d.remaining,
              tanggalJatuhTempo: d.dueDate ? new Date(d.dueDate).toLocaleDateString('id-ID') : '-',
              status: d.status,
            };
          }),
        terlambat: hutangDebts
          .filter((d) => d.status === 'overdue')
          .map((d) => {
            const paidAmount = d.payments.reduce((sum, p) => sum + p.amount, 0);
            return {
              id: d.id,
              pihak: d.counterpart,
              jumlah: d.amount,
              dibayar: paidAmount,
              sisa: d.remaining,
              tanggalJatuhTempo: d.dueDate ? new Date(d.dueDate).toLocaleDateString('id-ID') : '-',
              status: d.status,
            };
          }),
        lunas: hutangDebts
          .filter((d) => d.status === 'paid')
          .map((d) => {
            const paidAmount = d.payments.reduce((sum, p) => sum + p.amount, 0);
            return {
              id: d.id,
              pihak: d.counterpart,
              jumlah: d.amount,
              dibayar: paidAmount,
              sisa: d.remaining,
              tanggalJatuhTempo: d.dueDate ? new Date(d.dueDate).toLocaleDateString('id-ID') : '-',
              status: d.status,
            };
          }),
        ringkasan: {
          totalAktif: hutangDebts.filter((d) => d.status === 'active' || d.status === 'partially_paid').length,
          totalTerlambat: hutangDebts.filter((d) => d.status === 'overdue').length,
          totalLunas: hutangDebts.filter((d) => d.status === 'paid').length,
          nominalAktif: hutangDebts.filter((d) => d.status === 'active' || d.status === 'partially_paid').reduce((s, d) => s + d.remaining, 0),
          nominalTerlambat: hutangDebts.filter((d) => d.status === 'overdue').reduce((s, d) => s + d.remaining, 0),
          nominalLunas: hutangDebts.filter((d) => d.status === 'paid').reduce((s, d) => s + d.amount, 0),
        },
      };
      report.hutangDetail = hutangDetail;
    }

    if (type === 'full' || type === 'invoices') {
      const invoices = await db.businessInvoice.findMany({
        where: { businessId },
        orderBy: { date: 'asc' },
        include: {
          customer: { select: { name: true } },
        },
      });

      const totalInvoiced = invoices.reduce((sum, i) => sum + i.total, 0);
      const totalPaid = invoices
        .filter((i) => i.status === 'paid')
        .reduce((sum, i) => sum + i.total, 0);
      const totalPending = invoices
        .filter((i) => i.status === 'pending')
        .reduce((sum, i) => sum + i.total, 0);

      report.invoices = {
        data: invoices.map((i) => ({
          nomorInvoice: i.invoiceNumber,
          pelanggan: i.customer?.name || '-',
          tanggal: new Date(i.date).toLocaleDateString('id-ID'),
          tanggalJatuhTempo: i.dueDate ? new Date(i.dueDate).toLocaleDateString('id-ID') : '-',
          subtotal: i.subtotal,
          pajak: i.tax,
          diskon: i.discount,
          total: i.total,
          status: i.status,
        })),
        summary: {
          totalInvoiced,
          totalPaid,
          totalPending,
          jumlahInvoice: invoices.length,
        },
      };
    }

    if (type === 'full' || type === 'portfolio') {
      const portfolios = await db.investmentPortfolio.findMany({
        where: { businessId },
        orderBy: { createdAt: 'asc' },
        include: {
          journals: {
            orderBy: { date: 'asc' },
          },
        },
      });

      const totalInvested = portfolios.reduce(
        (sum, p) => sum + p.entryPrice * p.quantity,
        0
      );
      const totalCurrentValue = portfolios.reduce(
        (sum, p) => sum + p.currentPrice * p.quantity,
        0 );
      const totalUnrealizedPnl = totalCurrentValue - totalInvested;

      const closedJournals = portfolios.flatMap((p) =>
        p.journals.filter((j) => j.type === 'sell' && j.pnl !== 0)
      );
      const totalRealizedPnl = closedJournals.reduce((sum, j) => sum + j.pnl, 0);

      report.portfolio = {
        data: portfolios.map((p) => ({
          tipe: p.type,
          simbol: p.symbol,
          nama: p.name || '-',
          hargaMasuk: p.entryPrice,
          hargaSaatIni: p.currentPrice,
          jumlah: p.quantity,
          nilaiInvestasi: p.entryPrice * p.quantity,
          nilaiSaatIni: p.currentPrice * p.quantity,
          pnlTidakTerealisasi: p.currentPrice * p.quantity - p.entryPrice * p.quantity,
          status: p.status,
          jumlahTransaksi: p.journals.length,
        })),
        tradingHistory: closedJournals.map((j) => ({
          simbol: portfolios.find((p) => p.id === j.portfolioId)?.symbol || '-',
          tipe: j.type,
          hargaMasuk: j.entryPrice,
          hargaKeluar: j.exitPrice || 0,
          jumlah: j.quantity,
          pnl: j.pnl,
          pnlPersentase: j.pnlPercentage,
          tanggal: new Date(j.date).toLocaleDateString('id-ID'),
        })),
        summary: {
          totalPortofolio: portfolios.length,
          totalInvestasi: totalInvested,
          totalNilaiSaatIni: totalCurrentValue,
          totalPnlTidakTerealisasi: totalUnrealizedPnl,
          totalPnlTerealisasi: totalRealizedPnl,
          totalPnl: totalUnrealizedPnl + totalRealizedPnl,
        },
      };
    }

    // ── Investor Summary ──
    if (type === 'full') {
      const investors = await db.businessInvestor.findMany({
        where: { businessId },
        orderBy: { joinDate: 'asc' },
      });

      const activeInvestors = investors.filter((inv) => inv.status === 'active');
      const totalInvested = investors.reduce((s, i) => s + i.totalInvestment, 0);
      const totalActiveInvested = activeInvestors.reduce((s, i) => s + i.totalInvestment, 0);

      // Investor income from cash entries (investor_pendapatan category)
      const investorCashIncome = await db.businessCash.findMany({
        where: {
          businessId,
          type: 'investor',
          category: 'investor_pendapatan',
          ...(dateFilter ? { date: dateFilter } : {}),
        },
        select: { amount: true },
      });
      const investorIncomeInPeriod = investorCashIncome.reduce((s, c) => s + c.amount, 0);

      report.investorSummary = {
        totalInvestors: investors.length,
        activeInvestors: activeInvestors.length,
        totalInvested,
        totalActiveInvested,
        investorIncomeInPeriod,
        investors: investors.map((inv) => ({
          id: inv.id,
          name: inv.name,
          totalInvestment: inv.totalInvestment,
          profitSharePct: inv.profitSharePct,
          status: inv.status,
          joinDate: new Date(inv.joinDate).toLocaleDateString('id-ID'),
        })),
      };
    }

    // ── Budget Utilization ──
    if (type === 'full') {
      const now = new Date();
      const currentPeriod = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const budgets = await db.businessBudget.findMany({
        where: {
          businessId,
          isActive: true,
          period: currentPeriod,
          year: currentYear,
        },
        orderBy: { categoryName: 'asc' },
        include: {
          allocations: true,
        },
      });

      // Get expenses per category for current month
      const monthStart = new Date(currentYear, currentPeriod - 1, 1, 0, 0, 0, 0);
      const monthEnd = new Date(currentYear, currentPeriod, 0, 23, 59, 59, 999);

      const monthlyExpenses = await db.businessCash.findMany({
        where: {
          businessId,
          type: 'kas_keluar',
          date: { gte: monthStart, lte: monthEnd },
        },
        select: { amount: true, category: true },
      });

      const expenseByCategory = new Map<string, number>();
      for (const e of monthlyExpenses) {
        const cat = e.category || 'Lainnya';
        expenseByCategory.set(cat, (expenseByCategory.get(cat) || 0) + e.amount);
      }

      const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0);
      const totalActual = budgets.reduce((s, b) => s + (expenseByCategory.get(b.categoryName) || 0), 0);

      report.budgetUtilization = {
        period: currentPeriod,
        year: currentYear,
        totalBudgeted,
        totalActual,
        categories: budgets.map((b) => {
          const actual = expenseByCategory.get(b.categoryName) || 0;
          return {
            categoryName: b.categoryName,
            budgeted: b.amount,
            actual: Math.round(actual),
            remaining: Math.max(0, b.amount - actual),
            utilizationPct: b.amount > 0 ? Math.min((actual / b.amount) * 100, 100) : 0,
            isOverBudget: actual > b.amount,
            allocations: b.allocations.map((a) => ({
              fundSource: a.fundSource,
              amount: a.amount,
            })),
          };
        }),
      };
    }

    // Overall summary (only for full report)
    if (type === 'full') {
      const salesData = report.sales as { summary?: Record<string, number>; salesBreakdown?: Record<string, Record<string, number>>; data?: Array<Record<string, unknown>> } | undefined;
      const cashData = report.cash as { summary?: Record<string, number>; data?: Array<Record<string, unknown>> } | undefined;
      const debtsData = report.debts as { summary?: Record<string, number> } | undefined;
      const salesSummary = salesData?.summary;
      const salesBreakdown = salesData?.salesBreakdown;
      const cashSummary = cashData?.summary;
      const debtsSummary = debtsData?.summary;

      // Compute realized income: tunai total + cicilan realized (DP + installments received)
      const realizedIncome = (salesBreakdown?.tunai?.total || 0) + (salesBreakdown?.cicilan?.totalTerealisasi || 0);
      const unrealizedIncome = (salesBreakdown?.cicilan?.totalSisa || 0);

      report.overallSummary = {
        totalPendapatan: salesSummary?.totalPenjualan || 0,
        pendapatanTerealisasi: realizedIncome,
        pendapatanBelumTerealisasi: unrealizedIncome,
        totalPengeluaran: cashSummary?.totalKasKeluar || 0,
        labaKotor: realizedIncome - (cashSummary?.totalKasKeluar || 0),
        laba: (salesSummary?.totalPenjualan || 0) - (cashSummary?.totalKasKeluar || 0),
        totalKasBesar: cashSummary?.totalKasBesar || 0,
        totalKasKecil: cashSummary?.totalKasKecil || 0,
        saldoBersih: cashSummary?.saldoBersih || 0,
        totalHutang: debtsSummary?.totalHutang || 0,
        totalPiutang: debtsSummary?.totalPiutang || 0,
      };

      // ── taxAudit section: for tax reporting purposes ──
      const tunaiTotal = salesBreakdown?.tunai?.total || 0;
      const dpDiterima = salesBreakdown?.cicilan?.totalDPDiterima || 0;
      const cicilanDiterima = salesBreakdown?.cicilan?.totalCicilanDiterima || 0;
      const totalPengeluaran = cashSummary?.totalKasKeluar || 0;

      // Per-category expense breakdown from cash entries
      const cashDataRaw = cashData?.data || [];
      const expenseByCategory = new Map<string, number>();
      for (const entry of cashDataRaw) {
        if (entry.tipe === 'kas_keluar' && entry.kategori && entry.kategori !== '-') {
          const cat = entry.kategori as string;
          const amt = entry.jumlah as number;
          expenseByCategory.set(cat, (expenseByCategory.get(cat) || 0) + amt);
        }
      }
      const pengeluaranPerKategori = Array.from(expenseByCategory.entries())
        .map(([kategori, jumlah]) => ({ kategori, jumlah }))
        .sort((a, b) => b.jumlah - a.jumlah);

      report.taxAudit = {
        pendapatanTunai: {
          total: tunaiTotal,
          items: (salesData?.data || []).filter((s) => s.tipe === 'tunai').map((s) => ({
            tanggal: s.tanggal,
            pelanggan: s.pelanggan,
            deskripsi: s.deskripsi,
            jumlah: s.jumlah,
          })),
        },
        dpDiterima: {
          total: dpDiterima,
          items: (salesData?.data || []).filter((s) => s.tipe === 'cicilan').map((s) => ({
            tanggal: s.tanggal,
            pelanggan: s.pelanggan,
            deskripsi: s.deskripsi,
            dp: s.downPayment || 0,
          })),
        },
        cicilanDiterima: {
          total: cicilanDiterima,
          items: (salesData?.data || []).filter((s) => s.tipe === 'cicilan').map((s) => ({
            tanggal: s.tanggal,
            pelanggan: s.pelanggan,
            deskripsi: s.deskripsi,
            jumlah: s.jumlah,
            terealisasi: s.realizedAmount || 0,
            sisa: s.sisaPiutang || 0,
          })),
        },
        pendapatanBelumTerealisasi: {
          total: unrealizedIncome,
          items: (salesData?.data || []).filter((s) => s.tipe === 'cicilan' && Number(s.sisaPiutang || 0) > 0).map((s) => ({
            tanggal: s.tanggal,
            pelanggan: s.pelanggan,
            deskripsi: s.deskripsi,
            totalProduk: s.jumlah,
            terealisasi: s.realizedAmount || 0,
            sisa: s.sisaPiutang || 0,
          })),
        },
        pengeluaranPerKategori,
        labaRugi: {
          pendapatanRealized: realizedIncome,
          totalPengeluaran,
          labaBersih: realizedIncome - totalPengeluaran,
        },
      };
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Report GET error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
