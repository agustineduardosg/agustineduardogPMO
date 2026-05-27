import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();

    const updatedStakeholder = await prisma.stakeholder.update({
      where: { id },
      data: {
        indexId: data.indexId,
        name: data.name,
        role: data.role,
        orgSede: data.orgSede,
        area: data.area,
        contact: data.contact,
        influence: data.influence,
        impact: data.impact,
        notes: data.notes,
        projectId: data.projectId,
        customFields: data.customFields
      }
    });

    return NextResponse.json(updatedStakeholder);
  } catch (error: any) {
    console.error('Error updating stakeholder:', error);
    return NextResponse.json({ error: error.message || 'Error updating stakeholder' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.stakeholder.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Stakeholder deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting stakeholder:', error);
    return NextResponse.json({ error: error.message || 'Error deleting stakeholder' }, { status: 500 });
  }
}
