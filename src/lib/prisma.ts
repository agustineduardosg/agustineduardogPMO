import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

// Resolves the absolute path to prisma/dev.db so Next.js runtime and Prisma CLI
// always point to the exact same physical SQLite file.
let databaseUrl = process.env.DATABASE_URL;
let resolvedDbPath = '';

if (databaseUrl) {
  // Si DATABASE_URL está configurada, verificamos si es una conexión a archivo SQLite
  if (databaseUrl.startsWith('file:')) {
    try {
      // Extraemos la ruta del archivo SQLite
      const urlWithoutScheme = databaseUrl.substring(5); // Quita 'file:'
      const questionMarkIdx = urlWithoutScheme.indexOf('?');
      const rawFilePath = questionMarkIdx !== -1 ? urlWithoutScheme.substring(0, questionMarkIdx) : urlWithoutScheme;
      
      // Resolvemos la ruta absoluta
      resolvedDbPath = path.isAbsolute(rawFilePath) ? rawFilePath : path.resolve(process.cwd(), rawFilePath);
      const targetDir = path.dirname(resolvedDbPath);
      
      console.log('🔍 [Prisma init] Detectada base de datos SQLite en:', resolvedDbPath);
      
      // Asegurar que el directorio destino existe (por ejemplo, /data)
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        console.log('📁 [Prisma init] Directorio creado:', targetDir);
      }
      
      // Ruta de la plantilla (la base de datos pre-populada subida en Git)
      const templateDbPath = path.join(process.cwd(), 'prisma', 'dev.db');
      
      // Si el archivo en la ruta destino no existe pero la plantilla existe, lo inicializamos copiándolo
      if (!fs.existsSync(resolvedDbPath) && fs.existsSync(templateDbPath)) {
        console.log('🚨 [Prisma init] Base de datos destino no encontrada. Copiando plantilla de datos pre-populada...');
        fs.copyFileSync(templateDbPath, resolvedDbPath);
        console.log('✅ [Prisma init] Base de datos auto-inicializada con éxito en:', resolvedDbPath);
      }
    } catch (err) {
      console.error('❌ [Prisma init] Error al inicializar/copiar base de datos SQLite persistente:', err);
    }
  }
} else {
  // Fallback estándar de desarrollo local
  resolvedDbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  databaseUrl = `file:${resolvedDbPath}?connection_limit=1&socket_timeout=10000&busy_timeout=10000`;
}

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
if (!globalForPrisma.prisma && databaseUrl && databaseUrl.startsWith('file:')) {
  (async () => {
    try {
      // Activa Write-Ahead Logging (Lectores y Escritores no se bloquean mutuamente)
      await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
      // Optimiza la velocidad de sincronización de disco reduciendo escrituras innecesarias
      await prisma.$queryRawUnsafe('PRAGMA synchronous=NORMAL;');
      // Cache de memoria optimizado para lecturas rápidas
      await prisma.$queryRawUnsafe('PRAGMA cache_size=-64000;'); // ~64MB cache
      console.log('⚡ Base de datos SQLite optimizada con éxito en modo WAL y apuntando a:', resolvedDbPath);
    } catch (error) {
      console.error('❌ Error al configurar optimizaciones de SQLite:', error);
    }
  })();
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;


