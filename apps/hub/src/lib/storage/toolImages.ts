import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ImageStorage } from "@ludenlab/ai";

const BUCKET = process.env.TOOL_IMAGES_BUCKET ?? "tool-images";

let _client: SupabaseClient | null = null;
function client(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tanımlı değil — storage başlatılamıyor.");
    }
    _client = createClient(url, key, { auth: { persistSession: false } });
  }
  return _client;
}

/** Supabase Storage tool-images bucket'ına yükler; kalıcı public URL döner. */
export const supabaseToolImageStorage: ImageStorage = {
  async upload(path: string, bytes: Uint8Array, contentType: string): Promise<string> {
    const { error } = await client()
      .storage.from(BUCKET)
      .upload(path, bytes, { contentType, upsert: true });
    if (error) {
      throw new Error(`Storage upload hatası (${path}): ${error.message}`);
    }
    const { data } = client().storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },
};
