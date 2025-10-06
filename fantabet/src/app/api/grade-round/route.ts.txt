import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // accetta sia JSON che form
  let round_id = ''
  const ctype = req.headers.get('content-type') || ''
  if (ctype.includes('application/json')) {
    const body = await req.json()
    round_id = body.round_id
  } else {
    const form = await req.formData()
    round_id = String(form.get('round_id') || '')
  }

  if (!round_id) return NextResponse.json({ ok:false, error:'round_id mancante' }, { status:400 })

  const url = `${process.env.SUPABASE_URL}/functions/v1/grade_round`
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ round_id })
  })
  const data = await r.json()
  return NextResponse.json(data, { status: r.status })
}
