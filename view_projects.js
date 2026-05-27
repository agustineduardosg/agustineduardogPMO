const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("--- PROJECTS IN DATABASE ---");
  const projects = await prisma.project.findMany({
    include: {
      phases: {
        include: {
          tasks: true
        }
      }
    }
  });

  for (const p of projects) {
    console.log(`Project: "${p.name}" (ID: ${p.id})`);
    console.log(`  StartDate: ${p.startDate.toISOString()}`);
    console.log(`  EndDate: ${p.endDate.toISOString()}`);
    for (const ph of p.phases) {
      console.log(`  Phase: "${ph.name}" (ID: ${ph.id})`);
      console.log(`    StartDate: ${ph.startDate.toISOString()}`);
      console.log(`    EndDate: ${ph.endDate.toISOString()}`);
      for (const t of ph.tasks) {
        console.log(`    Task: "${t.name}" (ID: ${t.id})`);
        console.log(`      StartDate: ${t.startDate.toISOString()}`);
        console.log(`      EndDate: ${t.endDate.toISOString()}`);
      }
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
