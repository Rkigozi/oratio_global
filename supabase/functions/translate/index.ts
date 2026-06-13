import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const { q, target } = await req.json()

    if (!q || !target) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: q, target" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const apiKey = Deno.env.get("GOOGLE_TRANSLATE_API_KEY")
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Server not configured for translation" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    const res = await fetch(
      "https://translation.googleapis.com/language/translate/v2",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: q.slice(0, 500),
          target,
          format: "text",
        }),
      }
    )

    if (!res.ok) {
      const errBody = await res.text()
      return new Response(
        JSON.stringify({ error: "Translation API error", detail: errBody }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      )
    }

    const data = await res.json()
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
