import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function verifyProductOwnership(id: string, userId: string) {
  const product = await db.product.findFirst({
    where: { id },
    include: { business: { select: { userId: true } } },
  });
  return product?.business.userId === userId ? product : null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { id } = await params;

    const product = await verifyProductOwnership(id, userId);
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, sku, price, stock, category, unit, isActive } = body;

    // Validate name if provided
    if (name !== undefined && (!name || !name.trim())) {
      return NextResponse.json(
        { error: 'Product name cannot be empty' },
        { status: 400 }
      );
    }

    // Validate price if provided
    if (price !== undefined) {
      const numPrice = typeof price === 'string' ? parseFloat(price) : price;
      if (isNaN(numPrice) || numPrice <= 0) {
        return NextResponse.json(
          { error: 'Price must be a positive number' },
          { status: 400 }
        );
      }
    }

    // Validate stock if provided
    if (stock !== undefined) {
      const numStock = typeof stock === 'string' ? parseInt(stock) : stock;
      if (isNaN(numStock) || numStock < 0) {
        return NextResponse.json(
          { error: 'Stock must be a non-negative number' },
          { status: 400 }
        );
      }
    }

    // Check SKU uniqueness if changing
    if (sku !== undefined && sku?.trim() && sku.trim() !== product.sku) {
      const existingProduct = await db.product.findUnique({
        where: { sku: sku.trim() },
      });
      if (existingProduct) {
        return NextResponse.json(
          { error: 'SKU already exists' },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (sku !== undefined) updateData.sku = sku?.trim() || null;
    if (price !== undefined) updateData.price = typeof price === 'string' ? parseFloat(price) : price;
    if (stock !== undefined) updateData.stock = typeof stock === 'string' ? parseInt(stock) : stock;
    if (category !== undefined) updateData.category = category?.trim() || null;
    if (unit !== undefined) updateData.unit = unit?.trim() || 'pcs';
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await db.product.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ product: updated });
  } catch (error) {
    console.error('Product PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { id } = await params;

    const product = await verifyProductOwnership(id, userId);
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    await db.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Product DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
