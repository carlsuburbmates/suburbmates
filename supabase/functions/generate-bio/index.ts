import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') as string;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') as string;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    const { vendorId } = await req.json();

    if (!vendorId) {
      return new Response(JSON.stringify({ error: 'Missing vendorId parameter' }), { status: 400 });
    }

    // 1. Fetch vendor details
    const { data: vendor, error: fetchError } = await supabaseAdmin
      .from('vendors')
      .select('business_name, category_slug, suburb_slug')
      .eq('id', vendorId)
      .single();

    if (fetchError || !vendor) {
      throw new Error(`Failed to fetch vendor: ${fetchError?.message}`);
    }

    // 2. Construct the localized prompt
    const prompt = `Write a highly optimized, localized 300-word SEO description for a local business.
Business Name: ${vendor.business_name}
Trade/Category: ${vendor.category_slug.replace('-', ' ')}
Service Area: ${vendor.suburb_slug.replace('-', ' ')}, Melbourne, VIC.
Focus on local trust, community presence, and professional service. Do not use generic corporate jargon. Output the raw text only. No markdown formatting.`;

    // 3. Call OpenRouter API securely from the Edge (Using a strictly free model)
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://suburbmates.com", // Required by OpenRouter
          "X-Title": "SuburbMates Directory", // Required by OpenRouter
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemma-4-26b-a4b-it:free", // Strictly $0.00 cost model
          messages: [
            { role: "system", content: "You are an expert SEO copywriter specializing in local businesses." },
            { role: "user", content: prompt }
          ]
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const generatedBio = data.choices?.[0]?.message?.content;

    if (!generatedBio) {
        throw new Error('Failed to extract bio from OpenRouter API response.');
    }

    // 4. Update the vendor record with the AI-generated bio
    const { error: updateError } = await supabaseAdmin
      .from('vendors')
      .update({ 
        description: generatedBio.trim(),
        is_published: true 
      })
      .eq('id', vendorId);

    if (updateError) {
      throw new Error(`Failed to update vendor bio: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ message: 'Bio successfully generated and saved.', vendorId }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Edge Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
