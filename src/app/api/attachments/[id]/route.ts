import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Find attachment in DB
    const attachment = await prisma.attachment.findUnique({
      where: { id }
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Archivo adjunto no encontrado' }, { status: 404 });
    }

    // If it is stored locally under /uploads/, delete the physical file
    if (attachment.url.startsWith('/uploads/')) {
      const filePath = join(process.cwd(), 'public', attachment.url);
      try {
        await unlink(filePath);
      } catch (err) {
        console.warn('Physical file not found or could not be unlinked:', err);
      }
    }

    // Delete record from DB
    await prisma.attachment.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Adjunto eliminado con éxito' });
  } catch (error: any) {
    console.error('Error in attachments DELETE:', error);
    return NextResponse.json({ error: error.message || 'Error al eliminar el archivo' }, { status: 500 });
  }
}
