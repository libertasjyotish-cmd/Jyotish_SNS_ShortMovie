import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth';
import { Language } from '@/services/sheets';
import { uploadVoiceover } from '@/services/storage';
import { TextToSpeechService } from '@/services/tts';

export const dynamic = 'force-dynamic';

const LANGUAGES: Language[] = ['ja', 'en', 'es', 'pt', 'id', 'ar'];

/**
 * Synthesizes a one-off narration and returns its Blob URL, so template setup
 * and voice checks do not require running the whole render pipeline.
 */
export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { text?: string; language?: string; name?: string };
    if (!body.text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }
    const language = (body.language ?? 'ja') as Language;
    if (!LANGUAGES.includes(language)) {
      return NextResponse.json({ error: `Unsupported language "${language}"` }, { status: 400 });
    }

    const audio = await new TextToSpeechService().synthesize(body.text, language);
    const name = (body.name ?? `sample-${language}`).replace(/[^a-zA-Z0-9._-]/g, '-');
    const url = await uploadVoiceover(`preview/${name}.mp3`, audio);

    return NextResponse.json({ url, language, bytes: audio.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('TTS preview failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
