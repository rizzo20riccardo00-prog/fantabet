import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const [, token] = auth.split(' ')
  if (!token) return NextResponse.redirect(new URL('/login', req.url))

  const form = await req.formData()
  const round_id = String(form.get('round_id') || '')

  const sb = createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: u } = await sb.auth.getUser()
  if (!u?.user) return NextResponse.redirect(new URL('/login', req.url))

  const { data: prof } = await sb.from('profiles').select('role').eq('id', u.user.id).maybeSingle()
  if ((prof?.role ?? 'user') !== 'admin') {
    return NextResponse.json({ error: 'Forbidden (admin only)' }, { status: 403 })
  }

  const { data: matches } = await sb.from('matches').select('id').eq('round_id', round_id)
  for (const m of matches ?? []) {
    const ht_home = Number(form.get(`ht_home_${m.id}`) || 0)
    const ht_away = Number(form.get(`ht_away_${m.id}`) || 0)
    const ft_home = Number(form.get(`ft_home_${m.id}`) || 0)
    const ft_away = Number(form.get(`ft_away_${m.id}`) || 0)
    await sb.from('matches').update({ ht_home, ht_away, ft_home, ft_away, graded: true }).eq('id', m.id)
  }

  return NextResponse.redirect(new URL(`/admin/round/${round_id}`, req.url))
}
