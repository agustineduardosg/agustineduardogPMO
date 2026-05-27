import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();

    const updatedEquipment = await prisma.clinicalEquipment.update({
      where: { id },
      data: {
        recintoId: data.recintoId,
        name: data.name,
        section: data.section,
        levantamiento: data.levantamiento,
        parametrizacion: data.parametrizacion,
        pruebas: data.pruebas,
        capacitacion: data.capacitacion,
        validacion: data.validacion,
        golive: data.golive,
        responsable: data.responsable,
        compromisoDate: data.compromisoDate,
        observaciones: data.observaciones,
        pendienteDe: data.pendienteDe,
        projectId: data.projectId,
        customFields: data.customFields
      }
    });

    return NextResponse.json(updatedEquipment);
  } catch (error: any) {
    console.error('Error updating equipment:', error);
    return NextResponse.json({ error: error.message || 'Error updating equipment' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.clinicalEquipment.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Equipment deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting equipment:', error);
    return NextResponse.json({ error: error.message || 'Error deleting equipment' }, { status: 500 });
  }
}
