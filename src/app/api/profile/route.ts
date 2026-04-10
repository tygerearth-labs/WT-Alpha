import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

const VALID_LOCALES = ['id', 'en'];

// Basic currency code validation
const VALID_CURRENCIES = [
  'IDR', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'MYR', 'AUD', 'CAD', 'CHF',
  'KRW', 'CNY', 'THB', 'PHP', 'INR', 'BRL', 'MXN', 'ZAR', 'AED', 'SAR',
  'TWD', 'HKD', 'NZD', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON',
  'BGN', 'TRY', 'RUB', 'UAH', 'VND', 'NGN', 'EGP', 'PKR', 'BDT', 'LKR',
];

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        image: true,
        locale: true,
        currency: true,
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
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { username, currentPassword, newPassword, image, locale, currency } = body;

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let hashedPassword: string | undefined;

    // If updating password, verify current password first
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required' },
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

      hashedPassword = await bcrypt.hash(newPassword, 10);
    }

    // Validate image URL if provided
    let finalImage = user.image;
    if (image !== undefined) {
      if (image && image.trim() !== '') {
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
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        ...(username && { username }),
        ...(newPassword ? { password: hashedPassword } : {}),
        ...(finalImage !== undefined && { image: finalImage }),
        ...(finalLocale !== undefined && { locale: finalLocale }),
        ...(finalCurrency !== undefined && { currency: finalCurrency }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        image: true,
        locale: true,
        currency: true,
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
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Clear session cookie so client doesn't stay authenticated with dead session
    const response = NextResponse.json({ success: true });
    response.cookies.set('userId', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Profile DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
