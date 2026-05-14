const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany();
  console.log(users);
}

check()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
