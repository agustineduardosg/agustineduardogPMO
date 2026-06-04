import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const parentProjects = await prisma.parentProject.findMany({
      include: {
        projects: {
          include: {
            phases: {
              include: {
                tasks: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(parentProjects);
  } catch (error: any) {
    console.error('Error fetching parent projects:', error);
    return NextResponse.json({ error: error.message || 'Error fetching parent projects' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const newParent = await prisma.parentProject.create({
      data: {
        name: data.name,
        description: data.description
      },
      include: {
        projects: true
      }
    });
    return NextResponse.json(newParent, { status: 201 });
  } catch (error: any) {
    console.error('Error creating parent project:', error);
    return NextResponse.json({ error: error.message || 'Error creating parent project' }, { status: 500 });
  }
}
