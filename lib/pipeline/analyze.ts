import "server-only";
import { NoObjectGeneratedError } from "ai";

import { ANALYSIS_DISCLAIMER, ANALYSIS_MODEL, analyzeArticleText, type AnalysisOutput } from "@/lib/ai/analyze-article";
import {
  getPendingArticles,
  getPendingArticlesByIds,
  type PendingArticle,
} from "@/lib/supabase/queries/pending-articles";
import { insertAnalysis, markArticleAnalyzed } from "@/lib/supabase/queries/pipeline-analyses";
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

type AttemptResult = { ok: true; output: AnalysisOutput } | { ok: false; reason: "invalid_output" | "api_error" };

function log(message: string, meta?: unknown) {
  console.log(`[analyze] ${message}`, meta ?? "");
}

async function analyzeWithRetry(article: PendingArticle): Promise<AttemptResult> {
  let lastReason: "invalid_output" | "api_error" = "api_error";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const output = await analyzeArticleText(article.title, article.rawText);
      return { ok: true, output };
    } catch (error) {
      lastReason = NoObjectGeneratedError.isInstance(error) ? "invalid_output" : "api_error";
      log(`attempt ${attempt} failed for article ${article.id} (${lastReason})`, error);
    }
  }

  return { ok: false, reason: lastReason };
}

export async function runAnalysisPipeline(options: RunAnalyzeOptions = {}): Promise<AnalysisRunSummary> {
  const startedAt = Date.now();
  const batchSize = options.batchSize ?? Number(process.env.ANALYSIS_BATCH_SIZE ?? DEFAULT_BATCH_SIZE);

  log("analysis started");

  let articlesScanned = 0;
  let articlesAnalyzed = 0;
  let articlesSkipped = 0;
  let articlesFailed = 0;
  let batchesProcessed = 0;
  const failureReasons: Record<string, number> = {};
  // An article that fails (even after retry) has no article_analyses row, so
  // it would still look "pending" on the next fetch. Track it here so the
  // loop below can exclude it and actually terminate.
  const failedIds = new Set<string>();

  async function processBatch(batch: PendingArticle[]): Promise<void> {
    batchesProcessed += 1;
    log(`batch ${batchesProcessed} started`, { size: batch.length });

    for (const article of batch) {
      articlesScanned += 1;
      const result = await analyzeWithRetry(article);

      if (!result.ok) {
        articlesFailed += 1;
        failedIds.add(article.id);
        failureReasons[result.reason] = (failureReasons[result.reason] ?? 0) + 1;
        log(`article failed: ${article.id}`, result.reason);
        continue;
      }

      const biasScore = (result.output.rightPercentage - result.output.leftPercentage) / 100;

      const insertResult = await insertAnalysis({
        article_id: article.id,
        summary: result.output.summary,
        sentiment_score: result.output.sentimentScore,
        sentiment_label: result.output.sentimentLabel,
        bias_score: biasScore,
        bias_label: result.output.politicalFramingLabel,
        left_percentage: result.output.leftPercentage,
        center_percentage: result.output.centerPercentage,
        right_percentage: result.output.rightPercentage,
        confidence: result.output.confidence,
        framing_notes: result.output.framingNotes,
        loaded_terms: result.output.loadedTerms,
        disclaimer: ANALYSIS_DISCLAIMER,
        model: ANALYSIS_MODEL,
      });

      if (insertResult.status === "duplicate") {
        articlesSkipped += 1;
        log(`already analyzed, skipped: ${article.id}`);
        continue;
      }

      await markArticleAnalyzed(article.id);
      articlesAnalyzed += 1;
      log(`article analyzed: ${article.id}`);
    }

    log(`batch ${batchesProcessed} completed`, {
      analyzed: articlesAnalyzed,
      failed: articlesFailed,
      skipped: articlesSkipped,
    });
  }

  function buildSummary(status: AnalysisRunSummary["status"]): AnalysisRunSummary {
    return {
      status,
      articlesScanned,
      articlesAnalyzed,
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
    // Loop until no pending, not-yet-failed articles remain (AGENTS.md §19
    // requirement #3). excludeIds keeps this from retrying the same failure
    // forever — see the comment on getPendingArticles.
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
