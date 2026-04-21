import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'

// PrismaAdapter removed temporarily — NextAuth v5 beta has a known conflict
// between PrismaAdapter + JWT strategy + Google OAuth callback.
// Sessions are stored in signed JWT cookies. Re-enable adapter after upgrading
// to NextAuth stable when it releases.

export function validateApiKey(req: Request): boolean {
  const authHeader = req.headers.get('authorization') ?? ''
  const key = authHeader.replace(/^Bearer\s+/i, '').trim()
  return !!process.env.N8N_API_KEY && key === process.env.N8N_API_KEY
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  debug: process.env.NODE_ENV === 'development',
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Dev Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Dev-only bypass — never reaches production (Google OAuth is used there)
        const devEmail = process.env.DEV_LOGIN_EMAIL ?? 'dev@miamivacationrentals.com'
        const devPassword = process.env.DEV_LOGIN_PASSWORD ?? 'mvr-dev-2026'

        if (
          credentials?.email === devEmail &&
          credentials?.password === devPassword
        ) {
          await db.user.upsert({
            where: { id: 'dev-user-001' },
            update: { lastLoginAt: new Date() },
            create: {
              id: 'dev-user-001',
              name: 'Andrés Santa',
              email: devEmail,
              role: 'super_admin',
            },
          })
          return {
            id: 'dev-user-001',
            name: 'Andrés Santa',
            email: devEmail,
            role: 'super_admin',
          }
        }
        return null
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? 'read_only'
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role as string
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
