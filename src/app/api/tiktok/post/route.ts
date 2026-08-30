import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { GoogleSheetsService, Language } from '@/services/sheets';
import { TikTokPostOptions, TikTokService } from '@/services/tiktok';

export const dynamic = 'force-dynamic';

interface PostBody {
  lang?: string;
  videoUrl?: string;
  title?: string;
  draft?: boolean;
  options?: Partial<TikTokPostOptions>;
}

/** Publishes one rendered video with the options chosen on the admin page. */
export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as PostBody;
    if (!body.videoUrl) {
      return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 });
    }
    if (!body.draft && !body.options?.privacyLevel) {
      return NextResponse.json({ error: 'privacyLevel is required' }, { status: 400 });
    }

    const lang = (body.lang ?? 'ja') as Language;
    const sheets = new GoogleSheetsService();
    const channel = await sheets.getChannelConfig(lang, 'TikTok');
    if (!channel) {
      return NextResponse.json({ error: `No TikTok channel for "${lang}"` }, { status: 404 });
    }

    const publishId = await new TikTokService(sheets).uploadVideo({
      channel,
      description: body.title ?? '',
      videoUrl: body.videoUrl,
      draft: body.draft ?? false,
      postOptions: body.draft
        ? undefined
        : {
            privacyLevel: body.options?.privacyLevel as string,
            disableComment: body.options?.disableComment ?? false,
            disableDuet: body.options?.disableDuet ?? false,
            disableStitch: body.options?.disableStitch ?? false,
            brandOrganicToggle: body.options?.brandOrganicToggle ?? false,
            brandContentToggle: body.options?.brandContentToggle ?? false,
          },
    });

    return NextResponse.json({ publishId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('TikTok post failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
