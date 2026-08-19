import { google, texttospeech_v1 } from 'googleapis';
import { optionalEnv } from '@/lib/env';
import { getGoogleCredentials } from '@/lib/google-credentials';
import { Language } from './sheets';

/** Google Cloud TTS locale and voice per language. Override with `TTS_VOICE_<LANG>`. */
const VOICES: Record<Language, { languageCode: string; name: string }> = {
  ja: { languageCode: 'ja-JP', name: 'ja-JP-Chirp3-HD-Enceladus' },
  en: { languageCode: 'en-US', name: 'en-US-Neural2-F' },
  es: { languageCode: 'es-ES', name: 'es-ES-Neural2-A' },
  pt: { languageCode: 'pt-BR', name: 'pt-BR-Neural2-A' },
  id: { languageCode: 'id-ID', name: 'id-ID-Standard-A' },
  ar: { languageCode: 'ar-XA', name: 'ar-XA-Wavenet-A' },
};

export class TextToSpeechService {
  private tts: texttospeech_v1.Texttospeech;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      credentials: getGoogleCredentials(),
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    this.tts = google.texttospeech({ version: 'v1', auth });
  }

  /**
   * Synthesizes narration as MP3. `speakingRate` is how the render pipeline
   * fits the narration into the 20s / 65s slot.
   */
  async synthesize(text: string, language: Language, speakingRate = 1): Promise<Buffer> {
    const fallback = VOICES[language];
    const voice = {
      languageCode: optionalEnv(`TTS_LANGUAGE_CODE_${language.toUpperCase()}`) ?? fallback.languageCode,
      name: optionalEnv(`TTS_VOICE_${language.toUpperCase()}`) ?? fallback.name,
    };

    const response = await this.tts.text.synthesize({
      requestBody: {
        input: { text },
        voice,
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: Math.min(Math.max(speakingRate, 0.5), 2),
        },
      },
    });

    const audio = response.data.audioContent;
    if (!audio) throw new Error('Text-to-Speech returned no audio');
    return Buffer.from(audio, 'base64');
  }
}
