import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rawUrl = process.env.DATABASE_URL || 'not set';
    // Mask password in connection string for security
    const maskedUrl = rawUrl.replace(/:([^:@]+)@/, ':****@');

    const incidentCount = await prisma.incident.count();
    const equipmentCount = await prisma.clinicalEquipment.count();
    const analyteCount = await prisma.analyte.count();
    const recintoCount = await prisma.recinto.count();
    const userCount = await prisma.masterUser.count();
    const projectCount = await prisma.project.count();

    const incidents = await prisma.incident.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      databaseUrl: maskedUrl,
      isSqlite: rawUrl.startsWith('file:') || rawUrl === 'not set',
      counts: {
        incidents: incidentCount,
        equipments: equipmentCount,
        analytes: analyteCount,
        recintos: recintoCount,
        users: userCount,
        projects: projectCount
      },
      incidents: incidents.map(inc => ({
        id: inc.id,
        indexId: inc.indexId,
        fecha: inc.fecha,
        recintoName: inc.recintoName,
        equipmentName: inc.equipmentName,
        descripcion: inc.descripcion,
        createdAt: inc.createdAt
      }))
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Unknown error',
      stack: error.stack
    }, { status: 500 });
  }
}
