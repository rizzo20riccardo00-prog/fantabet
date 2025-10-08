import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type Choice = { market: string; value: string }
type Choices = Record<string, Choice>
type SelectionRow = {
  ticket_id: string
  match_id: string
  market: string
  value: string
  points_value: number
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } // Next 15: params è Promise
) {
  try {
    const { id: round_id } = await context.params

    const auth = req.headers.get('authorization') || ''
    const [, token] = auth.split(' ')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sb = createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } })
    const { choices } = (await req.json()) as { choices: Choices }

    const { data: userRes, error: uErr } = await sb.auth.getUser()
    if (uErr || !userRes?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user_id = userRes.user.id

    // trova/crea ticket
    const res = await sb
      .from('tickets')
      .select('id')
      .eq('round_id', round_id)
      .eq('user_id', user_id)
      .maybeSingle()
    if (res.error) return NextResponse.json({ error: res.error.message }, { status: 400 })

    let ticketId = res.data?.id as string | undefined
    if (!ticketId) {
      const ins = await sb.from('tickets').insert({ round_id, user_id }).select('id').single()
      if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 400 })
      ticketId = ins.data.id
    }

    // opzionale: pulisci selezioni precedenti
    await sb.from('selections').delete().eq('ticket_id', ticketId)

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

    const rows: SelectionRow[] = Object.entries(choices).map(([match_id, { market, value }]) => ({
      ticket_id: ticketId!,
      match_id,
      market,
      value,
      points_value: PTS[market] ?? 0,
    }))

    const insSel = await sb.from('selections').insert(rows)
    if (insSel.error) return NextResponse.json({ error: insSel.error.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
  }
}
