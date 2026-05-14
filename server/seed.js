const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  // Seed users
  const users = [
    { username: 'dataentry1', password: 'password', role: 'DataEntry', name: 'John Doe' },
    { username: 'checker1', password: 'password', role: 'Checker', name: 'Jane Smith' },
    { username: 'verifier1', password: 'password', role: 'Verifier', name: 'Boss Man' }
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: { username: u.username, passwordHash: hash, role: u.role, name: u.name }
    });
  }

  const dataEntryUser = await prisma.user.findUnique({ where: { username: 'dataentry1' } });
  const checkerUser = await prisma.user.findUnique({ where: { username: 'checker1' } });
  const verifierUser = await prisma.user.findUnique({ where: { username: 'verifier1' } });

  // Demo documents in various states
  const demoDocuments = [
    {
      type: 'First Piece Approval',
      data: JSON.stringify({ notes: 'Initial batch run for Component A', quantity: '50' }),
      status: 'Pending at Checked By',
      location: 'SHED NO 1',
      itemName: 'ADDITIVE',
      createdById: dataEntryUser.id,
    },
    {
      type: 'Shift Report',
      data: JSON.stringify({ notes: 'Morning shift report - all parameters normal', quantity: '120' }),
      status: 'Pending at Checked By',
      location: 'SHED NO 2',
      itemName: 'INK',
      createdById: dataEntryUser.id,
    },
    {
      type: 'Training Attendance Sheet',
      data: JSON.stringify({ notes: 'Safety training batch 3', quantity: '25' }),
      status: 'Pending at Verified By',
      location: 'SHED NO 3',
      itemName: 'Makeup',
      createdById: dataEntryUser.id,
      checkedById: checkerUser.id,
      checkedAt: new Date('2026-05-12T10:30:00Z'),
    },
    {
      type: 'Daily Quality Check',
      data: JSON.stringify({ notes: 'All QC parameters passed', quantity: '200' }),
      status: 'Completed',
      location: 'SHED NO 1',
      itemName: 'ADDITIVE',
      createdById: dataEntryUser.id,
      checkedById: checkerUser.id,
      checkedAt: new Date('2026-05-11T09:00:00Z'),
      verifiedById: verifierUser.id,
      verifiedAt: new Date('2026-05-11T14:00:00Z'),
    },
    {
      type: 'First Piece Approval',
      data: JSON.stringify({ notes: 'New product line validation', quantity: '10' }),
      status: 'Completed',
      location: 'SHED NO 2',
      itemName: 'INK',
      createdById: dataEntryUser.id,
      checkedById: checkerUser.id,
      checkedAt: new Date('2026-05-10T11:00:00Z'),
      verifiedById: verifierUser.id,
      verifiedAt: new Date('2026-05-10T16:00:00Z'),
    },
  ];

  for (const doc of demoDocuments) {
    await prisma.document.create({ data: doc });
  }

  console.log('Seed complete! Created 3 users and 5 demo documents.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
