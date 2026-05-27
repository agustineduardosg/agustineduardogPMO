import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const equipments = await prisma.masterEquipment.findMany({
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(equipments);
  } catch (error: any) {
    console.error('Error fetching master equipments:', error);
    return NextResponse.json({ error: error.message || 'Error fetching master equipments' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const newEq = await prisma.masterEquipment.create({
      data: {
        name: data.name,
        section: data.section || 'General',
        category: data.category || 'Clínico'
      }
    });
    return NextResponse.json(newEq, { status: 201 });
  } catch (error: any) {
    console.error('Error creating master equipment:', error);
    return NextResponse.json({ error: error.message || 'Error creating master equipment' }, { status: 500 });
  }
}
