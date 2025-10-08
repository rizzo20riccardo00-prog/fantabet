// Runtime: Deno (Supabase Edge Functions)
// Invocazione: POST JSON { round_id: "..." }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ⚠️ Usa le secrets che hai settato: SB_URL, SB_SERVICE_ROLE_KEY
const SUPABASE_URL = Deno.env.get("SB_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY")!; // non esporre mai al client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Helpers di esito
function w1x2(v: string, h: number, a: number) {
  return (v === "1" && h > a) || (v === "X" && h === a) || (v === "2" && h < a);
}
const over = (line: number, h: number, a: number) => h + a > line;
const under = (line: number, h: number, a: number) => h + a < line;
const gg = (h: number, a: number) => h > 0 && a > 0;
const ng = (h: number, a: number) => !gg(h, a);
const dcOk = (dc: string, h: number, a: number) =>
  (dc === "1X" && h >= a) || (dc === "12" && h !== a) || (dc === "X2" && h <= a);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { round_id } = await req.json();
    if (!round_id) {
      return new Response(JSON.stringify({ ok: false, error: "round_id mancante" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // Evita doppi conteggi se già refertata
    const { data: round, error: rErr } = await supabase
      .from("rounds")
      .select("id,status,league_id")
      .eq("id", round_id)
      .single();
    if (rErr) throw rErr;
    if (!round) {
      return new Response(JSON.stringify({ ok: false, error: "Giornata non trovata" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }
    if (round.status === "graded") {
      return new Response(
        JSON.stringify({ ok: true, already: true, message: "Giornata già refertata" }),
        { headers: { "content-type": "application/json" } },
      );
    }

    // Match della giornata
    const { data: matches, error: mErr } = await supabase
      .from("matches")
      .select("*")
      .eq("round_id", round_id);
    if (mErr) throw mErr;

    const matchIds = (matches ?? []).map((m) => m.id);
    if (matchIds.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "Nessun match per la giornata" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // Selezioni coinvolte
    const { data: sels, error: sErr } = await supabase
      .from("selections")
      .select("id,ticket_id,match_id,market,value,points_value")
      .in("match_id", matchIds);
    if (sErr) throw sErr;

    // Calcolo esiti
    const results: Array<{ selection_id: string; is_win: boolean; awarded_points: number }> = [];

    for (const s of sels ?? []) {
      const m = (matches ?? []).find((mm) => mm.id === s.match_id)!;
      const FT = { h: m.ft_home ?? 0, a: m.ft_away ?? 0 };
      const HT = { h: m.ht_home ?? 0, a: m.ht_away ?? 0 };

      let win = false;
      switch (s.market) {
        case "1X2":
          win = w1x2(s.value, FT.h, FT.a);
          break;
        case "O1_5_HT":
          win = over(1.5, HT.h, HT.a);
          break;
        case "UO2_5":
          win = s.value === "Over" ? over(2.5, FT.h, FT.a) : under(2.5, FT.h, FT.a);
          break;
        case "GGNG":
          win = s.value === "GG" ? gg(FT.h, FT.a) : ng(FT.h, FT.a);
          break;
        case "DC_O1_5":
          win = dcOk(s.value, FT.h, FT.a) && over(1.5, FT.h, FT.a);
          break;
        case "DC_U3_5":
          win = dcOk(s.value, FT.h, FT.a) && under(3.5, FT.h, FT.a);
          break;
        case "DC":
          win = dcOk(s.value, FT.h, FT.a);
          break;
        case "O1_5":
          win = over(1.5, FT.h, FT.a);
          break;
        case "U3_5":
          win = under(3.5, FT.h, FT.a);
          break;
        default:
          win = false;
      }

      results.push({
        selection_id: s.id,
        is_win: win,
        awarded_points: win ? Number(s.points_value) : 0,
      });
    }

    // Salva i risultati (sovrascrive se esistenti)
    if (results.length) {
      const ids = results.map((r) => r.selection_id);
      await supabase.from("selection_results").delete().in("selection_id", ids);
      const { error: insResErr } = await supabase.from("selection_results").insert(results);
      if (insResErr) throw insResErr;
    }

    // Calcola punteggi per ticket
    const { data: tickets, error: tErr } = await supabase
      .from("tickets")
      .select("id,round_id,user_id")
      .eq("round_id", round_id);
    if (tErr) throw tErr;

    for (const t of tickets ?? []) {
      const sIds = (sels ?? []).filter((s) => s.ticket_id === t.id).map((s) => s.id);
      const { data: rows, error: rsErr } = await supabase
        .from("selection_results")
        .select("awarded_points")
        .in("selection_id", sIds);
      if (rsErr) throw rsErr;

      const total = (rows ?? []).reduce((acc, r) => acc + Number(r.awarded_points ?? 0), 0);

      const { error: upScoreErr } = await supabase.from("ticket_scores").upsert({
        ticket_id: t.id,
        total_points: total,
        updated_at: new Date().toISOString(),
      });
      if (upScoreErr) throw upScoreErr;
    }

    // Leaderboard cumulativa (una volta sola quando si chiude la giornata)
    const league_id = round.league_id;
    for (const t of tickets ?? []) {
      const { data: sc } = await supabase
        .from("ticket_scores")
        .select("total_points")
        .eq("ticket_id", t.id)
        .single();
      const pts = Number(sc?.total_points ?? 0);

      const { data: old } = await supabase
        .from("leaderboard")
        .select("total_points,rounds_played")
        .eq("league_id", league_id)
        .eq("user_id", t.user_id)
        .maybeSingle();

      const newTotal = Number(old?.total_points ?? 0) + pts;
      const newRounds = Number(old?.rounds_played ?? 0) + 1;

      const { error: upLbErr } = await supabase.from("leaderboard").upsert(
        {
          league_id,
          user_id: t.user_id,
          total_points: newTotal,
          rounds_played: newRounds,
          last_update: new Date().toISOString(),
        },
        { onConflict: "league_id,user_id" },
      );
      if (upLbErr) throw upLbErr;
    }

    // Chiudi la giornata
    const { error: updErr } = await supabase
      .from("rounds")
      .update({ status: "graded" })
      .eq("id", round_id);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
});
