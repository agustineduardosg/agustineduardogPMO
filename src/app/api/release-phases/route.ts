import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const phases = await prisma.releasePhase.findMany({
      orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json(phases);
  } catch (error: any) {
    console.error('Error fetching release phases:', error);
    return NextResponse.json({ error: error.message || 'Error fetching release phases' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, description } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'El nombre de la fase es obligatorio' }, { status: 400 });
    }

    const nameTrimmed = name.trim();

    // Evitar nombres duplicados
    const existing = await prisma.releasePhase.findUnique({
      where: { name: nameTrimmed }
    });

    if (existing) {
      return NextResponse.json({ error: `La fase "${nameTrimmed}" ya existe` }, { status: 400 });
    }

    const newPhase = await prisma.releasePhase.create({
      data: {
        name: nameTrimmed,
        description: description?.trim() || null,
        isActive: true
      }
    });

    return NextResponse.json(newPhase, { status: 201 });
  } catch (error: any) {
    console.error('Error creating release phase:', error);
    return NextResponse.json({ error: error.message || 'Error creating release phase' }, { status: 500 });
  }
}
