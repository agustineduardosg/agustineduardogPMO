import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'prisma', 'dev.db');
const BACKUPS_DIR = path.join(process.cwd(), 'prisma', 'backups');

// Helper to count records in the database
async function getRecordCounts() {
  try {
    const [recintos, equipments, analytes] = await Promise.all([
      prisma.recinto.count(),
      prisma.clinicalEquipment.count(),
      prisma.analyte.count(),
    ]);
    return { recintos, equipments, analytes };
  } catch (e) {
    return { recintos: 0, equipments: 0, analytes: 0 };
  }
}

export async function GET() {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    const currentCounts = await getRecordCounts();
    const files = fs.readdirSync(BACKUPS_DIR);
    
    const backups = files
      .filter(f => f.startsWith('dev_backup_') && f.endsWith('.db'))
      .map(file => {
        const filePath = path.join(BACKUPS_DIR, file);
        const stats = fs.statSync(filePath);
        
        // Extract timestamp from name: dev_backup_YYYY-MM-DD_HH-mm-ss.db
        const match = file.match(/dev_backup_(.*)\.db/);
        const name = match ? match[1].replace(/_/g, ' ') : file;

        return {
          filename: file,
          name,
          sizeBytes: stats.size,
          createdAt: stats.birthtime,
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json({
      current: currentCounts,
      backups
    });
  } catch (error: any) {
    console.error('Error fetching database status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_PATH)) {
      throw new Error('Database file not found at ' + DB_PATH);
    }

    // Format filename timestamp: dev_backup_YYYY-MM-DD_HH-mm-ss.db
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const filename = `dev_backup_${timestamp}.db`;
    const destPath = path.join(BACKUPS_DIR, filename);

    // Copy database file
    fs.copyFileSync(DB_PATH, destPath);

    return NextResponse.json({ success: true, filename });
  } catch (error: any) {
    console.error('Error creating database backup:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// RESTORE database from a backup
export async function PUT(req: Request) {
  try {
    const { filename } = await req.json();
    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    const backupPath = path.join(BACKUPS_DIR, filename);
    if (!fs.existsSync(backupPath)) {
      return NextResponse.json({ error: 'Backup file not found' }, { status: 404 });
    }

    // Safely copy backup back to main database
    fs.copyFileSync(backupPath, DB_PATH);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error restoring database backup:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE a backup file
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');
    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    const backupPath = path.join(BACKUPS_DIR, filename);
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting backup file:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
