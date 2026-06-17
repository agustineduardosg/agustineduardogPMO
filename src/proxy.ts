import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

const proxyHandler = withAuth(
  function proxy(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // 1. RBAC: Proteger la vista de Maestros
    if (pathname.startsWith('/masters')) {
      const userRole = token?.role as string;
      if (userRole !== 'ADMIN' && userRole !== 'PMO' && userRole !== 'Project Manager') {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
    }

    // 2. RBAC: Proteger las APIs críticas de respaldo y restauración de base de datos
    if (pathname.startsWith('/api/admin/database')) {
      const userRole = token?.role as string;
      if (userRole !== 'ADMIN' && userRole !== 'PMO' && userRole !== 'Project Manager') {
        return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
    pages: {
      signIn: '/login'
    }
  }
);

// Exportar tanto por defecto como de forma nombrada para máxima compatibilidad con Next.js 16 y NextAuth
export default proxyHandler;
export { proxyHandler as proxy };

export const config = {
  matcher: [
    // Proteger todas las páginas del sistema excepto:
    // - Login y error de autorización (/login, /unauthorized)
    // - Rutas del handler de NextAuth (/api/auth)
    // - Archivos estáticos de Next.js (_next/static, _next/image)
    // - Favicon
    '/((?!api/auth|_next/static|_next/image|favicon.ico|login|unauthorized).*)'
  ]
};
