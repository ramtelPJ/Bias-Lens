import { NextResponse, type NextRequest } from "next/server";

import { runScheduledResultsProcessing } from "@/lib/pipeline/scheduled-results";

// Starts pipeline work — admin secret required (AGENTS.md §15).
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-biasly-admin-secret");
  if (!secret || secret !== process.env.BIASLY_ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runScheduledResultsProcessing();
  return NextResponse.json(summary);
}
