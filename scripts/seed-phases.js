const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Iniciando inicialización de Fases de Alcance...");

  // 1. Crear Fase 1 si no existe
  let phase1 = await prisma.releasePhase.findUnique({
    where: { name: 'Fase 1' }
  });
  if (!phase1) {
    phase1 = await prisma.releasePhase.create({
      data: {
        name: 'Fase 1',
        description: 'Primera etapa de implementación activa (Alcance 2026)',
        isActive: true
      }
    });
    console.log("✅ Creada: Fase 1");
  } else {
    console.log("ℹ️ Fase 1 ya existe");
  }

  // 2. Crear Fase 2 si no existe
  let phase2 = await prisma.releasePhase.findUnique({
    where: { name: 'Fase 2' }
  });
  if (!phase2) {
    phase2 = await prisma.releasePhase.create({
      data: {
        name: 'Fase 2',
        description: 'Segunda etapa de implementación (Alcance 2027)',
        isActive: true
      }
    });
    console.log("✅ Creada: Fase 2");
  } else {
    console.log("ℹ️ Fase 2 ya existe");
  }

  // 3. Vincular equipos clínicos huérfanos a la Fase 1
  const updatedEquips = await prisma.clinicalEquipment.updateMany({
    where: {
      releasePhaseId: null
    },
    data: {
      releasePhaseId: phase1.id,
      scopeStatus: 'ACTIVE'
    }
  });
  console.log(`✅ Se actualizaron ${updatedEquips.count} equipos clínicos vinculándolos a la Fase 1.`);

  // 4. Vincular analitos huérfanos a la Fase 1
  const updatedAnalytes = await prisma.analyte.updateMany({
    where: {
      releasePhaseId: null
    },
    data: {
      releasePhaseId: phase1.id,
      scopeStatus: 'INHERITED'
    }
  });
  console.log(`✅ Se actualizaron ${updatedAnalytes.count} analitos vinculándolos a la Fase 1.`);

  console.log("🎉 ¡Proceso de inicialización de fases completado con éxito!");
}

main()
  .catch((e) => {
    console.error("❌ Error durante la inicialización de fases:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
