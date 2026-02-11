import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  session: { strategy: 'jwt' as const },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || 'clipper';
        token.picture = user.image || null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.image = (token.picture as string) || null;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      return !!auth;
    },
  },
  providers: [], // Providers added in auth.ts (not needed for middleware JWT check)
} satisfies NextAuthConfig;
