import { NextResponse, type NextRequest } from "next/server";

import { runScheduleSync } from "@/lib/pipeline/scheduler-sync";
import { getSchedulesWithSourceNames } from "@/lib/supabase/queries/oxylabs-schedules";

// Mutates Oxylabs state (creates/deactivates schedules) — admin secret required (AGENTS.md §15).
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-biasly-admin-secret");
  if (!secret || secret !== process.env.BIASLY_ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runScheduleSync();
  return NextResponse.json(summary);
}

// Read-only DB status route (AGENTS.md §14) — no admin secret needed.
export async function GET() {
  const schedules = await getSchedulesWithSourceNames();
  return NextResponse.json({ schedules });
}
