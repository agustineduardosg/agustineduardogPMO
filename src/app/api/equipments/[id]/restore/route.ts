import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const restoredEquipment = await prisma.clinicalEquipment.update({
      where: { id },
      data: { deletedAt: null }
    });

    return NextResponse.json(restoredEquipment);
  } catch (error: any) {
    console.error('Error restoring equipment:', error);
    return NextResponse.json({ error: error.message || 'Error restoring equipment' }, { status: 500 });
  }
}
