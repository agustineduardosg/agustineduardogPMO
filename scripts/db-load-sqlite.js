const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const originalSchema = fs.readFileSync(schemaPath, 'utf8');
const DUMP_PATH = path.join(__dirname, '..', 'prisma', 'data_dump.json');

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
  console.log('🔄 Iniciando importación de datos de producción a SQLite local...');

  if (!fs.existsSync(DUMP_PATH)) {
    throw new Error(`Archivo de datos dump no encontrado en: ${DUMP_PATH}. Asegúrate de tener el archivo 'data_dump.json' en la carpeta prisma.`);
  }

  const dumpData = JSON.parse(fs.readFileSync(DUMP_PATH, 'utf-8'));

  try {
    // 1. Modificar schema.prisma temporalmente para SQLite local
    console.log('📝 Modificando temporalmente el esquema para usar SQLite...');
    const newSchema = originalSchema
      .replace('provider = "postgresql"', 'provider = "sqlite"')
      .replace('url      = env("DATABASE_URL")', '"file:./dev.db"');
    fs.writeFileSync(schemaPath, newSchema);

    // 2. Regenerar Prisma Client para SQLite
    console.log('⚙️ Regenerando Prisma Client para SQLite...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    // 3. Re-importar el cliente generado para SQLite
    delete require.cache[require.resolve('@prisma/client')];
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // 4. Limpiar la base de datos SQLite local
    console.log('🧹 Limpiando base de datos SQLite local...');
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
      console.log('✅ Base de datos SQLite limpia.');
    } catch (e) {
      console.log('⚠️ Aviso: Error o base de datos ya limpia.', e.message);
    }

    // 5. Insertar los datos en el orden correcto
    console.log('⏳ Insertando MasterUsers...');
    for (const item of dumpData.masterUsers || []) {
      await prisma.masterUser.create({
        data: parseDates(item, ['createdAt', 'updatedAt'])
      });
    }

    console.log('⏳ Insertando Projects...');
    for (const item of dumpData.projects || []) {
      await prisma.project.create({
        data: parseDates(item, ['startDate', 'endDate', 'createdAt', 'updatedAt', 'cutoffDate', 'goLiveDate', 'nextMilestoneDate'])
      });
    }

    console.log('⏳ Insertando Phases...');
    for (const item of dumpData.phases || []) {
      await prisma.phase.create({
        data: parseDates(item, ['startDate', 'endDate', 'createdAt', 'updatedAt'])
      });
    }

    console.log('⏳ Insertando Tasks (Paso 1: sin parentId)...');
    const tasksWithParents = [];
    for (const item of dumpData.tasks || []) {
      const parsed = parseDates(item, ['startDate', 'endDate', 'createdAt', 'updatedAt', 'realStartDate', 'realEndDate']);
      if (parsed.parentId) {
        tasksWithParents.push({ id: parsed.id, parentId: parsed.parentId });
        parsed.parentId = null;
      }
      await prisma.task.create({
        data: parsed
      });
    }

    console.log('⏳ Vinculando parentId en Tasks (Paso 2)...');
    for (const link of tasksWithParents) {
      await prisma.task.update({
        where: { id: link.id },
        data: { parentId: link.parentId }
      });
    }

    console.log('⏳ Insertando Attachments...');
    for (const item of dumpData.attachments || []) {
      await prisma.attachment.create({
        data: parseDates(item, ['createdAt'])
      });
    }

    console.log('⏳ Insertando Recintos...');
    for (const item of dumpData.recintos || []) {
      await prisma.recinto.create({
        data: parseDates(item, ['createdAt', 'updatedAt'])
      });
    }

    console.log('⏳ Insertando ClinicalEquipments...');
    for (const item of dumpData.clinicalEquipments || []) {
      await prisma.clinicalEquipment.create({
        data: parseDates(item, ['deletedAt', 'createdAt', 'updatedAt'])
      });
    }

    console.log('⏳ Insertando Incidents...');
    for (const item of dumpData.incidents || []) {
      await prisma.incident.create({
        data: parseDates(item, ['createdAt', 'updatedAt'])
      });
    }

    console.log('⏳ Insertando Trainings...');
    for (const item of dumpData.trainings || []) {
      await prisma.training.create({
        data: parseDates(item, ['createdAt', 'updatedAt'])
      });
    }

    console.log('⏳ Insertando Stakeholders...');
    for (const item of dumpData.stakeholders || []) {
      await prisma.stakeholder.create({
        data: parseDates(item, ['createdAt', 'updatedAt'])
      });
    }

    console.log('⏳ Insertando MasterEquipments...');
    for (const item of dumpData.masterEquipments || []) {
      await prisma.masterEquipment.create({
        data: parseDates(item, ['createdAt', 'updatedAt'])
      });
    }

    console.log('⏳ Insertando Analytes...');
    for (const item of dumpData.analytes || []) {
      await prisma.analyte.create({
        data: parseDates(item, ['createdAt', 'updatedAt'])
      });
    }

    console.log('🎉 ¡Carga de datos en SQLite completada con éxito!');
    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ Error durante la importación:', error);
  } finally {
    // 6. Restaurar schema.prisma a su estado original (PostgreSQL)
    console.log('🔄 Restaurando schema.prisma a PostgreSQL original...');
    fs.writeFileSync(schemaPath, originalSchema);
    
    // 7. Regenerar el cliente de Prisma para PostgreSQL
    console.log('⚙️ Regenerando Prisma Client para PostgreSQL...');
    execSync('npx prisma generate', { stdio: 'ignore' });
    console.log('✅ Restaurado y regenerado con éxito.');
  }
}

main().catch(e => {
  console.error('❌ Error crítico en script:', e);
  process.exit(1);
});
