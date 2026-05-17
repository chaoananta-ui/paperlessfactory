const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function check() {
  console.log('Querying users naturally from .env DATABASE_URL...');
  const users = await prisma.user.findMany();
  console.log('Result:', users);
}

check()
  .catch(e => {
    console.error('Fatal error in check:');
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
