import { NextResponse } from 'next/server';
import { GoogleSheetsService, Language } from '@/services/sheets';
import { YouTubeService } from '@/services/youtube';
import { TikTokService } from '@/services/tiktok';
import { InstagramService } from '@/services/instagram';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetLang = searchParams.get('target') as Language;

  // Daily dispatch pipeline stub
  // 1. Fetch pending content from Sheets
  // 2. Based on targetLang, publish to YouTube (if JP, handling all audios), TikTok, Instagram
  // 3. Update Sheets status to PUBLISHED
  
  return NextResponse.json({ status: 'Dispatch initiated', targetLang });
}
