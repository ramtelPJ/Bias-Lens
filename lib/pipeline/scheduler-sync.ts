import "server-only";

import { createHourlySchedule, listOxylabsScheduleIds, setScheduleActive } from "@/lib/oxylabs/scheduler-client";
import { getActiveSources } from "@/lib/supabase/queries/sources";
import { deleteSchedule, getStoredSchedules, insertSchedule } from "@/lib/supabase/queries/oxylabs-schedules";
import type { ScheduleSyncSummary } from "@/lib/pipeline/types";

function log(message: string, meta?: unknown) {
  console.log(`[scheduler-sync] ${message}`, meta ?? "");
}

// AGENTS.md §18: sync = create one Oxylabs schedule per active source that
// doesn't have one yet, deactivate schedules for sources no longer active,
// then sweep Oxylabs for orphaned schedules (created previously, DB row
// since deleted) that would otherwise keep billing hourly forever.
export async function runScheduleSync(): Promise<ScheduleSyncSummary> {
  const startedAt = Date.now();
  log("sync started");

  const [activeSources, storedSchedules] = await Promise.all([getActiveSources(), getStoredSchedules()]);
  const activeSourceIds = new Set(activeSources.map((s) => s.id));
  const scheduleBySourceId = new Map(storedSchedules.map((s) => [s.source_id, s]));
  const knownScheduleIds = new Set(storedSchedules.map((s) => s.oxylabs_schedule_id));

  let schedulesCreated = 0;
  let schedulesSkipped = 0;
  for (const source of activeSources) {
    if (scheduleBySourceId.has(source.id)) {
      schedulesSkipped += 1;
      continue;
    }
    log(`creating schedule for source: ${source.name}`);
    const schedule = await createHourlySchedule(source.listing_url);
    await insertSchedule({ source_id: source.id, oxylabs_schedule_id: schedule.scheduleId, cron: schedule.cron });
    knownScheduleIds.add(schedule.scheduleId);
    schedulesCreated += 1;
    log(`schedule created: ${source.name}`, { oxylabsScheduleId: schedule.scheduleId });
  }

  let staleSchedulesDeactivated = 0;
  for (const schedule of storedSchedules) {
    if (activeSourceIds.has(schedule.source_id)) continue;
    log("deactivating schedule for inactive source", { oxylabsScheduleId: schedule.oxylabs_schedule_id });
    await setScheduleActive(schedule.oxylabs_schedule_id, false);
    await deleteSchedule(schedule.id);
    knownScheduleIds.delete(schedule.oxylabs_schedule_id);
    staleSchedulesDeactivated += 1;
  }

  const oxylabsScheduleIds = await listOxylabsScheduleIds();
  let orphanSchedulesDeactivated = 0;
  for (const id of oxylabsScheduleIds) {
    if (knownScheduleIds.has(id)) continue;
    log("deactivating orphaned Oxylabs schedule", { oxylabsScheduleId: id });
    await setScheduleActive(id, false);
    orphanSchedulesDeactivated += 1;
  }

  const summary: ScheduleSyncSummary = {
    status: "completed",
    sourcesChecked: activeSources.length,
    schedulesCreated,
    schedulesSkipped,
    staleSchedulesDeactivated,
    orphanSchedulesDeactivated,
    durationMs: Date.now() - startedAt,
  };

  log("sync completed", summary);
  return summary;
}
