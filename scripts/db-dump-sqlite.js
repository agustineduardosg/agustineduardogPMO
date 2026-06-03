const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const DUMP_PATH = path.join(process.cwd(), 'prisma', 'data_dump.json');

async function main() {
  console.log('🔄 Iniciando extracción de datos desde SQLite...');

  // Leer todas las tablas
  const masterUsers = await prisma.masterUser.findMany();
  const projects = await prisma.project.findMany();
  const phases = await prisma.phase.findMany();
  const tasks = await prisma.task.findMany();
  const attachments = await prisma.attachment.findMany();
  const recintos = await prisma.recinto.findMany();
  const clinicalEquipments = await prisma.clinicalEquipment.findMany();
  const incidents = await prisma.incident.findMany();
  const trainings = await prisma.training.findMany();
  const stakeholders = await prisma.stakeholder.findMany();
  const masterEquipments = await prisma.masterEquipment.findMany();
  const analytes = await prisma.analyte.findMany();

  const dumpData = {
    masterUsers,
    projects,
    phases,
    tasks,
    attachments,
    recintos,
    clinicalEquipments,
    incidents,
    trainings,
    stakeholders,
    masterEquipments,
    analytes
  };

  fs.writeFileSync(DUMP_PATH, JSON.stringify(dumpData, null, 2));

  console.log(`✅ Extracción completada con éxito.`);
  console.log(`   Archivo guardado en: ${DUMP_PATH}`);
  console.log(`   - MasterUsers: ${masterUsers.length}`);
  console.log(`   - Projects: ${projects.length}`);
  console.log(`   - Phases: ${phases.length}`);
  console.log(`   - Tasks: ${tasks.length}`);
  console.log(`   - Attachments: ${attachments.length}`);
  console.log(`   - Recintos: ${recintos.length}`);
  console.log(`   - ClinicalEquipments: ${clinicalEquipments.length}`);
  console.log(`   - Incidents: ${incidents.length}`);
  console.log(`   - Trainings: ${trainings.length}`);
  console.log(`   - Stakeholders: ${stakeholders.length}`);
  console.log(`   - MasterEquipments: ${masterEquipments.length}`);
  console.log(`   - Analytes: ${analytes.length}`);
}

main()
  .catch(e => {
    console.error('❌ Error durante la extracción:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
