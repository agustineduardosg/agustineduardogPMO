import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const analytes = await prisma.analyte.findMany({
      include: {
        recinto: {
          select: { id: true, name: true, code: true }
        },
        equipment: {
          select: { id: true, name: true, section: true }
        }
      },
      orderBy: [
        { recintoId: 'asc' },
        { instrumentName: 'asc' },
        { name: 'asc' }
      ]
    });
    return NextResponse.json(analytes);
  } catch (error: any) {
    console.error('Error fetching analytes:', error);
    return NextResponse.json({ error: error.message || 'Error fetching analytes' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const newAnalyte = await prisma.analyte.create({
      data: {
        instrumentName: data.instrumentName,
        transmissionCode: data.transmissionCode,
        testCode: data.testCode,
        name: data.name,
        description: data.description || '',
        section: data.section,
        state: data.state || 'No Iniciado',
        equipmentId: data.equipmentId || null,
        recintoId: data.recintoId || null
      },
      include: {
        recinto: true,
        equipment: true
      }
    });
    return NextResponse.json(newAnalyte, { status: 201 });
  } catch (error: any) {
    console.error('Error creating analyte:', error);
    return NextResponse.json({ error: error.message || 'Error creating analyte' }, { status: 500 });
  }
}
