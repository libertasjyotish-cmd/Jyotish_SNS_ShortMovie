import { put } from '@vercel/blob';
import { requireEnv } from '@/lib/env';

/**
 * Uploads narration audio to Vercel Blob and returns its public URL, which is
 * handed to Creatomate as the `Voiceover` source.
 */
export async function uploadVoiceover(pathname: string, audio: Buffer): Promise<string> {
  const blob = await put(pathname, audio, {
    access: 'public',
    contentType: 'audio/mpeg',
    token: requireEnv('BLOB_READ_WRITE_TOKEN'),
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return blob.url;
}
