import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth';
import { NextResponse } from 'next/server';

/**
 * Obtiene la sesión actual del usuario desde NextAuth.
 * @returns La sesión si está autenticado, o null si no lo está.
 */
export async function checkSession() {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    console.error('Error al verificar sesión en API:', error);
    return null;
  }
}

/**
 * Retorna una respuesta JSON estandarizada indicando que el cliente no está autorizado.
 */
export function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'No autorizado. Debe iniciar sesión.' },
    { status: 401 }
  );
}
