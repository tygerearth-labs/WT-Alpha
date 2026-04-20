import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';
import { logAdminActivity } from '@/lib/adminLogger';

// GET /api/admin/invites — List all invite tokens
export async function GET(request: NextRequest) {
  const adminId = await requireAdmin();
  if (adminId instanceof NextResponse) return adminId;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || '';

    const where: Record<string, unknown> = { createdBy: adminId as string };
    if (status === 'active') {
      where.isUsed = false;
      where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }];
    } else if (status === 'used') {
      where.isUsed = true;
    } else if (status === 'expired') {
      where.isUsed = false;
      where.expiresAt = { lt: new Date() };
    }

    const [invites, total] = await Promise.all([
      db.inviteToken.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.inviteToken.count({ where })
    ]);

    return NextResponse.json({
      invites,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Admin invites list error:', error);
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
  }
}

// POST /api/admin/invites — Create invite token
export async function POST(request: NextRequest) {
  const adminId = await requireAdmin();
  if (adminId instanceof NextResponse) return adminId;

  try {
    const body = await request.json();
    const { email, plan, maxUses, expiresInHours } = body;

    const token = randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase();

    const inviteData: Record<string, unknown> = {
      token,
      createdBy: adminId as string,
      plan: plan || 'basic',
      maxUses: maxUses || 1
    };

    if (email) inviteData.email = email;
    if (expiresInHours) {
      inviteData.expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    }

    const invite = await db.inviteToken.create({ data: inviteData as any });

    const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?invite=${token}`;

    logAdminActivity(adminId as string, 'create_invite', token, `Plan: ${body.plan || 'basic'}, MaxUses: ${body.maxUses || 1}, Email: ${body.email || 'public'}`);
    return NextResponse.json({ invite, inviteUrl }, { status: 201 });
  } catch (error) {
    console.error('Admin create invite error:', error);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}

// DELETE /api/admin/invites — Revoke invite token
export async function DELETE(request: NextRequest) {
  const adminId = await requireAdmin();
  if (adminId instanceof NextResponse) return adminId;

  try {
    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get('id');

    if (!inviteId) {
      return NextResponse.json({ error: 'Invite ID is required' }, { status: 400 });
    }

    const existing = await db.inviteToken.findUnique({ where: { id: inviteId } });
    if (!existing || existing.createdBy !== (adminId as string)) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    logAdminActivity(adminId as string, 'revoke_invite', existing.token);
    await db.inviteToken.delete({ where: { id: inviteId } });

    return NextResponse.json({ message: 'Invite revoked successfully' });
  } catch (error) {
    console.error('Admin revoke invite error:', error);
    return NextResponse.json({ error: 'Failed to revoke invite' }, { status: 500 });
  }
}
