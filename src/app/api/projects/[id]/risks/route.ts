import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export function getRiskLevel(probability: number, impact: number): 'Bajo' | 'Medio' | 'Alto' | 'Crítico' {
  if (impact === 1) return 'Bajo';
  if (impact === 2) {
    if (probability <= 3) return 'Bajo';
    return 'Medio';
  }
  if (impact === 3) {
    if (probability === 1) return 'Bajo';
    if (probability <= 4) return 'Medio';
    return 'Alto';
  }
  if (impact === 4) {
    if (probability === 1) return 'Medio';
    if (probability === 2) return 'Alto';
    return 'Crítico';
  }
  if (impact === 5) {
    if (probability === 1) return 'Alto';
    return 'Crítico';
  }
  return 'Bajo';
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const risks = await prisma.risk.findMany({
      where: { projectId },
      orderBy: { indexId: 'asc' }
    });
    return NextResponse.json(risks);
  } catch (error: any) {
    console.error('Error fetching risks:', error);
    return NextResponse.json({ error: error.message || 'Error fetching risks' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await req.json();
    
    // Calcular el score y el nivel antes de guardar
    const probability = Number(body.probability) || 1;
    const impact = Number(body.impact) || 1;
    const score = probability * impact;
    const level = getRiskLevel(probability, impact);

    const risk = await prisma.risk.create({
      data: {
        indexId: body.indexId || 'R01',
        description: body.description || '',
        category: body.category || '',
        probability,
        impact,
        score,
        level,
        mitigationPlan: body.mitigationPlan || '',
        responsible: body.responsible || '',
        limitDate: body.limitDate ? new Date(body.limitDate) : null,
        status: body.status || 'Activo',
        associatedActivity: body.associatedActivity || '',
        mitigationCost: body.mitigationCost ? Number(body.mitigationCost) : 0,
        observations: body.observations || '',
        projectId
      }
    });
    return NextResponse.json(risk);
  } catch (error: any) {
    console.error('Error creating risk:', error);
    return NextResponse.json({ error: error.message || 'Error creating risk' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    
    // Si probability o impact no están definidos, leemos el riesgo existente de la base de datos
    let probability = data.probability;
    let impact = data.impact;
    
    if (probability === undefined || impact === undefined) {
      const existingRisk = await prisma.risk.findUnique({ where: { id } });
      if (existingRisk) {
        if (probability === undefined) probability = existingRisk.probability;
        if (impact === undefined) impact = existingRisk.impact;
      }
    }
    
    const probNum = Number(probability) || 1;
    const impNum = Number(impact) || 1;
    const score = probNum * impNum;
    const level = getRiskLevel(probNum, impNum);

    const updateData: any = {};
    if (data.indexId !== undefined) updateData.indexId = data.indexId;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    updateData.probability = probNum;
    updateData.impact = impNum;
    updateData.score = score;
    updateData.level = level;
    if (data.mitigationPlan !== undefined) updateData.mitigationPlan = data.mitigationPlan;
    if (data.responsible !== undefined) updateData.responsible = data.responsible;
    if (data.limitDate !== undefined) updateData.limitDate = data.limitDate ? new Date(data.limitDate) : null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.associatedActivity !== undefined) updateData.associatedActivity = data.associatedActivity;
    if (data.mitigationCost !== undefined) updateData.mitigationCost = Number(data.mitigationCost) || 0;
    if (data.observations !== undefined) updateData.observations = data.observations;

    const risk = await prisma.risk.update({
      where: { id },
      data: updateData
    });
    return NextResponse.json(risk);
  } catch (error: any) {
    console.error('Error updating risk:', error);
    return NextResponse.json({ error: error.message || 'Error updating risk' }, { status: 500 });
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
    
    await prisma.risk.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting risk:', error);
    return NextResponse.json({ error: error.message || 'Error deleting risk' }, { status: 500 });
  }
}
