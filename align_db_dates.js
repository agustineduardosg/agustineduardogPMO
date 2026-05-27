const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== HEALING DATABASE DATES ===");
  const projects = await prisma.project.findMany({
    include: {
      phases: {
        include: {
          tasks: true
        }
      }
    }
  });

  for (const project of projects) {
    console.log(`Processing Project: "${project.name}" (${project.id})`);
    
    let projMin = null;
    let projMax = null;

    for (const phase of project.phases) {
      if (phase.tasks.length === 0) {
        console.log(`  Phase "${phase.name}" has no tasks. Skipping recalculation.`);
        continue;
      }

      // Calculate min start and max end of tasks
      let phMin = new Date(phase.tasks[0].startDate);
      let phMax = new Date(phase.tasks[0].endDate);
      let totalDuration = 0;
      let totalWeightedProgress = 0;

      phase.tasks.forEach(t => {
        const tStart = new Date(t.startDate);
        const tEnd = new Date(t.endDate);
        if (tStart < phMin) phMin = tStart;
        if (tEnd > phMax) phMax = tEnd;
        totalDuration += t.duration;
        totalWeightedProgress += (t.progress * t.duration);
      });

      const phaseProgress = totalDuration > 0 ? Math.round(totalWeightedProgress / totalDuration) : 0;

      console.log(`  Phase: "${phase.name}" (${phase.id})`);
      console.log(`    Old Dates: ${phase.startDate.toISOString()} - ${phase.endDate.toISOString()} | Prog: ${phase.progress}%`);
      console.log(`    New Dates: ${phMin.toISOString()} - ${phMax.toISOString()} | Prog: ${phaseProgress}%`);

      // Update Phase in DB
      await prisma.phase.update({
        where: { id: phase.id },
        data: {
          startDate: phMin,
          endDate: phMax,
          progress: phaseProgress
        }
      });

      if (!projMin || phMin < projMin) projMin = phMin;
      if (!projMax || phMax > projMax) projMax = phMax;
    }

    if (projMin && projMax) {
      console.log(`  Project Old Dates: ${project.startDate.toISOString()} - ${project.endDate.toISOString()}`);
      console.log(`  Project New Dates: ${projMin.toISOString()} - ${projMax.toISOString()}`);
      
      // Update Project in DB
      await prisma.project.update({
        where: { id: project.id },
        data: {
          startDate: projMin,
          endDate: projMax
        }
      });
    }
  }
  console.log("=== HEALING COMPLETED SUCCESSFULLY ===");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
