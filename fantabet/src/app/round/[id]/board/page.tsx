import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type BoardRow = {
  id: string
  user_id: string
  ticket_scores: { total_points: number | null } | null
  profiles: { nickname?: string | null } | null
}

async function getBoard(roundId: string): Promise<BoardRow[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      id,
      user_id,
      ticket_scores ( total_points ),
      profiles ( nickname )
    `)
    .eq('round_id', roundId)
    .order('total_points', { referencedTable: 'ticket_scores', ascending: false })
  if (error) {
    console.error('getBoard error:', error)
    return []
  }
  return (data ?? []) as BoardRow[]
}

export default async function RoundBoard({ params }: { params: { id: string } }) {
  const rows = await getBoard(params.id)
  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Classifica giornata</h1>
        <Link href={`/round/${params.id}`} className="underline text-sm">← Giornata</Link>
      </div>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">Utente</th>
            <th className="p-2 text-right">Punti</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.profiles?.nickname ?? r.user_id}</td>
              <td className="p-2 text-right">{r.ticket_scores?.total_points ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
