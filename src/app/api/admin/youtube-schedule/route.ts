import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/auth";
import { playlistDescription } from "@/lib/cta";
import { LANGUAGES, type Language } from "@/lib/languages";
import { GoogleSheetsService, type Channel } from "@/services/sheets";
import { YouTubeService } from "@/services/youtube";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface ScheduleBody {
  lang?: string;
  video_url?: string;
  title?: string;
  description?: string;
  publish_at?: string;
  /** Adds a video already on the channel to `playlist_title` instead of uploading one. */
  video_id?: string;
  playlist_title?: string;
}

/**
 * Uploads one finished video to a language's YouTube channel, private until `publish_at`, when
 * YouTube publishes it. For hand-picked videos outside the queue, so `PAUSED_PLATFORMS` does not
 * apply. `POST {lang, video_url, title, description, publish_at, playlist_title?}`.
 *
 * With `playlist_title` the video also joins that playlist, created on first use. `{lang, video_id,
 * playlist_title}` adds a video that is already uploaded.
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
  if (body.video_id) {
    if (!body.playlist_title) {
      return NextResponse.json(
        { error: "playlist_title is required with video_id" },
        { status: 400 },
      );
    }
    try {
      const channel = await youtubeChannel(lang);
      await addToPlaylist(channel, lang, body.playlist_title, body.video_id);
      return NextResponse.json({ video_id: body.video_id });
    } catch (error) {
      return failure(error);
    }
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
    const channel = await youtubeChannel(lang);
    const videoId = await youtube.uploadVideo({
      channel,
      lang,
      title: body.title,
      description: body.description,
      videoUrl: body.video_url,
      publishAt: new Date(publishAt).toISOString(),
    });
    if (body.playlist_title) {
      await addToPlaylist(channel, lang, body.playlist_title, videoId);
    }
    return NextResponse.json({
      video_id: videoId,
      publish_at: new Date(publishAt).toISOString(),
    });
  } catch (error) {
    return failure(error);
  }
}

const youtube = new YouTubeService();

async function youtubeChannel(lang: Language): Promise<Channel> {
  const channel = await new GoogleSheetsService().getChannelConfig(
    lang,
    "YouTube",
  );
  if (!channel?.youtube_refresh_token) throw new Error("no YouTube channel");
  return channel;
}

async function addToPlaylist(
  channel: Channel,
  lang: Language,
  title: string,
  videoId: string,
): Promise<void> {
  const playlistId = await youtube.ensurePlaylist(
    channel,
    title,
    playlistDescription(lang),
  );
  await youtube.addToPlaylist(channel, playlistId, videoId);
}

function failure(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error("YouTube schedule failed:", message);
  return NextResponse.json({ error: message }, { status: 500 });
}
