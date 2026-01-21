import { runPricingUpdateJob, getScraperStatus } from "./pricingScraper";

interface ScheduledJob {
  name: string;
  intervalMs: number;
  lastRun: Date | null;
  nextRun: Date | null;
  running: boolean;
  enabled: boolean;
  runs: number;
  failures: number;
  lastError?: string;
}

interface SchedulerStatus {
  started: boolean;
  startedAt: Date | null;
  jobs: ScheduledJob[];
}

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

const jobs: Map<string, {
  config: ScheduledJob;
  timer: NodeJS.Timeout | null;
  handler: () => Promise<void>;
}> = new Map();

let schedulerStarted = false;
let schedulerStartedAt: Date | null = null;

async function runPricingJob(): Promise<void> {
  const job = jobs.get("pricing-update");
  if (!job) return;
  
  if (job.config.running) {
    console.log("[Scheduler] Pricing job already running, skipping");
    return;
  }
  
  job.config.running = true;
  job.config.lastRun = new Date();
  
  try {
    console.log("[Scheduler] Starting pricing update job...");
    const result = await runPricingUpdateJob();
    console.log(`[Scheduler] Pricing job completed: ${result.itemsProcessed} items in ${result.duration}ms`);
    job.config.runs++;
  } catch (error: any) {
    console.error("[Scheduler] Pricing job failed:", error);
    job.config.failures++;
    job.config.lastError = error.message;
  } finally {
    job.config.running = false;
    job.config.nextRun = new Date(Date.now() + job.config.intervalMs);
  }
}

export function initializeScheduler(): void {
  if (schedulerStarted) {
    console.log("[Scheduler] Already initialized");
    return;
  }

  jobs.set("pricing-update", {
    config: {
      name: "pricing-update",
      intervalMs: ONE_DAY,
      lastRun: null,
      nextRun: null,
      running: false,
      enabled: true,
      runs: 0,
      failures: 0,
    },
    timer: null,
    handler: runPricingJob,
  });

  console.log("[Scheduler] Initialized with 1 job registered");
}

export function startScheduler(): void {
  if (schedulerStarted) {
    console.log("[Scheduler] Already started");
    return;
  }

  initializeScheduler();
  schedulerStarted = true;
  schedulerStartedAt = new Date();

  Array.from(jobs.entries()).forEach(([name, job]) => {
    if (!job.config.enabled) return;
    
    job.config.nextRun = new Date(Date.now() + job.config.intervalMs);
    
    job.timer = setInterval(() => {
      job.handler().catch((err: Error) => {
        console.error(`[Scheduler] Job ${name} error:`, err);
      });
    }, job.config.intervalMs);
    
    console.log(`[Scheduler] Started job: ${name} (interval: ${job.config.intervalMs / 1000}s)`);
  });

  console.log("[Scheduler] All jobs started");
}

export function stopScheduler(): void {
  if (!schedulerStarted) return;

  Array.from(jobs.entries()).forEach(([name, job]) => {
    if (job.timer) {
      clearInterval(job.timer);
      job.timer = null;
      console.log(`[Scheduler] Stopped job: ${name}`);
    }
  });

  schedulerStarted = false;
  console.log("[Scheduler] All jobs stopped");
}

export async function runJobManually(jobName: string): Promise<{
  success: boolean;
  message: string;
  duration?: number;
}> {
  const job = jobs.get(jobName);
  if (!job) {
    return { success: false, message: `Job ${jobName} not found` };
  }

  if (job.config.running) {
    return { success: false, message: `Job ${jobName} is already running` };
  }

  const startTime = Date.now();
  try {
    await job.handler();
    return {
      success: true,
      message: `Job ${jobName} completed successfully`,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Job ${jobName} failed: ${error.message}`,
      duration: Date.now() - startTime,
    };
  }
}

export function getSchedulerStatus(): SchedulerStatus {
  const jobList: ScheduledJob[] = Array.from(jobs.values()).map(job => ({ ...job.config }));
  
  return {
    started: schedulerStarted,
    startedAt: schedulerStartedAt,
    jobs: jobList,
  };
}

export function setJobEnabled(jobName: string, enabled: boolean): boolean {
  const job = jobs.get(jobName);
  if (!job) return false;
  
  job.config.enabled = enabled;
  
  if (!enabled && job.timer) {
    clearInterval(job.timer);
    job.timer = null;
  } else if (enabled && !job.timer && schedulerStarted) {
    job.config.nextRun = new Date(Date.now() + job.config.intervalMs);
    job.timer = setInterval(() => {
      job.handler().catch(err => {
        console.error(`[Scheduler] Job ${jobName} error:`, err);
      });
    }, job.config.intervalMs);
  }
  
  return true;
}

export function setJobInterval(jobName: string, intervalMs: number): boolean {
  const job = jobs.get(jobName);
  if (!job) return false;
  
  const wasRunning = job.timer !== null;
  
  if (job.timer) {
    clearInterval(job.timer);
    job.timer = null;
  }
  
  job.config.intervalMs = intervalMs;
  
  if (wasRunning && job.config.enabled) {
    job.config.nextRun = new Date(Date.now() + intervalMs);
    job.timer = setInterval(() => {
      job.handler().catch(err => {
        console.error(`[Scheduler] Job ${jobName} error:`, err);
      });
    }, intervalMs);
  }
  
  return true;
}

export const scheduler = {
  initialize: initializeScheduler,
  start: startScheduler,
  stop: stopScheduler,
  runJob: runJobManually,
  getStatus: getSchedulerStatus,
  setJobEnabled,
  setJobInterval,
};
