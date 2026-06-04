import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { 
      itemId, 
      itemType, 
      newScope, 
      newScopeStatus, 
      reasonCode, 
      justification, 
      userEmail 
    } = await req.json();

    // Validar entradas requeridas
    if (!itemId || !itemType || !newScopeStatus || !reasonCode || !justification || !userEmail) {
      return NextResponse.json({ error: 'Faltan parámetros obligatorios para el cambio de alcance' }, { status: 400 });
    }

    if (!justification.trim() || justification.trim().length < 5) {
      return NextResponse.json({ error: 'Debe ingresar una justificación válida de al menos 5 caracteres' }, { status: 400 });
    }

    // Ejecutar en una transacción para garantizar consistencia de datos y auditoría
    const result = await prisma.$transaction(async (tx) => {
      let itemName = '';
      let previousScopeName = 'Ninguno';
      let newScopeName = 'Ninguno';

      // 1. Resolver el nombre de la nueva fase si aplica
      if (newScope) {
        const rp = await tx.releasePhase.findUnique({ where: { id: newScope } });
        if (rp) newScopeName = rp.name;
      } else {
        newScopeName = newScopeStatus === 'OUT_OF_SCOPE' ? 'Fuera de Alcance' : 'Sin Asignar';
      }

      if (itemType === 'EQUIPMENT') {
        // 2a. Buscar equipamiento
        const equip = await tx.clinicalEquipment.findUnique({
          where: { id: itemId },
          include: { releasePhase: true }
        });

        if (!equip) throw new Error('Equipo clínico no encontrado');
        itemName = equip.name;
        if (equip.releasePhase) previousScopeName = equip.releasePhase.name;
        else if (equip.scopeStatus === 'OUT_OF_SCOPE') previousScopeName = 'Fuera de Alcance';

        // 3a. Actualizar el equipamiento
        const updatedEquip = await tx.clinicalEquipment.update({
          where: { id: itemId },
          data: {
            scopeStatus: newScopeStatus,
            releasePhaseId: newScope || null
          }
        });

        // 4a. Cascada automática a los analitos que heredan del equipo (scopeStatus = 'INHERITED')
        const cascadeResult = await tx.analyte.updateMany({
          where: {
            equipmentId: itemId,
            scopeStatus: 'INHERITED'
          },
          data: {
            releasePhaseId: newScope || null
            // Mantienen scopeStatus = 'INHERITED' pero adoptan la nueva fase del padre
          }
        });

        console.log(`Cascade: se actualizaron ${cascadeResult.count} analitos vinculados al equipo ${equip.name}`);

        // 5a. Crear log de auditoría
        const auditLog = await tx.scopeAuditLog.create({
          data: {
            itemId,
            itemType: 'EQUIPMENT',
            itemName,
            previousScope: previousScopeName,
            newScope: `${newScopeName} (${newScopeStatus})`,
            reasonCode,
            justification: justification.trim(),
            userEmail: userEmail.trim()
          }
        });

        return { success: true, item: updatedEquip, cascadeCount: cascadeResult.count, auditLog };

      } else if (itemType === 'ANALYTE') {
        // 2b. Buscar analito
        const analyte = await tx.analyte.findUnique({
          where: { id: itemId },
          include: { releasePhase: true }
        });

        if (!analyte) throw new Error('Analito no encontrado');
        itemName = analyte.name;
        if (analyte.releasePhase) previousScopeName = analyte.releasePhase.name;
        else if (analyte.scopeStatus === 'OUT_OF_SCOPE') previousScopeName = 'Fuera de Alcance';

        // 3b. Actualizar el analito
        const updatedAnalyte = await tx.analyte.update({
          where: { id: itemId },
          data: {
            scopeStatus: newScopeStatus,
            releasePhaseId: newScope || null
          }
        });

        // 4b. Crear log de auditoría
        const auditLog = await tx.scopeAuditLog.create({
          data: {
            itemId,
            itemType: 'ANALYTE',
            itemName,
            previousScope: previousScopeName,
            newScope: `${newScopeName} (${newScopeStatus})`,
            reasonCode,
            justification: justification.trim(),
            userEmail: userEmail.trim()
          }
        });

        return { success: true, item: updatedAnalyte, auditLog };
      } else {
        throw new Error('Tipo de ítem no soportado');
      }
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error changing scope:', error);
    return NextResponse.json({ error: error.message || 'Error executing scope change' }, { status: 500 });
  }
}
