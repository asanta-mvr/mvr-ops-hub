import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { isResource, type Level } from './resources'

// PrismaAdapter removed temporarily — NextAuth v5 beta has a known conflict
// between PrismaAdapter + JWT strategy + Google OAuth callback.
// Sessions are stored in signed JWT cookies. Re-enable adapter after upgrading
// to NextAuth stable when it releases.

export function validateApiKey(req: Request): boolean {
  const authHeader = req.headers.get('authorization') ?? ''
  const key = authHeader.replace(/^Bearer\s+/i, '').trim()
  return !!process.env.N8N_API_KEY && key === process.env.N8N_API_KEY
}

const ALLOWED_EMAIL_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN ?? 'miamivacationrentals.com').toLowerCase()

function isCompanyEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)
}

// CredentialsProvider is the local "Dev Login" bypass — only registered in
// non-production environments. In production, the only way in is Google OAuth
// against an existing User row or a pending UserInvitation (see signIn below).
const devCredentialsProvider =
  process.env.NODE_ENV !== 'production'
    ? [
        CredentialsProvider({
          name: 'Dev Login',
          credentials: {
            email: { label: 'Email', type: 'email' },
            password: { label: 'Password', type: 'password' },
          },
          async authorize(credentials) {
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
      ]
    : []

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  debug: process.env.NODE_ENV === 'development',
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    ...devCredentialsProvider,
  ],
  callbacks: {
    // Strict access control for Google sign-ins. CredentialsProvider (dev) is
    // exempt — it has its own hardcoded email/password check above.
    //   1. Email must be on the company domain.
    //   2. A User row OR a pending UserInvitation must exist for the email.
    //      Otherwise, redirect to /no-access with a reason so the user gets
    //      an explanation instead of a silent failure.
    async signIn({ user, account }) {
      if (account?.provider === 'credentials') return true
      if (!isCompanyEmail(user?.email ?? undefined)) {
        return `/login?error=domain&email=${encodeURIComponent(user?.email ?? '')}`
      }
      const email = user!.email!.toLowerCase()
      const [existingUser, pendingInvite] = await Promise.all([
        db.user.findUnique({ where: { email }, select: { id: true, isActive: true } }),
        db.userInvitation.findFirst({
          where: { email, acceptedAt: null, expiresAt: { gt: new Date() } },
          select: { id: true },
        }),
      ])
      if (!existingUser && !pendingInvite) {
        return `/no-access?reason=noinvite`
      }
      if (existingUser && !existingUser.isActive && !pendingInvite) {
        return `/no-access?reason=disabled`
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        // Look for a pending invitation for this email — if found, accept it
        // and seed UserPermission rows from the invitation payload.
        const now = new Date()
        const pendingInvite = await db.userInvitation.findFirst({
          where: {
            email: user.email!.toLowerCase(),
            acceptedAt: null,
            expiresAt: { gt: now },
          },
          orderBy: { createdAt: 'desc' },
        })

        // By the time we reach this callback, signIn has already validated that
        // either a User exists OR a pending invitation exists. So if we're
        // creating a new User row, it's because the invitation auto-accept path
        // is about to run below — isActive starts true.
        const dbUser = await db.user.upsert({
          where: { email: user.email! },
          update: {
            lastLoginAt: now,
            name: user.name ?? undefined,
            image: user.image ?? undefined,
          },
          create: {
            email: user.email!,
            name: user.name,
            image: user.image,
            role: 'read_only',
            isActive: true,
          },
        })

        if (pendingInvite) {
          // Snapshot the invitation payload into per-user permissions, then
          // mark the invitation accepted. Idempotent via @@unique([userId, resource]).
          const entries =
            (pendingInvite.permissions as Array<{ resource: string; level: Level }> | null) ?? []
          const valid = entries.filter(
            (e) => isResource(e.resource) && (e.level === 'view' || e.level === 'edit')
          )
          if (valid.length > 0) {
            await db.$transaction([
              ...valid.map((e) =>
                db.userPermission.upsert({
                  where: { userId_resource: { userId: dbUser.id, resource: e.resource } },
                  update: { level: e.level, createdBy: pendingInvite.invitedBy },
                  create: {
                    userId: dbUser.id,
                    resource: e.resource,
                    level: e.level,
                    createdBy: pendingInvite.invitedBy,
                  },
                })
              ),
              db.userInvitation.update({
                where: { id: pendingInvite.id },
                data: { acceptedAt: now, acceptedBy: dbUser.id },
              }),
              db.user.update({
                where: { id: dbUser.id },
                data: { isActive: true },
              }),
            ])
          } else {
            await db.userInvitation.update({
              where: { id: pendingInvite.id },
              data: { acceptedAt: now, acceptedBy: dbUser.id },
            })
          }
        }

        token.role = dbUser.role
        token.id = dbUser.id
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
