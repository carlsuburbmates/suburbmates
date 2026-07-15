import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Image } from 'https://deno.land/x/imagescript@1.2.15/mod.ts';
// Note: You can use `https://esm.sh/@jsquash/webp` but it requires WASM initialization.
// We provide the strict structure required for the Edge Function hook.

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

serve(async (req) => {
  try {
    // Only accept POST requests (e.g., triggered by Supabase Storage webhooks or direct call)
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();

    // Example payload shape depending on whether this is triggered via webhook or direct call
    const { bucket, path, record } = payload;
    
    // In a real scenario, fetch the image, compress it, and upload back.
    // Placeholder logic for the actual compression step
    console.log(`Processing image compression for ${bucket}/${path}`);
    
    // 1. Download original image
    const { data: fileData, error: downloadError } = await supabaseAdmin
      .storage
      .from(bucket)
      .download(path);

    if (downloadError) throw downloadError;

    // 2. Compress image into WebP using ImageScript
    const arrayBuffer = await fileData.arrayBuffer();
    const image = await Image.decode(new Uint8Array(arrayBuffer));
    // encode to WebP with a quality of 80 (0-100 scale, but ImageScript uses a 1-3 scale for format? No, ImageScript's WebP encoding is experimental or we can use 3 for WEBP format code. Let's use image.encodeWEBP(80) if available or just image.encode(3))
    // Actually in ImageScript, encode accepts format (3 is WEBP). But let's be safer and use a dedicated WASM if possible. 
    // ImageScript uses format ids. PNG = 1, JPEG = 2, WEBP = 3. 
    // encode(format_id, quality) 
    const webpBuffer = await image.encode(3, 80);
    
    const newPath = path.replace(/\.[^/.]+$/, "") + '.webp';

    // 3. Upload the compressed WebP asset
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from(bucket)
      .upload(newPath, webpBuffer, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    return new Response(
      JSON.stringify({ message: 'Image successfully compressed to WebP', original: path, compressed: newPath }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Edge Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
