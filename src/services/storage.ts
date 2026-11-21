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

/** Uploads a background image or video so Creatomate can fetch it by URL. */
export async function uploadAsset(
  pathname: string,
  data: Buffer,
  contentType: string,
): Promise<string> {
  const blob = await put(pathname, data, {
    access: 'public',
    contentType,
    token: requireEnv('BLOB_READ_WRITE_TOKEN'),
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return blob.url;
}

/** Stores rows moved out of the sheet; the random suffix keeps the public URL unguessable. */
export async function uploadArchive(pathname: string, json: string): Promise<string> {
  const blob = await put(pathname, json, {
    access: 'public',
    contentType: 'application/json',
    token: requireEnv('BLOB_READ_WRITE_TOKEN'),
    addRandomSuffix: true,
  });
  return blob.url;
}
