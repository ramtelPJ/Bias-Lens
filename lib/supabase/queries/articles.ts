import { supabasePublicClient } from "@/lib/supabase/public-client";
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
