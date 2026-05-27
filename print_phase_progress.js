const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const phases = await prisma.phase.findMany();
  console.log("--- PHASE PROGRESS ---");
  phases.forEach(ph => {
    console.log(`Phase: "${ph.name}" | Progress: ${ph.progress}% | Start: ${ph.startDate.toISOString()} | End: ${ph.endDate.toISOString()}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
