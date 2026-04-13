'use server'

import { revalidateTag } from 'next/cache'

/** Call when the job list changes (create / update). */
export async function invalidateJobs(companyId: string) {
  revalidateTag(`jobs-${companyId}`, {})
}

/** Call when applications change (new application / status change / analysis). */
export async function invalidateJobData(jobId: string) {
  revalidateTag(`job-data-${jobId}`, {})
}

/** Call when the video pool changes (upload / delete). */
export async function invalidateVideos(companyId: string) {
  revalidateTag(`intro-videos-${companyId}`, {})
}
