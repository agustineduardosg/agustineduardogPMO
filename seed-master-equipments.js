const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== INICIANDO EXTRACCIÓN Y SEMBRADO DE EQUIPAMIENTO MÉDICO MAESTRO ===");
  
  // 1. Obtener todos los equipos clínicos cargados en la base de datos
  const clinicalEquipments = await prisma.clinicalEquipment.findMany({
    select: {
      name: true,
      section: true
    }
  });
  
  console.log(`Se encontraron ${clinicalEquipments.length} equipos clínicos en la base de datos.`);
  
  // 2. Extraer combinaciones únicas de name y section
  const uniqueMap = new Map();
  clinicalEquipments.forEach(eq => {
    const name = eq.name.trim();
    const section = eq.section ? eq.section.trim() : "General";
    
    if (name && !uniqueMap.has(name)) {
      uniqueMap.set(name, section);
    }
  });
  
  console.log(`Se descubrieron ${uniqueMap.size} modelos únicos de equipamiento médico.`);
  
  // 3. Insertar en MasterEquipment
  let count = 0;
  for (const [name, section] of uniqueMap.entries()) {
    try {
      await prisma.masterEquipment.upsert({
        where: { name },
        update: { section },
        create: {
          name,
          section,
          category: 'Clínico'
        }
      });
      count++;
    } catch (e) {
      console.error(`Error al insertar ${name}:`, e.message);
    }
  }
  
  console.log(`=== SEMBRADO COMPLETADO: ${count} equipos insertados/actualizados en el Maestro ===`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
