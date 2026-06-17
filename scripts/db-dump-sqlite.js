const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const DUMP_PATH = path.join(process.cwd(), 'prisma', 'data_dump.json');

async function main() {
  console.log('🔄 Iniciando extracción de datos desde SQLite...');

  // Leer todas las tablas
  const masterUsers = await prisma.masterUser.findMany();
  const parentProjects = await prisma.parentProject.findMany();
  const systemConfigs = await prisma.systemConfig.findMany();
  const importTemplates = await prisma.importTemplate.findMany();
  const scopeAuditLogs = await prisma.scopeAuditLog.findMany();
  const releasePhases = await prisma.releasePhase.findMany();
  const masterEquipments = await prisma.masterEquipment.findMany();
  const recintos = await prisma.recinto.findMany();
  const projects = await prisma.project.findMany();
  const phases = await prisma.phase.findMany();
  const tasks = await prisma.task.findMany();
  const incidents = await prisma.incident.findMany();
  const trainings = await prisma.training.findMany();
  const stakeholders = await prisma.stakeholder.findMany();
  const risks = await prisma.risk.findMany();
  const costItems = await prisma.costItem.findMany();
  const clinicalEquipments = await prisma.clinicalEquipment.findMany();
  const analytes = await prisma.analyte.findMany();
  const attachments = await prisma.attachment.findMany();

  const dumpData = {
    masterUsers,
    parentProjects,
    systemConfigs,
    importTemplates,
    scopeAuditLogs,
    releasePhases,
    masterEquipments,
    recintos,
    projects,
    phases,
    tasks,
    incidents,
    trainings,
    stakeholders,
    risks,
    costItems,
    clinicalEquipments,
    analytes,
    attachments
  };

  fs.writeFileSync(DUMP_PATH, JSON.stringify(dumpData, null, 2));

  console.log(`✅ Extracción completada con éxito.`);
  console.log(`   Archivo guardado en: ${DUMP_PATH}`);
  console.log(`   - MasterUsers: ${masterUsers.length}`);
  console.log(`   - ParentProjects: ${parentProjects.length}`);
  console.log(`   - SystemConfigs: ${systemConfigs.length}`);
  console.log(`   - ImportTemplates: ${importTemplates.length}`);
  console.log(`   - ScopeAuditLogs: ${scopeAuditLogs.length}`);
  console.log(`   - ReleasePhases: ${releasePhases.length}`);
  console.log(`   - MasterEquipments: ${masterEquipments.length}`);
  console.log(`   - Recintos: ${recintos.length}`);
  console.log(`   - Projects: ${projects.length}`);
  console.log(`   - Phases: ${phases.length}`);
  console.log(`   - Tasks: ${tasks.length}`);
  console.log(`   - Incidents: ${incidents.length}`);
  console.log(`   - Trainings: ${trainings.length}`);
  console.log(`   - Stakeholders: ${stakeholders.length}`);
  console.log(`   - Risks: ${risks.length}`);
  console.log(`   - CostItems: ${costItems.length}`);
  console.log(`   - ClinicalEquipments: ${clinicalEquipments.length}`);
  console.log(`   - Analytes: ${analytes.length}`);
  console.log(`   - Attachments: ${attachments.length}`);
}

main()
  .catch(e => {
    console.error('❌ Error durante la extracción:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
