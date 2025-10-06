import Link from 'next/link'
import { supabase } from '@/lib/supabase'

async function getLeagueBoard(leagueId: string) {
  const { data } = await supabase
    .from('leaderboard')
    .select('user_id, total_points, rounds_played, profiles(nickname)')
    .eq('league_id', leagueId)
    .order('total_points', { ascending: false })
  return data ?? []
}

export default async function LeagueBoard({ params }: { params: { id: string } }) {
  const rows = await getLeagueBoard(params.id)
  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Classifica stagione</h1>
        <Link href="/" className="underline text-sm">← Home</Link>
      </div>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">Utente</th>
            <th className="p-2 text-right">Punti</th>
            <th className="p-2 text-right">Giornate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any) => (
            <tr key={r.user_id} className="border-t">
              <td className="p-2">{r.profiles?.nickname ?? r.user_id}</td>
              <td className="p-2 text-right">{r.total_points}</td>
              <td className="p-2 text-right">{r.rounds_played}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
