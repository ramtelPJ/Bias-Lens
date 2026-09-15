import "server-only";

import { getJobResultHtml, listDoneJobIds } from "@/lib/oxylabs/scheduler-client";
import { runScrapePipeline } from "@/lib/pipeline/scrape";
import type { RunSummary, ScheduledResultsSummary } from "@/lib/pipeline/types";
import { getSchedulesWithSourceNames } from "@/lib/supabase/queries/oxylabs-schedules";
import { getProcessedJobIds, markJobProcessed } from "@/lib/supabase/queries/oxylabs-schedule-runs";
import { getActiveSources } from "@/lib/supabase/queries/sources";

function log(message: string, meta?: unknown) {
  console.log(`[scheduled-results] ${message}`, meta ?? "");
}

function emptyRunSummary(): RunSummary {
  return {
    status: "completed",
    sourcesChecked: 0,
    candidatesFound: 0,
    candidatesRejected: 0,
    duplicatesSkipped: 0,
    detailPagesScraped: 0,
    articlesInserted: 0,
    articlesRejected: 0,
    articlesFailed: 0,
    durationMs: 0,
    rejectionReasons: {},
    perSource: [],
  };
}

function mergeRunSummaries(a: RunSummary, b: RunSummary): RunSummary {
  const rejectionReasons: Record<string, number> = { ...a.rejectionReasons };
  for (const [reason, count] of Object.entries(b.rejectionReasons)) {
    rejectionReasons[reason] = (rejectionReasons[reason] ?? 0) + count;
  }
  return {
    status: a.status === "failed" || b.status === "failed" ? "failed" : "completed",
    sourcesChecked: a.sourcesChecked + b.sourcesChecked,
    candidatesFound: a.candidatesFound + b.candidatesFound,
    candidatesRejected: a.candidatesRejected + b.candidatesRejected,
    duplicatesSkipped: a.duplicatesSkipped + b.duplicatesSkipped,
    detailPagesScraped: a.detailPagesScraped + b.detailPagesScraped,
    articlesInserted: a.articlesInserted + b.articlesInserted,
    articlesRejected: a.articlesRejected + b.articlesRejected,
    articlesFailed: a.articlesFailed + b.articlesFailed,
    durationMs: a.durationMs + b.durationMs,
    rejectionReasons,
    perSource: [...a.perSource, ...b.perSource],
  };
}

// AGENTS.md §18: processing runs the same scrape-to-insert pipeline as
// manual scraping (via runScrapePipeline's injectable getHomepageHtml), fed
// with homepage HTML pulled from completed Oxylabs Scheduler jobs instead of
// a live fetch. Each schedule has exactly one item (its source's homepage —
// see scheduler-sync.ts), so a schedule's jobs always belong to that same
// source; no separate URL-matching is needed to figure out which source a
// job's HTML came from.
export async function runScheduledResultsProcessing(): Promise<ScheduledResultsSummary> {
  const startedAt = Date.now();
  log("processing started");

  const [schedules, activeSources] = await Promise.all([getSchedulesWithSourceNames(), getActiveSources()]);
  const activeSourceById = new Map(activeSources.map((s) => [s.id, s]));

  let jobsProcessed = 0;
  let jobsFailed = 0;
  let scrapeSummary = emptyRunSummary();

  for (const schedule of schedules) {
    const source = activeSourceById.get(schedule.source_id);
    if (!source) continue; // stale/inactive source — scheduler-sync cleans these up separately

    let doneJobIds: string[];
    try {
      doneJobIds = await listDoneJobIds(schedule.oxylabs_schedule_id);
    } catch (error) {
      log(`failed to list runs for schedule: ${schedule.source_name}`, error);
      continue;
    }
    if (doneJobIds.length === 0) continue;

    const processedIds = await getProcessedJobIds(doneJobIds);
    const newJobIds = doneJobIds.filter((id) => !processedIds.has(id));
    if (newJobIds.length === 0) continue;

    log(`new completed jobs for ${schedule.source_name}`, { count: newJobIds.length });

    for (const jobId of newJobIds) {
      try {
        const html = await getJobResultHtml(jobId);
        const pipelineResult = await runScrapePipeline({
          sourceNames: [source.name],
          getHomepageHtml: async () => html,
        });
        scrapeSummary = mergeRunSummaries(scrapeSummary, pipelineResult);
        await markJobProcessed(schedule.id, jobId, "done");
        jobsProcessed += 1;
        log(`job processed: ${jobId}`, { source: schedule.source_name });
      } catch (error) {
        jobsFailed += 1;
        log(`failed to process job ${jobId} for ${schedule.source_name}`, error);
      }
    }
  }

  const summary: ScheduledResultsSummary = {
    ...scrapeSummary,
    jobsProcessed,
    jobsFailed,
    durationMs: Date.now() - startedAt,
  };

  log("processing completed", summary);
  return summary;
}
