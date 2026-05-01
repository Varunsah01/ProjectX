import type { Job } from "../../types/domain";
import type { PendingAction } from "../../services/offline-sync";

// Mock SecureStore before importing the module under test
const mockStore: Record<string, string> = {};
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockStore[key] ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockStore[key] = value;
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    delete mockStore[key];
    return Promise.resolve();
  }),
}));

import {
  loadPendingActions,
  clearPendingActions,
  queueJobStatusUpdate,
  queueJobNotesSave,
  queueJobClosureSubmit,
  removePendingAction,
  applyPendingActionsToJob,
  countPendingActionsForJob,
  getPendingProofsForJob,
} from "../../services/offline-sync";
import type {
  PendingJobStatusUpdateAction,
  PendingJobNotesSaveAction,
  PendingJobClosureSubmitAction,
  PendingJobProofUploadAction,
} from "../../services/offline-sync";

beforeEach(async () => {
  // Clear mock store and internal cache between tests
  Object.keys(mockStore).forEach((key) => delete mockStore[key]);
  await clearPendingActions();
});

describe("loadPendingActions", () => {
  it("returns empty array when store is empty", async () => {
    const actions = await loadPendingActions();
    expect(actions).toEqual([]);
  });
});

describe("queueJobStatusUpdate", () => {
  it("enqueues a status update action", async () => {
    const action = await queueJobStatusUpdate({
      jobId: "job-1",
      status: "on_the_way",
    });

    expect(action.type).toBe("job_status_update");
    expect(action.jobId).toBe("job-1");
    expect(action.payload.status).toBe("on_the_way");

    const all = await loadPendingActions();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(action.id);
  });

  it("deduplicates by status and job", async () => {
    await queueJobStatusUpdate({ jobId: "job-1", status: "on_the_way" });
    await queueJobStatusUpdate({ jobId: "job-1", status: "on_the_way" });

    const all = await loadPendingActions();
    expect(all).toHaveLength(1);
  });

  it("keeps different statuses for same job", async () => {
    await queueJobStatusUpdate({ jobId: "job-1", status: "on_the_way" });
    await queueJobStatusUpdate({ jobId: "job-1", status: "arrived" });

    const all = await loadPendingActions();
    expect(all).toHaveLength(2);
  });
});

describe("queueJobNotesSave", () => {
  it("enqueues a notes save action", async () => {
    const action = await queueJobNotesSave({
      jobId: "job-1",
      note: "Fixed the compressor",
    });

    expect(action.type).toBe("job_notes_save");
    expect(action.payload.note).toBe("Fixed the compressor");
  });

  it("deduplicates notes for same job (last write wins)", async () => {
    await queueJobNotesSave({ jobId: "job-1", note: "First note" });
    await queueJobNotesSave({ jobId: "job-1", note: "Updated note" });

    const all = await loadPendingActions();
    expect(all).toHaveLength(1);
    expect((all[0] as PendingJobNotesSaveAction).payload.note).toBe("Updated note");
  });
});

describe("queueJobClosureSubmit", () => {
  it("enqueues a closure submit action", async () => {
    const action = await queueJobClosureSubmit({
      jobId: "job-1",
      outcome: "fail",
      note: "Customer not home",
    });

    expect(action.type).toBe("job_closure_submit");
    expect(action.payload.outcome).toBe("fail");
    expect(action.payload.note).toBe("Customer not home");
  });
});

describe("removePendingAction", () => {
  it("removes a specific action by ID", async () => {
    const a1 = await queueJobStatusUpdate({ jobId: "job-1", status: "on_the_way" });
    const a2 = await queueJobStatusUpdate({ jobId: "job-2", status: "arrived" });

    await removePendingAction(a1.id);

    const all = await loadPendingActions();
    expect(all).toHaveLength(1);
    expect(all[0].jobId).toBe("job-2");
  });
});

describe("replay order", () => {
  it("maintains chronological order across action types", async () => {
    // Queue in sequence — each will get an increasing timestamp
    await queueJobStatusUpdate({ jobId: "job-1", status: "on_the_way" });
    await queueJobNotesSave({ jobId: "job-1", note: "note" });
    await queueJobStatusUpdate({ jobId: "job-1", status: "arrived" });

    const all = await loadPendingActions();
    expect(all).toHaveLength(3);
    // Should be in order of createdAt
    for (let i = 1; i < all.length; i++) {
      expect(all[i].createdAt >= all[i - 1].createdAt).toBe(true);
    }
  });
});

