const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const task = await prisma.task.findFirst({
    where: {
      wbsId: '1.1'
    }
  });
  console.log("--- TASK 1.1 DETAILS ---");
  console.log(JSON.stringify(task, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
