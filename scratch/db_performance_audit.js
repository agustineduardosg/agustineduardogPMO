const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('📊 --- AUDITORÍA DE BASE DE DATOS Y RENDIMIENTO (SQLITE) --- \n');

  // 1. Tamaño del archivo de base de datos
  const dbPath = path.join(__dirname, '..', 'dev.db');
  if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(3);
    console.log(`📁 Archivo DB: ${dbPath}`);
    console.log(`📏 Tamaño en Disco: ${sizeInMB} MB (${stats.size.toLocaleString()} bytes)\n`);
  } else {
    console.log('⚠️ No se encontró el archivo dev.db en la raíz.\n');
  }

  // 2. Pragmas de SQLite y Configuración de WAL
  try {
    const journalMode = await prisma.$queryRawUnsafe('PRAGMA journal_mode;');
    const synchronous = await prisma.$queryRawUnsafe('PRAGMA synchronous;');
    const cacheSize = await prisma.$queryRawUnsafe('PRAGMA cache_size;');
    const pageSize = await prisma.$queryRawUnsafe('PRAGMA page_size;');
    const pageCount = await prisma.$queryRawUnsafe('PRAGMA page_count;');
    const integrityCheck = await prisma.$queryRawUnsafe('PRAGMA integrity_check;');

    console.log('⚡ Configuración de SQLite (PRAGMAs):');
    console.log(`   - journal_mode: ${JSON.stringify(journalMode[0])}`);
    console.log(`   - synchronous:  ${JSON.stringify(synchronous[0])}`);
    console.log(`   - cache_size:   ${JSON.stringify(cacheSize[0])} (Páginas: ${Math.abs(Object.values(cacheSize[0])[0])})`);
    console.log(`   - page_size:    ${JSON.stringify(pageSize[0])} bytes`);
    console.log(`   - page_count:   ${JSON.stringify(pageCount[0])} páginas`);
    console.log(`   - Integrity:    ${JSON.stringify(integrityCheck[0])}\n`);
  } catch (err) {
    console.error('❌ Error al consultar PRAGMAs:', err.message);
  }

  // 3. Cantidad de Registros por Tabla
  console.log('📋 Cantidad de registros en tablas:');
  const tables = [
    'Project',
    'Phase',
    'Task',
    'Attachment',
    'Recinto',
    'ClinicalEquipment',
    'MasterUser',
    'Incident',
    'Training',
    'Stakeholder',
    'MasterEquipment',
    'Analyte'
  ];

  for (const t of tables) {
    try {
      const count = await prisma[t.charAt(0).toLowerCase() + t.slice(1)].count();
      console.log(`   - ${t.padEnd(20)}: ${count.toLocaleString()} registros`);
    } catch (err) {
      // Intentar raw query si falla el mapping
      try {
        const countRaw = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM "${t}";`);
        console.log(`   - ${t.padEnd(20)}: ${countRaw[0].cnt.toLocaleString()} registros (raw)`);
      } catch (e) {
        console.log(`   - ${t.padEnd(20)}: Error (${err.message})`);
      }
    }
  }
  console.log('');

  // 4. Chequeo de Índices en la Base de Datos
  try {
    const indexes = await prisma.$queryRawUnsafe(`
      SELECT type, name, tbl_name, sql 
      FROM sqlite_master 
      WHERE type='index';
    `);
    console.log(`🔍 Índices definidos en SQLite (${indexes.length}):`);
    indexes.forEach(idx => {
      console.log(`   - [${idx.tbl_name}] Índice: ${idx.name}`);
      if (idx.sql) console.log(`     SQL: ${idx.sql}`);
    });
    console.log('');
  } catch (err) {
    console.error('❌ Error al consultar índices:', err.message);
  }

  // 5. Test de Velocidad de Consulta de Analitos (Performance de Lectura)
  console.log('⏱️ Prueba de rendimiento de lectura:');
  const start = Date.now();
  try {
    const analytesList = await prisma.analyte.findMany({
      include: {
        recinto: true,
        equipment: true
      }
    });
    const duration = Date.now() - start;
    console.log(`   - Lectura de ${analytesList.length} analitos con joins (recinto y equipo): ${duration} ms`);
  } catch (err) {
    console.error('❌ Error en test de lectura:', err.message);
  }

  // 6. Test de Escritura y Transacciones
  console.log('⏱️ Prueba de escritura (Transacciones rápidas):');
  const writeStart = Date.now();
  try {
    await prisma.$transaction([
      prisma.analyte.updateMany({
        where: { id: 'non-existent-id' },
        data: { state: 'No Iniciado' }
      })
    ]);
    const duration = Date.now() - writeStart;
    console.log(`   - Tiempo de actualización masiva con transacción: ${duration} ms`);
  } catch (err) {
    console.error('❌ Error en test de escritura:', err.message);
  }

  await prisma.$disconnect();
  console.log('\n✅ Auditoría finalizada de forma segura.');
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
