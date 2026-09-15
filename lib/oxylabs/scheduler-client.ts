import "server-only";

// Oxylabs Scheduler API (AGENTS.md §18). Docs live-fetched from
// https://developers.oxylabs.io/products/web-scraper-api/features/scheduler
// before implementing — endpoint paths/fields below are confirmed against
// that page, not assumed from memory.
const SCHEDULER_BASE = "https://data.oxylabs.io/v1";

export class OxylabsSchedulerError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "OxylabsSchedulerError";
  }
}

function authHeader(): string {
  const username = process.env.OXY_WSA_USERNAME;
  const password = process.env.OXY_WSA_PASSWORD;
  if (!username || !password) throw new Error("Missing OXY_WSA_USERNAME/OXY_WSA_PASSWORD");
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

async function request(method: string, path: string, body?: unknown): Promise<string> {
  const response = await fetch(`${SCHEDULER_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const rawText = await response.text();
  if (!response.ok) {
    throw new OxylabsSchedulerError(`Oxylabs ${method} ${path} failed with HTTP ${response.status}: ${rawText}`, response.status);
  }
  return rawText;
}

// AGENTS.md §18 critical rule: Oxylabs schedule_id and job id are 64-bit
// integers that exceed Number.MAX_SAFE_INTEGER. They appear as bare JSON
// numbers in these responses, so JSON.parse silently corrupts the last
// digits. Read the exact digit sequence from the raw text instead — never
// JSON.parse these fields, and never convert a parsed number back to string.
function extractFirstIntField(rawText: string, field: string): string {
  const match = rawText.match(new RegExp(`"${field}"\\s*:\\s*(\\d+)`));
  if (!match) throw new OxylabsSchedulerError(`Could not find "${field}" in Oxylabs response: ${rawText}`);
  return match[1];
}

// Every `"id": <digits>` in document order. GET /schedules/{id}/runs nests
// job ids inside runs[].jobs[] — JSON.parse corrupts the numeric value but
// preserves array/property order, so the Nth regex match (scanned over the
// same raw text) lines up with the Nth job in runs.flatMap(r => r.jobs).
// Matching on the literal `"id"` key (not `"run_id"`) — the character right
// before "id" in "run_id" is "_", not a quote, so it never matches.
function extractAllIntFields(rawText: string, field: string): string[] {
  return Array.from(rawText.matchAll(new RegExp(`"${field}"\\s*:\\s*(\\d+)`, "g")), (m) => m[1]);
}

function formatEndTime(date: Date): string {
  // Oxylabs' documented format: "YYYY-MM-DD HH:MM:SS", UTC, no offset.
  return date.toISOString().slice(0, 19).replace("T", " ");
}

const TEN_YEARS_MS = 10 * 365 * 24 * 60 * 60 * 1000;
const HOURLY_CRON = "0 * * * *"; // top of every hour, per AGENTS.md §18

export interface CreatedSchedule {
  scheduleId: string;
  cron: string;
}

// One schedule per source, one item per schedule (AGENTS.md §18: "creates
// one Oxylabs schedule per active source"). Mirrors fetchHtml's default: no
// render, cheapest option.
export async function createHourlySchedule(url: string): Promise<CreatedSchedule> {
  const endTime = formatEndTime(new Date(Date.now() + TEN_YEARS_MS));
  const rawText = await request("POST", "/schedules", {
    cron: HOURLY_CRON,
    items: [{ source: "universal", url }],
    end_time: endTime,
  });
  return { scheduleId: extractFirstIntField(rawText, "schedule_id"), cron: HOURLY_CRON };
}

// GET /schedules returns ids as quoted strings already — safe to JSON.parse
// directly, unlike schedule_id/job id elsewhere.
export async function listOxylabsScheduleIds(): Promise<string[]> {
  const rawText = await request("GET", "/schedules");
  const parsed = JSON.parse(rawText) as { schedules: string[] };
  return parsed.schedules;
}

export async function setScheduleActive(scheduleId: string, active: boolean): Promise<void> {
  await request("PUT", `/schedules/${scheduleId}/state`, { active });
}

// AGENTS.md §18: use /runs, not /jobs — only /runs carries per-job
// result_status, and only "done" jobs have fetchable results. Never fetch
// results for "pending" or "faulted" jobs.
export async function listDoneJobIds(scheduleId: string): Promise<string[]> {
  const rawText = await request("GET", `/schedules/${scheduleId}/runs`);
  const rawIds = extractAllIntFields(rawText, "id");
  const parsed = JSON.parse(rawText) as { runs: { jobs: { result_status: string }[] }[] };
  const statuses = parsed.runs.flatMap((run) => run.jobs.map((job) => job.result_status));
  return rawIds.filter((_, i) => statuses[i] === "done");
}

// jobId here is already a raw-text-extracted string (never a JS number), so
// interpolating it into the path is precision-safe.
export async function getJobResultHtml(jobId: string): Promise<string> {
  const rawText = await request("GET", `/queries/${jobId}/results`);
  const parsed = JSON.parse(rawText) as { results?: { content?: string }[] };
  const content = parsed.results?.[0]?.content;
  if (typeof content !== "string") {
    throw new OxylabsSchedulerError(`Job ${jobId} result had no content`);
  }
  return content;
}
