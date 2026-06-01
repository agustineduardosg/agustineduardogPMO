/**
 * SCRIPT DE SANEAMIENTO Y LIMPIEZA DE EQUIPOS CLÍNICOS VIRTUALES
 * 
 * Este script elimina de forma segura y permanente los equipos "virtuales" o duplicados que
 * fueron auto-creados automáticamente por el módulo de la Matriz de Analitos de Laboratorio,
 * restaurando la base de datos a su estado limpio y real del Seguimiento Físico (PMBOK tracker).
 * 
 * Resguarda al 100% los equipos reales del Seguimiento Físico y desvincula los analitos
 * de forma que sigan operando de manera independiente.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Iniciando saneamiento de base de datos...');

  // 1. Identificar todos los ClinicalEquipment auto-creados
  // Buscamos coincidencia en la columna 'observaciones'
  const virtualEquipments = await prisma.clinicalEquipment.findMany({
    where: {
      OR: [
        { observaciones: { contains: 'Creado automáticamente' } },
        { observaciones: { contains: 'Matriz de Analitos' } }
      ]
    },
    select: {
      id: true,
      name: true,
      recintoId: true,
      observaciones: true
    }
  });

  console.log(`🔍 Se identificaron ${virtualEquipments.length} equipos virtuales auto-creados.`);

  if (virtualEquipments.length === 0) {
    console.log('✅ No se encontraron equipos virtuales. La base de datos ya está limpia.');
    return;
  }

  // Listar equipos a eliminar para transparencia
  virtualEquipments.forEach((eq, idx) => {
    console.log(`   [${idx + 1}] ID: ${eq.id} | Nombre: ${eq.name} | Sede: ${eq.recintoId}`);
  });

  const virtualIds = virtualEquipments.map(eq => eq.id);

  // 2. Ejecutar transacción de saneamiento
  const result = await prisma.$transaction(async (tx) => {
    // A. Desvincular todos los analitos asociados a estos equipos virtuales (equipmentId -> null)
    const unlinkResult = await tx.analyte.updateMany({
      where: {
        equipmentId: { in: virtualIds }
      },
      data: {
        equipmentId: null
      }
    });
    console.log(`🔗 Se desvincularon ${unlinkResult.count} analitos de los equipos virtuales.`);

    // B. Eliminar físicamente los equipos virtuales de la tabla ClinicalEquipment
    const deleteResult = await tx.clinicalEquipment.deleteMany({
      where: {
        id: { in: virtualIds }
      }
    });

    return deleteResult.count;
  });

  console.log(`🗑️ Saneamiento completado con éxito. Se eliminaron ${result} equipos virtuales de la tabla ClinicalEquipment.`);
  console.log('✨ La base de datos de Seguimiento Clínico físico ha sido restaurada a su estado original real.');
}

main()
  .catch(e => {
    console.error('❌ Error durante el saneamiento:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
