import "server-only";

import { supabaseServiceClient } from "@/lib/supabase/service-client";
import type { Database } from "@/lib/supabase/types";

export type OxylabsScheduleRow = Database["public"]["Tables"]["oxylabs_schedules"]["Row"];
export type OxylabsScheduleInsert = Database["public"]["Tables"]["oxylabs_schedules"]["Insert"];

export interface ScheduleWithSourceName extends OxylabsScheduleRow {
  source_name: string;
}

export async function getStoredSchedules(): Promise<OxylabsScheduleRow[]> {
  const { data, error } = await supabaseServiceClient.from("oxylabs_schedules").select("*");
  if (error) throw error;
  return data;
}

export async function getSchedulesWithSourceNames(): Promise<ScheduleWithSourceName[]> {
  const { data, error } = await supabaseServiceClient
    .from("oxylabs_schedules")
    .select("*, sources(name)")
    .order("created_at", { ascending: true });
  if (error) throw error;

  return (data as unknown as (OxylabsScheduleRow & { sources: { name: string } | null })[]).map((row) => {
    const { sources, ...schedule } = row;
    return { ...schedule, source_name: sources?.name ?? "unknown" };
  });
}

export async function insertSchedule(row: OxylabsScheduleInsert): Promise<void> {
  const { error } = await supabaseServiceClient.from("oxylabs_schedules").insert(row);
  if (error) throw error;
}

export async function deleteSchedule(id: string): Promise<void> {
  const { error } = await supabaseServiceClient.from("oxylabs_schedules").delete().eq("id", id);
  if (error) throw error;
}
