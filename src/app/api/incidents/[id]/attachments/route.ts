import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: incidentId } = await params;
    
    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save the file to public/uploads
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    // Ensure dir exists
    await mkdir(uploadDir, { recursive: true });

    // Generate unique name to avoid collision
    const fileExt = file.name.split('.').pop() || 'dat';
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${cleanFileName}`;
    const filePath = join(uploadDir, fileName);
    
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${fileName}`;

    // Register Attachment row in SQLite/Postgres
    const attachment = await prisma.attachment.create({
      data: {
        name: file.name,
        type: fileExt.toLowerCase(),
        url: fileUrl,
        incidentId: incidentId
      }
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error: any) {
    console.error('Error in incident attachments POST:', error);
    return NextResponse.json({ error: error.message || 'Error al subir el archivo' }, { status: 500 });
  }
}
