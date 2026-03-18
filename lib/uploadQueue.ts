import { updateJobMetadataStatus, updateParsingJobWithLocation } from './jobMetadata';
import { sendFileToExternalApi } from './externalApiService';

export type ProcessTask = {
  sessionId: string;    // Local batch tracking ID
  buffer: Buffer;
  filename: string;
  statename: string;    // From ZIP folder
  cityname: string;     // From ZIP folder
  webhookUrl: string;
};

class RateLimitedQueue {
  private queue: ProcessTask[] = [];
  private isProcessing = false;
  // 40 requests per minute = 60,000 ms -> 1500ms delay per request
  private minDelayMs = 1500;
  private lastRunTime = 0;

  add(task: ProcessTask) {
    this.queue.push(task);
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue() {
    this.isProcessing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) continue;

      const now = Date.now();
      const timeSinceLastRun = now - this.lastRunTime;
      if (timeSinceLastRun < this.minDelayMs) {
        const delay = this.minDelayMs - timeSinceLastRun;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      this.lastRunTime = Date.now();

      await this.executeTask(task);
    }
    this.isProcessing = false;
  }

  private async executeTask(task: ProcessTask) {
    try {
      console.log(`[Queue] Starting: ${task.filename}`);
      await updateJobMetadataStatus(task.sessionId, task.filename, 'processing');
      
      let success = false;
      let lastError = '';
      
      // Retry logic (up to 3 tries)
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`[Queue] Sending to API (Attempt ${attempt}): ${task.filename}`);
          const apiResponse = await sendFileToExternalApi(task.buffer, task.filename, task.webhookUrl);
          console.log(`[Queue] API Response:`, JSON.stringify(apiResponse));

          if (apiResponse.success) {
            const externalJobId = apiResponse.job_id;
            const reportId = apiResponse.report_id;
            
            console.log(`[Queue] Success! External Job ID: ${externalJobId}`);
            console.log(`[Queue] Now updating parsing_jobs with state=${task.statename}, city=${task.cityname}`);

            // Step 1: Update the EXISTING record in parsing_jobs using _id = job_id
            await updateParsingJobWithLocation(externalJobId, task.statename, task.cityname);

            // Step 2: Update our local tracking record
            await updateJobMetadataStatus(task.sessionId, task.filename, 'success', undefined, externalJobId, reportId);
            
            success = true;
          } else {
            throw new Error(apiResponse.message || "External API reported failure");
          }
          break;
        } catch (error: any) {
          lastError = error.message;
          console.error(`[Queue] Error (Attempt ${attempt}): ${task.filename} - ${error.message}`);
          if (attempt < 3) {
            await new Promise(res => setTimeout(res, 2000));
          }
        }
      }

      if (!success) {
        console.error(`[Queue] Final failure: ${task.filename} - ${lastError}`);
        await updateJobMetadataStatus(task.sessionId, task.filename, 'failed', lastError);
      }

    } catch (error) {
      console.error(`[Queue] Panic: ${task.sessionId}/${task.filename}:`, error);
      await updateJobMetadataStatus(
        task.sessionId,
        task.filename, 
        'failed', 
        error instanceof Error ? error.message : 'Unknown error'
      ).catch(e => console.error("[Queue] Failed to update status in DB:", e));
    }
  }
}

// Ensure the queue is a singleton within the Node process
export const uploadQueue = (global as any).uploadQueue || new RateLimitedQueue();
(global as any).uploadQueue = uploadQueue;
