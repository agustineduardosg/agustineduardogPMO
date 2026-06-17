import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { checkSession, unauthorizedResponse } from '@/lib/apiAuth';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await checkSession();
    if (!session) return unauthorizedResponse();
    const { id } = await params;
    const data = await req.json();

    const updatePayload: any = {
      name: data.name,
      email: data.email?.toLowerCase().trim(),
      role: data.role,
      maxTasksLimit: Number(data.maxTasksLimit)
    };

    if (data.password && data.password.trim() !== '') {
      updatePayload.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const updatedUser = await prisma.masterUser.update({
      where: { id },
      data: updatePayload
    });

    const { passwordHash: _, ...safeUser } = updatedUser as any;
    return NextResponse.json(safeUser);
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: error.message || 'Error updating user' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await checkSession();
    if (!session) return unauthorizedResponse();
    const { id } = await params;

    await prisma.masterUser.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: error.message || 'Error deleting user' }, { status: 500 });
  }
}
