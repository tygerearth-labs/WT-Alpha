import { db } from '@/lib/db';

export async function logAdminActivity(adminId: string, action: string, target?: string, details?: string) {
  try {
    await db.adminActivityLog.create({
      data: { adminId, action, target, details }
    });
  } catch (error) {
    console.error('Failed to log admin activity:', error);
  }
}
