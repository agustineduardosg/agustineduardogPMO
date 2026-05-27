import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    console.log("=== INICIANDO SINCRONIZACIÓN DE EQUIPAMIENTO MÉDICO DESDE INVENTARIO ===");
    
    // 1. Obtener todos los equipos clínicos del inventario
    const clinicalEquipments = await prisma.clinicalEquipment.findMany({
      select: {
        name: true,
        section: true
      }
    });

    // 2. Extraer combinaciones únicas de name y section
    const uniqueMap = new Map<string, string>();
    clinicalEquipments.forEach(eq => {
      const name = eq.name?.trim();
      const section = eq.section ? eq.section.trim() : "General";
      
      if (name && !uniqueMap.has(name)) {
        uniqueMap.set(name, section);
      }
    });

    // 3. Upsert en MasterEquipment
    let count = 0;
    for (const [name, section] of uniqueMap.entries()) {
      await prisma.masterEquipment.upsert({
        where: { name },
        update: { section }, // Actualizar sección si cambió
        create: {
          name,
          section,
          category: 'Clínico'
        }
      });
      count++;
    }

    // 4. Retornar la lista maestra actualizada
    const updatedMasterList = await prisma.masterEquipment.findMany({
      orderBy: { name: 'asc' }
    });

    console.log(`=== SINCRONIZACIÓN COMPLETADA: ${count} modelos cargados ===`);
    return NextResponse.json({ 
      success: true, 
      count,
      message: `Se sincronizaron ${count} equipos desde el inventario.`,
      masterEquipments: updatedMasterList
    });
  } catch (error: any) {
    console.error('Error synchronizing master equipments:', error);
    return NextResponse.json({ error: error.message || 'Error synchronizing master equipments' }, { status: 500 });
  }
}
