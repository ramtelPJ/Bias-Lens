import "server-only";

import { supabasePublicClient } from "@/lib/supabase/public-client";
import { supabaseServiceClient } from "@/lib/supabase/service-client";
import type { Database } from "@/lib/supabase/types";

type ArticleRow = Database["public"]["Tables"]["articles"]["Row"];
type SourceRow = Database["public"]["Tables"]["sources"]["Row"];
type AnalysisRow = Database["public"]["Tables"]["article_analyses"]["Row"];

export interface ArticleWithAnalysis extends ArticleRow {
  source: SourceRow;
  analysis: AnalysisRow;
}

const ARTICLE_WITH_ANALYSIS_SELECT = "*, source:sources(*), analysis:article_analyses(*)";

export async function getArticles({
  limit = 20,
  offset = 0,
}: { limit?: number; offset?: number } = {}): Promise<ArticleWithAnalysis[]> {
  const { data, error } = await supabasePublicClient
    .from("articles")
    .select(ARTICLE_WITH_ANALYSIS_SELECT)
    .not("analyzed_at", "is", null)
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data as unknown as ArticleWithAnalysis[];
}

export async function getArticleById(id: string): Promise<ArticleWithAnalysis | null> {
  const { data, error } = await supabasePublicClient
    .from("articles")
    .select(ARTICLE_WITH_ANALYSIS_SELECT)
    .eq("id", id)
    .not("analyzed_at", "is", null)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as ArticleWithAnalysis | null;
}

export type RelatedArticle = Database["public"]["Functions"]["match_related_articles"]["Returns"][number];

// AGENTS.md §20: cosine-similarity ordering against a dynamic query vector
// isn't expressible through the PostgREST query builder, so this calls the
// match_related_articles SQL function (join + filter + order + limit all
// live there). Uses the service-role client per §20's explicit instruction.
export async function getRelatedArticles(articleId: string, embedding: string): Promise<RelatedArticle[]> {
  const { data, error } = await supabaseServiceClient.rpc("match_related_articles", {
    current_article_id: articleId,
    query_embedding: embedding,
    match_count: 5,
  });

  if (error) throw error;
  return data;
}
