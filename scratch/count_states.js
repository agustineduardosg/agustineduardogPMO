const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const counts = await prisma.analyte.groupBy({
    by: ['state'],
    _count: {
      _all: true
    }
  });
  console.log(JSON.stringify(counts, null, 2));
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
