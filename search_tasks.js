const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tasks = await prisma.task.findMany({
    include: {
      phase: true
    },
    orderBy: {
      wbsId: 'asc'
    }
  });
  console.log(`Found ${tasks.length} tasks in database.`);
  tasks.slice(0, 25).forEach(t => {
    console.log(`Task ID: ${t.id} | Name: "${t.name}" | WBS: ${t.wbsId} | Status: ${t.status} | Progress: ${t.progress}% | Phase: "${t.phase.name}" | Start: ${t.startDate.toISOString()} | End: ${t.endDate.toISOString()}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
