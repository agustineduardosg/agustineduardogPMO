import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');

    if (!secret || secret !== process.env.NEXTAUTH_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Iniciando extracción de datos para dump seguro...');

    // Leer todas las tablas
    const masterUsers = await prisma.masterUser.findMany();
    const parentProjects = await prisma.parentProject.findMany();
    const systemConfigs = await prisma.systemConfig.findMany();
    const importTemplates = await prisma.importTemplate.findMany();
    const scopeAuditLogs = await prisma.scopeAuditLog.findMany();
    const releasePhases = await prisma.releasePhase.findMany();
    const masterEquipments = await prisma.masterEquipment.findMany();
    const recintos = await prisma.recinto.findMany();
    const projects = await prisma.project.findMany();
    const phases = await prisma.phase.findMany();
    const tasks = await prisma.task.findMany();
    const incidents = await prisma.incident.findMany();
    const trainings = await prisma.training.findMany();
    const stakeholders = await prisma.stakeholder.findMany();
    const risks = await prisma.risk.findMany();
    const costItems = await prisma.costItem.findMany();
    const clinicalEquipments = await prisma.clinicalEquipment.findMany();
    const analytes = await prisma.analyte.findMany();
    const attachments = await prisma.attachment.findMany();

    const dumpData = {
      masterUsers,
      parentProjects,
      systemConfigs,
      importTemplates,
      scopeAuditLogs,
      releasePhases,
      masterEquipments,
      recintos,
      projects,
      phases,
      tasks,
      incidents,
      trainings,
      stakeholders,
      risks,
      costItems,
      clinicalEquipments,
      analytes,
      attachments
    };

    return new NextResponse(JSON.stringify(dumpData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="data_dump.json"',
      },
    });
  } catch (error: any) {
    console.error('❌ Error en endpoint seguro de dump:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
