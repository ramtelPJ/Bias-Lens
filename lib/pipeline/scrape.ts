import "server-only";

import { fetchHtml } from "@/lib/oxylabs/client";
import { extractCandidateLinks } from "@/lib/parsing/extract-candidate-links";
import { validateArticle } from "@/lib/parsing/validate-article";
import { getActiveSources, type SourceRow } from "@/lib/supabase/queries/sources";
import { getExistingOriginalUrls, insertArticle } from "@/lib/supabase/queries/pipeline-articles";
import type { PerSourceResult, RunSummary } from "@/lib/pipeline/types";

const DEFAULT_LIMIT_PER_SOURCE = 5;

export interface RunScrapeOptions {
  sourceNames?: string[];
  limitPerSource?: number;
  // Injectable so scheduler processing (AGENTS.md §18) can reuse this same
  // pipeline with homepage HTML sourced from a completed Oxylabs job instead
  // of a live fetch.
  getHomepageHtml?: (source: SourceRow) => Promise<string>;
}

function log(message: string, meta?: unknown) {
  console.log(`[scrape] ${message}`, meta ?? "");
}

export async function runScrapePipeline(options: RunScrapeOptions = {}): Promise<RunSummary> {
  const startedAt = Date.now();
  const limitPerSource = options.limitPerSource ?? DEFAULT_LIMIT_PER_SOURCE;
  const getHomepageHtml = options.getHomepageHtml ?? ((source: SourceRow) => fetchHtml(source.listing_url));

  log("scrape started");

  const activeSources = await getActiveSources();
  const selectedSources = options.sourceNames
    ? activeSources.filter((s) => options.sourceNames!.some((name) => name.toLowerCase() === s.name.toLowerCase()))
    : activeSources;

  log("selected sources", selectedSources.map((s) => s.name));

  const perSource: PerSourceResult[] = [];
  const rejectionReasons: Record<string, number> = {};

  for (const source of selectedSources) {
    const result: PerSourceResult = {
      sourceId: source.id,
      sourceName: source.name,
      candidatesFound: 0,
      candidatesRejected: 0,
      duplicatesSkipped: 0,
      detailPagesScraped: 0,
      articlesInserted: 0,
      articlesRejected: 0,
      articlesFailed: 0,
      error: null,
    };
    perSource.push(result);

    log(`source start: ${source.name}`);

    try {
      const homepageHtml = await getHomepageHtml(source);
      log(`homepage fetched: ${source.name}`);

      const { candidates, rejected } = extractCandidateLinks(homepageHtml, source.listing_url);
      result.candidatesFound = candidates.length;
      result.candidatesRejected = rejected;
      log(`candidates found: ${candidates.length}, rejected before detail scrape: ${rejected}`, source.name);

      const existingUrls = await getExistingOriginalUrls(candidates);
      const newCandidates = candidates.filter((url) => !existingUrls.has(url));
      result.duplicatesSkipped = candidates.length - newCandidates.length;
      log(`duplicates skipped: ${result.duplicatesSkipped}`, source.name);

      for (const candidateUrl of newCandidates) {
        if (result.articlesInserted >= limitPerSource) break;

        try {
          const detailHtml = await fetchHtml(candidateUrl);
          result.detailPagesScraped += 1;

          const validation = validateArticle(detailHtml, candidateUrl);
          if (!validation.ok) {
            result.articlesRejected += 1;
            rejectionReasons[validation.reason] = (rejectionReasons[validation.reason] ?? 0) + 1;
            log(`article rejected (${validation.reason}): ${candidateUrl}`);
            continue;
          }

          const insertResult = await insertArticle({
            source_id: source.id,
            original_url: candidateUrl,
            canonical_url: validation.article.canonicalUrl,
            title: validation.article.title,
            image_url: validation.article.imageUrl,
            published_at: validation.article.publishedAt,
            raw_text: validation.article.rawText,
          });

          if (insertResult.status === "duplicate") {
            result.duplicatesSkipped += 1;
            log(`duplicate on insert (race): ${candidateUrl}`);
          } else {
            result.articlesInserted += 1;
            log(`article inserted: ${candidateUrl}`);
          }
        } catch (detailError) {
          result.articlesFailed += 1;
          log(`detail page failed: ${candidateUrl}`, detailError);
        }
      }
    } catch (sourceError) {
      result.error = sourceError instanceof Error ? sourceError.message : String(sourceError);
      log(`source error: ${source.name}`, result.error);
    }

    log(`source completed: ${source.name}`, result);
  }

  const summary: RunSummary = {
    status: perSource.length > 0 && perSource.every((s) => s.error) ? "failed" : "completed",
    sourcesChecked: perSource.length,
    candidatesFound: perSource.reduce((sum, s) => sum + s.candidatesFound, 0),
    candidatesRejected: perSource.reduce((sum, s) => sum + s.candidatesRejected, 0),
    duplicatesSkipped: perSource.reduce((sum, s) => sum + s.duplicatesSkipped, 0),
    detailPagesScraped: perSource.reduce((sum, s) => sum + s.detailPagesScraped, 0),
    articlesInserted: perSource.reduce((sum, s) => sum + s.articlesInserted, 0),
    articlesRejected: perSource.reduce((sum, s) => sum + s.articlesRejected, 0),
    articlesFailed: perSource.reduce((sum, s) => sum + s.articlesFailed, 0),
    durationMs: Date.now() - startedAt,
    rejectionReasons,
    perSource,
  };

  log(summary.status === "completed" ? "scrape completed" : "scrape failed", summary);

  return summary;
}
