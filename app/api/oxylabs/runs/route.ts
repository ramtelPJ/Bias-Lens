import { NextResponse } from "next/server";

import { getRunHistory } from "@/lib/supabase/queries/oxylabs-schedule-runs";

// Read-only DB status route (AGENTS.md §14) — no admin secret needed.
export async function GET() {
  const runs = await getRunHistory();
  return NextResponse.json({ runs });
}
