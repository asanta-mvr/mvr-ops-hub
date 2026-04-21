import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { lookupReservation } from '@/lib/integrations/bigquery'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const confirmationCode = req.nextUrl.searchParams.get('confirmationCode')
    if (!confirmationCode) {
      return NextResponse.json({ error: 'confirmationCode is required' }, { status: 400 })
    }

    const reservation = await lookupReservation(confirmationCode.trim())
    return NextResponse.json({ data: reservation })
  } catch (error) {
    console.error('[GET /api/v1/reservations/lookup]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
