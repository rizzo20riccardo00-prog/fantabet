'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Match = { id: string; home_team: string; away_team: string; kickoff_at: string }
type Choice = { market: string; value: string }

const MARKETS = {
  '1X2': { label: '1X2 (3pt)', values: ['1', 'X', '2'], points: 3 },
  'O1_5_HT': { label: 'Over 1.5 HT (2.5pt)', values: ['Over'], points: 2.5 },
  'UO2_5': { label: 'Under/Over 2.5 (2pt)', values: ['Under', 'Over'], points: 2 },
  'GGNG': { label: 'GG/NG (2pt)', values: ['GG', 'NG'], points: 2 },
  'DC_O1_5': { label: 'DC + Over 1.5 (1.5pt)', values: ['1X', '12', 'X2'], points: 1.5 },
  'DC_U3_5': { label: 'DC + Under 3.5 (1.5pt)', values: ['1X', '12', 'X2'], points: 1.5 },
  'DC': { label: 'DC (1pt)', values: ['1X', '12', 'X2'], points: 1 },
  'O1_5': { label: 'Over 1.5 (1pt)', values: ['Over'], points: 1 },
  'U3_5': { label: 'Under 3.5 (1pt)', values: ['Under'], points: 1 },
} as const

export default function RoundEditor({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [roundName, setRoundName] = useState<string>('')
  const [matches, setMatches] = useState<Match[]>([])
  const [choices, setChoices] = useState<Record<string, Choice>>({})
  const [msg, setMsg] = useState<string>('')

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) {
        router.replace('/login')
        return
      }
      setUserId(auth.user.id)

      const { data: r } = await supabase.from('rounds').select('name').eq('id', params.id).maybeSingle()
      setRoundName(r?.name ?? '')

      const { data: mm } = await supabase
        .from('matches')
        .select('id,home_team,away_team,kickoff_at')
        .eq('round_id', params.id)
        .order('kickoff_at', { ascending: true })

      setMatches((mm ?? []) as Match[])
    })()
  }, [params.id, router])

  const onChange = (matchId: string, market: string, value: string) => {
    setChoices(prev => ({ ...prev, [matchId]: { market, value } }))
  }

  const submit = async () => {
    setMsg('')
    if (!userId) return
    if (Object.keys(choices).length !== matches.length) {
      setMsg('Devi selezionare 1 pronostico per ogni partita.')
      return
    }
    const { data: session } = await supabase.auth.getSession()
    const access_token = session.session?.access_token
    if (!access_token) {
      setMsg('Sessione scaduta. Effettua di nuovo il login.')
      return
    }
    const r = await fetch(`/round/${params.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access_token}` },
      body: JSON.stringify({ choices }),
    })
    const j = await r.json()
    if (!r.ok) setMsg(j.error ?? 'Errore di salvataggio.')
    else {
      setMsg('✅ Schedina salvata!')
      router.push(`/round/${params.id}/board`)
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Giornata: {roundName || params.id}</h1>

      {matches.length === 0 ? (
        <p className="text-gray-500">Nessuna partita caricata.</p>
      ) : (
        <div className="space-y-4">
          {matches.map((m) => (
            <div key={m.id} className="border rounded p-4">
              <div className="font-semibold mb-2">
                {m.home_team} – {m.away_team}
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                {Object.entries(MARKETS).map(([market, meta]) => (
                  <div key={market} className="border p-3 rounded">
                    <div className="text-sm font-medium mb-2">{meta.label}</div>
                    <div className="flex gap-2 flex-wrap">
                      {meta.values.map((v) => {
                        const active = choices[m.id]?.market === market && choices[m.id]?.value === v
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => onChange(m.id, market, v)}
                            className={`px-2 py-1 border rounded text-sm ${active ? 'bg-black text-white' : ''}`}
                          >
                            {v}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button onClick={submit} className="bg-black text-white px-4 py-2 rounded">
            Salva schedina
          </button>
          {!!msg && <p className="text-sm pt-2">{msg}</p>}
        </div>
      )}
    </main>
  )
}
