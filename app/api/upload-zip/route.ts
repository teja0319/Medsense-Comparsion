import { NextRequest, NextResponse } from "next/server";
import AdmZip from "adm-zip";
import crypto from "crypto";
import { createJobMetadata } from "@/lib/jobMetadata";
import { uploadQueue } from "@/lib/uploadQueue";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    
    const url = new URL(req.url);
    const webhookUrl = url.searchParams.get("webhook_url") || "https://yirahealthcampapidev.azurewebsites.net/api/Account/webhooktest";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    // sessionId is ONLY for local batch tracking (UI progress)
    const sessionId = crypto.randomUUID();
    let queuedCount = 0;
    
    console.log(`[Upload] Session: ${sessionId}, ZIP entries: ${zipEntries.length}`);

    for (const zipEntry of zipEntries) {
      if (
        !zipEntry.isDirectory &&
        zipEntry.entryName.toLowerCase().endsWith(".pdf") &&
        !zipEntry.entryName.includes("__MACOSX")
      ) {
        // Expected structure: State/City/filename.pdf
        const parts = zipEntry.entryName.split("/").filter(p => p.length > 0);
        
        if (parts.length >= 2) {
          const filename = parts[parts.length - 1];
          const city = parts.length >= 2 ? parts[parts.length - 2] : "Unknown City";
          const state = parts.length >= 3 ? parts[parts.length - 3] : "Unknown State";
          
          console.log(`[Upload] Found: ${state}/${city}/${filename}`);
          
          const fileBuffer = zipEntry.getData();
          
          // Create local tracking record
          await createJobMetadata({
            sessionId,
            statename: state,
            cityname: city,
            filename,
            status: "pending",
          });

          // Enqueue for processing (external API call happens here)
          uploadQueue.add({
            sessionId,
            buffer: fileBuffer,
            filename,
            statename: state,
            cityname: city,
            webhookUrl
          });

          queuedCount++;
        }
      }
    }

    console.log(`[Upload] Total queued: ${queuedCount}`);

    return NextResponse.json({
      message: "File processing started",
      sessionId,
      queuedFiles: queuedCount,
      estimatedMinutes: Math.ceil(queuedCount / 100)
    });

  } catch (error: any) {
    console.error("[Upload] Error:", error);
    return NextResponse.json(
      { error: "Failed to process zip", details: error.message },
      { status: 500 }
    );
  }
}
