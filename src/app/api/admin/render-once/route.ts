import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { INTRO_SECONDS, synthesizeNarration } from '@/lib/render';
import { CreatomateService } from '@/services/creatomate';
import { Language, Pattern } from '@/services/sheets';
import { uploadVoiceover } from '@/services/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const LANGUAGES: Language[] = ['ja', 'en', 'es', 'pt', 'id', 'ar'];
const OUTRO_SECONDS = 0.8;
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 240_000;

interface RenderOnceBody {
  templateId?: string;
  language?: string;
  pattern?: string;
  hook?: string;
  body?: string;
  cta?: string;
  backgroundUrl?: string;
  name?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Renders a single video from a script supplied in the request, bypassing the
 * weekly queue. Used for evergreen clips such as the app introduction, whose
 * script is fixed and whose template differs from the horoscope ones.
 */
export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = (await req.json()) as RenderOnceBody;
    if (!payload.templateId || !payload.hook || !payload.body || !payload.cta) {
      return NextResponse.json(
        { error: 'templateId, hook, body and cta are required' },
        { status: 400 },
      );
    }
    const language = (payload.language ?? 'ja') as Language;
    if (!LANGUAGES.includes(language)) {
      return NextResponse.json({ error: `Unsupported language "${language}"` }, { status: 400 });
    }
    const pattern = (payload.pattern ?? '20s') as Pattern;
    if (pattern !== '20s' && pattern !== '65s') {
      return NextResponse.json({ error: `Unsupported pattern "${pattern}"` }, { status: 400 });
    }

    const script = {
      hook_text: payload.hook,
      body_script: payload.body,
      cta_text: payload.cta,
    };
    const name = (payload.name ?? `oneoff-${language}-${pattern}`).replace(/[^a-zA-Z0-9._-]/g, '-');

    const { audio, speed, duration } = await synthesizeNarration(
      [script.hook_text, script.body_script, script.cta_text].join('\n'),
      language,
      pattern,
    );
    const voiceoverUrl = await uploadVoiceover(`oneoff/${name}.mp3`, audio);

    const creatomate = new CreatomateService();
    const { renderId } = await creatomate.triggerRender({
      taskId: name,
      templateId: payload.templateId,
      pattern,
      language,
      scriptData: script,
      voiceoverUrl,
      backgroundUrl: payload.backgroundUrl,
      durationSeconds:
        duration > 0 ? Number((INTRO_SECONDS + duration + OUTRO_SECONDS).toFixed(2)) : undefined,
      voiceoverStart: INTRO_SECONDS,
      speed,
    });

    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const render = await creatomate.getRender(renderId);
      if (render.status === 'succeeded' || render.status === 'failed') {
        return NextResponse.json({
          renderId,
          status: render.status,
          url: render.url,
          duration: render.duration,
          error: render.errorMessage,
          voiceoverUrl,
          narrationSeconds: duration,
          speed,
        });
      }
      await sleep(POLL_INTERVAL_MS);
    }

    return NextResponse.json({ renderId, status: 'rendering', voiceoverUrl, speed });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('One-off render failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
