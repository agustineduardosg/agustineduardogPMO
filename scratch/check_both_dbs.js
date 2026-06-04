const { PrismaClient } = require('@prisma/client');

async function checkDb(url, label) {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: url
      }
    }
  });

  try {
    const count = await prisma.analyte.count();
    const states = await prisma.analyte.groupBy({
      by: ['state'],
      _count: {
        state: true
      }
    });
    console.log(`=== ${label} (${url}) ===`);
    console.log(`Total Analytes: ${count}`);
    console.log('States:', JSON.stringify(states, null, 2));
  } catch (e) {
    console.error(`Error checking ${label}:`, e.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  // Prisma resolves relative paths relative to the schema directory (prisma/)
  // So:
  // "file:./dev.db" points to prisma/dev.db
  // "file:../dev.db" points to root dev.db
  await checkDb("file:./dev.db", "prisma/dev.db");
  await checkDb("file:../dev.db", "root dev.db");
}

main();
