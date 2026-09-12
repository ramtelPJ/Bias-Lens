import "server-only";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

// Server-only, bypasses RLS. Use for pipeline/admin reads and writes — never
// import this from a client component.
export const supabaseServiceClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
