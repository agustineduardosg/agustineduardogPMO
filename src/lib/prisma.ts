import { PrismaClient } from '@prisma/client';
import path from 'path';

// Resolves the absolute path to prisma/dev.db so Next.js runtime and Prisma CLI
// always point to the exact same physical SQLite file.
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const databaseUrl = `file:${dbPath}?connection_limit=1&socket_timeout=10000&busy_timeout=10000`;

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

// Configuración de ALTA CONCURRENCIA para SQLite (WAL Mode y Synchronous Normal)
if (!globalForPrisma.prisma) {
  (async () => {
    try {
      // Activa Write-Ahead Logging (Lectores y Escritores no se bloquean mutuamente)
      await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
      // Optimiza la velocidad de sincronización de disco reduciendo escrituras innecesarias
      await prisma.$queryRawUnsafe('PRAGMA synchronous=NORMAL;');
      // Cache de memoria optimizado para lecturas rápidas
      await prisma.$queryRawUnsafe('PRAGMA cache_size=-64000;'); // ~64MB cache
      console.log('⚡ Base de datos SQLite optimizada con éxito en modo WAL y apuntando a:', dbPath);
    } catch (error) {
      console.error('❌ Error al configurar optimizaciones de SQLite:', error);
    }
  })();
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;


