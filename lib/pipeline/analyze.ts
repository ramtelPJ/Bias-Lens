import "server-only";
import { NoObjectGeneratedError } from "ai";

import { ANALYSIS_DISCLAIMER, ANALYSIS_MODEL, analyzeArticleText, type AnalysisOutput } from "@/lib/ai/analyze-article";
import { generateEmbedding } from "@/lib/ai/embed-article";
import {
  getPendingArticles,
  getPendingArticlesByIds,
  type PendingArticle,
} from "@/lib/supabase/queries/pending-articles";
import { insertAnalysis, markArticleAnalyzed, updateAnalysisEmbedding } from "@/lib/supabase/queries/pipeline-analyses";
import type { AnalysisRunSummary } from "@/lib/pipeline/types";

const DEFAULT_BATCH_SIZE = 5;
const MAX_ATTEMPTS = 2;
// Circuit breaker, independent of the excludeIds fix above: each iteration
// should always shrink the pending pool by at least one article, so this
// should never be reached. It exists only so a future bug in the pending
// query can't turn into an unbounded loop of billed OpenAI calls.
const MAX_BATCHES_PER_RUN = 500;

export interface RunAnalyzeOptions {
  articleIds?: string[];
  batchSize?: number;
}

type FailureReason = "invalid_output" | "api_error" | "embedding_error";
type AnalysisAttempt = { ok: true; output: AnalysisOutput } | { ok: false; reason: FailureReason };
type EmbeddingAttempt = { ok: true; embedding: number[] } | { ok: false; reason: FailureReason };

function log(message: string, meta?: unknown) {
  console.log(`[analyze] ${message}`, meta ?? "");
}

async function withRetry<T>(
  run: () => Promise<T>,
  onError: (error: unknown) => FailureReason,
): Promise<{ ok: true; value: T } | { ok: false; reason: FailureReason }> {
  let lastReason: FailureReason = "api_error";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const value = await run();
      return { ok: true, value };
    } catch (error) {
      lastReason = onError(error);
      log(`attempt ${attempt} failed (${lastReason})`, error);
    }
  }

  return { ok: false, reason: lastReason };
}

async function analyzeWithRetry(title: string, rawText: string): Promise<AnalysisAttempt> {
  const result = await withRetry(
    () => analyzeArticleText(title, rawText),
    (error) => (NoObjectGeneratedError.isInstance(error) ? "invalid_output" : "api_error"),
  );
  return result.ok ? { ok: true, output: result.value } : { ok: false, reason: result.reason };
}

async function embedWithRetry(text: string): Promise<EmbeddingAttempt> {
  const result = await withRetry(
    () => generateEmbedding(text),
    () => "embedding_error" as const,
  );
  return result.ok ? { ok: true, embedding: result.value } : { ok: false, reason: result.reason };
}

