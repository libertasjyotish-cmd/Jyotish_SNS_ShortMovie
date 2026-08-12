import { NextResponse } from 'next/server';
import { GoogleSheetsService, Language } from '@/services/sheets';
import { YouTubeService } from '@/services/youtube';
import { TikTokService } from '@/services/tiktok';
import { InstagramService } from '@/services/instagram';

export const maxDuration = 300;

export async function GET(request: Request) {
  // Scenario 3: Daily Multi-Platform Post Scheduler (hourly execution)
  const sheetsService = new GoogleSheetsService();
  const youtubeService = new YouTubeService();
  const tiktokService = new TikTokService();
  const instagramService = new InstagramService();

  try {
    // 1. Fetch contents scheduled for the current hour that have been rendered and not yet posted
    const pendingPosts = await sheetsService.getPendingPosts();
    
    for (const post of pendingPosts) {
      // 2. Publish to all 3 platforms
      try {
        // YouTube Shorts (20s)
        await youtubeService.uploadVideo({
          title: `Libertas Jyotish ${post.zodiac_sign || post.target_type}`,
          description: "Forecast based on moon signs.",
          videoUrl: `stub_url_20s_${post.task_id}` // In reality, fetch from RenderOutputs
        });

        // Instagram Reels (20s)
        await instagramService.uploadVideo({
          caption: `Libertas Jyotish ${post.zodiac_sign || post.target_type}`,
          videoUrl: `stub_url_20s_${post.task_id}`
        });

        // TikTok (65s)
        await tiktokService.uploadVideo({
          description: `Libertas Jyotish ${post.zodiac_sign || post.target_type}`,
          videoUrl: `stub_url_65s_${post.task_id}`
        });
        
        // 3. Mark as Posted
        await sheetsService.updatePostStatus(post.task_id, 'Posted');
      } catch (err: any) {
        console.error(`Failed to post task ${post.task_id}:`, err);
        await sheetsService.updatePostStatus(post.task_id, 'Error');
        // Slack notification logic for Error could be added here
      }
    }
    
    return NextResponse.json({ status: 'Dispatch completed', processed: pendingPosts.length });
  } catch (error: any) {
    console.error('Dispatch failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
