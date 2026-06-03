import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    const user = token ? await verifyJWT(token) : null;

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { sku, name, description, category, dimension, baseUnit, basePrice, inventoryQuantity } = body;

    if (sku) {
      const existing = await prisma.product.findFirst({
        where: { sku, id: { not: id } },
      });
      if (existing) {
        return NextResponse.json({ error: 'Product SKU already exists' }, { status: 400 });
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        sku,
        name,
        description,
        category,
        dimension,
        baseUnit,
        basePrice: basePrice !== undefined ? Number(basePrice) : undefined,
        inventoryQuantity: inventoryQuantity !== undefined ? Number(inventoryQuantity) : undefined,
      },
    });

    return NextResponse.json({ product });
  } catch (error: any) {
    console.error('Update product error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    const user = token ? await verifyJWT(token) : null;

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
