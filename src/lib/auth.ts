import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Correo', type: 'email', placeholder: 'usuario@bupa.cl' },
        password: { label: 'Contraseña', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email y contraseña requeridos');
        }

        // Buscar el usuario por email
        const user = await prisma.masterUser.findUnique({
          where: { email: credentials.email.toLowerCase().trim() }
        });

        if (!user) {
          throw new Error('Usuario no encontrado');
        }

        if (!user.passwordHash) {
          throw new Error('Usuario registrado pero sin contraseña establecida. Contacte al administrador.');
        }

        // Comparar contraseña cifrada
        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          throw new Error('Contraseña incorrecta');
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login'
  },
  session: {
    strategy: 'jwt',
    maxAge: 12 * 60 * 60 // 12 horas de duración de la sesión
  },
  secret: process.env.NEXTAUTH_SECRET || 'bupa-secret-key-2026-pm-org'
};
