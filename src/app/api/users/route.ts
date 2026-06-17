import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { checkSession, unauthorizedResponse } from '@/lib/apiAuth';

// Datos iniciales de colaboradores con contraseñas encriptadas
const getInitialUsers = () => [
  {
    id: 'usr-admin',
    name: 'Agustín Eduardo',
    email: 'agustin@bupa.cl',
    passwordHash: bcrypt.hashSync('admin123', 10),
    role: 'ADMIN',
    maxTasksLimit: 5
  },
  {
    id: 'usr-pm',
    name: 'PM Bupa',
    email: 'pm@bupa.cl',
    passwordHash: bcrypt.hashSync('pm123', 10),
    role: 'Project Manager',
    maxTasksLimit: 5
  },
  {
    id: 'usr-viewer',
    name: 'Visualizador Bupa',
    email: 'viewer@bupa.cl',
    passwordHash: bcrypt.hashSync('viewer123', 10),
    role: 'VIEWER',
    maxTasksLimit: 5
  }
];

export async function GET() {
  try {
    const session = await checkSession();
    if (!session) return unauthorizedResponse();

    const users = await prisma.masterUser.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    // Omitir passwordHash por seguridad
    const safeUsers = users.map(({ passwordHash, ...user }) => user);
    return NextResponse.json(safeUsers);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: error.message || 'Error fetching users' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await checkSession();
    if (!session) return unauthorizedResponse();

    const data = await req.json();
    
    // Evitar emails duplicados
    const existing = await prisma.masterUser.findUnique({
      where: { email: data.email.toLowerCase().trim() }
    });
    if (existing) {
      return NextResponse.json({ error: 'El email ingresado ya está registrado por otro colaborador.' }, { status: 400 });
    }

    const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : null;
    const newUser = await prisma.masterUser.create({
      data: {
        id: data.id,
        name: data.name,
        email: data.email.toLowerCase().trim(),
        passwordHash,
        role: data.role,
        maxTasksLimit: Number(data.maxTasksLimit)
      }
    });

    const { passwordHash: _, ...safeUser } = newUser as any;
    return NextResponse.json(safeUser, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message || 'Error creating user' }, { status: 500 });
  }
}
