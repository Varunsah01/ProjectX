import * as SecureStore from "expo-secure-store";
import type { Job } from "../types/domain";

const JOB_LIST_CACHE_KEY = "project-x.mobile.jobs.cache.v1";
const JOB_DETAIL_CACHE_KEY_PREFIX = "project-x.mobile.job-detail.";

type CacheEnvelope<T> = {
  updatedAt: string;
  data: T;
};

async function saveCacheValue<T>(key: string, data: T) {
  const payload: CacheEnvelope<T> = {
    updatedAt: new Date().toISOString(),
    data,
  };

  await SecureStore.setItemAsync(key, JSON.stringify(payload));
}

async function loadCacheValue<T>(key: string) {
  const rawValue = await SecureStore.getItemAsync(key);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as CacheEnvelope<T>;
    return parsed?.data ?? null;
  } catch {
    return null;
  }
}

function getJobDetailCacheKey(jobId: string) {
  return `${JOB_DETAIL_CACHE_KEY_PREFIX}${jobId}.v1`;
}

export async function saveJobsCache(jobs: Job[]) {
  await saveCacheValue(JOB_LIST_CACHE_KEY, jobs);
}

export async function loadJobsCache() {
  return (await loadCacheValue<Job[]>(JOB_LIST_CACHE_KEY)) ?? [];
}

export async function saveJobDetailCache(job: Job) {
  await saveCacheValue(getJobDetailCacheKey(job.id), job);
}

export async function loadJobDetailCache(jobId: string) {
  return loadCacheValue<Job>(getJobDetailCacheKey(jobId));
}
