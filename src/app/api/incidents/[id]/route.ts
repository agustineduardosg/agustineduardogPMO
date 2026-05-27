import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();

    const updatedIncident = await prisma.incident.update({
      where: { id },
      data: {
        indexId: data.indexId,
        fecha: data.fecha,
        recintoName: data.recintoName,
        equipmentName: data.equipmentName,
        faseAfectada: data.faseAfectada,
        descripcion: data.descripcion,
        impacto: data.impacto,
        responsable: data.responsable,
        estado: data.estado,
        planDeAccion: data.planDeAccion,
        fechaCierre: data.fechaCierre,
        projectId: data.projectId !== undefined ? data.projectId : undefined,
        customFields: data.customFields
      }
    });

    return NextResponse.json(updatedIncident);
  } catch (error: any) {
    console.error('Error updating incident:', error);
    return NextResponse.json({ error: error.message || 'Error updating incident' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.incident.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Incident deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting incident:', error);
    return NextResponse.json({ error: error.message || 'Error deleting incident' }, { status: 500 });
  }
}
