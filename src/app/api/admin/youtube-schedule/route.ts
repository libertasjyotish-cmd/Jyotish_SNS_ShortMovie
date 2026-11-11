import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/auth";
import { LANGUAGES, type Language } from "@/lib/languages";
import { GoogleSheetsService } from "@/services/sheets";
import { YouTubeService } from "@/services/youtube";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface ScheduleBody {
  lang?: string;
  video_url?: string;
  title?: string;
  description?: string;
  publish_at?: string;
}

/**
 * Uploads one finished video to a language's YouTube channel, private until `publish_at`, when
 * YouTube publishes it. For hand-picked videos outside the queue, so `PAUSED_PLATFORMS` does not
 * apply. `POST {lang, video_url, title, description, publish_at}`.
 */
export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as ScheduleBody;
  const lang = body.lang as Language;
  if (!LANGUAGES.includes(lang)) {
    return NextResponse.json({ error: "unknown lang" }, { status: 400 });
  }
  if (
    !body.video_url?.startsWith("https://") ||
    !body.title ||
    !body.description
  ) {
    return NextResponse.json(
      { error: "video_url, title and description are required" },
      { status: 400 },
    );
  }
  const publishAt = Date.parse(body.publish_at ?? "");
  if (Number.isNaN(publishAt) || publishAt <= Date.now()) {
    return NextResponse.json(
      { error: "publish_at must be a future ISO time" },
      { status: 400 },
    );
  }

  try {
    const channel = await new GoogleSheetsService().getChannelConfig(
      lang,
      "YouTube",
    );
    if (!channel?.youtube_refresh_token) throw new Error("no YouTube channel");
    const videoId = await new YouTubeService().uploadVideo({
      channel,
      lang,
      title: body.title,
      description: body.description,
      videoUrl: body.video_url,
      publishAt: new Date(publishAt).toISOString(),
    });
    return NextResponse.json({
      video_id: videoId,
      publish_at: new Date(publishAt).toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("YouTube schedule failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
