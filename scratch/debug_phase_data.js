const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const allAnalytes = await p.analyte.findMany({
    include: {
      releasePhase: true
    }
  });

  console.log(`Total Analytes: ${allAnalytes.length}`);

  // Count by phase and state
  const breakdown = {};

  allAnalytes.forEach(a => {
    const phaseName = a.releasePhase ? a.releasePhase.name : 'Sin Asignar';
    const state = a.state;

    if (!breakdown[phaseName]) {
      breakdown[phaseName] = {
        total: 0,
        states: {}
      };
    }

    breakdown[phaseName].total++;
    if (!breakdown[phaseName].states[state]) {
      breakdown[phaseName].states[state] = 0;
    }
    breakdown[phaseName].states[state]++;
  });

  console.log('\n=== ANALYTE BREAKDOWN BY PHASE AND STATE ===');
  console.log(JSON.stringify(breakdown, null, 2));
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
