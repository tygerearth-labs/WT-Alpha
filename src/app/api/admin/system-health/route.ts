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
