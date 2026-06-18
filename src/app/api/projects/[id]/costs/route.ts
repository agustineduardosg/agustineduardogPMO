import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const getNetClpValue = (originalVal: number, rate: number, tax: string) => {
  const val = originalVal || 0;
  const r = rate || 1.0;
  if (tax === 'BRUTO') {
    return (val / 1.19) * r;
  }
  return val * r;
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const costs = await prisma.costItem.findMany({
      where: { projectId },
      include: { attachments: true },
      orderBy: { indexId: 'asc' }
    });
    return NextResponse.json(costs);
  } catch (error: any) {
    console.error('Error fetching cost items:', error);
    return NextResponse.json({ error: error.message || 'Error fetching cost items' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await req.json();
    
    const taxType = body.taxType || 'NETO';
    const currency = body.currency || 'CLP';
    const exchangeRate = body.exchangeRate !== undefined ? Number(body.exchangeRate) : 1.0;

    let originalBudget = body.originalBudget !== undefined ? Number(body.originalBudget) : null;
    let approvedBudget = 0;

    if (originalBudget !== null) {
      approvedBudget = getNetClpValue(originalBudget, exchangeRate, taxType);
    } else {
      approvedBudget = body.approvedBudget !== undefined ? Number(body.approvedBudget) : 0;
      originalBudget = approvedBudget;
    }

    let originalRealCost = body.originalRealCost !== undefined ? Number(body.originalRealCost) : null;
    let realCost = 0;

    if (originalRealCost !== null) {
      realCost = getNetClpValue(originalRealCost, exchangeRate, taxType);
    } else {
      realCost = body.realCost !== undefined ? Number(body.realCost) : 0;
      originalRealCost = realCost;
    }

    const cost = await prisma.costItem.create({
      data: {
        indexId: body.indexId || 'C01',
        description: body.description || '',
        category: body.category || '',
        provider: body.provider || '',
        currency,
        originalBudget,
        exchangeRate,
        approvedBudget,
        taxType,
        ocEmitted: body.ocEmitted || '',
        ocNumber: body.ocNumber || '',
        originalRealCost,
        realCost,
        ocStatus: body.ocStatus || 'Pendiente',
        observations: body.observations || '',
        projectId
      },
      include: {
        attachments: true
      }
    });
    return NextResponse.json(cost);
  } catch (error: any) {
    console.error('Error creating cost item:', error);
    return NextResponse.json({ error: error.message || 'Error creating cost item' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json();
    const { id, ...data } = body;

    const existing = await prisma.costItem.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Item de costo no encontrado' }, { status: 404 });
    }
    
    const taxType = data.taxType !== undefined ? data.taxType : existing.taxType;
    const currency = data.currency !== undefined ? data.currency : existing.currency;
    const exchangeRate = data.exchangeRate !== undefined ? Number(data.exchangeRate) : existing.exchangeRate;

    let originalBudget = existing.originalBudget;
    let approvedBudget = existing.approvedBudget;
    if (data.originalBudget !== undefined) {
      originalBudget = Number(data.originalBudget);
    }
    approvedBudget = getNetClpValue(originalBudget, exchangeRate, taxType);

    let originalRealCost = existing.originalRealCost;
    let realCost = existing.realCost;
    if (data.originalRealCost !== undefined) {
      originalRealCost = Number(data.originalRealCost);
    }
    realCost = getNetClpValue(originalRealCost, exchangeRate, taxType);
    
    const updateData: any = {
      currency,
      exchangeRate,
      taxType,
      originalBudget,
      approvedBudget,
      originalRealCost,
      realCost
    };

    if (data.indexId !== undefined) updateData.indexId = data.indexId;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.provider !== undefined) updateData.provider = data.provider;
    if (data.ocEmitted !== undefined) updateData.ocEmitted = data.ocEmitted;
    if (data.ocNumber !== undefined) updateData.ocNumber = data.ocNumber;
    if (data.ocStatus !== undefined) updateData.ocStatus = data.ocStatus;
    if (data.observations !== undefined) updateData.observations = data.observations;

    const cost = await prisma.costItem.update({
      where: { id },
      data: updateData,
      include: {
        attachments: true
      }
    });
    return NextResponse.json(cost);
  } catch (error: any) {
    console.error('Error updating cost item:', error);
    return NextResponse.json({ error: error.message || 'Error updating cost item' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request
) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    
    await prisma.costItem.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting cost item:', error);
    return NextResponse.json({ error: error.message || 'Error deleting cost item' }, { status: 500 });
  }
}
