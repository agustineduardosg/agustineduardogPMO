const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== REALIGNING DATABASE TASKS TO 2026 ===");
  const tasks = await prisma.task.findMany();

  for (const task of tasks) {
    const start = new Date(task.startDate);
    const end = new Date(task.endDate);
    
    let changed = false;

    if (start.getFullYear() !== 2026) {
      start.setFullYear(2026);
      changed = true;
    }
    if (end.getFullYear() !== 2026) {
      end.setFullYear(2026);
      changed = true;
    }

    if (changed) {
      console.log(`Updating Task "${task.name}":`);
      console.log(`  Old: ${task.startDate.toISOString()} - ${task.endDate.toISOString()}`);
      console.log(`  New: ${start.toISOString()} - ${end.toISOString()}`);
      
      await prisma.task.update({
        where: { id: task.id },
        data: {
          startDate: start,
          endDate: end
        }
      });
    }
  }

  console.log("=== RE-RUNNING DATABASE HEALING ===");
  // Now run the healing algorithm to update phases and projects
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
    let projMin = null;
    let projMax = null;

    for (const phase of project.phases) {
      if (phase.tasks.length === 0) continue;

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
      await prisma.project.update({
        where: { id: project.id },
        data: {
          startDate: projMin,
          endDate: projMax
        }
      });
    }
  }
  console.log("=== DATABASE REALIGNED AND HEALED ===");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
