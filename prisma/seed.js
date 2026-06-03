require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Error: DATABASE_URL environment variable is required to run the seed script.");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Create Users
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const sellerPasswordHash = await bcrypt.hash('seller123', 10);
  const buyerPasswordHash = await bcrypt.hash('buyer123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@inventory.com' },
    update: {},
    create: {
      email: 'admin@inventory.com',
      name: 'Admin Manager',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
  });
  console.log('Seeded admin user:', admin.email);

  const seller = await prisma.user.upsert({
    where: { email: 'seller@inventory.com' },
    update: {
      role: 'USER',
    },
    create: {
      email: 'seller@inventory.com',
      name: 'Seller Agent',
      passwordHash: sellerPasswordHash,
      role: 'USER',
    },
  });
  console.log('Seeded seller user:', seller.email);

  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@inventory.com' },
    update: {
      role: 'USER',
    },
    create: {
      email: 'buyer@inventory.com',
      name: 'Retail Buyer',
      passwordHash: buyerPasswordHash,
      role: 'USER',
    },
  });
  console.log('Seeded buyer user:', buyer.email);

  // Create Products
  const products = [
    {
      sku: 'WHT-FLR-01',
      name: 'Wheat Flour',
      description: 'Premium organic wheat flour.',
      category: 'Grains & Flours',
      dimension: 'WEIGHT',
      baseUnit: 'kg',
      basePrice: 60.00,
      inventoryQuantity: 500.00,
    },
    {
      sku: 'GLD-DST-02',
      name: 'Gold Dust',
      description: 'High-purity baking shimmer dust.',
      category: 'Baking Decor',
      dimension: 'WEIGHT',
      baseUnit: 'g',
      basePrice: 350.00,
      inventoryQuantity: 50.00,
    },
    {
      sku: 'MILK-LIT-03',
      name: 'Whole Milk',
      description: 'Pasteurized whole milk.',
      category: 'Dairy',
      dimension: 'VOLUME',
      baseUnit: 'L',
      basePrice: 75.00,
      inventoryQuantity: 100.00,
    },
    {
      sku: 'VAN-EXT-04',
      name: 'Vanilla Extract',
      description: 'Pure Madagascar vanilla extract.',
      category: 'Extracts',
      dimension: 'VOLUME',
      baseUnit: 'mL',
      basePrice: 15.00,
      inventoryQuantity: 1000.00,
    },
    {
      sku: 'CARD-BOX-05',
      name: 'Cardboard Box (Medium)',
      description: 'Sturdy packaging box.',
      category: 'Packaging',
      dimension: 'COUNT',
      baseUnit: 'item',
      basePrice: 25.00,
      inventoryQuantity: 200.00,
    },
  ];

  for (const prod of products) {
    const created = await prisma.product.upsert({
      where: { sku: prod.sku },
      update: {
        basePrice: prod.basePrice,
        inventoryQuantity: prod.inventoryQuantity,
      },
      create: prod,
    });
    console.log(`Seeded product: ${created.name} (${created.sku})`);
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
