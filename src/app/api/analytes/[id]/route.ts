import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();
    
    const updatedAnalyte = await prisma.analyte.update({
      where: { id },
      data: {
        instrumentName: data.instrumentName,
        transmissionCode: data.transmissionCode,
        testCode: data.testCode,
        name: data.name,
        description: data.description,
        section: data.section,
        state: data.state,
        equipmentId: data.equipmentId,
        recintoId: data.recintoId,
        customFields: data.customFields
      },
      include: {
        recinto: true,
        equipment: true
      }
    });
    
    return NextResponse.json(updatedAnalyte);
  } catch (error: any) {
    console.error('Error updating analyte:', error);
    return NextResponse.json({ error: error.message || 'Error updating analyte' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.analyte.delete({
      where: { id }
    });
    
    return NextResponse.json({ message: 'Analyte deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting analyte:', error);
    return NextResponse.json({ error: error.message || 'Error deleting analyte' }, { status: 500 });
  }
}
