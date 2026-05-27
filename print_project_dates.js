const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.findFirst({
    include: {
      phases: {
        include: {
          tasks: true
        }
      }
    }
  });

  if (!project) {
    console.log("No project found.");
    return;
  }

  console.log("--- PROJECT DATES ---");
  console.log(`Project: "${project.name}"`);
  console.log(`  StartDate: ${project.startDate.toISOString()}`);
  console.log(`  EndDate: ${project.endDate.toISOString()}`);

  let minDate = new Date(project.startDate);
  let maxDate = new Date(project.endDate);

  project.phases.forEach(ph => {
    console.log(`  Phase: "${ph.name}"`);
    console.log(`    StartDate: ${ph.startDate.toISOString()}`);
    console.log(`    EndDate: ${ph.endDate.toISOString()}`);
    
    const phStart = new Date(ph.startDate);
    const phEnd = new Date(ph.endDate);
    if (phStart < minDate) minDate = phStart;
    if (phEnd > maxDate) maxDate = phEnd;

    ph.tasks.forEach(t => {
      console.log(`      Task: "${t.name}" | Start: ${t.startDate.toISOString()} | End: ${t.endDate.toISOString()}`);
      const tStart = new Date(t.startDate);
      const tEnd = new Date(t.endDate);
      if (tStart < minDate) minDate = tStart;
      if (tEnd > maxDate) maxDate = tEnd;
    });
  });

  console.log("--- EVALUATED BOUNDS ---");
  console.log(`Calculated minDate: ${minDate.toISOString()}`);
  console.log(`Calculated maxDate: ${maxDate.toISOString()}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
