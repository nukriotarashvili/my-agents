import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseAdminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdminClient) return supabaseAdminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Supabase env ცვლადები აკლია. დაამატე NEXT_PUBLIC_SUPABASE_URL და SUPABASE_SERVICE_ROLE_KEY Vercel Environment Variables-ში (ან .env.local-ში).'
    );
  }

  supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey);
  return supabaseAdminClient;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
