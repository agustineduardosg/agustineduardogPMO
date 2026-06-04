const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const recintos = await p.recinto.findMany({
    include: {
      analytes: {
        include: {
          releasePhase: true
        }
      }
    }
  });

  console.log('=== RECINTO ANALYTE COUNTS AND PHASES ===');
  recintos.forEach(r => {
    const total = r.analytes.length;
    const phaseCounts = {};
    r.analytes.forEach(a => {
      const phaseName = a.releasePhase ? a.releasePhase.name : 'Sin Asignar';
      phaseCounts[phaseName] = (phaseCounts[phaseName] || 0) + 1;
    });
    console.log(`- Recinto: "${r.name}" (${r.id}): Total Analytes = ${total}`);
    console.log('  Phases:', phaseCounts);
  });
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
