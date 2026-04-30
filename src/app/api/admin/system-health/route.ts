import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    // Real database file size
    let dbSize = 'Unknown';
    try {
      const dbPath = path.join(process.cwd(), 'db', 'custom.db');
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        const bytes = stats.size;
        if (bytes < 1024) dbSize = bytes + ' B';
        else if (bytes < 1024 * 1024) dbSize = (bytes / 1024).toFixed(1) + ' KB';
        else dbSize = (bytes / (1024 * 1024)).toFixed(2) + ' MB';
      }
    } catch {
      dbSize = 'Unknown';
    }

    // Record counts per table
    const [userCount, txCount, catCount, targetCount, inviteCount, logCount] = await Promise.all([
      db.user.count(),
      db.transaction.count(),
      db.category.count(),
      db.savingsTarget.count(),
      db.inviteToken.count(),
      db.adminActivityLog.count(),
    ]);

    const recordCounts = {
      users: userCount,
      transactions: txCount,
      categories: catCount,
      savingsTargets: targetCount,
      inviteTokens: inviteCount,
      activityLogs: logCount,
    };

    // Get table count by testing each model
    const tableNames = ['User', 'Category', 'Transaction', 'SavingsTarget', 'Allocation', 'InviteToken', 'AdminActivityLog'];
    let activeTables = 0;
    for (const name of tableNames) {
      try {
        await (db as any)[name.charAt(0).toLowerCase() + name.slice(1)].count();
        activeTables++;
      } catch {
        // Table doesn't exist or is not accessible
      }
    }

    // Real memory stats from Node.js process
    const mem = process.memoryUsage();
    const formatMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(2) + ' MB';

    // Real uptime
    const uptime = Math.floor(process.uptime());

    // Real version from package.json
    let version = 'unknown';
    try {
      const pkgPath = path.join(process.cwd(), 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      version = pkg.version || 'unknown';
    } catch {
      version = 'unknown';
    }

    return NextResponse.json({
      status: 'healthy',
      database: {
        size: dbSize,
        tables: activeTables,
        recordCounts,
      },
      memory: {
        used: formatMB(mem.heapUsed),
        total: formatMB(mem.heapTotal),
        rss: formatMB(mem.rss),
        heapUsed: formatMB(mem.heapUsed),
        heapTotal: formatMB(mem.heapTotal),
        external: formatMB(mem.external),
      },
      uptime,
      version,
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      database: { size: 'Unknown', tables: 0 },
      memory: { used: 'Unknown', total: 'Unknown', rss: 'Unknown', heapUsed: 'Unknown', heapTotal: 'Unknown', external: 'Unknown' },
      uptime: 0,
      version: 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// DELETE /api/admin/system-health — Reset demo data (clears transactions, categories, savings, etc.)
// Preserves: Users, PlatformConfig, AdminActivityLog
export async function DELETE() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    // Order matters — delete child records first to avoid foreign key violations
    const deletionResults: Record<string, number> = {};

    // Transactions
    const txResult = await db.transaction.deleteMany({});
    deletionResults.transactions = txResult.count;

    // Savings targets + allocations
    const allocResult = await db.allocation.deleteMany({});
    deletionResults.allocations = allocResult.count;
    const savingsResult = await db.savingsTarget.deleteMany({});
    deletionResults.savingsTargets = savingsResult.count;

    // Categories (reset to defaults — don't delete all, keep some defaults)
    const catResult = await db.category.deleteMany({});
    deletionResults.categories = catResult.count;

    // Budgets
    const budgetResult = await db.budget.deleteMany({});
    deletionResults.budgets = budgetResult.count;

    // Business-related demo data
    const businessCashResult = await db.businessCash.deleteMany({});
    deletionResults.businessCash = businessCashResult.count;
    const businessSaleResult = await db.businessSale.deleteMany({});
    deletionResults.businessSales = businessSaleResult.count;
    const businessInvoiceResult = await db.businessInvoice.deleteMany({});
    deletionResults.businessInvoices = businessInvoiceResult.count;
    const businessCustomerResult = await db.businessCustomer.deleteMany({});
    deletionResults.businessCustomers = businessCustomerResult.count;
    const businessInvestorResult = await db.businessInvestor.deleteMany({});
    deletionResults.businessInvestors = businessInvestorResult.count;
    const businessDebtPaymentResult = await db.businessDebtPayment.deleteMany({});
    deletionResults.businessDebtPayments = businessDebtPaymentResult.count;
    const businessDebtResult = await db.businessDebt.deleteMany({});
    deletionResults.businessDebts = businessDebtResult.count;
    const businessCategoryResult = await db.businessCategory.deleteMany({});
    deletionResults.businessCategories = businessCategoryResult.count;
    const productResult = await db.product.deleteMany({});
    deletionResults.products = productResult.count;

    // Announcements
    const announcementResult = await db.announcement.deleteMany({});
    deletionResults.announcements = announcementResult.count;

    // Invite tokens (non-used)
    const inviteResult = await db.inviteToken.deleteMany({});
    deletionResults.inviteTokens = inviteResult.count;

    // Notifications
    const notifResult = await db.notification.deleteMany({});
    deletionResults.notifications = notifResult.count;

    // Bill reminders
    const billResult = await db.billReminder.deleteMany({});
    deletionResults.billReminders = billResult.count;

    // Investment portfolios
    const portfolioResult = await db.investmentPortfolio.deleteMany({});
    deletionResults.investmentPortfolios = portfolioResult.count;

    // Trading journals
    const journalResult = await db.tradingJournal.deleteMany({});
    deletionResults.tradingJournals = journalResult.count;

    // Clear activity logs too (fresh start)
    const logResult = await db.adminActivityLog.deleteMany({});
    deletionResults.activityLogs = logResult.count;

    return NextResponse.json({
      success: true,
      deleted: deletionResults,
      totalDeleted: Object.values(deletionResults).reduce((sum, n) => sum + n, 0),
    });
  } catch (error) {
    console.error('System health DELETE (reset) error:', error);
    return NextResponse.json(
      { error: 'Failed to reset demo data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
