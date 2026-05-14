const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting production seed...');

  // 1. Seed Core Users
  const users = [
    { username: 'DEVELOPER', password: 'PASSWORD', role: 'Verifier', name: 'Super Admin', plainPassword: 'PASSWORD' },
    { username: 'entry1', password: 'password', role: 'DataEntry', name: 'Shed 1 Operator', plainPassword: 'password' },
    { username: 'check1', password: 'password', role: 'Checker', name: 'Shed 1 Quality Lead', plainPassword: 'password' },
    { username: 'verify1', password: 'password', role: 'Verifier', name: 'Factory Manager', plainPassword: 'password' },
    { username: 'entry2', password: 'password', role: 'DataEntry', name: 'Shed 2 Operator', plainPassword: 'password' },
    { username: 'check2', password: 'password', role: 'Checker', name: 'Shed 2 Quality Lead', plainPassword: 'password' },
    { username: 'entry3', password: 'password', role: 'DataEntry', name: 'Shed 3 Operator', plainPassword: 'password' },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { username: u.username },
      update: { passwordHash: hash, plainPassword: u.plainPassword },
      create: { 
        username: u.username, 
        passwordHash: hash, 
        role: u.role, 
        name: u.name,
        plainPassword: u.plainPassword
      }
    });
  }

  const devUser = await prisma.user.findUnique({ where: { username: 'DEVELOPER' } });
  const entry1 = await prisma.user.findUnique({ where: { username: 'entry1' } });
  const check1 = await prisma.user.findUnique({ where: { username: 'check1' } });
  const verify1 = await prisma.user.findUnique({ where: { username: 'verify1' } });

  // 2. Generate 25+ High-Quality Demo Documents
  const sheds = ['SHED NO 1', 'SHED NO 2', 'SHED NO 3'];
  const items = ['ADDITIVE', 'INK', 'Makeup', 'Laminate', 'Solvent'];
  const types = ['Packing Shift Report', 'Laminate Record for GSM Verification', 'First Piece Approval', 'Daily Quality Check'];
  const statuses = ['Completed', 'Pending at Checked By', 'Pending at Verified By'];

  console.log('Generating 30 professional records...');
  
  for (let i = 0; i < 30; i++) {
    const shed = sheds[i % 3];
    const item = items[i % 5];
    const type = types[i % 4];
    const status = statuses[i % 3];
    
    const date = new Date();
    date.setDate(date.getDate() - (i % 15)); // Spread over last 15 days

    await prisma.document.create({
      data: {
        type: type,
        location: shed,
        itemName: item,
        status: status,
        data: JSON.stringify({ 
          batchNumber: `BTCH-${2026}-${100 + i}`,
          quantity: 1000 + (i * 50),
          remarks: 'Standard production run. All parameters verified.',
          temperature: '24°C',
          humidity: '45%'
        }),
        createdAt: date,
        createdById: entry1.id,
        checkedById: status !== 'Pending at Checked By' ? check1.id : null,
        checkedAt: status !== 'Pending at Checked By' ? date : null,
        verifiedById: status === 'Completed' ? verify1.id : null,
        verifiedAt: status === 'Completed' ? date : null,
      }
    });
  }

  console.log('✅ Seed complete! Admin account DEVELOPER/PASSWORD is ready.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
