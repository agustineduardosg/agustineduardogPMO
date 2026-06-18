import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const cacheKey = 'exchange_rates_today';

  try {
    // 1. Intentar obtener de la base de datos (SystemConfig)
    const cachedConfig = await prisma.systemConfig.findUnique({
      where: { key: cacheKey }
    });

    if (cachedConfig) {
      try {
        const parsed = JSON.parse(cachedConfig.value);
        // Si es de hoy, retornar directamente
        if (parsed.date === todayStr) {
          return NextResponse.json(parsed);
        }
      } catch (e) {
        console.warn('Error parsing cached exchange rates:', e);
      }
    }

    // 2. Si no hay caché o está desactualizado, consultar mindicador.cl
    try {
      const response = await fetch('https://mindicador.cl/api', {
        next: { revalidate: 3600 } // Caché en nivel de fetch de Next.js por 1 hora
      });

      if (!response.ok) {
        throw new Error(`Mindicador API returned status ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.dolar && data.uf) {
        const rates = {
          date: todayStr,
          usd: Number(data.dolar.valor),
          uf: Number(data.uf.valor),
          updatedAt: new Date().toISOString()
        };

        const ratesJson = JSON.stringify(rates);

        // Guardar/Actualizar en SystemConfig
        await prisma.systemConfig.upsert({
          where: { key: cacheKey },
          update: { value: ratesJson },
          create: { key: cacheKey, value: ratesJson }
        });

        return NextResponse.json(rates);
      } else {
        throw new Error('Invalid data structure returned from Mindicador');
      }
    } catch (fetchError: any) {
      console.error('Failed to fetch from mindicador.cl:', fetchError);

      // Si falló el fetch, retornar el último caché disponible (aunque sea viejo)
      if (cachedConfig) {
        try {
          const parsed = JSON.parse(cachedConfig.value);
          return NextResponse.json({
            ...parsed,
            isStale: true,
            fetchError: fetchError.message
          });
        } catch (e) {
          // Ignorar error de parseo y pasar a fallbacks
        }
      }

      // Si no hay nada en caché, usar fallbacks seguros de contingencia
      const fallbackRates = {
        date: todayStr,
        usd: 885.0,
        uf: 40787.7,
        isFallback: true,
        fetchError: fetchError.message
      };
      
      return NextResponse.json(fallbackRates);
    }
  } catch (error: any) {
    console.error('Unhandled error in exchange-rates GET:', error);
    return NextResponse.json({ error: error.message || 'Error general en tipo de cambio' }, { status: 500 });
  }
}
