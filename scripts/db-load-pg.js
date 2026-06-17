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
    throw new Error(`Archivo de dump no encontrado en: ${DUMP_PATH}. Ejecuta primero el volcado.`);
  }

  const dumpData = JSON.parse(fs.readFileSync(DUMP_PATH, 'utf-8'));

  console.log('🧹 Limpiando base de datos PostgreSQL (Operación destructiva)...');
  
  try {
    await prisma.attachment.deleteMany();
    await prisma.analyte.deleteMany();
    await prisma.clinicalEquipment.deleteMany();
    await prisma.costItem.deleteMany();
    await prisma.risk.deleteMany();
    await prisma.stakeholder.deleteMany();
    await prisma.training.deleteMany();
    await prisma.incident.deleteMany();
    await prisma.task.deleteMany();
    await prisma.phase.deleteMany();
    await prisma.project.deleteMany();
    await prisma.recinto.deleteMany();
    await prisma.masterEquipment.deleteMany();
    await prisma.releasePhase.deleteMany();
    await prisma.scopeAuditLog.deleteMany();
    await prisma.importTemplate.deleteMany();
    await prisma.systemConfig.deleteMany();
    await prisma.parentProject.deleteMany();
    await prisma.masterUser.deleteMany();
    console.log('✅ Base de datos PostgreSQL limpia.');
  } catch (e) {
    console.log('⚠️ Aviso: La base de datos estaba vacía o limpia de antemano.', e.message);
  }

  // 1. MasterUser
  console.log('⏳ Insertando MasterUsers...');
  for (const item of dumpData.masterUsers || []) {
    await prisma.masterUser.create({
      data: parseDates(item, ['createdAt', 'updatedAt'])
    });
  }

  // 2. ParentProject
  console.log('⏳ Insertando ParentProjects...');
  for (const item of dumpData.parentProjects || []) {
    await prisma.parentProject.create({
      data: parseDates(item, ['createdAt', 'updatedAt'])
    });
  }

  // 3. SystemConfig
  console.log('⏳ Insertando SystemConfigs...');
  for (const item of dumpData.systemConfigs || []) {
    await prisma.systemConfig.create({
      data: item
    });
  }

  // 4. ImportTemplate
  console.log('⏳ Insertando ImportTemplates...');
  for (const item of dumpData.importTemplates || []) {
    await prisma.importTemplate.create({
      data: parseDates(item, ['createdAt', 'updatedAt'])
    });
  }

  // 5. ScopeAuditLog
  console.log('⏳ Insertando ScopeAuditLogs...');
  for (const item of dumpData.scopeAuditLogs || []) {
    await prisma.scopeAuditLog.create({
      data: parseDates(item, ['createdAt'])
    });
  }

  // 6. ReleasePhase
  console.log('⏳ Insertando ReleasePhases...');
  for (const item of dumpData.releasePhases || []) {
    await prisma.releasePhase.create({
      data: parseDates(item, ['createdAt', 'updatedAt'])
    });
  }

  // 7. MasterEquipment
  console.log('⏳ Insertando MasterEquipments...');
  for (const item of dumpData.masterEquipments || []) {
    await prisma.masterEquipment.create({
      data: parseDates(item, ['createdAt', 'updatedAt'])
    });
  }

  // 8. Recinto
  console.log('⏳ Insertando Recintos...');
  for (const item of dumpData.recintos || []) {
    await prisma.recinto.create({
      data: parseDates(item, ['createdAt', 'updatedAt'])
    });
  }

  // 9. Project
  console.log('⏳ Insertando Projects...');
  for (const item of dumpData.projects || []) {
    await prisma.project.create({
      data: parseDates(item, ['startDate', 'endDate', 'createdAt', 'updatedAt', 'cutoffDate', 'goLiveDate', 'nextMilestoneDate'])
    });
  }

  // 10. Phase
  console.log('⏳ Insertando Phases...');
  for (const item of dumpData.phases || []) {
    await prisma.phase.create({
      data: parseDates(item, ['startDate', 'endDate', 'createdAt', 'updatedAt'])
    });
  }

  // 11. Task (Paso 1: sin parentId)
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

  // Paso 2: Re-enlazar parentId
  console.log('⏳ Vinculando parentId en Tasks (Paso 2)...');
  for (const link of tasksWithParents) {
    await prisma.task.update({
      where: { id: link.id },
      data: { parentId: link.parentId }
    });
  }

  // 12. Incident
  console.log('⏳ Insertando Incidents...');
  for (const item of dumpData.incidents || []) {
    await prisma.incident.create({
      data: parseDates(item, ['createdAt', 'updatedAt'])
    });
  }

  // 13. Training
  console.log('⏳ Insertando Trainings...');
  for (const item of dumpData.trainings || []) {
    await prisma.training.create({
      data: parseDates(item, ['createdAt', 'updatedAt'])
    });
  }

  // 14. Stakeholder
  console.log('⏳ Insertando Stakeholders...');
  for (const item of dumpData.stakeholders || []) {
    await prisma.stakeholder.create({
      data: parseDates(item, ['createdAt', 'updatedAt'])
    });
  }

  // 15. Risk
  console.log('⏳ Insertando Risks...');
  for (const item of dumpData.risks || []) {
    await prisma.risk.create({
      data: parseDates(item, ['limitDate', 'createdAt', 'updatedAt'])
    });
  }

  // 16. CostItem
  console.log('⏳ Insertando CostItems...');
  for (const item of dumpData.costItems || []) {
    await prisma.costItem.create({
      data: parseDates(item, ['createdAt', 'updatedAt'])
    });
  }

  // 17. ClinicalEquipment
  console.log('⏳ Insertando ClinicalEquipments...');
  for (const item of dumpData.clinicalEquipments || []) {
    await prisma.clinicalEquipment.create({
      data: parseDates(item, ['deletedAt', 'createdAt', 'updatedAt'])
    });
  }

  // 18. Analyte
  console.log('⏳ Insertando Analytes...');
  // Los analitos pueden ser muchos (3900+), los insertamos en lotes (batch) de 100 para evitar sobrecarga y lentitud.
  const analytes = (dumpData.analytes || []).map(item => parseDates(item, ['createdAt', 'updatedAt']));
  const batchSize = 100;
  for (let i = 0; i < analytes.length; i += batchSize) {
    const batch = analytes.slice(i, i + batchSize);
    await prisma.analyte.createMany({
      data: batch
    });
  }

  // 19. Attachment
  console.log('⏳ Insertando Attachments...');
  for (const item of dumpData.attachments || []) {
    await prisma.attachment.create({
      data: parseDates(item, ['createdAt'])
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
