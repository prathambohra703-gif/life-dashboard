// OPTIONAL. Life Dashboard: Claude for free-text logging and meal estimates.
// Supabase > Edge Functions > new function named "ai". Secret it needs: ANTHROPIC_API_KEY (from console.anthropic.com).
// Leave this out entirely if you do not want any AI cost. The app works without it.
import { createClient } from "npm:@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "ANTHROPIC_API_KEY is not set" }, 500);
  // only the signed-in owner may spend the key
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return json({ error: "Not signed in" }, 401);
  const { prompt, images = [], tier } = await req.json();
  const content: unknown[] = images.map((i: { type: string; data: string }) => ({ type: "image", source: { type: "base64", media_type: i.type, data: i.data } }));
  content.push({ type: "text", text: String(prompt).slice(0, 20000) });
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: tier === "quick" ? "claude-haiku-5-5" : "claude-sonnet-5-5", max_tokens: 1500, messages: [{ role: "user", content }] }),
  });
  const j = await r.json();
  if (!r.ok) return json({ error: j?.error?.message ?? "AI request failed" }, 502);
  const text = (j.content ?? []).map((c: { text?: string }) => c.text ?? "").join("");
  const m = text.match(/\{[\s\S]*\}/);
  try { return json({ result: JSON.parse(m ? m[0] : text) }); } catch { return json({ error: "The AI reply was not valid JSON" }, 502); }
});
