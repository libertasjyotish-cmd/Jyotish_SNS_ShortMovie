import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Issues client upload tokens so large background media can be sent straight to
 * Vercel Blob, bypassing the request body limit of the serverless functions.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request: req,
      token: requireEnv("BLOB_READ_WRITE_TOKEN"),
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (clientPayload !== requireEnv("CRON_SECRET")) {
          throw new Error("Unauthorized");
        }
        return {
          allowedContentTypes: [
            "video/mp4",
            "video/quicktime",
            "image/png",
            "image/jpeg",
          ],
          addRandomSuffix: false,
          allowOverwrite: true,
          pathname,
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
