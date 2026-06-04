import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (key) {
      const config = await prisma.systemConfig.findUnique({
        where: { key }
      });
      return NextResponse.json(config ? JSON.parse(config.value) : null);
    }

    const configs = await prisma.systemConfig.findMany();
    const configMap: Record<string, any> = {};
    configs.forEach(c => {
      try {
        configMap[c.key] = JSON.parse(c.value);
      } catch (e) {
        configMap[c.key] = c.value;
      }
    });

    return NextResponse.json(configMap);
  } catch (error: any) {
    console.error('Error fetching system config:', error);
    return NextResponse.json({ error: error.message || 'Error fetching system config' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { key, value } = await req.json();

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);

    const config = await prisma.systemConfig.upsert({
      where: { key },
      update: { value: serializedValue },
      create: { key, value: serializedValue }
    });

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error('Error updating system config:', error);
    return NextResponse.json({ error: error.message || 'Error updating system config' }, { status: 500 });
  }
}
