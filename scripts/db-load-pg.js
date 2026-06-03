const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const DUMP_PATH = path.join(process.cwd(), 'prisma', 'data_dump.json');

function parseDates(obj, fields) {
  if (!obj) return obj;
  const newObj = { ...obj };
  fields.forEach(f => {
    if (newObj[f]) {
      newObj[f] = new Date(newObj[f]);
    }
  });
  return newObj;
}

async function main() {
  console.log('🔄 Iniciando restauración de datos en PostgreSQL...');

  if (!fs.existsSync(DUMP_PATH)) {
    throw new Error(`Archivo de dump no encontrado en: ${DUMP_PATH}. Ejecuta primero 'node scripts/db-dump-sqlite.js'`);
  }

  const dumpData = JSON.parse(fs.readFileSync(DUMP_PATH, 'utf-8'));

  console.log('🧹 Limpiando base de datos PostgreSQL (Operación destructiva de limpieza)...');
  
  // Limpiar en orden inverso de dependencias para evitar violaciones de clave foránea
  try {
    await prisma.analyte.deleteMany();
    await prisma.clinicalEquipment.deleteMany();
    await prisma.recinto.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.task.deleteMany();
    await prisma.phase.deleteMany();
    await prisma.project.deleteMany();
    await prisma.masterUser.deleteMany();
    await prisma.incident.deleteMany();
    await prisma.training.deleteMany();
    await prisma.stakeholder.deleteMany();
    await prisma.masterEquipment.deleteMany();
    console.log('✅ Base de datos PostgreSQL limpia.');
  } catch (e) {
    console.log('⚠️ Aviso: La base de datos estaba vacía o limpia de antemano.', e.message);
  }

  // 1. MasterUser
  console.log('⏳ Insertando MasterUsers...');
  for (const item of dumpData.masterUsers) {
    await prisma.masterUser.create({
      data: parseDates(item, ['createdAt', 'updatedAt'])
    });
  }

  // 2. Project
  console.log('⏳ Insertando Projects...');
  for (const item of dumpData.projects) {
    await prisma.project.create({
      data: parseDates(item, ['startDate', 'endDate', 'createdAt', 'updatedAt'])
    });
  }

  // 3. Phase
  console.log('⏳ Insertando Phases...');
  for (const item of dumpData.phases) {
    await prisma.phase.create({
      data: parseDates(item, ['startDate', 'endDate', 'createdAt', 'updatedAt'])
    });
  }

  // 4. Task (Insertar con parentId: null primero para evitar errores cíclicos)
  console.log('⏳ Insertando Tasks (Paso 1: sin parentId)...');
  const tasksWithParents = [];
  for (const item of dumpData.tasks) {
    const parsed = parseDates(item, ['startDate', 'endDate', 'createdAt', 'updatedAt']);
    if (parsed.parentId) {
      tasksWithParents.push({ id: parsed.id, parentId: parsed.parentId });
      parsed.parentId = null;
    }
    await prisma.task.create({
      data: parsed
    });
  }

  // Paso 2: Re-enlazar parentId
  console.log('⏳ Vinculando parentId en Tasks (Paso 2)...');
  for (const link of tasksWithParents) {
    await prisma.task.update({
      where: { id: link.id },
      data: { parentId: link.parentId }
    });
  }

  // 5. Attachment
  console.log('⏳ Insertando Attachments...');
  for (const item of dumpData.attachments) {
    await prisma.attachment.create({
      data: parseDates(item, ['createdAt'])
    });
  }

  // 6. Recinto
  console.log('⏳ Insertando Recintos...');
  for (const item of dumpData.recintos) {
    await prisma.recinto.create({
      data: parseDates(item, ['createdAt', 'updatedAt'])
    });
  }

  // 7. ClinicalEquipment
  console.log('⏳ Insertando ClinicalEquipments...');
  for (const item of dumpData.clinicalEquipments) {
    await prisma.clinicalEquipment.create({
      data: parseDates(item, ['deletedAt', 'createdAt', 'updatedAt'])
    });
  }

  // 8. Incident
  console.log('⏳ Insertando Incidents...');
  for (const item of dumpData.incidents) {
    await prisma.incident.create({
      data: parseDates(item, ['createdAt', 'updatedAt'])
    });
  }

  // 9. Training
  console.log('⏳ Insertando Trainings...');
  for (const item of dumpData.trainings) {
    await prisma.training.create({
      data: parseDates(item, ['createdAt', 'updatedAt'])
    });
  }

  // 10. Stakeholder
  console.log('⏳ Insertando Stakeholders...');
  for (const item of dumpData.stakeholders) {
    await prisma.stakeholder.create({
      data: parseDates(item, ['createdAt', 'updatedAt'])
    });
  }

  // 11. MasterEquipment
  console.log('⏳ Insertando MasterEquipments...');
  for (const item of dumpData.masterEquipments) {
    await prisma.masterEquipment.create({
      data: parseDates(item, ['createdAt', 'updatedAt'])
    });
  }

  // 12. Analyte
  console.log('⏳ Insertando Analytes...');
  for (const item of dumpData.analytes) {
    await prisma.analyte.create({
      data: parseDates(item, ['createdAt', 'updatedAt'])
    });
  }

  console.log('🎉 ¡Migración de datos a PostgreSQL completada con 100% de éxito!');
}

main()
  .catch(e => {
    console.error('❌ Error durante la carga a PostgreSQL:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
