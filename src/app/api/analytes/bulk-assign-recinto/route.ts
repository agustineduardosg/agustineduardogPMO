import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { instrumentName, recintoId, sourceRecintoId } = await req.json();

    if (!instrumentName || !recintoId) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos: instrumentName y recintoId' }, { status: 400 });
    }

    console.log(`[Bulk Assign] Asignando sede "${recintoId}" al instrumento "${instrumentName}" en cascada (origen: ${sourceRecintoId || 'nuevo'})...`);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Actualizar todos los analitos de este instrumento al recinto correspondiente (equipmentId siempre null)
      const whereClause: any = { instrumentName };
      if (sourceRecintoId) {
        whereClause.recintoId = sourceRecintoId;
      } else {
        whereClause.OR = [
          { recintoId: null },
          { recintoId: '' }
        ];
      }

      const updateResult = await tx.analyte.updateMany({
        where: whereClause,
        data: {
          recintoId,
          equipmentId: null
        }
      });

      return {
        updatedAnalytesCount: updateResult.count,
        equipmentId: null,
        createdNewEquipment: false
      };
    });

    return NextResponse.json({
      success: true,
      message: `Se asignaron ${result.updatedAnalytesCount} analitos de "${instrumentName}" al recinto exitosamente.`,
      details: result
    });
  } catch (error: any) {
    console.error('Error in bulk assign recinto to analytes:', error);
    return NextResponse.json({ error: error.message || 'Error en la asignación masiva de recinto' }, { status: 500 });
  }
}
