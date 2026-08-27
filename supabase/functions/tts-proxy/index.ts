// ─── EDGE FUNCTION: tts-proxy ────────────────────────────────────────────────
//
// Tira a chave da ElevenLabs de dentro do navegador.
//
// Antes: o build injetava VITE_ELEVEN_KEY no JavaScript do site. Como o site é
// público (vicente.ia.br), qualquer pessoa abria o DevTools, copiava a chave e
// gastava o crédito da conta.
//
// Agora: o navegador manda só o texto e o id da voz, autenticado com o JWT do
// Supabase. A chave vive aqui, como secret do projeto, e nunca é enviada ao
// cliente.
//
// DEPLOY (uma vez):
//   supabase functions deploy tts-proxy
//   supabase secrets set ELEVEN_KEY=sk_...
//
// Depois do deploy, apague o secret VITE_ELEVEN_KEY do GitHub Actions e
// refaça o deploy do site. O front detecta a ausência da variável e passa a
// usar esta função automaticamente — não há mudança de código a fazer.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ELEVEN_KEY = Deno.env.get("ELEVEN_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!

// Vozes permitidas — as mesmas de src/useTTS.js. Impede que alguém com uma
// conta válida use o proxy para gerar áudio em qualquer voz da conta.
const VOZES_PERMITIDAS = new Set([
  "Qrdut83w0Cr152Yb4Xn3",
  "oArP4WehPe3qjqvCwHNo",
  "sXSV9RZ095VZyL64w3ap",
  "xHUwLsLfyqiYOIVTzLRW",
  "TY3h8ANhQUsJaa0Bga5F",
])

const MAX_CHARS = 300

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  if (req.method !== "POST") return erro(405, "Método não permitido")

  // 1. Exige usuário autenticado.
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return erro(401, "Não autenticado")

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return erro(401, "Não autenticado")

  // 2. Valida a entrada.
  let text: string, voice_id: string
  try {
    const body = await req.json()
    text = String(body.text ?? "").trim()
    voice_id = String(body.voice_id ?? "")
  } catch {
    return erro(400, "JSON inválido")
  }

  if (!text) return erro(400, "Texto vazio")
  if (text.length > MAX_CHARS) return erro(400, `Texto acima de ${MAX_CHARS} caracteres`)
  if (!VOZES_PERMITIDAS.has(voice_id)) return erro(400, "Voz não permitida")

  // 3. Gera o áudio com a chave que só existe aqui.
  const eleven = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}/stream`,
    {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVEN_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    },
  )

  if (!eleven.ok) {
    const detalhe = await eleven.text().catch(() => "")
    console.error("ElevenLabs erro", eleven.status, detalhe)
    // O cliente cai na voz do aparelho quando recebe erro.
    return erro(502, "Falha ao gerar áudio")
  }

  return new Response(eleven.body, {
    headers: { ...CORS, "Content-Type": "audio/mpeg" },
  })
})

function erro(status: number, mensagem: string) {
  return new Response(JSON.stringify({ error: mensagem }), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  })
}
