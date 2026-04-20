import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { logAdminActivity } from '@/lib/adminLogger';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const adminId = await requireAdmin();
  if (adminId instanceof NextResponse) return adminId;

  try {
    const body = await request.json();
    const { type, format, filters } = body;

    const validTypes = ['users', 'activity', 'announcements', 'subscriptions'];
    const validFormats = ['csv', 'json'];

    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid export type. Must be one of: ${validTypes.join(', ')}` }, { status: 400 });
    }

    if (!validFormats.includes(format)) {
      return NextResponse.json({ error: `Invalid format. Must be one of: ${validFormats.join(', ')}` }, { status: 400 });
    }

    const dateFrom = filters?.dateFrom ? new Date(filters.dateFrom) : undefined;
    const dateTo = filters?.dateTo ? new Date(filters.dateTo) : undefined;

    let data: Record<string, unknown>[] = [];
    let filename = '';

    switch (type) {
      case 'users': {
        const where: Record<string, unknown> = {};
        if (dateFrom || dateTo) {
          const createdAt: Record<string, unknown> = {};
          if (dateFrom) createdAt.gte = dateFrom;
          if (dateTo) createdAt.lte = dateTo;
          where.createdAt = createdAt;
        }

        const users = await db.user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            username: true,
            plan: true,
            role: true,
            status: true,
            subscriptionEnd: true,
            maxCategories: true,
            maxSavings: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                transactions: true,
                categories: true,
                savingsTargets: true,
              },
            },
          },
        });

        data = users.map((u) => ({
          ID: u.id,
          Email: u.email,
          Username: u.username,
          Plan: u.plan,
          Role: u.role,
          Status: u.status,
          SubscriptionEnd: u.subscriptionEnd?.toISOString() || '',
          MaxCategories: u.maxCategories,
          MaxSavings: u.maxSavings,
          Transactions: u._count.transactions,
          Categories: u._count.categories,
          SavingsTargets: u._count.savingsTargets,
          CreatedAt: u.createdAt.toISOString(),
          UpdatedAt: u.updatedAt.toISOString(),
        }));
        filename = 'users';
        break;
      }

      case 'activity': {
        const where: Record<string, unknown> = {};
        if (filters?.action) where.action = filters.action;
        if (dateFrom || dateTo) {
          const createdAt: Record<string, unknown> = {};
          if (dateFrom) createdAt.gte = dateFrom;
          if (dateTo) createdAt.lte = dateTo;
          where.createdAt = createdAt;
        }

        const logs = await db.adminActivityLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 10000,
        });

        data = logs.map((l) => ({
          ID: l.id,
          AdminID: l.adminId,
          Action: l.action,
          Target: l.target || '',
          Details: l.details || '',
          CreatedAt: l.createdAt.toISOString(),
        }));
        filename = 'activity-log';
        break;
      }

      case 'announcements': {
        const where: Record<string, unknown> = {};
        if (filters?.type) where.type = filters.type;
        if (dateFrom || dateTo) {
          const createdAt: Record<string, unknown> = {};
          if (dateFrom) createdAt.gte = dateFrom;
          if (dateTo) createdAt.lte = dateTo;
          where.createdAt = createdAt;
        }

        const announcements = await db.announcement.findMany({
          where,
          orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        });

        data = announcements.map((a) => ({
          ID: a.id,
          Title: a.title,
          Message: a.message,
          Type: a.type,
          IsActive: a.isActive,
          Priority: a.priority,
          StartsAt: a.startsAt?.toISOString() || '',
          ExpiresAt: a.expiresAt?.toISOString() || '',
          CreatedAt: a.createdAt.toISOString(),
          UpdatedAt: a.updatedAt.toISOString(),
        }));
        filename = 'announcements';
        break;
      }

      case 'subscriptions': {
        const where: Record<string, unknown> = {
          plan: 'pro',
          subscriptionEnd: { not: null },
        };
        if (dateFrom || dateTo) {
          const subEnd: Record<string, unknown> = {};
          if (dateFrom) subEnd.gte = dateFrom;
          if (dateTo) subEnd.lte = dateTo;
          where.subscriptionEnd = subEnd;
        }

        const users = await db.user.findMany({
          where,
          orderBy: { subscriptionEnd: 'asc' },
          select: {
            id: true,
            email: true,
            username: true,
            plan: true,
            status: true,
            subscriptionEnd: true,
            createdAt: true,
          },
        });

        data = users.map((u) => ({
          ID: u.id,
          Email: u.email,
          Username: u.username,
          Plan: u.plan,
          Status: u.status,
          SubscriptionEnd: u.subscriptionEnd?.toISOString() || '',
          DaysRemaining: u.subscriptionEnd
            ? Math.max(0, Math.ceil((u.subscriptionEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : 0,
          CreatedAt: u.createdAt.toISOString(),
        }));
        filename = 'subscriptions';
        break;
      }
    }

    // Log export action
    await logAdminActivity(
      adminId,
      'export_data',
      type,
      `Exported ${data.length} ${type} records as ${format.toUpperCase()}${filters?.dateFrom ? ` (from ${filters.dateFrom})` : ''}${filters?.dateTo ? ` (to ${filters.dateTo})` : ''}`
    );

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fullFilename = `${filename}_${timestamp}.${format}`;

    if (format === 'csv') {
      if (data.length === 0) {
        return NextResponse.json({ error: 'No data to export' }, { status: 404 });
      }

      const headers = Object.keys(data[0]);
      const csvRows: string[] = [];

      // Add UTF-8 BOM for Excel compatibility
      csvRows.push('\uFEFF');
      csvRows.push(headers.map(escapeCSV).join(','));

      for (const row of data) {
        csvRows.push(headers.map((h) => escapeCSV(String(row[h] ?? ''))).join(','));
      }

      const csvContent = csvRows.join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fullFilename}"`,
        },
      });
    }

    // JSON format
    const jsonContent = JSON.stringify(
      {
        _metadata: {
          exportDate: new Date().toISOString(),
          type,
          format: 'json',
          recordCount: data.length,
          filters: {
            dateFrom: dateFrom?.toISOString() || null,
            dateTo: dateTo?.toISOString() || null,
            ...(filters?.action ? { action: filters.action } : {}),
            ...(filters?.type ? { type: filters.type } : {}),
          },
        },
        data,
      },
      null,
      2
    );

    return new NextResponse(jsonContent, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fullFilename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
