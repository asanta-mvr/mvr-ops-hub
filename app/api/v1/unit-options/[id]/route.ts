import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!(await canEdit(session, "data_master.units"))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.unitFieldOption.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/v1/unit-options/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
