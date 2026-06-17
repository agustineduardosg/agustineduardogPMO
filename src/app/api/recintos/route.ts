export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkSession, unauthorizedResponse } from '@/lib/apiAuth';


const initialRecintos = [
  { id: 'rec-1', name: 'BUPA CLA', code: 'ID: 4057', isActive: true },
  { id: 'rec-2', name: 'BUPA CLR', code: 'ID: 4528', isActive: true },
  { id: 'rec-3', name: 'BUPA Stat Las Condes', code: 'ID: 4553', isActive: true }
];

export async function GET() {
  try {
    const session = await checkSession();
    if (!session) return unauthorizedResponse();

    const recintos = await prisma.recinto.findMany({
      include: {
        equipments: {
          where: { deletedAt: null },
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(recintos);
  } catch (error: any) {
    console.error('Error fetching recintos:', error);
    return NextResponse.json({ error: error.message || 'Error fetching recintos' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await checkSession();
    if (!session) return unauthorizedResponse();

    const data = await req.json();
    const newRecinto = await prisma.recinto.create({
      data: {
        id: data.id,
        name: data.name,
        code: data.code,
        isActive: data.isActive !== undefined ? data.isActive : true
      },
      include: { equipments: true }
    });
    return NextResponse.json(newRecinto, { status: 201 });
  } catch (error: any) {
    console.error('Error creating recinto:', error);
    return NextResponse.json({ error: error.message || 'Error creating recinto' }, { status: 500 });
  }
}
