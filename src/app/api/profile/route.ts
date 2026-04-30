import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, destroySession } from '@/lib/auth';
import { createSession } from '@/lib/session';
import bcrypt from 'bcryptjs';

const VALID_LOCALES = ['id', 'en'];

// Basic currency code validation
const VALID_CURRENCIES = [
  'IDR', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'MYR', 'AUD', 'CAD', 'CHF',
  'KRW', 'CNY', 'THB', 'PHP', 'INR', 'BRL', 'MXN', 'ZAR', 'AED', 'SAR',
  'TWD', 'HKD', 'NZD', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON',
  'BGN', 'TRY', 'RUB', 'UAH', 'VND', 'NGN', 'EGP', 'PKR', 'BDT', 'LKR',
];

/**
 * Validate that an image URL is safe (no javascript: URIs or other dangerous schemes).
 * Allows http://, https://, and relative paths starting with /.
 */
function isValidImageUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  // Reject dangerous schemes
  if (trimmed.startsWith('javascript:')) return false;
  if (trimmed.startsWith('data:')) return false;
  if (trimmed.startsWith('vbscript:')) return false;
  if (trimmed.startsWith('file:')) return false;
  // Allow valid schemes
  if (trimmed.startsWith('https://')) return true;
  if (trimmed.startsWith('http://')) return true;
  if (trimmed.startsWith('/')) return true;
  // Reject anything else (e.g., unknown schemes)
  return false;
}

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        image: true,
        locale: true,
        currency: true,
        plan: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });

  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const body = await request.json();
    const { username, email, currentPassword, newPassword, image, locale, currency } = body;

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Validate username if provided
    if (username !== undefined) {
      if (typeof username !== 'string' || username.trim().length < 3) {
        return NextResponse.json(
          { error: 'Username must be at least 3 characters' },
          { status: 400 }
        );
      }
      if (username.trim().length > 30) {
        return NextResponse.json(
          { error: 'Username must be 30 characters or less' },
          { status: 400 }
        );
      }
      // Check uniqueness (exclude current user)
      const existingUser = await db.user.findFirst({
        where: {
          username: username.trim(),
          id: { not: userId },
        },
      });
      if (existingUser) {
        return NextResponse.json(
          { error: 'Username is already taken' },
          { status: 409 }
        );
      }
    }

    // Validate email if provided
    let finalEmail = user.email;
    if (email !== undefined && email !== user.email) {
      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
      // Email change requires password confirmation
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to change email' },
          { status: 400 }
        );
      }
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 401 }
        );
      }
      // Check email uniqueness
      const existingEmail = await db.user.findFirst({
        where: {
          email: email.trim().toLowerCase(),
          id: { not: userId },
        },
      });
      if (existingEmail) {
        return NextResponse.json(
          { error: 'Email is already in use' },
          { status: 409 }
        );
      }
      finalEmail = email.trim().toLowerCase();
    }

    let hashedPassword: string | undefined;
    let passwordChanged = false;

    // If updating password, verify current password first
    if (newPassword) {
      if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
        return NextResponse.json(
          { error: 'Password must be between 8 and 128 characters' },
          { status: 400 }
        );
      }
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required' },
          { status: 400 }
        );
      }

      const isValidPw = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPw) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 401 }
        );
      }

      hashedPassword = await bcrypt.hash(newPassword, 10);
      passwordChanged = true;
    }

    // Validate image URL if provided
    let finalImage = user.image;
    if (image !== undefined) {
      if (image && image.trim() !== '') {
        if (!isValidImageUrl(image)) {
          return NextResponse.json(
            { error: 'Invalid image URL. Only http://, https://, and relative paths are allowed.' },
            { status: 400 }
          );
        }
        finalImage = image.trim();
      } else {
        finalImage = null;
      }
    }

    // Validate locale if provided
    let finalLocale = user.locale;
    if (locale !== undefined) {
      if (!VALID_LOCALES.includes(locale)) {
        return NextResponse.json(
          { error: 'Invalid locale. Must be "id" or "en"' },
          { status: 400 }
        );
      }
      finalLocale = locale;
    }

    // Validate currency if provided
    let finalCurrency = user.currency;
    if (currency !== undefined) {
      if (!VALID_CURRENCIES.includes(currency)) {
        return NextResponse.json(
          { error: 'Invalid currency code' },
          { status: 400 }
        );
      }
      finalCurrency = currency;
    }

    // Update user (include password if it was changed)
    await db.user.update({
      where: { id: userId },
      data: {
        ...(username !== undefined && { username: username.trim() }),
        ...(finalEmail !== user.email && { email: finalEmail }),
        ...(newPassword ? { password: hashedPassword } : {}),
        ...(finalImage !== undefined && { image: finalImage }),
        ...(finalLocale !== undefined && { locale: finalLocale }),
        ...(finalCurrency !== undefined && { currency: finalCurrency }),
      },
    });

    // If password was changed, regenerate the session cookie with a new signed token
    // This invalidates any stolen cookies
    if (passwordChanged) {
      await createSession(userId);
    }

    // Fetch the updated user to return
    const updatedUser = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        image: true,
        locale: true,
        currency: true,
        plan: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user: updatedUser });

  } catch (error) {
    console.error('Profile PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required to delete account' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Password is incorrect' },
        { status: 401 }
      );
    }

    // Delete user (this will cascade delete all related data)
    await db.user.delete({
      where: { id: userId },
    });

    // Clear the signed session cookie
    await destroySession();

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Profile DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
