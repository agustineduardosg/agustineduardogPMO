import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const costs = await prisma.costItem.findMany({
      where: { projectId },
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
    
    const cost = await prisma.costItem.create({
      data: {
        indexId: body.indexId || 'C01',
        description: body.description || '',
        category: body.category || '',
        provider: body.provider || '',
        approvedBudget: body.approvedBudget ? Number(body.approvedBudget) : 0,
        ocEmitted: body.ocEmitted || '',
        ocNumber: body.ocNumber || '',
        realCost: body.realCost ? Number(body.realCost) : 0,
        ocStatus: body.ocStatus || 'Pendiente',
        observations: body.observations || '',
        projectId
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
    
    const updateData: any = {};
    if (data.indexId !== undefined) updateData.indexId = data.indexId;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.provider !== undefined) updateData.provider = data.provider;
    if (data.approvedBudget !== undefined) updateData.approvedBudget = Number(data.approvedBudget) || 0;
    if (data.ocEmitted !== undefined) updateData.ocEmitted = data.ocEmitted;
    if (data.ocNumber !== undefined) updateData.ocNumber = data.ocNumber;
    if (data.realCost !== undefined) updateData.realCost = Number(data.realCost) || 0;
    if (data.ocStatus !== undefined) updateData.ocStatus = data.ocStatus;
    if (data.observations !== undefined) updateData.observations = data.observations;

    const cost = await prisma.costItem.update({
      where: { id },
      data: updateData
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
