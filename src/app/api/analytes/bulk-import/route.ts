import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RawAnalyteRow {
  instrumentName: string;
  transmissionCode: string;
  testCode: string;
  name: string;
  description?: string;
  section: string;
  state: string;
  recintoId: string; // Resolvido en la interfaz interactiva de importación
}

export async function POST(req: Request) {
  try {
    const analytes: RawAnalyteRow[] = await req.json();
    
    if (!Array.isArray(analytes) || analytes.length === 0) {
      return NextResponse.json({ error: 'No se encontraron datos de analitos válidos' }, { status: 400 });
    }

    console.log(`🚀 [Bulk Import] Procesando ${analytes.length} filas de analitos...`);

    // 1. Identificar instrumentos únicos y sus sedes correspondientes (solo aquellos con recintoId válido)
    const uniqueInstrumentsMap = new Map<string, { instrumentName: string; recintoId: string; section: string }>();
    
    analytes.forEach(row => {
      if (row.recintoId && row.recintoId.trim() !== '') {
        const key = `${row.instrumentName.trim()}||${row.recintoId.trim()}`;
        if (!uniqueInstrumentsMap.has(key)) {
          uniqueInstrumentsMap.set(key, {
            instrumentName: row.instrumentName.trim(),
            recintoId: row.recintoId.trim(),
            section: row.section.trim() || 'General'
          });
        }
      }
    });

    const uniqueInstruments = Array.from(uniqueInstrumentsMap.values());
    console.log(`🔍 [Bulk Import] Se detectaron ${uniqueInstruments.length} instrumentos con sedes válidas en el archivo.`);

    // 2. Transacción para sincronizar analitos (sin crear ClinicalEquipment)
    const result = await prisma.$transaction(async (tx) => {
      let deletedAnalytesCount = 0;

      // 1. Limpiar los analitos antiguos de estos instrumentos específicos en estas sedes para evitar duplicados
      for (const inst of uniqueInstruments) {
        const delResult = await tx.analyte.deleteMany({
          where: {
            instrumentName: inst.instrumentName,
            recintoId: inst.recintoId
          }
        });
        deletedAnalytesCount += delResult.count;
      }
      
      // Limpiar también analitos antiguos sin recinto que coincidan con los nombres importados sin recinto para evitar duplicados
      const unassignedInstruments = Array.from(new Set(analytes.filter(r => !r.recintoId || r.recintoId.trim() === '').map(r => r.instrumentName.trim())));
      for (const instName of unassignedInstruments) {
        const delResult = await tx.analyte.deleteMany({
          where: {
            instrumentName: instName,
            OR: [
              { recintoId: null },
              { recintoId: '' }
            ]
          }
        });
        deletedAnalytesCount += delResult.count;
      }
      console.log(`🗑️ [Bulk Import] Se eliminaron ${deletedAnalytesCount} analitos antiguos para evitar colisiones.`);

      // 2. Crear los nuevos analitos asociados correctamente a sus sedes (equipmentId siempre null)
      const analytesToCreate = analytes.map(row => {
        const hasRecinto = row.recintoId && row.recintoId.trim() !== '';
        return {
          instrumentName: row.instrumentName.trim(),
          transmissionCode: row.transmissionCode.trim(),
          testCode: row.testCode.trim(),
          name: row.name.trim(),
          description: row.description?.trim() || '',
          section: row.section.trim() || 'General',
          state: row.state.trim() || 'No Iniciado',
          equipmentId: null,
          recintoId: hasRecinto ? row.recintoId.trim() : null
        };
      });

      // Insertar masivamente todos los nuevos analitos
      const createdResult = await tx.analyte.createMany({
        data: analytesToCreate
      });

      return {
        createdEquipments: 0,
        linkedEquipments: 0,
        importedAnalytes: createdResult.count
      };
    });

    return NextResponse.json({
      success: true,
      message: `Importación masiva completada con éxito.`,
      details: result
    });
  } catch (error: any) {
    console.error('Error in bulk import analytes:', error);
    return NextResponse.json({ error: error.message || 'Error en la importación masiva de analitos' }, { status: 500 });
  }
}
