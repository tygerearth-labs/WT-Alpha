import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function verifyBusinessOwnership(businessId: string, userId: string) {
  const business = await db.business.findFirst({
    where: { id: businessId, userId },
  });
  return !!business;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { businessId } = await params;

    const ownsBusiness = await verifyBusinessOwnership(businessId, userId);
    if (!ownsBusiness) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), 100);

    if (isNaN(page) || page < 1 || isNaN(pageSize) || pageSize < 1) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    const whereClause: Record<string, unknown> = { businessId };
    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
      ];
    }
    if (category) {
      whereClause.category = category;
    }

    const [products, totalCount] = await Promise.all([
      db.product.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.product.count({ where: whereClause }),
    ]);

    // Stock summary
    const stockSummary = await db.product.aggregate({
      where: { businessId, isActive: true },
      _sum: { stock: true, price: true },
      _count: true,
    });

    const lowStockCount = await db.product.count({
      where: {
        businessId,
        isActive: true,
        stock: { gt: 0, lte: 10 },
      },
    });

    const outOfStockCount = await db.product.count({
      where: {
        businessId,
        isActive: true,
        stock: 0,
      },
    });

    const totalStockValue = products.reduce(
      (sum, p) => sum + p.price * p.stock,
      0
    );

    return NextResponse.json({
      products,
      pagination: { page, pageSize, total: totalCount, hasMore: totalCount > page * pageSize },
      summary: {
        totalActive: stockSummary._count,
        totalStock: stockSummary._sum.stock || 0,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
        totalStockValue,
      },
    });
  } catch (error) {
    console.error('Products GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { businessId } = await params;

    const ownsBusiness = await verifyBusinessOwnership(businessId, userId);
    if (!ownsBusiness) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, sku, price, stock, category, unit, isActive } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
      );
    }

    if (price === undefined || price === null) {
      return NextResponse.json(
        { error: 'Price is required' },
        { status: 400 }
      );
    }

    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice) || numPrice <= 0) {
      return NextResponse.json(
        { error: 'Price must be a positive number' },
        { status: 400 }
      );
    }

    const numStock = typeof stock === 'string' ? parseInt(stock) : (stock ?? 0);
    if (isNaN(numStock) || numStock < 0) {
      return NextResponse.json(
        { error: 'Stock must be a non-negative number' },
        { status: 400 }
      );
    }

    // Check SKU uniqueness if provided
    if (sku && sku.trim()) {
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

    const product = await db.product.create({
      data: {
        businessId,
        name: name.trim(),
        description: description?.trim() || undefined,
        sku: sku?.trim() || undefined,
        price: numPrice,
        stock: numStock,
        category: category?.trim() || undefined,
        unit: unit?.trim() || 'pcs',
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Products POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
