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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

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
      report.sales = {
        data: sales.map((s) => ({
          tanggal: new Date(s.date).toLocaleDateString('id-ID'),
          pelanggan: s.customer?.name || '-',
          deskripsi: s.description,
          jumlah: s.amount,
          metodePembayaran: s.paymentMethod || '-',
          catatan: s.notes || '',
        })),
        summary: {
          totalPenjualan: totalSales,
          jumlahTransaksi: sales.length,
          rataRata: sales.length > 0 ? totalSales / sales.length : 0,
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

    // Overall summary (only for full report)
    if (type === 'full') {
      const salesData = report.sales as { summary?: Record<string, number> } | undefined;
      const cashData = report.cash as { summary?: Record<string, number> } | undefined;
      const debtsData = report.debts as { summary?: Record<string, number> } | undefined;
      const salesSummary = salesData?.summary;
      const cashSummary = cashData?.summary;
      const debtsSummary = debtsData?.summary;

      report.overallSummary = {
        totalPendapatan: salesSummary?.totalPenjualan || 0,
        totalPengeluaran: cashSummary?.totalKasKeluar || 0,
        laba: (salesSummary?.totalPenjualan || 0) - (cashSummary?.totalKasKeluar || 0),
        totalKasBesar: cashSummary?.totalKasBesar || 0,
        totalKasKecil: cashSummary?.totalKasKecil || 0,
        saldoBersih: cashSummary?.saldoBersih || 0,
        totalHutang: debtsSummary?.totalHutang || 0,
        totalPiutang: debtsSummary?.totalPiutang || 0,
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
