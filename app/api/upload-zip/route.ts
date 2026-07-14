import { NextRequest, NextResponse } from "next/server";
import AdmZip from "adm-zip";
import { sendFileToExternalApi } from "@/lib/externalApiService";

const WEBHOOK_URL = "https://yirahealthcampapidev.azurewebsites.net/api/Account/webhooktest";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    
    const url = new URL(req.url);
    const webhookUrl = url.searchParams.get("webhook_url") || WEBHOOK_URL;
    const projectId = url.searchParams.get("project_id") || "5e19dae4-46fe-42ba-981e-bd0a3a451f8e";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    const results: { filename: string; success: boolean; job_id?: string; report_id?: string; error?: string }[] = [];
    
    console.log(`[Upload] ZIP entries: ${zipEntries.length}`);

    for (const zipEntry of zipEntries) {
      if (
        !zipEntry.isDirectory &&
        zipEntry.entryName.toLowerCase().endsWith(".pdf") &&
        !zipEntry.entryName.includes("__MACOSX")
      ) {
        const parts = zipEntry.entryName.split("/").filter(p => p.length > 0);
        const filename = parts[parts.length - 1];

        try {
          console.log(`[Upload] Sending file directly: ${filename}`);
          const fileBuffer = zipEntry.getData();

          const apiResponse = await sendFileToExternalApi(fileBuffer, filename, webhookUrl, projectId);

          if (apiResponse.success) {
            console.log(`[Upload] Success: ${filename} -> Job ID: ${apiResponse.job_id}`);
            results.push({
              filename,
              success: true,
              job_id: apiResponse.job_id,
              report_id: apiResponse.report_id,
            });
          } else {
            console.error(`[Upload] API failure: ${filename} - ${apiResponse.message}`);
            results.push({
              filename,
              success: false,
              error: apiResponse.message || "External API reported failure",
            });
          }
        } catch (error: any) {
          console.error(`[Upload] Error uploading ${filename}:`, error.message);
          results.push({
            filename,
            success: false,
            error: error.message,
          });
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`[Upload] Complete: ${successCount} succeeded, ${failedCount} failed`);

    return NextResponse.json({
      message: `Upload complete: ${successCount} succeeded, ${failedCount} failed`,
      results,
      successCount,
      failedCount,
    });

  } catch (error: any) {
    console.error("[Upload] Error:", error);
    return NextResponse.json(
      { error: "Failed to process zip", details: error.message },
      { status: 500 }
    );
  }
}