describe("applyPendingActionsToJob", () => {
  const baseJob: Job = {
    id: "job-1",
    jobNumber: "J-001",
    type: "scheduled",
    status: "assigned",
    operatorStatus: "assigned",
    scheduledDate: "2024-06-15",
    customer: {
      id: "cust-1",
      name: "Test Customer",
      address: "123 Main St",
      phone: "1234567890",
    },
    asset: {
      name: "AC Unit",
    },
    notes: undefined,
    serviceReport: undefined,
    completedAt: undefined,
  };

  it("applies status update to job", () => {
    const actions: PendingAction[] = [
      {
        id: "a1",
        type: "job_status_update",
        createdAt: "2024-06-15T10:00:00Z",
        jobId: "job-1",
        dedupeKey: "status:job-1:on_the_way:",
        payload: { status: "on_the_way" },
      },
    ];

    const result = applyPendingActionsToJob(baseJob, actions);
    expect(result.status).toBe("en_route");
    expect(result.operatorStatus).toBe("on_the_way");
  });

  it("applies completed status", () => {
    const actions: PendingAction[] = [
      {
        id: "a1",
        type: "job_status_update",
        createdAt: "2024-06-15T12:00:00Z",
        jobId: "job-1",
        dedupeKey: "status:job-1:completed:",
        payload: { status: "completed", note: "All done" },
      },
    ];

    const result = applyPendingActionsToJob(baseJob, actions);
    expect(result.status).toBe("completed");
    expect(result.operatorStatus).toBe("completed");
    expect(result.completedAt).toBe("2024-06-15T12:00:00Z");
    expect(result.serviceReport).toBe("All done");
  });

  it("applies notes save to job", () => {
    const actions: PendingAction[] = [
      {
        id: "a1",
        type: "job_notes_save",
        createdAt: "2024-06-15T10:00:00Z",
        jobId: "job-1",
        dedupeKey: "notes:job-1",
        payload: { note: "Replaced filter" },
      },
    ];

    const result = applyPendingActionsToJob(baseJob, actions);
    expect(result.serviceReport).toBe("Replaced filter");
  });

  it("applies failure closure to job", () => {
    const actions: PendingAction[] = [
      {
        id: "a1",
        type: "job_closure_submit",
        createdAt: "2024-06-15T10:00:00Z",
        jobId: "job-1",
        dedupeKey: "closure:job-1",
        payload: { outcome: "fail", note: "Parts unavailable" },
      },
    ];

    const result = applyPendingActionsToJob(baseJob, actions);
    expect(result.status).toBe("cancelled");
    expect(result.operatorStatus).toBe("failed");
    expect(result.serviceReport).toBe("Parts unavailable");
  });

  it("applies reschedule closure to job", () => {
    const actions: PendingAction[] = [
      {
        id: "a1",
        type: "job_closure_submit",
        createdAt: "2024-06-15T10:00:00Z",
        jobId: "job-1",
        dedupeKey: "closure:job-1",
        payload: {
          outcome: "reschedule",
          note: "Customer requested later date",
          scheduledDate: "2024-06-20",
        },
      },
    ];

    const result = applyPendingActionsToJob(baseJob, actions);
    expect(result.status).toBe("assigned");
    expect(result.operatorStatus).toBe("rescheduled");
    expect(result.scheduledDate).toBe("2024-06-20");
  });

  it("applies complete closure to job", () => {
    const actions: PendingAction[] = [
      {
        id: "a1",
        type: "job_closure_submit",
        createdAt: "2024-06-15T14:00:00Z",
        jobId: "job-1",
        dedupeKey: "closure:job-1",
        payload: { outcome: "complete", note: "All fixed" },
      },
    ];

    const result = applyPendingActionsToJob(baseJob, actions);
    expect(result.status).toBe("completed");
    expect(result.operatorStatus).toBe("completed");
  });

  it("ignores actions for other jobs", () => {
    const actions: PendingAction[] = [
      {
        id: "a1",
        type: "job_status_update",
        createdAt: "2024-06-15T10:00:00Z",
        jobId: "job-999",
        dedupeKey: "status:job-999:on_the_way:",
        payload: { status: "on_the_way" },
      },
    ];

    const result = applyPendingActionsToJob(baseJob, actions);
    expect(result.status).toBe("assigned");
  });
});

describe("countPendingActionsForJob", () => {
  it("counts actions matching the job ID", () => {
    const actions: PendingAction[] = [
      { id: "a1", type: "job_status_update", createdAt: "2024-01-01T00:00:00Z", jobId: "job-1", dedupeKey: "x", payload: { status: "on_the_way" } },
      { id: "a2", type: "job_notes_save", createdAt: "2024-01-01T00:01:00Z", jobId: "job-1", dedupeKey: "y", payload: { note: "hi" } },
      { id: "a3", type: "job_status_update", createdAt: "2024-01-01T00:02:00Z", jobId: "job-2", dedupeKey: "z", payload: { status: "arrived" } },
    ];

    expect(countPendingActionsForJob("job-1", actions)).toBe(2);
    expect(countPendingActionsForJob("job-2", actions)).toBe(1);
    expect(countPendingActionsForJob("job-3", actions)).toBe(0);
  });
});

describe("getPendingProofsForJob", () => {
  it("returns proof uploads for the given job", () => {
    const actions: PendingAction[] = [
      {
        id: "a1",
        type: "job_proof_upload",
        createdAt: "2024-06-15T10:00:00Z",
        jobId: "job-1",
        dedupeKey: "proof:job-1:p1",
        payload: {
          proofId: "p1",
          type: "photo",
          label: "Before photo",
          createdAt: "2024-06-15T10:00:00Z",
          uri: "file:///photo1.jpg",
          source: "camera",
        },
      },
      {
        id: "a2",
        type: "job_status_update",
        createdAt: "2024-06-15T10:01:00Z",
        jobId: "job-1",
        dedupeKey: "status:job-1:arrived:",
        payload: { status: "arrived" },
      },
    ];

    const proofs = getPendingProofsForJob("job-1", actions);
    expect(proofs).toHaveLength(1);
    expect(proofs[0].id).toBe("p1");
    expect(proofs[0].syncState).toBe("pending");
    expect(proofs[0].label).toBe("Before photo");
  });

  it("returns empty array when no proofs match", () => {
    const proofs = getPendingProofsForJob("job-999", []);
    expect(proofs).toEqual([]);
  });
});
