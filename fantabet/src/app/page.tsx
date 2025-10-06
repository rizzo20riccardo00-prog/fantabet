import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Round = {
  id: string
  name: string
  lock_at: string | null
  status: string
}

async function getRounds(): Promise<Round[]> {
  const { data, error } = await supabase
    .from('rounds')
    .select('id,name,lock_at,status')
    .order('start_at', { ascending: false })
  if (error) {
    console.error('getRounds error:', error)
    return []
  }
  return (data ?? []) as Round[]
}

export default async function Home() {
  const rounds = await getRounds()

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Giornate Fantabet</h1>
      {rounds.length === 0 ? (
        <p className="text-gray-500">Nessuna giornata disponibile.</p>
      ) : (
        <ul className="space-y-3">
          {rounds.map((r) => (
            <li key={r.id} className="border rounded p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">{r.name}</div>
                <div className="text-sm text-gray-500">
                  Lock: {r.lock_at ? new Date(r.lock_at).toLocaleString() : '—'} · Stato: {r.status}
                </div>
              </div>
              <Link href={`/round/${r.id}`} className="px-3 py-1 bg-black text-white rounded">
                Apri
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
