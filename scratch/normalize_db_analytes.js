const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const normalizeAnalyteState = (state) => {
  if (!state) return 'No Iniciado';
  const trimmed = state.trim();
  const lower = trimmed.toLowerCase();
  
  if (lower === 'transmitiendo') return 'Transmitiendo';
  if (lower === 'no iniciado') return 'No Iniciado';
  if (lower === 'en pausa') return 'En Pausa';
  if (lower === 'no aplica' || lower === 'na' || lower === 'n-a' || lower === 'n/a') return 'No aplica';
  
  // Custom status: sentence case
  if (trimmed.length > 0) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }
  return trimmed;
};

async function main() {
  console.log('🔄 Querying all analytes from database...');
  const analytes = await prisma.analyte.findMany();
  console.log(`🔍 Found ${analytes.length} analytes.`);

  let updatedCount = 0;

  for (const a of analytes) {
    const normalized = normalizeAnalyteState(a.state);
    if (a.state !== normalized) {
      console.log(`👉 Normalizing: "${a.state}" ➡️ "${normalized}" for analyte "${a.name}" (ID: ${a.id})`);
      await prisma.analyte.update({
        where: { id: a.id },
        data: { state: normalized }
      });
      updatedCount++;
    }
  }

  console.log(`✅ Completed! Updated ${updatedCount} analytes.`);
}

main()
  .catch(e => {
    console.error('❌ Error running database script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
