const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const originalSchema = fs.readFileSync(schemaPath, 'utf8');

async function main() {
  try {
    console.log('🔄 Modificando schema.prisma para dev_backup.db...');
    const newSchema = originalSchema
      .replace('provider = "postgresql"', 'provider = "sqlite"')
      .replace('url      = env("DATABASE_URL")', 'url      = "file:./dev_backup.db"');
    
    fs.writeFileSync(schemaPath, newSchema);
    
    console.log('📦 Generando cliente Prisma (mostrando salida)...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    console.log('📊 Consultando base de datos dev_backup.db...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const analyteCount = await prisma.analyte.count().catch(() => 0);
    const clinicalEquipmentCount = await prisma.clinicalEquipment.count().catch(() => 0);

    console.log(`- Analitos en backup: ${analyteCount}`);
    console.log(`- Equipos clínicos en backup: ${clinicalEquipmentCount}`);

    if (analyteCount > 0) {
      const states = await prisma.analyte.groupBy({
        by: ['state'],
        _count: { id: true }
      });
      console.log('Estados de analitos:');
      states.forEach(s => {
        console.log(`  * ${s.state}: ${s._count.id}`);
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error durante la ejecución:', error);
  } finally {
    console.log('🔄 Restaurando schema.prisma original...');
    fs.writeFileSync(schemaPath, originalSchema);
    execSync('npx prisma generate', { stdio: 'ignore' });
    console.log('✅ Listo.');
  }
}

main();
