import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  const { context, base_phrase } = await req.json();

  if (!context?.trim() || !base_phrase?.trim()) {
    return new Response(
      JSON.stringify({ phrase: base_phrase }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const prompt = `AAC para pessoa com afasia. Contexto pessoal: ${context}\nFrase base: "${base_phrase}"\nReescreva de forma pessoal e natural (máx 20 palavras, 1ª pessoa). Só a frase, sem aspas.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 80,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    return new Response(
      JSON.stringify({ phrase: base_phrase }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const data = await res.json();
  const phrase = data?.content?.[0]?.text?.trim() ?? base_phrase;

  return new Response(
    JSON.stringify({ phrase }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
