import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    const user = token ? await verifyJWT(token) : null;

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const products = await prisma.product.findMany();
    let totalInventoryValue = 0;
    let lowStockCount = 0;

    for (const prod of products) {
      const qty = Number(prod.inventoryQuantity);
      const price = Number(prod.basePrice);
      totalInventoryValue += qty * price;

      // Check if low stock (e.g. less than 10 for kg/L/item, or less than 1000 for g/mL)
      const threshold = prod.baseUnit === 'g' || prod.baseUnit === 'mL' ? 1000 : 10;
      if (qty < threshold) {
        lowStockCount++;
      }
    }

    const totalOrders = await prisma.order.count();
    const pendingOrders = await prisma.order.count({ where: { status: 'PENDING' } });
    const completedOrders = await prisma.order.count({ where: { status: 'COMPLETED' } });
    const approvedOrders = await prisma.order.count({ where: { status: 'APPROVED' } });

    return NextResponse.json({
      metrics: {
        totalInventoryValue,
        lowStockCount,
        totalOrders,
        pendingOrders,
        completedOrders,
        approvedOrders,
        totalProducts: products.length,
      },
    });
  } catch (error) {
    console.error('Fetch admin metrics error:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
