import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

const startTime = Date.now();

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    // Estimate database size from record counts (safe for hosted Postgres like Neon)
    let dbSize = 'Unknown';
    try {
      const [userCount, txCount, catCount, targetCount, inviteCount, logCount] = await Promise.all([
        db.user.count(),
        db.transaction.count(),
        db.category.count(),
        db.savingsTarget.count(),
        db.inviteToken.count(),
        db.adminActivityLog.count(),
      ]);
      const totalRecords = userCount + txCount + catCount + targetCount + inviteCount + logCount;
      // Rough estimate: ~2KB per record average
      const estimatedBytes = totalRecords * 2048;
      if (estimatedBytes < 1024 * 1024) dbSize = `${(estimatedBytes / 1024).toFixed(1)} KB`;
      else dbSize = `${(estimatedBytes / (1024 * 1024)).toFixed(2)} MB`;
    } catch {
      dbSize = 'Unknown';
    }

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

    const uptime = Math.floor((Date.now() - startTime) / 1000);

    return NextResponse.json({
      status: 'healthy',
      database: {
        size: dbSize,
        tables: activeTables,
      },
      memory: {
        used: 'N/A',
        total: 'N/A',
      },
      uptime,
      version: '1.0.0',
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      database: { size: 'Unknown', tables: 0 },
      memory: { used: 'Unknown', total: 'Unknown' },
      uptime: 0,
      version: '1.0.0',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
