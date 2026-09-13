import "server-only";

import { supabaseServiceClient } from "@/lib/supabase/service-client";
import type { Database } from "@/lib/supabase/types";

type ArticleInsert = Database["public"]["Tables"]["articles"]["Insert"];
type ArticleRow = Database["public"]["Tables"]["articles"]["Row"];

const URL_CHECK_CHUNK_SIZE = 15; // AGENTS.md §9 URL existence check — never exceed 15 per .in()
const UNIQUE_VIOLATION = "23505";

// AGENTS.md §9 URL existence check: query in small chunks, never pass more
// than 15 URLs to a single .in() filter.
export async function getExistingOriginalUrls(urls: string[]): Promise<Set<string>> {
  const existing = new Set<string>();

  for (let i = 0; i < urls.length; i += URL_CHECK_CHUNK_SIZE) {
    const chunk = urls.slice(i, i + URL_CHECK_CHUNK_SIZE);
    if (chunk.length === 0) continue;
    const { data, error } = await supabaseServiceClient
      .from("articles")
      .select("original_url")
      .in("original_url", chunk);
    if (error) throw error;
    for (const row of data) existing.add(row.original_url);
  }

  return existing;
}

export type InsertArticleResult =
  | { status: "inserted"; article: ArticleRow }
  | { status: "duplicate" };

// Append-only (AGENTS.md §10): a unique-constraint violation on original_url
// is a duplicate-skip, not a failure.
export async function insertArticle(row: ArticleInsert): Promise<InsertArticleResult> {
  const { data, error } = await supabaseServiceClient.from("articles").insert(row).select().single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) return { status: "duplicate" };
    throw error;
  }

  return { status: "inserted", article: data };
}
