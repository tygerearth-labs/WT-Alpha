import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, color, icon } = body;

    // Verify category belongs to user
    const existingCategory = await db.category.findFirst({
      where: {
        id: params.id,
        userId,
      },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    const category = await db.category.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(color && { color }),
        ...(icon && { icon }),
      },
    });

    return NextResponse.json({ category });

  } catch (error) {
    console.error('Category PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify category belongs to user
    const existingCategory = await db.category.findFirst({
      where: {
        id: params.id,
        userId,
      },
      include: {
        transactions: true,
      },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    if (existingCategory.transactions.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with transactions' },
        { status: 400 }
      );
    }

    await db.category.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Category DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
