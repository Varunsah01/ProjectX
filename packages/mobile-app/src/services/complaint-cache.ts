import * as SecureStore from "expo-secure-store";
import type { ComplaintDetail, ComplaintSummary } from "../types/domain";

const COMPLAINT_LIST_CACHE_KEY = "project-x.mobile.complaints.cache.v1";
const COMPLAINT_DETAIL_CACHE_KEY_PREFIX = "project-x.mobile.complaint-detail.";

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

function getComplaintDetailCacheKey(complaintId: string) {
  return `${COMPLAINT_DETAIL_CACHE_KEY_PREFIX}${complaintId}.v1`;
}

export async function saveComplaintsCache(complaints: ComplaintSummary[]) {
  await saveCacheValue(COMPLAINT_LIST_CACHE_KEY, complaints);
}

export async function loadComplaintsCache() {
  return (await loadCacheValue<ComplaintSummary[]>(COMPLAINT_LIST_CACHE_KEY)) ?? [];
}

export async function saveComplaintDetailCache(complaint: ComplaintDetail) {
  await saveCacheValue(getComplaintDetailCacheKey(complaint.id), complaint);
}

export async function loadComplaintDetailCache(complaintId: string) {
  return loadCacheValue<ComplaintDetail>(getComplaintDetailCacheKey(complaintId));
}
