import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { runAnalysisPipeline } from "@/lib/pipeline/analyze";

const bodySchema = z.object({
  articleIds: z.array(z.string()).optional(),
  batchSize: z.number().int().positive().optional(),
});

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-biasly-admin-secret");
  if (!secret || secret !== process.env.BIASLY_ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.text();
  let parsedInput: z.infer<typeof bodySchema> = {};
  if (rawBody) {
    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const result = bodySchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request body", issues: result.error.issues }, { status: 400 });
    }
    parsedInput = result.data;
  }

  const summary = await runAnalysisPipeline({
    articleIds: parsedInput.articleIds,
    batchSize: parsedInput.batchSize,
  });

  return NextResponse.json(summary);
}
