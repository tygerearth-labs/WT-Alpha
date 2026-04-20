import { db } from '@/lib/db';

/**
 * Create a notification when a transaction is added.
 * @param userId - The user who made the transaction
 * @param type - 'income' or 'expense'
 * @param amount - Transaction amount
 * @param description - Transaction description
 * @param categoryId - Category ID (used to look up category name)
 */
export async function notifyTransaction(
  userId: string,
  type: string,
  amount: number,
  description?: string | null,
  categoryId?: string | null,
): Promise<void> {
  try {
    // Look up category name for a better message
    let categoryName = '';
    if (categoryId) {
      const category = await db.category.findUnique({
        where: { id: categoryId },
        select: { name: true },
      });
      categoryName = category?.name || '';
    }

    const isIncome = type === 'income';
    const typeLabel = isIncome ? 'Pemasukan' : 'Pengeluaran';
    const formattedAmount = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

    const title = `${typeLabel} Baru`;
    let message = `${typeLabel} ${formattedAmount}`;
    if (categoryName) {
      message += ` untuk ${categoryName}`;
    }
    if (description) {
      message += ` — ${description}`;
    }

    await db.notification.create({
      data: {
        userId,
        type: isIncome ? 'income' : 'expense',
        title,
        message,
        amount,
        actionUrl: '/dashboard',
      },
    });
  } catch (error) {
    console.error('notifyTransaction error:', error);
    // Non-critical — don't throw
  }
}

/**
 * Create a notification for savings target progress.
 * @param userId - The user who owns the savings target
 * @param targetName - Name of the savings target
 * @param progress - Progress percentage (0-100)
 */
export async function notifySavingsTarget(
  userId: string,
  targetName: string,
  progress: number,
): Promise<void> {
  try {
    let title: string;
    let message: string;

    if (progress >= 100) {
      title = 'Target Tercapai! 🎉';
      message = `Selamat! Target tabungan "${targetName}" telah tercapai!`;
    } else if (progress >= 75) {
      title = 'Hampir Tercapai!';
      message = `Target tabungan "${targetName}" sudah ${Math.round(progress)}% tercapai. Sedikit lagi!`;
    } else if (progress >= 50) {
      title = 'Setengah Jalan!';
      message = `Target tabungan "${targetName}" sudah ${Math.round(progress)}% tercapai. Terus semangat!`;
    } else {
      title = 'Progres Tabungan';
      message = `Target tabungan "${targetName}" sudah ${Math.round(progress)}% tercapai.`;
    }

    await db.notification.create({
      data: {
        userId,
        type: 'savings',
        title,
        message,
        actionUrl: '/dashboard',
      },
    });
  } catch (error) {
    console.error('notifySavingsTarget error:', error);
  }
}

/**
 * Create a notification for an expiring subscription.
 * @param userId - The user whose subscription is expiring
 * @param daysLeft - Number of days until expiry
 */
export async function notifySubscriptionExpiry(
  userId: string,
  daysLeft: number,
): Promise<void> {
  try {
    const title = 'Langganan Segera Berakhir';
    let message: string;

    if (daysLeft <= 0) {
      message = 'Langganan Anda telah berakhir dan telah diturunkan ke paket Basic.';
    } else if (daysLeft === 1) {
      message = 'Langganan Anda berakhir besok! Perpanjang sekarang agar tetap menikmati fitur Pro.';
    } else {
      message = `Langganan Anda berakhir dalam ${daysLeft} hari. Perpanjang sekarang agar tetap menikmati fitur Pro.`;
    }

    await db.notification.create({
      data: {
        userId,
        type: 'subscription',
        title,
        message,
        actionUrl: '/dashboard',
      },
    });
  } catch (error) {
    console.error('notifySubscriptionExpiry error:', error);
  }
}

/**
 * Create a notification offering a plan upgrade.
 * @param userId - The user to offer the upgrade to
 */
export async function notifyUpgradeOffer(
  userId: string,
): Promise<void> {
  try {
    const title = 'Upgrade ke Pro!';
    const message = 'Dapatkan fitur lebih banyak dengan paket Pro. Budget tanpa batas, ekspor data, dan masih banyak lagi!';

    await db.notification.create({
      data: {
        userId,
        type: 'upgrade',
        title,
        message,
        actionUrl: '/dashboard',
      },
    });
  } catch (error) {
    console.error('notifyUpgradeOffer error:', error);
  }
}
