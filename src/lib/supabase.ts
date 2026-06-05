import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Supabase env ცვლადები აკლია. დაამატე NEXT_PUBLIC_SUPABASE_URL და SUPABASE_SERVICE_ROLE_KEY ფაილში .env.local (პროექტის root-ში).'
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
