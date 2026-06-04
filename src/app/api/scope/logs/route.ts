import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('itemId');

    let logs;
    if (itemId) {
      logs = await prisma.scopeAuditLog.findMany({
        where: { itemId },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      logs = await prisma.scopeAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100 // Limitar a las últimas 100 por rendimiento
      });
    }

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error('Error fetching scope logs:', error);
    return NextResponse.json({ error: error.message || 'Error fetching scope audit logs' }, { status: 500 });
  }
}
