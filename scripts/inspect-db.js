const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const originalSchema = fs.readFileSync(schemaPath, 'utf8');

async function checkDatabase(dbFile) {
  console.log(`\n========================================`);
  console.log(`🔍 INSPECTING SQLITE DATABASE: ${dbFile}`);
  console.log(`========================================`);

  try {
    // 1. Modificar schema.prisma temporalmente para SQLite
    const newSchema = originalSchema
      .replace('provider = "postgresql"', 'provider = "sqlite"')
      .replace('url      = env("DATABASE_URL")', `url      = "file:./${dbFile}"`);
    
    fs.writeFileSync(schemaPath, newSchema);
    
    // 2. Regenerar Prisma Client
    execSync('npx prisma generate', { stdio: 'ignore' });

    // 3. Importar PrismaClient y consultar
    // Limpiamos cache de require por si acaso
    delete require.cache[require.resolve('@prisma/client')];
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Contar usuarios, proyectos, analitos, etc.
    const userCount = await prisma.masterUser.count().catch(() => -1);
    const projectCount = await prisma.project.count().catch(() => -1);
    const phaseCount = await prisma.phase.count().catch(() => -1);
    const taskCount = await prisma.task.count().catch(() => -1);
    const recintoCount = await prisma.recinto.count().catch(() => -1);
    const equipmentCount = await prisma.clinicalEquipment.count().catch(() => -1);
    const analyteCount = await prisma.analyte.count().catch(() => -1);

    console.log(`📊 Conteos generales en ${dbFile}:`);
    console.log(`   - MasterUsers: ${userCount}`);
    console.log(`   - Projects: ${projectCount}`);
    console.log(`   - Phases: ${phaseCount}`);
    console.log(`   - Tasks: ${taskCount}`);
    console.log(`   - Recintos: ${recintoCount}`);
    console.log(`   - ClinicalEquipments: ${equipmentCount}`);
    console.log(`   - Analytes: ${analyteCount}`);

    if (analyteCount > 0) {
      // Agrupar analitos por su estado para ver el progreso real
      const states = await prisma.analyte.groupBy({
        by: ['state'],
        _count: {
          id: true
        }
      });
      console.log(`📉 Estados de Analitos:`);
      states.forEach(s => {
        console.log(`   - ${s.state}: ${s._count.id}`);
      });

      // Ver algunos analitos que tengan estado diferente a 'No Iniciado' o similar
      const activeAnalytes = await prisma.analyte.findMany({
        where: {
          NOT: {
            state: 'No Iniciado'
          }
        },
        take: 5
      });
      if (activeAnalytes.length > 0) {
        console.log(`✨ Ejemplo de analitos activos:`);
        activeAnalytes.forEach(a => {
          console.log(`   - [${a.transmissionCode}] ${a.name} -> ${a.state} (${a.recintoId})`);
        });
      }
    }

    if (equipmentCount > 0) {
      const activeEquipments = await prisma.clinicalEquipment.findMany({
        where: {
          NOT: [
            { levantamiento: 'No iniciado' },
            { parametrizacion: 'No iniciado' },
            { pruebas: 'No iniciado' },
            { capacitacion: 'No iniciado' },
            { validacion: 'No iniciado' },
            { golive: 'No iniciado' }
          ]
        },
        take: 5
      });
      if (activeEquipments.length > 0) {
        console.log(`🩺 Equipos con progreso:`);
        activeEquipments.forEach(eq => {
          console.log(`   - ${eq.name}: Levantamiento=${eq.levantamiento}, Observaciones=${eq.observaciones}`);
        });
      }
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error(`❌ Error al inspeccionar ${dbFile}:`, error);
  }
}

async function main() {
  try {
    // Inspeccionar las tres bases de datos posibles
    await checkDatabase('dev.db');
    await checkDatabase('dev_backup.db');
    await checkDatabase('../dev.db');
  } finally {
    // Restaurar schema.prisma original y regenerar
    console.log(`\n🔄 Restaurando schema.prisma a PostgreSQL original...`);
    fs.writeFileSync(schemaPath, originalSchema);
    execSync('npx prisma generate', { stdio: 'ignore' });
    console.log(`✅ Restaurado con éxito.`);
  }
}

main();
