const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const equipments = await prisma.clinicalEquipment.findMany({
    select: {
      id: true,
      name: true,
      recintoId: true,
      observaciones: true,
      createdAt: true
    }
  });

  console.log(`Total ClinicalEquipments: ${equipments.length}`);
  equipments.forEach((eq, idx) => {
    console.log(`${idx + 1}. ID: ${eq.id} | Name: ${eq.name} | Sede: ${eq.recintoId} | Observaciones: "${eq.observaciones}"`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
