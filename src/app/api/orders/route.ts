import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { getConversionFactor, validateUnits, Dimension } from '@/utils/unitConversion';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    const user = token ? await verifyJWT(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let orders;

    if (user.role === 'ADMIN') {
      orders = await prisma.order.findMany({
        include: {
          user: {
            select: { name: true, email: true, role: true },
          },
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      orders = await prisma.order.findMany({
        where: { userId: user.userId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Fetch orders error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    const user = token ? await verifyJWT(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { items, type } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Order must contain at least one item' }, { status: 400 });
    }

    let orderType: 'PURCHASE' | 'QUOTATION' = 'PURCHASE';
    if (type) {
      if (type !== 'PURCHASE' && type !== 'QUOTATION') {
        return NextResponse.json({ error: 'Invalid order type' }, { status: 400 });
      }
      orderType = type;
    }

    const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await prisma.$transaction(async (tx: any) => {
      let totalAmount = 0;
      const orderItemsToCreate = [];

      for (const item of items) {
        const { productId, orderedUnit, orderedQuantity } = item;

        if (!productId || !orderedUnit || orderedQuantity === undefined || Number(orderedQuantity) <= 0) {
          throw new Error('Invalid order item data');
        }

        const product = await tx.product.findUnique({
          where: { id: productId },
        });

        if (!product) {
          throw new Error(`Product not found`);
        }

        const isValid = validateUnits(product.dimension as Dimension, product.baseUnit, orderedUnit);
        if (!isValid) {
          throw new Error(`Incompatible unit "${orderedUnit}" for product "${product.name}"`);
        }

        const factor = getConversionFactor(orderedUnit, product.baseUnit);
        const qtyInBase = Number(orderedQuantity) * factor;
        const itemTotalPrice = qtyInBase * Number(product.basePrice);
        const pricePerOrdered = Number(product.basePrice) * factor;

        if (Number(product.inventoryQuantity) < qtyInBase) {
          throw new Error(`Insufficient stock for "${product.name}". Available: ${Number(product.inventoryQuantity)} ${product.baseUnit}, requested: ${qtyInBase.toFixed(4)} ${product.baseUnit} (${orderedQuantity} ${orderedUnit})`);
        }

        await tx.product.update({
          where: { id: productId },
          data: {
            inventoryQuantity: {
              decrement: qtyInBase,
            },
          },
        });

        orderItemsToCreate.push({
          productId: product.id,
          orderedUnit,
          orderedQuantity: Number(orderedQuantity),
          quantityInBaseUnit: qtyInBase,
          pricePerOrderedUnit: pricePerOrdered,
          totalPrice: itemTotalPrice,
        });

        totalAmount += itemTotalPrice;
      }

      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: user.userId,
          status: 'PENDING',
          type: orderType,
          totalAmount,
          items: {
            create: orderItemsToCreate,
          },
        },
        include: {
          items: true,
        },
      });

      return newOrder;
    });

    return NextResponse.json({ order: result });
  } catch (error: any) {
    console.error('Create order error:', error);
    return NextResponse.json({ error: error.message || 'Failed to place order' }, { status: 400 });
  }
}
