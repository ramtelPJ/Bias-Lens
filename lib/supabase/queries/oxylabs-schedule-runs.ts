import "server-only";

import { supabaseServiceClient } from "@/lib/supabase/service-client";

const JOB_ID_CHECK_CHUNK_SIZE = 15; // Same chunking rule as AGENTS.md §9's URL existence check — never exceed 15 per .in()

// Dedupe check for scheduled-results processing: which of these already-done
// job ids have we ingested before? Never re-process the same Oxylabs run.
export async function getProcessedJobIds(jobIds: string[]): Promise<Set<string>> {
  const processed = new Set<string>();

  for (let i = 0; i < jobIds.length; i += JOB_ID_CHECK_CHUNK_SIZE) {
    const chunk = jobIds.slice(i, i + JOB_ID_CHECK_CHUNK_SIZE);
    if (chunk.length === 0) continue;
    const { data, error } = await supabaseServiceClient
      .from("oxylabs_schedule_runs")
      .select("oxylabs_job_id")
      .in("oxylabs_job_id", chunk);
    if (error) throw error;
    for (const row of data) processed.add(row.oxylabs_job_id);
  }

  return processed;
}

export async function markJobProcessed(scheduleId: string, jobId: string, resultStatus: string): Promise<void> {
  const { error } = await supabaseServiceClient.from("oxylabs_schedule_runs").insert({
    schedule_id: scheduleId,
    oxylabs_job_id: jobId,
    result_status: resultStatus,
  });
  if (error) throw error;
}

export interface RunHistoryRow {
  oxylabs_job_id: string;
  result_status: string;
  processed_at: string;
  source_name: string;
}

export async function getRunHistory(limit = 50): Promise<RunHistoryRow[]> {
  const { data, error } = await supabaseServiceClient
    .from("oxylabs_schedule_runs")
    .select("oxylabs_job_id, result_status, processed_at, oxylabs_schedules(sources(name))")
    .order("processed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  type Row = {
    oxylabs_job_id: string;
    result_status: string;
    processed_at: string;
    oxylabs_schedules: { sources: { name: string } | null } | null;
  };

  return (data as unknown as Row[]).map((row) => ({
    oxylabs_job_id: row.oxylabs_job_id,
    result_status: row.result_status,
    processed_at: row.processed_at,
    source_name: row.oxylabs_schedules?.sources?.name ?? "unknown",
  }));
}
