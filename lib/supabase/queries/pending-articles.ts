import "server-only";

import { supabaseServiceClient } from "@/lib/supabase/service-client";

// Two distinct kinds of pending work (AGENTS.md §19 + §20):
// - "full": no article_analyses row yet — needs the LLM analysis call, the
//   embedding, and analyzed_at set once both are saved.
// - "embedding-only": an article_analyses row already exists but its
//   embedding is still null (e.g. an article analyzed before pgvector was
//   enabled) — needs only an embedding generated from the existing summary,
//   no re-analysis, no analyzed_at change.
export type PendingArticle =
  | { kind: "full"; id: string; title: string; rawText: string }
  | { kind: "embedding-only"; id: string; summary: string };

interface PendingRow {
  id: string;
  title: string;
  raw_text: string;
  scraped_at: string;
  // article_id is UNIQUE on article_analyses, so PostgREST embeds this as a
  // single object (or null), never an array — matches ArticleWithAnalysis in
  // lib/supabase/queries/articles.ts. Indexing this as an array (row.analysis?.[0])
  // silently returns undefined and misclassifies already-analyzed articles as
  // needing fresh analysis, which caused a real infinite-loop incident.
  // embedding reads back as a string (pgvector's text representation via
  // PostgREST) even though we write it as a number[] — see the comment on
  // article_analyses.Row in lib/supabase/types.ts. Only the null-check
  // matters here, so this doesn't change behavior, just accuracy.
  analysis: { summary: string; embedding: string | null } | null;
}

function toPendingArticle(row: PendingRow): PendingArticle | null {
  if (!row.analysis) {
    return { kind: "full", id: row.id, title: row.title, rawText: row.raw_text };
  }
  if (row.analysis.embedding === null) {
    return { kind: "embedding-only", id: row.id, summary: row.analysis.summary };
  }
  return null; // fully done — has both an analysis and an embedding
}

// AGENTS.md §19 pending-analysis check: an article is pending only when no
// article_analyses row exists for it — never analyzed_at IS NULL alone.
// Per the supabase skill's documented gotcha, filtering on an embedded
// (joined) table via .eq()/.is() produces broken PostgREST SQL, so the
// embed is fetched unfiltered and the emptiness/embedding check happens in JS.
//
// excludeIds lets a caller loop in batches without re-selecting an article
// that already failed earlier in the same run — a failed article is still
// "pending" by the rules above, so without this the caller's loop would
// never terminate.
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
    .select("id, title, raw_text, scraped_at, analysis:article_analyses(summary, embedding)")
    .order("scraped_at", { ascending: true });

  if (error) throw error;

  const pending: PendingArticle[] = [];
  for (const row of data as unknown as PendingRow[]) {
    if (excludeIds.has(row.id)) continue;
    const article = toPendingArticle(row);
    if (article) pending.push(article);
    if (pending.length >= limit) break;
  }
  return pending;
}

// For explicit articleIds requests — still respects both pending cases above.
export async function getPendingArticlesByIds(ids: string[]): Promise<PendingArticle[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabaseServiceClient
    .from("articles")
    .select("id, title, raw_text, scraped_at, analysis:article_analyses(summary, embedding)")
    .in("id", ids);

  if (error) throw error;

  return (data as unknown as PendingRow[])
    .map(toPendingArticle)
    .filter((article): article is PendingArticle => article !== null);
}
