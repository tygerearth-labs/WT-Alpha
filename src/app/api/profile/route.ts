import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

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
    const { username, currentPassword, newPassword, image } = body;

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

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

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
    }

    // Validate image URL if provided
    let finalImage = user.image;
    if (image !== undefined) {
      if (image && image.trim() !== '') {
        // Allow image URL to be set
        finalImage = image.trim();
      } else {
        // Clear image if empty string
        finalImage = null;
      }
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        ...(username && { username }),
        ...(finalImage !== undefined && { image: finalImage }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        image: true,
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

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Profile DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
