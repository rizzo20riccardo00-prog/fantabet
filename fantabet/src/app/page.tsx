"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function Home() {
  const [rounds, setRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchRounds = async () => {
      const { data, error } = await supabase
        .from("rounds")
        .select("id, name, status, start_at")
        .order("start_at", { ascending: false });
      if (!error && data) setRounds(data);
      setLoading(false);
    };
    fetchRounds();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">🏆 Fantabet</h1>

      {loading ? (
        <p className="text-center text-gray-500">Caricamento giornate...</p>
      ) : rounds.length === 0 ? (
        <p className="text-center text-gray-500">Nessuna giornata disponibile.</p>
      ) : (
        <div className="max-w-2xl mx-auto grid gap-3">
          {rounds.map((r) => (
            <Link
              key={r.id}
              href={`/round/${r.id}`}
              className="block bg-white rounded-xl shadow p-4 hover:bg-blue-50 transition"
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold">{r.name}</span>
                <span
                  className={`text-sm px-3 py-1 rounded-full ${
                    r.status === "open"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {r.status}
                </span>
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {new Date(r.start_at).toLocaleDateString("it-IT")}
              </div>
            </Link>
          ))}
        </div>
      )}

      <footer className="text-center mt-8 text-sm text-gray-400">
        <Link href="/login" className="underline">
          🔐 Accedi
        </Link>{" "}
        |{" "}
        <Link href="/admin/round/test" className="underline">
          ⚙️ Admin
        </Link>
      </footer>
    </main>
  );
}

