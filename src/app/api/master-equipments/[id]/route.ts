import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();

    // 1. Obtener el registro original para conocer el nombre antes del cambio
    const originalMaster = await prisma.masterEquipment.findUnique({
      where: { id }
    });

    if (!originalMaster) {
      return NextResponse.json({ error: 'Master equipment not found' }, { status: 404 });
    }

    const originalName = originalMaster.name;

    // 2. Ejecutar transaccionalmente la actualización del maestro y cascada
    const result = await prisma.$transaction(async (tx) => {
      const updatedMaster = await tx.masterEquipment.update({
        where: { id },
        data: {
          name: data.name,
          section: data.section,
          category: data.category
        }
      });

      // Si el nombre ha cambiado, actualizar en cascada todos los equipos clínicos asociados
      if (data.name && data.name !== originalName) {
        await tx.clinicalEquipment.updateMany({
          where: { name: originalName },
          data: {
            name: data.name,
            ...(data.section ? { section: data.section } : {})
          }
        });
      } else if (data.section && data.section !== originalMaster.section) {
        // Si solo cambió la sección, también propagarla
        await tx.clinicalEquipment.updateMany({
          where: { name: originalName },
          data: {
            section: data.section
          }
        });
      }

      return updatedMaster;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error updating master equipment:', error);
    return NextResponse.json({ error: error.message || 'Error updating master equipment' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.masterEquipment.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Master equipment deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting master equipment:', error);
    return NextResponse.json({ error: error.message || 'Error deleting master equipment' }, { status: 500 });
  }
}
