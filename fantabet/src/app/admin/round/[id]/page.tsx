import Link from 'next/link'
import { supabase } from '@/lib/supabase'

async function getData(roundId: string) {
  const [{ data: round }, { data: matches }] = await Promise.all([
    supabase.from('rounds').select('id,name,status').eq('id', roundId).maybeSingle(),
    supabase.from('matches').select('id,home_team,away_team,ht_home,ht_away,ft_home,ft_away').eq('round_id', roundId).order('kickoff_at')
  ])
  return { round, matches: matches ?? [] }
}

export default async function AdminRound({ params }: { params: { id: string } }) {
  const { round, matches } = await getData(params.id)

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin · {round?.name}</h1>
        <Link href={`/round/${params.id}`} className="underline text-sm">← Giornata</Link>
      </div>

      <form action={`/admin/round/${params.id}/save`} method="post" className="space-y-3">
        <input type="hidden" name="round_id" value={params.id} />
        {matches.map((m: any) => (
          <div key={m.id} className="border p-3 rounded">
            <div className="font-semibold mb-2">{m.home_team} – {m.away_team}</div>
            <div className="grid grid-cols-4 gap-2">
              <input className="border p-2" name={`ht_home_${m.id}`} placeholder="HT home" defaultValue={m.ht_home ?? ''} />
              <input className="border p-2" name={`ht_away_${m.id}`} placeholder="HT away" defaultValue={m.ht_away ?? ''} />
              <input className="border p-2" name={`ft_home_${m.id}`} placeholder="FT home" defaultValue={m.ft_home ?? ''} />
              <input className="border p-2" name={`ft_away_${m.id}`} placeholder="FT away" defaultValue={m.ft_away ?? ''} />
            </div>
          </div>
        ))}
        <button className="bg-black text-white px-4 py-2 rounded">Salva risultati</button>
      </form>

      <form action="/api/grade-round" method="post">
        <input type="hidden" name="round_id" value={params.id} />
        <button className="bg-emerald-600 text-white px-4 py-2 rounded mt-2">Referta giornata</button>
      </form>
    </main>
  )
}
