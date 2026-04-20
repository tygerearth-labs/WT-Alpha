import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import * as os from 'os';

const startTime = Date.now();

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    // Get database size via PostgreSQL
    let dbSize = 'Unknown';
    try {
      const result = await db.$queryRawUnsafe<{ size: bigint }[]>(
        'SELECT pg_database_size(current_database()) as size'
      );
      if (result && result[0]) {
        const bytes = Number(result[0].size);
        if (bytes < 1024) dbSize = `${bytes} B`;
        else if (bytes < 1024 * 1024) dbSize = `${(bytes / 1024).toFixed(1)} KB`;
        else dbSize = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
      }
    } catch {}

    // Get table count from Prisma
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

    // Get memory info
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const formatBytes = (bytes: number) => {
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
      if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    const uptime = Math.floor((Date.now() - startTime) / 1000);

    return NextResponse.json({
      status: 'healthy',
      database: {
        size: dbSize,
        tables: activeTables,
      },
      memory: {
        used: formatBytes(usedMem),
        total: formatBytes(totalMem),
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
