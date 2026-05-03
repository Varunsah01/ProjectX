const NEON_API = "https://console.neon.tech/api/v2";

export interface NeonBranchResult {
  branchId: string;
  branchName: string;
  connectionUri: string;
}

interface NeonCreateBranchResponse {
  branch: { id: string; name: string };
  connection_uris: Array<{ connection_uri: string }>;
}

/**
 * Creates a Neon branch with a read-write endpoint, restoring from
 * `pointInTime`. Returns the branch metadata and a full connection URI.
 */
export async function createNeonBranch(
  pointInTime: Date,
): Promise<NeonBranchResult> {
  const apiKey = process.env.NEON_API_KEY;
  const projectId = process.env.NEON_PROJECT_ID;

  if (!apiKey || !projectId) {
    throw new Error("NEON_API_KEY and NEON_PROJECT_ID must be configured");
  }

  const res = await fetch(`${NEON_API}/projects/${projectId}/branches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      endpoints: [{ type: "read_write" }],
      branch: { parent_timestamp: pointInTime.toISOString() },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Neon create-branch failed: HTTP ${res.status} — ${text}`,
    );
  }

  const body = (await res.json()) as NeonCreateBranchResponse;
  const connectionUri = body.connection_uris[0]?.connection_uri;

  if (!connectionUri) {
    throw new Error(
      "Neon API returned no connection_uri — check project role configuration",
    );
  }

  return {
    branchId: body.branch.id,
    branchName: body.branch.name,
    connectionUri,
  };
}

/**
 * Deletes a Neon branch. Call only on success; do NOT call on failure so
 * the branch is preserved for forensic inspection.
 */
export async function deleteNeonBranch(branchId: string): Promise<void> {
  const apiKey = process.env.NEON_API_KEY;
  const projectId = process.env.NEON_PROJECT_ID;

  if (!apiKey || !projectId) return;

  const res = await fetch(
    `${NEON_API}/projects/${projectId}/branches/${branchId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Neon delete-branch failed: HTTP ${res.status} — ${text}`,
    );
  }
}
