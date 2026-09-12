import "server-only";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!publishableKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

// Server-only, subject to RLS. Used from Server Components for public reads —
// nothing in this app calls Supabase directly from the browser.
export const supabasePublicClient = createClient<Database>(supabaseUrl, publishableKey, {
  auth: { persistSession: false },
});
