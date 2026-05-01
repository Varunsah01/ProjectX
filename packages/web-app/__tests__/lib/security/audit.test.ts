import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => {
  const mockAuditLog = {
    create: vi.fn(),
  };
  return {
    db: {
      auditLog: mockAuditLog,
    },
  };
});

import { db } from "@/lib/db";
import { logAuditEvent } from "@/lib/security/audit";

const mockCreate = vi.mocked(db.auditLog.create);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("logAuditEvent", () => {
  const base = {
    organizationId: "org-1",
    userId: "user-1",
    entity: "Customer",
    entityId: "cust-1",
  };

  it("logs a CREATE event with after data", async () => {
    mockCreate.mockResolvedValue({} as never);

    await logAuditEvent({
      ...base,
      action: "CREATE",
      after: { name: "Acme", email: "a@b.com" },
    });

    expect(mockCreate).toHaveBeenCalledOnce();
    const arg = mockCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(arg.data.action).toBe("CREATE");
    expect(arg.data.entity).toBe("Customer");
    expect(arg.data.entityId).toBe("cust-1");
    const changes = arg.data.changes as Record<string, unknown>;
    expect(changes).toHaveProperty("created");
  });

  it("logs a DELETE event with before data", async () => {
    mockCreate.mockResolvedValue({} as never);

    await logAuditEvent({
      ...base,
      action: "DELETE",
      before: { name: "Old Corp" },
    });

    const arg = mockCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    const changes = arg.data.changes as Record<string, unknown>;
    expect(changes).toHaveProperty("deleted");
  });

  it("logs an UPDATE event with diff of before/after", async () => {
    mockCreate.mockResolvedValue({} as never);

    await logAuditEvent({
      ...base,
      action: "UPDATE",
      before: { name: "Old", email: "same@test.com" },
      after: { name: "New", email: "same@test.com" },
    });

    const arg = mockCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    const changes = arg.data.changes as Record<string, { before: unknown; after: unknown }>;
    // Only changed keys should appear in diff
    expect(changes).toHaveProperty("name");
    expect(changes.name.before).toBe("Old");
    expect(changes.name.after).toBe("New");
    // Unchanged key should not appear
    expect(changes).not.toHaveProperty("email");
  });

  it("redacts sensitive keys in audit data", async () => {
    mockCreate.mockResolvedValue({} as never);

    await logAuditEvent({
      ...base,
      action: "CREATE",
      after: {
        name: "User",
        password: "secret123",
        secretKey: "key-abc",
        sessionToken: "tok-xyz",
      },
    });

    const arg = mockCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    const changes = arg.data.changes as { created: { after: Record<string, unknown> } };
    const afterData = changes.created.after;
    expect(afterData.name).toBe("User");
    expect(afterData.password).toBe("[REDACTED]");
    expect(afterData.secretKey).toBe("[REDACTED]");
    expect(afterData.sessionToken).toBe("[REDACTED]");
  });

  it("serializes Date values to ISO strings", async () => {
    mockCreate.mockResolvedValue({} as never);
    const date = new Date("2024-06-15T10:00:00Z");

    await logAuditEvent({
      ...base,
      action: "CREATE",
      after: { createdAt: date },
    });

    const arg = mockCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    const changes = arg.data.changes as { created: { after: Record<string, unknown> } };
    expect(changes.created.after.createdAt).toBe("2024-06-15T10:00:00.000Z");
  });

  it("serializes nested objects and arrays", async () => {
    mockCreate.mockResolvedValue({} as never);

    await logAuditEvent({
      ...base,
      action: "CREATE",
      after: {
        tags: ["a", "b"],
        address: { city: "Mumbai", token: "secret" },
      },
    });

    const arg = mockCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    const changes = arg.data.changes as { created: { after: Record<string, unknown> } };
    expect(changes.created.after.tags).toEqual(["a", "b"]);
    const addr = changes.created.after.address as Record<string, unknown>;
    expect(addr.city).toBe("Mumbai");
    expect(addr.token).toBe("[REDACTED]");
  });

  it("handles null before and after", async () => {
    mockCreate.mockResolvedValue({} as never);

    await logAuditEvent({
      ...base,
      action: "DELETE",
      before: null,
      after: null,
    });

    expect(mockCreate).toHaveBeenCalledOnce();
    const arg = mockCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    const changes = arg.data.changes as Record<string, unknown>;
    expect(changes).toHaveProperty("deleted");
  });
});
