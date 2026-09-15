import "server-only";

import { supabaseServiceClient } from "@/lib/supabase/service-client";
import type { Database } from "@/lib/supabase/types";

type AnalysisInsert = Database["public"]["Tables"]["article_analyses"]["Insert"];

const UNIQUE_VIOLATION = "23505";

export type InsertAnalysisResult = { status: "inserted" } | { status: "duplicate" };

// A unique-constraint violation on article_id means this article already has
// an analysis (race with a concurrent run, or an explicit re-request) —
// treated as a skip, not a failure, same pattern as pipeline-articles.ts.
export async function insertAnalysis(row: AnalysisInsert): Promise<InsertAnalysisResult> {
  const { error } = await supabaseServiceClient.from("article_analyses").insert(row);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) return { status: "duplicate" };
    throw error;
  }

  return { status: "inserted" };
}

// AGENTS.md §19: analyzed_at is set only after a valid analysis is saved.
export async function markArticleAnalyzed(articleId: string): Promise<void> {
  const { error } = await supabaseServiceClient
    .from("articles")
    .update({ analyzed_at: new Date().toISOString() })
    .eq("id", articleId);

  if (error) throw error;
}

// AGENTS.md §20 backfill path: an article_analyses row already exists but
// has no embedding yet. Only the embedding changes — analyzed_at was already
// set when the row's analysis was originally saved.
export async function updateAnalysisEmbedding(articleId: string, embedding: number[]): Promise<void> {
  const { error } = await supabaseServiceClient
    .from("article_analyses")
    .update({ embedding })
    .eq("article_id", articleId);

  if (error) throw error;
}