export async function runAnalysisPipeline(options: RunAnalyzeOptions = {}): Promise<AnalysisRunSummary> {
  const startedAt = Date.now();
  const batchSize = options.batchSize ?? Number(process.env.ANALYSIS_BATCH_SIZE ?? DEFAULT_BATCH_SIZE);

  log("analysis started");

  let articlesScanned = 0;
  let articlesAnalyzed = 0;
  let embeddingsBackfilled = 0;
  let articlesSkipped = 0;
  let articlesFailed = 0;
  let batchesProcessed = 0;
  const failureReasons: Record<string, number> = {};
  // An article that fails (even after retry) still has no article_analyses
  // row, or still has a null embedding, so it would look "pending" on the
  // next fetch. Track it here so the loop below can exclude it and actually
  // terminate.
  const failedIds = new Set<string>();

  function recordFailure(id: string, reason: FailureReason) {
    articlesFailed += 1;
    failedIds.add(id);
    failureReasons[reason] = (failureReasons[reason] ?? 0) + 1;
    log(`article failed: ${id}`, reason);
  }

  async function processFullAnalysis(article: Extract<PendingArticle, { kind: "full" }>): Promise<void> {
    const analysis = await analyzeWithRetry(article.title, article.rawText);
    if (!analysis.ok) {
      recordFailure(article.id, analysis.reason);
      return;
    }

    const embedding = await embedWithRetry(analysis.output.summary);
    if (!embedding.ok) {
      recordFailure(article.id, embedding.reason);
      return;
    }

    const biasScore = (analysis.output.rightPercentage - analysis.output.leftPercentage) / 100;

    const insertResult = await insertAnalysis({
      article_id: article.id,
      summary: analysis.output.summary,
      sentiment_score: analysis.output.sentimentScore,
      sentiment_label: analysis.output.sentimentLabel,
      bias_score: biasScore,
      bias_label: analysis.output.politicalFramingLabel,
      left_percentage: analysis.output.leftPercentage,
      center_percentage: analysis.output.centerPercentage,
      right_percentage: analysis.output.rightPercentage,
      confidence: analysis.output.confidence,
      framing_notes: analysis.output.framingNotes,
      loaded_terms: analysis.output.loadedTerms,
      disclaimer: ANALYSIS_DISCLAIMER,
      model: ANALYSIS_MODEL,
      embedding: embedding.embedding,
    });

    if (insertResult.status === "duplicate") {
      articlesSkipped += 1;
      log(`already analyzed, skipped: ${article.id}`);
      return;
    }

    await markArticleAnalyzed(article.id);
    articlesAnalyzed += 1;
    log(`article analyzed: ${article.id}`);
  }

  async function processEmbeddingBackfill(article: Extract<PendingArticle, { kind: "embedding-only" }>): Promise<void> {
    const embedding = await embedWithRetry(article.summary);
    if (!embedding.ok) {
      recordFailure(article.id, embedding.reason);
      return;
    }

    await updateAnalysisEmbedding(article.id, embedding.embedding);
    embeddingsBackfilled += 1;
    log(`embedding backfilled: ${article.id}`);
  }

  async function processBatch(batch: PendingArticle[]): Promise<void> {
    batchesProcessed += 1;
    log(`batch ${batchesProcessed} started`, { size: batch.length });

    for (const article of batch) {
      articlesScanned += 1;
      if (article.kind === "full") {
        await processFullAnalysis(article);
      } else {
        await processEmbeddingBackfill(article);
      }
    }

    log(`batch ${batchesProcessed} completed`, {
      analyzed: articlesAnalyzed,
      embeddingsBackfilled,
      failed: articlesFailed,
      skipped: articlesSkipped,
    });
  }

  function buildSummary(status: AnalysisRunSummary["status"]): AnalysisRunSummary {
    return {
      status,
      articlesScanned,
      articlesAnalyzed,
      embeddingsBackfilled,
      articlesSkipped,
      articlesFailed,
      batchesProcessed,
      durationMs: Date.now() - startedAt,
      failureReasons,
    };
  }

  if (options.articleIds) {
    const articles = await getPendingArticlesByIds(options.articleIds);
    for (let i = 0; i < articles.length; i += batchSize) {
      await processBatch(articles.slice(i, i + batchSize));
    }
  } else {
    // Loop until no pending, not-yet-failed work remains (AGENTS.md §19
    // requirement #3, extended to §20's embedding backfill). excludeIds keeps
    // this from retrying the same failure forever — see the comment on
    // getPendingArticles.
    for (;;) {
      if (batchesProcessed >= MAX_BATCHES_PER_RUN) {
        const summary = buildSummary("failed");
        log("circuit breaker tripped — stopping run", summary);
        return summary;
      }
      const batch = await getPendingArticles(batchSize, failedIds);
      if (batch.length === 0) break;
      await processBatch(batch);
    }
  }

  const summary = buildSummary("completed");
  log("analysis completed", summary);
  return summary;
}
