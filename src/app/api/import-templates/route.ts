import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const headersHash = searchParams.get('headersHash');

    if (!headersHash) {
      return NextResponse.json({ error: 'Falta el parámetro headersHash' }, { status: 400 });
    }

    const template = await prisma.importTemplate.findUnique({
      where: { headersHash }
    });

    if (!template) {
      return NextResponse.json({ message: 'No se encontró ninguna plantilla guardada para este formato.' }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error: any) {
    console.error('Error fetching import template:', error);
    return NextResponse.json({ error: error.message || 'Error al obtener la plantilla' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, headersHash, mapping } = await req.json();

    if (!headersHash || !mapping) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const template = await prisma.importTemplate.upsert({
      where: { headersHash },
      update: {
        name: name || 'Plantilla autoguardada',
        mapping: typeof mapping === 'string' ? mapping : JSON.stringify(mapping)
      },
      create: {
        name: name || 'Plantilla autoguardada',
        headersHash,
        mapping: typeof mapping === 'string' ? mapping : JSON.stringify(mapping)
      }
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error: any) {
    console.error('Error saving import template:', error);
    return NextResponse.json({ error: error.message || 'Error al guardar la plantilla' }, { status: 500 });
  }
}
