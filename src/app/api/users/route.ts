import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Datos iniciales de colaboradores
const initialUsers = [
  { id: 'usr-1', name: 'Agustín Eduardo', email: 'agustin@bupa.cl', role: 'Project Manager', maxTasksLimit: 5 },
  { id: 'usr-2', name: 'Carolina Siemens', email: 'carolina.s@bupa.cl', role: 'Ingeniero Biomédico', maxTasksLimit: 5 },
  { id: 'usr-3', name: 'Felipe Valenzuela', email: 'felipe.v@bupa.cl', role: 'Técnico de TI', maxTasksLimit: 8 },
  { id: 'usr-4', name: 'Dra. Elena Rostova', email: 'elena.r@bupa.cl', role: 'Físico Médico', maxTasksLimit: 4 }
];

export async function GET() {
  try {
    const count = await prisma.masterUser.count();
    if (count === 0) {
      // Auto-sembrado inicial
      await prisma.masterUser.createMany({
        data: initialUsers
      });
    }

    const users = await prisma.masterUser.findMany({
      orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json(users);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: error.message || 'Error fetching users' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const newUser = await prisma.masterUser.create({
      data: {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        maxTasksLimit: data.maxTasksLimit
      }
    });
    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message || 'Error creating user' }, { status: 500 });
  }
}
