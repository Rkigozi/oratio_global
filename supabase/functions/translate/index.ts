import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const { q, target } = await req.json();

    if (typeof q !== 'string' || !q.trim() || typeof target !== 'string' || !target.trim()) {
      return jsonResponse({ error: 'Missing required fields: q, target' }, 400);
    }

    const apiKey = Deno.env.get('GOOGLE_TRANSLATE_API_KEY');
    if (!apiKey) {
      return jsonResponse({ error: 'Server not configured for translation' }, 500);
    }

    const res = await fetch('https://translation.googleapis.com/language/translate/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        q: q.trim().slice(0, 500),
        target: target.trim().toLowerCase(),
        format: 'text',
      }),
    });

    if (!res.ok) {
      return jsonResponse({ error: 'Translation service unavailable' }, 502);
    }

    const data = await res.json();
    return jsonResponse(data);
  } catch {
    return jsonResponse({ error: 'Translation service unavailable' }, 500);
  }
});
