import { NextRequest, NextResponse } from "next/server";
import { sendFileToExternalApi } from "@/lib/externalApiService";

const WEBHOOK_URL = "https://yirahealthcampapidev.azurewebsites.net/api/Account/webhooktest";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    
    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const results: { filename: string; success: boolean; job_id?: string; report_id?: string; error?: string }[] = [];

    for (const file of files) {
      if (file.name.toLowerCase().endsWith(".pdf")) {
        try {
          console.log(`[Upload] Sending file directly: ${file.name}`);
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          const apiResponse = await sendFileToExternalApi(buffer, file.name, WEBHOOK_URL, projectId);

          if (apiResponse.success) {
            console.log(`[Upload] Success: ${file.name} -> Job ID: ${apiResponse.job_id}`);
            results.push({
              filename: file.name,
              success: true,
              job_id: apiResponse.job_id,
              report_id: apiResponse.report_id,
            });
          } else {
            console.error(`[Upload] API failure: ${file.name} - ${apiResponse.message}`);
            results.push({
              filename: file.name,
              success: false,
              error: apiResponse.message || "External API reported failure",
            });
          }
        } catch (error: any) {
          console.error(`[Upload] Error uploading ${file.name}:`, error.message);
          results.push({
            filename: file.name,
            success: false,
            error: error.message,
          });
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: `Upload complete: ${successCount} succeeded, ${failedCount} failed`,
      results,
      successCount,
      failedCount,
    });
  } catch (error: any) {
    console.error("[Upload] Project file upload failed:", error);
    return NextResponse.json(
      { error: "Upload failed", details: error.message },
      { status: 500 }
    );
  }
}
