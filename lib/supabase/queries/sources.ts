import { supabaseServiceClient } from "@/lib/supabase/service-client";
import type { Database } from "@/lib/supabase/types";

export type SourceRow = Database["public"]["Tables"]["sources"]["Row"];

export async function getActiveSources(): Promise<SourceRow[]> {
  const { data, error } = await supabaseServiceClient
    .from("sources")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}
