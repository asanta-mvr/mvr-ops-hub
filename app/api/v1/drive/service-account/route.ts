import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDriveServiceAccountEmail } from '@/lib/integrations/google-drive'

export const dynamic = 'force-dynamic'

// GET — the Drive service-account email, so users know which account to share a
// folder with (as Editor) before uploading documents into it.
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ data: { email: getDriveServiceAccountEmail() } })
}
