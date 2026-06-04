const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.analyte.groupBy({
    by: ['state'],
    _count: {
      state: true
    }
  });
  console.log('Unique states in database:', JSON.stringify(result, null, 2));
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
