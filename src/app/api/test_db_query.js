const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const recintos = await prisma.recinto.findMany({
    include: {
      equipments: {
        where: { deletedAt: null },
        orderBy: { name: 'asc' }
      }
    },
    orderBy: { name: 'asc' }
  });
  
  console.log('Recintos count with query:', recintos.length);
  if (recintos.length > 0) {
    console.log('First Recinto Equipments count:', recintos[0].equipments.length);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
