import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const dimension = searchParams.get('dimension') || '';

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      whereClause.category = category;
    }

    if (dimension) {
      whereClause.dimension = dimension;
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: { sku: 'asc' },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Fetch products error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    const user = token ? await verifyJWT(token) : null;

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { sku, name, description, category, dimension, baseUnit, basePrice, inventoryQuantity } = body;

    if (!sku || !name || !dimension || !baseUnit || basePrice === undefined || inventoryQuantity === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existing = await prisma.product.findUnique({
      where: { sku },
    });

    if (existing) {
      return NextResponse.json({ error: 'Product SKU already exists' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description,
        category,
        dimension,
        baseUnit,
        basePrice: Number(basePrice),
        inventoryQuantity: Number(inventoryQuantity),
      },
    });

    return NextResponse.json({ product });
  } catch (error: any) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
