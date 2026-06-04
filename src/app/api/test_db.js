const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const recintosCount = await prisma.recinto.count();
  const equipmentsCount = await prisma.clinicalEquipment.count();
  
  console.log('Recintos Count:', recintosCount);
  console.log('Equipments Count:', equipmentsCount);
  
  const recintos = await prisma.recinto.findMany();
  console.log('Recintos:', JSON.stringify(recintos, null, 2));
  
  const equipments = await prisma.clinicalEquipment.findMany({ take: 5 });
  console.log('First 5 Equipments:', JSON.stringify(equipments, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
