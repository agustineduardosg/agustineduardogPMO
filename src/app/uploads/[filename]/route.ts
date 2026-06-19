import { checkSession, unauthorizedResponse } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  csv: 'text/csv',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  txt: 'text/plain',
  zip: 'application/zip'
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  // Verify that the user is logged in
  const session = await checkSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const { filename } = await params;
    
    // Prevent directory traversal attacks by taking only the base name
    const safeFilename = join('/', filename).substring(1);
    const filePath = join(process.cwd(), 'public', 'uploads', safeFilename);

    const fileContent = await readFile(filePath);
    const fileExt = safeFilename.split('.').pop()?.toLowerCase() || '';
    const contentType = MIME_TYPES[fileExt] || 'application/octet-stream';

    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(safeFilename)}"`
      }
    });
  } catch (error: any) {
    console.error('Error serving upload file:', error);
    return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
  }
}
