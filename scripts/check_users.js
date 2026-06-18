const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.masterUser.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  });
  console.log("USERS IN DATABASE:");
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
