import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: round_id } = await context.params  // ⬅️ Await della Promise

    const auth = req.headers.get('authorization') || ''
    const [, token] = auth.split(' ')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sb = createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } })
    const { choices } = (await req.json()) as { choices: Record<string, { market: string; value: string }> }

    const { data: userRes, error: uErr } = await sb.auth.getUser()
    if (uErr || !userRes?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user_id = userRes.user.id

    // ticket (crea se non esiste)
    let { data: t, error: tErr } = await sb
      .from('tickets')
      .select('id')
      .eq('round_id', round_id)
      .eq('user_id', user_id)
      .maybeSingle()
    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 400 })
    if (!t) {
      const { data: ins, error: insErr } = await sb.from('tickets').insert({ round_id, user_id }).select('id').single()
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 })
      t = ins
    }

    // opzionale: pulizia precedenti selezioni
    await sb.from('selections').delete().eq('ticket_id', t.id)

    const PTS: Record<string, number> = {
      '1X2': 3,
      'O1_5_HT': 2.5,
      'UO2_5': 2,
      'GGNG': 2,
      'DC_O1_5': 1.5,
      'DC_U3_5': 1.5,
      'DC': 1,
      'O1_5': 1,
      'U3_5': 1,
    }

    const rows = Object.entries(choices).map(([match_id, { market, value }]) => ({
      ticket_id: t!.id,
      match_id,
      market,
      value,
      points_value: PTS[market] ?? 0,
    }))

    const { error: insSelErr } = await sb.from('selections').insert(rows)
    if (insSelErr) return NextResponse.json({ error: insSelErr.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 400 })
  }
}
