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
    const { status } = await request.json();

    if (!status || !['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === status) {
      return NextResponse.json({ order });
    }

    const updatedOrder = await prisma.$transaction(async (tx: any) => {
      // If transitioning to REJECTED, restore inventory
      if (status === 'REJECTED' && order.status !== 'REJECTED') {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              inventoryQuantity: {
                increment: item.quantityInBaseUnit,
              },
            },
          });
        }
      }

      // If transitioning AWAY from REJECTED, re-deduct inventory
      if (order.status === 'REJECTED' && status !== 'REJECTED') {
        for (const item of order.items) {
          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          if (!prod || Number(prod.inventoryQuantity) < Number(item.quantityInBaseUnit)) {
            throw new Error(`Insufficient stock for "${prod?.name || 'Product'}" to reopen this order`);
          }
          await tx.product.update({
            where: { id: item.productId },
            data: {
              inventoryQuantity: {
                decrement: item.quantityInBaseUnit,
              },
            },
          });
        }
      }

      return await tx.order.update({
        where: { id },
        data: { status },
        include: { items: true },
      });
    });

    return NextResponse.json({ order: updatedOrder });
  } catch (error: any) {
    console.error('Update order status error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update order status' }, { status: 500 });
  }
}
