import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { WebPush } from "https://deno.land/x/webpush@v1.0.0/mod.ts"

serve(async (req) => {
  try {
    const { subscription, title, body, url } = await req.json()
    
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? ""
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? ""

    const webPush = new WebPush({
      publicKey: vapidPublicKey,
      privateKey: vapidPrivateKey,
    })

    await webPush.sendNotification(
      subscription,
      JSON.stringify({ title, body, url })
    )

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
