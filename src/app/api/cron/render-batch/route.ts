import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/auth";
import { ALL_PATTERNS, SCHEDULED_PATTERNS } from "@/lib/patterns";
import { runRenderBatch } from "@/lib/render-batch";
import { CreatomateService } from "@/services/creatomate";
import { GoogleSheetsService, Pattern } from "@/services/sheets";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * `?patterns=65s` renders a pattern the schedule leaves alone, for a planned manual upload.
 * `?tasks=<task_id>,<task_id>` jumps the queue order for slots that air before the rest.
 */
function requestedPatterns(request: Request): Pattern[] {
  const requested = new URL(request.url).searchParams.get("patterns");
  if (!requested) return SCHEDULED_PATTERNS;
  return ALL_PATTERNS.filter((pattern) =>
    requested.split(",").includes(pattern),
  );
}

export async function GET(request: Request) {
  // Scenario 2 Trigger: Creatomate batch rendering
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const patterns = requestedPatterns(request);
  const tasks = new URL(request.url).searchParams.get("tasks");
  if (patterns.length === 0) {
    return NextResponse.json(
      { error: `patterns must be one of ${ALL_PATTERNS}` },
      { status: 400 },
    );
  }

  try {
    const result = await runRenderBatch(
      new GoogleSheetsService(),
      new CreatomateService(),
      {
        patterns,
        taskIds: tasks ? tasks.split(",") : undefined,
      },
    );
    return NextResponse.json({ status: "Render batch initiated", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Render batch failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
