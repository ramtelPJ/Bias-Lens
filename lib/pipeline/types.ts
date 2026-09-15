export interface PerSourceResult {
  sourceId: string;
  sourceName: string;
  candidatesFound: number;
  candidatesRejected: number;
  duplicatesSkipped: number;
  detailPagesScraped: number;
  articlesInserted: number;
  articlesRejected: number;
  articlesFailed: number;
  error: string | null;
}

export interface RunSummary {
  status: "completed" | "failed";
  sourcesChecked: number;
  candidatesFound: number;
  candidatesRejected: number;
  duplicatesSkipped: number;
  detailPagesScraped: number;
  articlesInserted: number;
  articlesRejected: number;
  articlesFailed: number;
  durationMs: number;
  rejectionReasons: Record<string, number>;
  perSource: PerSourceResult[];
}

export interface ScheduleSyncSummary {
  status: "completed" | "failed";
  sourcesChecked: number;
  schedulesCreated: number;
  schedulesSkipped: number;
  staleSchedulesDeactivated: number;
  orphanSchedulesDeactivated: number;
  durationMs: number;
}

export interface ScheduledResultsSummary extends RunSummary {
  jobsProcessed: number;
  jobsFailed: number;
}

export interface AnalysisRunSummary {
  status: "completed" | "failed";
  articlesScanned: number;
  articlesAnalyzed: number;
  embeddingsBackfilled: number;
  articlesSkipped: number;
  articlesFailed: number;
  batchesProcessed: number;
  durationMs: number;
  failureReasons: Record<string, number>;
}
