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

    // Validate the total number of files in the ZIP (excluding directories and macOS metadata)
    const allFiles = zipEntries.filter(
      entry => !entry.isDirectory && !entry.entryName.replace(/\\/g, "/").includes("__MACOSX")
    );

    if (allFiles.length > 20) {
      return NextResponse.json(
        { error: `ZIP contains too many files (${allFiles.length}). The maximum limit is 20 files per ZIP upload.` },
        { status: 400 }
      );
    }

    if (allFiles.length === 0) {
      return NextResponse.json(
        { error: "No files found in the ZIP archive." },
        { status: 400 }
      );
    }

    // sessionId is ONLY for local batch tracking (UI progress)
    const sessionId = crypto.randomUUID();
    let queuedCount = 0;
    
    console.log(`[Upload] Session: ${sessionId}, ZIP entries: ${zipEntries.length}`);

    for (const zipEntry of zipEntries) {
      const entryNameNormalized = zipEntry.entryName.replace(/\\/g, "/");
      if (
        !zipEntry.isDirectory &&
        entryNameNormalized.toLowerCase().endsWith(".pdf") &&
        !entryNameNormalized.includes("__MACOSX")
      ) {
        // Extract filename from the zip entry path
        const parts = entryNameNormalized.split("/").filter(p => p.length > 0);
        
        if (parts.length >= 1) {
          const filename = parts[parts.length - 1];
          
          console.log(`[Upload] Found: ${filename}`);
          
          const fileBuffer = zipEntry.getData();
          
          // Create local tracking record (statename and cityname are not related to claims)
          await createJobMetadata({
            sessionId,
            statename: "",
            cityname: "",
            filename,
            status: "pending",
          });

          // Enqueue for processing (external API call happens here)
          uploadQueue.add({
            sessionId,
            buffer: fileBuffer,
            filename,
            statename: "",
            cityname: "",
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
