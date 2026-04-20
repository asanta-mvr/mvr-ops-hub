'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

function CrownLogo() {
  return (
    <svg width="40" height="34" viewBox="0 0 28 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14 2L18.5 10L24 4L22 20H6L4 4L9.5 10L14 2Z"
        fill="#1E2D40"
        stroke="#A2B4C0"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <rect x="5" y="20" width="18" height="2.5" rx="1" fill="#CEC4B6" />
    </svg>
  )
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string }
}) {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(searchParams.error ?? '')

  const callbackUrl = searchParams.callbackUrl ?? '/dashboard'

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn('credentials', { email, password, redirect: false })
    if (result?.error) {
      setError('Invalid credentials')
      setLoading(false)
    } else {
      router.push(callbackUrl)
    }
  }

  async function handleGoogle() {
    setLoading(true)
    await signIn('google', { callbackUrl })
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-white rounded-2xl shadow-panel p-8 flex flex-col gap-5">
        {/* Brand */}
        <div className="text-center flex flex-col items-center gap-3">
          <CrownLogo />
          <div>
            <h1 className="font-display text-2xl font-bold text-mvr-primary tracking-tight">
              Miami Vacation Rentals
            </h1>
            <p className="text-xs text-mvr-sand font-medium uppercase tracking-[0.15em] mt-0.5">
              Operations Hub
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-mvr-danger-light text-mvr-danger text-sm rounded-lg px-4 py-3">
            {error === 'Invalid credentials' ? 'Invalid credentials' : `Auth error: ${error}`}
          </div>
        )}

        {/* Credentials form */}
        <form onSubmit={handleCredentials} className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dev@miamivacationrentals.com"
              required
              className="w-full border border-[#E0DBD4] rounded-lg px-3 py-2 text-sm bg-mvr-cream/40 focus:outline-none focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full border border-[#E0DBD4] rounded-lg px-3 py-2 text-sm bg-mvr-cream/40 focus:outline-none focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary transition-colors"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-mvr-primary hover:bg-mvr-primary/90 mt-1 font-medium tracking-wide"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E0DBD4]" />
          </div>
          <div className="relative flex justify-center text-xs text-muted-foreground">
            <span className="bg-white px-2">or</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={handleGoogle}
          className="w-full border-[#E0DBD4] hover:bg-mvr-cream"
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Access restricted to authorized MVR team members.
        </p>
      </div>
    </div>
  )
}
