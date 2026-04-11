import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client with service role key.
// NEVER import this in client components or expose to the browser.
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
