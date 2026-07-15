import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: JSON_HEADERS,
    });
  }

  return new Response(
    JSON.stringify({
      error: 'This legacy generator is disabled. AI output requires operator review and cannot publish listings.',
    }),
    { status: 410, headers: JSON_HEADERS },
  );
});
