import { NextResponse, type NextRequest } from "next/server";

import { runAnalysisPipeline } from "@/lib/pipeline/analyze";
import { runScheduledResultsProcessing } from "@/lib/pipeline/scheduled-results";
import type { AnalysisRunSummary, ScheduledResultsSummary } from "@/lib/pipeline/types";

function log(message: string, meta?: unknown) {
  console.log(`[cron] ${message}`, meta ?? "");
}

// Vercel Cron only — GET is the one AGENTS.md §14 exception, since Vercel
// Cron always sends GET. Protected by CRON_SECRET (injected by Vercel;
// never in .env.local), skipped in local dev per AGENTS.md §18 so the route
// stays manually testable before Vercel Cron is configured.
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  log("pipeline started");

  // Step 1: process scheduled Oxylabs results. Step 2 must still run even if
  // this throws — pre-existing unanalyzed articles may need analysis
  // regardless (AGENTS.md §18 point 6).
  let scrape: ScheduledResultsSummary | { status: "failed"; error: string };
  try {
    scrape = await runScheduledResultsProcessing();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("scheduled-results processing failed", message);
    scrape = { status: "failed", error: message };
  }

  const analyze: AnalysisRunSummary = await runAnalysisPipeline();

  log("pipeline completed", { scrape, analyze });

  return NextResponse.json({ scrape, analyze });
}
