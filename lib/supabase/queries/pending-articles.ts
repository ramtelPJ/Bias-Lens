import "server-only";

import { supabaseServiceClient } from "@/lib/supabase/service-client";

export interface PendingArticle {
  id: string;
  title: string;
  rawText: string;
}

interface PendingRow {
  id: string;
  title: string;
  raw_text: string;
  scraped_at: string;
  analysis: { id: string }[] | null;
}

function isPending(row: PendingRow): boolean {
  return !row.analysis || row.analysis.length === 0;
}

// AGENTS.md §19 pending-analysis check: an article is pending only when no
// article_analyses row exists for it — never analyzed_at IS NULL alone.
// Per the supabase skill's documented gotcha, filtering on an embedded
// (joined) table via .eq()/.is() produces broken PostgREST SQL, so the
// embed is fetched unfiltered and the emptiness check happens in JS.
//
// excludeIds lets a caller loop in batches without re-selecting an article
// that already failed earlier in the same run — a failed article has no
// article_analyses row, so without this it would look "pending" forever
// and the caller's loop would never terminate.
//
// ponytail: scans the whole articles table every call — fine at this
// project's scale; if articles grows very large, replace with a
// NOT EXISTS SQL view/function instead of widening this scan.
export async function getPendingArticles(
  limit: number,
  excludeIds: ReadonlySet<string> = new Set(),
): Promise<PendingArticle[]> {
  const { data, error } = await supabaseServiceClient
    .from("articles")
    .select("id, title, raw_text, scraped_at, analysis:article_analyses(id)")
    .order("scraped_at", { ascending: true });

  if (error) throw error;

  return (data as unknown as PendingRow[])
    .filter(isPending)
    .filter((row) => !excludeIds.has(row.id))
    .slice(0, limit)
    .map(({ id, title, raw_text }) => ({ id, title, rawText: raw_text }));
}

// For explicit articleIds requests — still filters out ones already analyzed.
export async function getPendingArticlesByIds(ids: string[]): Promise<PendingArticle[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabaseServiceClient
    .from("articles")
    .select("id, title, raw_text, scraped_at, analysis:article_analyses(id)")
    .in("id", ids);

  if (error) throw error;

  return (data as unknown as PendingRow[])
    .filter(isPending)
    .map(({ id, title, raw_text }) => ({ id, title, rawText: raw_text }));
}
