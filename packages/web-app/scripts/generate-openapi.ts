/**
 * Generates:
 *   public/openapi/mobile-v1.json  — machine-readable OpenAPI 3.1 spec
 *   public/openapi/mobile-v1.md   — human-readable route summary
 *
 * Source of truth: Zod schemas in @project-x/shared (request bodies) plus
 * the response/model shapes defined below.  Never hand-author OpenAPI YAML.
 *
 * Run: npm run docs:openapi
 */

// extendZodWithOpenApi patches the Zod prototype.  All imports are hoisted by
// the module loader, so the shared schemas already exist as Zod instances when
// this body runs — but prototype patching is retroactive, so .openapi() works
// on every instance created before or after the call.
import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

import {
  createJobFromComplaintSchema,
  updateComplaintStatusSchema,
} from "@project-x/shared/schemas/complaints";
import {
  failJobSchema,
  proofSourceSchema,
  proofTypeSchema,
  rescheduleJobSchema,
  updateJobNotesSchema,
  updateJobStatusSchema,
} from "@project-x/shared/schemas/jobs";

extendZodWithOpenApi(z);

// ─────────────────────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────────────────────

const registry = new OpenAPIRegistry();

// ─────────────────────────────────────────────────────────────────────────────
// Security
// ─────────────────────────────────────────────────────────────────────────────

registry.registerComponent("securitySchemes", "BearerAuth", {
  type: "http",
  scheme: "bearer",
  description:
    "Session token from `POST /auth/login` or `POST /auth/otp/verify`.",
});

/** Apply to every authenticated endpoint */
const BEARER = [{ BearerAuth: [] as string[] }];

/** Required header on every mutation (POST / PATCH / DELETE) */
const CSRF_PARAM = {
  name: "X-CSRF-Token",
  in: "header" as const,
  required: true,
  schema: z.string(),
  description: "CSRF token obtained from `GET /auth/me`.",
};

// ─────────────────────────────────────────────────────────────────────────────
// Component schemas (generate $ref entries in components/schemas)
// ─────────────────────────────────────────────────────────────────────────────

const ErrorSchema = registry.register(
  "Error",
  z
    .object({ error: z.string().openapi({ description: "Human-readable error message" }) })
    .openapi({ description: "Error response" }),
);

const UserSchema = registry.register(
  "User",
  z
    .object({
      id: z.string().uuid().openapi({ description: "Operator UUID" }),
      organizationId: z.string().uuid(),
      role: z.enum(["ADMIN", "MANAGER", "AGENT", "TECHNICIAN"]),
      name: z.string(),
      email: z.string().email(),
      phone: z.string().nullable(),
      status: z
        .string()
        .openapi({ description: "active | inactive | suspended" }),
      territory: z.string().nullable().optional(),
      specialization: z.string().nullable().optional(),
      activeJobs: z.number().int(),
      completedToday: z.number().int(),
      totalJobs: z.number().int(),
      avgRating: z.number(),
      completedThisWeek: z.number().int(),
      completedThisMonth: z.number().int(),
      skills: z.array(z.string()),
    })
    .openapi({ description: "Authenticated field operator" }),
);

const LoginResponseSchema = registry.register(
  "LoginResponse",
  z
    .object({
      token: z
        .string()
        .openapi({ description: "Session token — send as Authorization: Bearer <token>" }),
      csrfToken: z
        .string()
        .openapi({ description: "Pass as X-CSRF-Token header on all mutations" }),
      user: UserSchema,
    })
    .openapi({ description: "Successful login payload" }),
);

const OtpRequestResponseSchema = registry.register(
  "OtpRequestResponse",
  z
    .object({
      ok: z.literal(true),
      expiresAt: z.string().datetime().openapi({ description: "ISO 8601 OTP expiry" }),
    })
    .openapi({ description: "OTP sent" }),
);

const JobSummarySchema = registry.register(
  "JobSummary",
  z
    .object({
      id: z.string().uuid(),
      jobNumber: z.string().openapi({ example: "JOB-0001" }),
      ticketId: z.string().uuid().nullable().optional(),
      customerId: z.string().uuid(),
      customerName: z.string(),
      customerAddress: z.string(),
      assetId: z.string().uuid().nullable().optional(),
      assetName: z.string().nullable().optional(),
      technicianId: z.string().uuid(),
      technicianName: z.string(),
      type: z.enum(["complaint", "scheduled", "installation", "inspection"]),
      status: z.enum([
        "pending",
        "assigned",
        "en_route",
        "in_progress",
        "completed",
        "cancelled",
      ]),
      scheduledDate: z.string().openapi({ description: "YYYY-MM-DD", example: "2025-01-15" }),
      completedAt: z.string().datetime().nullable().optional(),
      notes: z.string().nullable().optional(),
      serviceReport: z.string().nullable().optional(),
    })
    .openapi({ description: "Job list / detail item" }),
);

const JobProofSchema = registry.register(
  "JobProof",
  z
    .object({
      id: z.string().uuid(),
      jobId: z.string().uuid(),
      type: proofTypeSchema.openapi({ description: "Proof category" }),
      source: proofSourceSchema.optional(),
      label: z.string(),
      uri: z.string().url().optional().openapi({ description: "Pre-signed GET URL (15 min TTL)" }),
      fileName: z.string().optional(),
      mimeType: z.string().optional(),
      width: z.number().int().optional(),
      height: z.number().int().optional(),
      sizeBytes: z.number().int().optional(),
      createdAt: z.string().datetime(),
    })
    .openapi({ description: "A proof photo attached to a job" }),
);

const ComplaintTimelineSchema = registry.register(
  "ComplaintTimeline",
  z
    .object({
      id: z.string().optional(),
      date: z.string().datetime(),
      action: z.string(),
      by: z.string(),
      note: z.string().optional(),
    })
    .openapi({ description: "Single complaint timeline entry" }),
);

const ComplaintSummarySchema = registry.register(
  "ComplaintSummary",
  z
    .object({
      id: z.string().uuid(),
      ticketNumber: z.string().openapi({ example: "TKT-0001" }),
      customerId: z.string().uuid(),
      customerName: z.string(),
      assetId: z.string().uuid().nullable().optional(),
      assetName: z.string().nullable().optional(),
      subject: z.string(),
      description: z.string(),
      category: z.string(),
      priority: z.enum(["low", "medium", "high", "critical"]),
      status: z.enum([
        "open",
        "assigned",
        "in_progress",
        "on_hold",
        "resolved",
        "closed",
        "reopened",
      ]),
      assignedTo: z.string().nullable().optional(),
      assignedTechnicianId: z.string().uuid().nullable().optional(),
      slaDeadline: z.string().datetime(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
      resolvedAt: z.string().datetime().nullable().optional(),
      timeline: z.array(ComplaintTimelineSchema),
    })
    .openapi({ description: "Complaint / ticket" }),
);

const SignedUrlResponseSchema = registry.register(
  "SignedUrlResponse",
  z
    .object({
      uploadUrl: z
        .string()
        .url()
        .openapi({ description: "Presigned S3 PUT URL — valid for 5 min" }),
      key: z
        .string()
        .openapi({ description: "Object key — pass to POST /jobs/{id}/proofs" }),
      getUrl: z.string().url().openapi({ description: "Presigned GET URL — valid for 15 min" }),
      expiresAt: z.string().datetime(),
    })
    .openapi({ description: "Presigned upload URL pair" }),
);

// ─────────────────────────────────────────────────────────────────────────────
// Request body schemas (inline — sourced from route files, not registered as
// components so they stay inlined next to their endpoint for readability)
// ─────────────────────────────────────────────────────────────────────────────

const LoginBodySchema = z
  .object({
    identifierType: z.enum(["phone", "employee_id"]),
    identifier: z.string().min(1).openapi({ description: "Phone number or employee ID" }),
    authMethod: z.enum(["password"]),
    secret: z.string().min(1).openapi({ description: "Password" }),
  })
  .openapi({ description: "Login credentials" });

const OtpRequestBodySchema = z
  .object({
    phone: z.string().min(10).max(15).openapi({ description: "E.164-compatible phone number" }),
  })
  .openapi({ description: "OTP request" });

const OtpVerifyBodySchema = z
  .object({
    phone: z.string().min(10).max(15),
    code: z.string().regex(/^\d{6}$/).openapi({ description: "6-digit OTP" }),
  })
  .openapi({ description: "OTP verification" });

const RegisterDeviceBodySchema = z
  .object({
    token: z.string().min(1).openapi({ description: "FCM / APNs push token" }),
    platform: z.enum(["android", "ios", "web"]),
  })
  .openapi({ description: "Device registration" });

const SignUploadBodySchema = z
  .object({
    kind: z.enum(["job-proof", "complaint-proof"]),
    resourceId: z.string().uuid().openapi({ description: "Job or complaint UUID" }),
    contentType: z
      .string()
      .regex(/^image\//)
      .openapi({ description: "MIME type, e.g. image/jpeg" }),
    ext: z.string().min(1).openapi({ description: "File extension without dot, e.g. jpg" }),
  })
  .openapi({ description: "Sign upload request" });

const CreateProofBodySchema = z
  .object({
    key: z
      .string()
      .min(1)
      .openapi({ description: "S3 key returned by POST /uploads/sign" }),
    type: proofTypeSchema,
    source: proofSourceSchema,
    label: z.string().min(1),
    clientProofId: z.string().optional(),
    createdAt: z.string().optional(),
    fileName: z.string().optional(),
    mimeType: z.string().regex(/^image\//),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    sizeBytes: z.number().int().positive().optional(),
  })
  .openapi({ description: "Proof metadata after S3 upload" });

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function jsonContent(schema: z.ZodType) {
  return { content: { "application/json": { schema } } } as const;
}

type StatusCode = 200 | 201 | 400 | 401 | 403 | 404 | 429 | 500 | 503;

function stdResponses(
  success: { status: StatusCode; description: string; schema: z.ZodType },
  extras: StatusCode[] = [400, 401, 500],
): Record<string, { description: string; content?: Record<string, { schema: z.ZodType }> }> {
  const result: Record<
    string,
    { description: string; content?: Record<string, { schema: z.ZodType }> }
  > = {
    [success.status]: { description: success.description, ...jsonContent(success.schema) },
  };
  const e = new Set(extras);
  if (e.has(400)) result["400"] = { description: "Validation error", ...jsonContent(ErrorSchema) };
  if (e.has(401)) result["401"] = { description: "Unauthorized", ...jsonContent(ErrorSchema) };
  if (e.has(403))
    result["403"] = { description: "CSRF token missing or invalid", ...jsonContent(ErrorSchema) };
  if (e.has(404)) result["404"] = { description: "Not found", ...jsonContent(ErrorSchema) };
  if (e.has(429)) result["429"] = { description: "Rate limited", ...jsonContent(ErrorSchema) };
  if (e.has(500))
    result["500"] = { description: "Internal server error", ...jsonContent(ErrorSchema) };
  if (e.has(503))
    result["503"] = { description: "Service unavailable", ...jsonContent(ErrorSchema) };
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Route registrations
// ─────────────────────────────────────────────────────────────────────────────

// ── auth ─────────────────────────────────────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/auth/login",
  tags: ["auth"],
  summary: "Login with phone or employee_id + password",
  request: { body: { ...jsonContent(LoginBodySchema), required: true } },
  responses: stdResponses(
    { status: 200, description: "Login successful", schema: LoginResponseSchema },
    [400, 401, 500],
  ),
});

registry.registerPath({
  method: "post",
  path: "/auth/logout",
  tags: ["auth"],
  summary: "Invalidate the current session",
  security: BEARER,
  request: { headers: [CSRF_PARAM] },
  responses: stdResponses(
    {
      status: 200,
      description: "Logged out",
      schema: z.object({ ok: z.literal(true) }),
    },
    [401, 403, 500],
  ),
});

registry.registerPath({
  method: "get",
  path: "/auth/me",
  tags: ["auth"],
  summary: "Return current session user and a fresh CSRF token",
  security: BEARER,
  responses: stdResponses(
    {
      status: 200,
      description: "Current session",
      schema: z.object({
        user: UserSchema,
        csrfToken: z
          .string()
          .optional()
          .openapi({ description: "Included on first call; refresh periodically" }),
      }),
    },
    [401, 500],
  ),
});

registry.registerPath({
  method: "post",
  path: "/auth/otp/request",
  tags: ["auth"],
  summary: "Send a 6-digit OTP to the given phone number",
  description: "Rate-limited: 429 includes a Retry-After header.",
  request: { body: { ...jsonContent(OtpRequestBodySchema), required: true } },
  responses: stdResponses(
    { status: 200, description: "OTP dispatched", schema: OtpRequestResponseSchema },
    [400, 429, 500, 503],
  ),
});

registry.registerPath({
  method: "post",
  path: "/auth/otp/verify",
  tags: ["auth"],
  summary: "Verify OTP and return a session token",
  request: { body: { ...jsonContent(OtpVerifyBodySchema), required: true } },
  responses: stdResponses(
    {
      status: 200,
      description: "OTP verified — same shape as POST /auth/login",
      schema: LoginResponseSchema,
    },
    [400, 401, 500],
  ),
});

// ── jobs ─────────────────────────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/jobs",
  tags: ["jobs"],
  summary: "List jobs assigned to the authenticated technician",
  security: BEARER,
  request: {
    query: z.object({
      status: z
        .enum(["PENDING", "ASSIGNED", "EN_ROUTE", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
        .optional()
        .openapi({ description: "Filter by job status" }),
    }),
  },
  responses: stdResponses(
    {
      status: 200,
      description: "Job list",
      schema: z.object({ data: z.array(JobSummarySchema) }),
    },
    [401, 500],
  ),
});

registry.registerPath({
  method: "get",
  path: "/jobs/{id}",
  tags: ["jobs"],
  summary: "Get a single job with customer and asset detail",
  security: BEARER,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: stdResponses(
    {
      status: 200,
      description: "Job detail",
      schema: z.object({ data: JobSummarySchema }),
    },
    [401, 404, 500],
  ),
});

registry.registerPath({
  method: "post",
  path: "/jobs/{id}/status",
  tags: ["jobs"],
  summary: "Transition job status (en_route → arrived → in_progress → completed)",
  description:
    "The `arrived` status is a virtual transition that maps internally to `en_route` " +
    "and appends a marker to the service report.",
  security: BEARER,
  request: {
    params: z.object({ id: z.string().uuid() }),
    headers: [CSRF_PARAM],
    body: {
      ...jsonContent(
        updateJobStatusSchema.openapi({ description: "Status transition payload" }),
      ),
      required: true,
    },
  },
  responses: stdResponses(
    { status: 200, description: "Updated job", schema: z.object({ data: JobSummarySchema }) },
    [400, 401, 403, 404, 500],
  ),
});

registry.registerPath({
  method: "post",
  path: "/jobs/{id}/fail",
  tags: ["jobs"],
  summary: "Cancel / fail a job with a mandatory reason",
  security: BEARER,
  request: {
    params: z.object({ id: z.string().uuid() }),
    headers: [CSRF_PARAM],
    body: {
      ...jsonContent(failJobSchema.openapi({ description: "Cancellation reason" })),
      required: true,
    },
  },
  responses: stdResponses(
    { status: 200, description: "Job cancelled", schema: z.object({ data: JobSummarySchema }) },
    [400, 401, 403, 404, 500],
  ),
});

registry.registerPath({
  method: "post",
  path: "/jobs/{id}/reschedule",
  tags: ["jobs"],
  summary: "Reschedule a job to a different date",
  security: BEARER,
  request: {
    params: z.object({ id: z.string().uuid() }),
    headers: [CSRF_PARAM],
    body: {
      ...jsonContent(rescheduleJobSchema.openapi({ description: "New scheduled date" })),
      required: true,
    },
  },
  responses: stdResponses(
    {
      status: 200,
      description: "Rescheduled job",
      schema: z.object({ data: JobSummarySchema }),
    },
    [400, 401, 403, 404, 500],
  ),
});

registry.registerPath({
  method: "post",
  path: "/jobs/{id}/notes",
  tags: ["jobs"],
  summary: "Update the service report / work notes for a job",
  security: BEARER,
  request: {
    params: z.object({ id: z.string().uuid() }),
    headers: [CSRF_PARAM],
    body: {
      ...jsonContent(updateJobNotesSchema.openapi({ description: "Service report text" })),
      required: true,
    },
  },
  responses: stdResponses(
    {
      status: 200,
      description: "Job with updated notes",
      schema: z.object({ data: JobSummarySchema }),
    },
    [400, 401, 403, 404, 500],
  ),
});

registry.registerPath({
  method: "get",
  path: "/jobs/{id}/proofs",
  tags: ["jobs"],
  summary: "List all proof photos for a job",
  security: BEARER,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: stdResponses(
    {
      status: 200,
      description: "Proof list with pre-signed GET URLs",
      schema: z.object({ data: z.array(JobProofSchema) }),
    },
    [401, 404, 500, 503],
  ),
});

registry.registerPath({
  method: "post",
  path: "/jobs/{id}/proofs",
  tags: ["jobs"],
  summary: "Attach a proof photo to a job",
  description:
    "Workflow: `POST /uploads/sign` → PUT to `uploadUrl` → `POST /jobs/{id}/proofs` " +
    "with the returned `key`.",
  security: BEARER,
  request: {
    params: z.object({ id: z.string().uuid() }),
    headers: [CSRF_PARAM],
    body: { ...jsonContent(CreateProofBodySchema), required: true },
  },
  responses: {
    "201": { description: "Proof saved", ...jsonContent(z.object({ data: JobProofSchema })) },
    "400": { description: "Validation error", ...jsonContent(ErrorSchema) },
    "401": { description: "Unauthorized", ...jsonContent(ErrorSchema) },
    "403": { description: "CSRF mismatch", ...jsonContent(ErrorSchema) },
    "404": { description: "Job not found", ...jsonContent(ErrorSchema) },
    "500": { description: "Internal server error", ...jsonContent(ErrorSchema) },
    "503": { description: "Storage not configured", ...jsonContent(ErrorSchema) },
  },
});

registry.registerPath({
  method: "delete",
  path: "/jobs/{id}/proofs/{proofId}",
  tags: ["jobs"],
  summary: "Delete a proof photo from a job",
  security: BEARER,
  request: {
    params: z.object({ id: z.string().uuid(), proofId: z.string().uuid() }),
    headers: [CSRF_PARAM],
  },
  responses: stdResponses(
    {
      status: 200,
      description: "Proof deleted",
      schema: z.object({ ok: z.literal(true) }),
    },
    [401, 403, 404, 500],
  ),
});

// ── complaints ────────────────────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/complaints",
  tags: ["complaints"],
  summary: "List complaints assigned to the authenticated technician",
  security: BEARER,
  request: {
    query: z.object({
      status: z
        .enum([
          "OPEN",
          "ASSIGNED",
          "IN_PROGRESS",
          "ON_HOLD",
          "RESOLVED",
          "CLOSED",
          "REOPENED",
        ])
        .optional()
        .openapi({ description: "Filter by ticket status" }),
      priority: z
        .enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
        .optional()
        .openapi({ description: "Filter by priority" }),
    }),
  },
  responses: stdResponses(
    {
      status: 200,
      description: "Complaint list",
      schema: z.object({ data: z.array(ComplaintSummarySchema) }),
    },
    [401, 500],
  ),
});

registry.registerPath({
  method: "get",
  path: "/complaints/{id}",
  tags: ["complaints"],
  summary: "Get a single complaint with full timeline, customer, and asset detail",
  security: BEARER,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: stdResponses(
    {
      status: 200,
      description: "Complaint detail",
      schema: z.object({ data: ComplaintSummarySchema }),
    },
    [401, 404, 500],
  ),
});

registry.registerPath({
  method: "post",
  path: "/complaints/{id}/status",
  tags: ["complaints"],
  summary: "Transition a complaint status (in_progress, on_hold, resolved)",
  security: BEARER,
  request: {
    params: z.object({ id: z.string().uuid() }),
    headers: [CSRF_PARAM],
    body: {
      ...jsonContent(
        updateComplaintStatusSchema.openapi({ description: "Status transition" }),
      ),
      required: true,
    },
  },
  responses: stdResponses(
    {
      status: 200,
      description: "Updated complaint",
      schema: z.object({ data: ComplaintSummarySchema }),
    },
    [400, 401, 403, 404, 500],
  ),
});

registry.registerPath({
  method: "post",
  path: "/complaints/{id}/jobs",
  tags: ["complaints"],
  summary: "Create a service job from an existing complaint",
  security: BEARER,
  request: {
    params: z.object({ id: z.string().uuid() }),
    headers: [CSRF_PARAM],
    body: {
      ...jsonContent(
        createJobFromComplaintSchema.openapi({ description: "Job scheduling details" }),
      ),
      required: true,
    },
  },
  responses: {
    "201": {
      description: "Job created",
      ...jsonContent(z.object({ data: JobSummarySchema })),
    },
    "400": { description: "Validation error", ...jsonContent(ErrorSchema) },
    "401": { description: "Unauthorized", ...jsonContent(ErrorSchema) },
    "403": { description: "CSRF mismatch", ...jsonContent(ErrorSchema) },
    "404": { description: "Complaint not found", ...jsonContent(ErrorSchema) },
    "500": { description: "Internal server error", ...jsonContent(ErrorSchema) },
  },
});

// ── devices ───────────────────────────────────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/devices",
  tags: ["devices"],
  summary: "Register or refresh a push notification token",
  security: BEARER,
  request: {
    headers: [CSRF_PARAM],
    body: { ...jsonContent(RegisterDeviceBodySchema), required: true },
  },
  responses: stdResponses(
    {
      status: 200,
      description: "Token registered / updated",
      schema: z.object({ ok: z.literal(true) }),
    },
    [400, 401, 403, 500],
  ),
});

// ── uploads ───────────────────────────────────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/uploads/sign",
  tags: ["uploads"],
  summary: "Get a presigned S3 PUT URL for uploading a proof image",
  description:
    "Verify the caller owns the resource before issuing the URL. " +
    "PUT to `uploadUrl` within 5 min, then POST the `key` to `/jobs/{id}/proofs`.",
  security: BEARER,
  request: {
    headers: [CSRF_PARAM],
    body: { ...jsonContent(SignUploadBodySchema), required: true },
  },
  responses: stdResponses(
    {
      status: 200,
      description: "Presigned URL pair",
      schema: SignedUrlResponseSchema,
    },
    [400, 401, 403, 404, 500, 503],
  ),
});

// ─────────────────────────────────────────────────────────────────────────────
// Generate document
// ─────────────────────────────────────────────────────────────────────────────

const generator = new OpenApiGeneratorV31(registry.definitions);

const document = generator.generateDocument({
  openapi: "3.1.0",
  info: {
    version: "1",
    title: "Recuring Mobile API v1",
    description:
      "REST API for the Recuring field-operator mobile application.\n\n" +
      "**Authentication** — pass the session token from `POST /auth/login` " +
      "as `Authorization: Bearer <token>`.\n\n" +
      "**CSRF protection** — all mutation endpoints (POST / PATCH / DELETE) " +
      "require the `X-CSRF-Token` header obtained from `GET /auth/me`.\n\n" +
      "**Rate limits** — mobile org bucket is 10× the standard org bucket.\n\n" +
      "**Spec endpoint** — `GET /api/mobile/v1/openapi.json` (no auth required).",
  },
  servers: [{ url: "/api/mobile/v1", description: "Current host" }],
  tags: [
    { name: "auth", description: "Authentication and session management" },
    { name: "jobs", description: "Service job lifecycle and proof management" },
    { name: "complaints", description: "Customer complaint / ticket management" },
    { name: "devices", description: "Push notification device registration" },
    { name: "uploads", description: "Presigned S3 upload URL generation" },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// Markdown summary builder
// ─────────────────────────────────────────────────────────────────────────────

function buildMarkdown(
  doc: typeof document,
): string {
  const lines: string[] = [];
  lines.push(`# ${doc.info.title}`);
  lines.push("");
  if (doc.info.description) {
    // Strip markdown bold for plain text readability
    lines.push(doc.info.description.replace(/\*\*/g, ""));
    lines.push("");
  }
  lines.push(`| | |`);
  lines.push(`|---|---|`);
  lines.push(`| OpenAPI | \`${doc.openapi}\` |`);
  lines.push(`| Version | \`${doc.info.version}\` |`);
  lines.push(`| Spec | [\`GET /api/mobile/v1/openapi.json\`](/api/mobile/v1/openapi.json) |`);
  lines.push(`| Swagger UI | [\`/api-docs/mobile/v1\`](/api-docs/mobile/v1) |`);
  lines.push("");

  // Group endpoints by tag
  const byTag: Record<string, Array<{ method: string; path: string; summary: string }>> = {};

  const paths = doc.paths as Record<string, Record<string, unknown>> | undefined;
  if (paths) {
    for (const [path, methods] of Object.entries(paths)) {
      if (!methods || typeof methods !== "object") continue;
      for (const [method, op] of Object.entries(methods)) {
        if (!op || typeof op !== "object") continue;
        const operation = op as Record<string, unknown>;
        const tags = operation.tags as string[] | undefined;
        const tag = tags?.[0] ?? "other";
        if (!byTag[tag]) byTag[tag] = [];
        byTag[tag].push({
          method: method.toUpperCase(),
          path,
          summary: (operation.summary as string | undefined) ?? "",
        });
      }
    }
  }

  const tagOrder = ["auth", "jobs", "complaints", "devices", "uploads"];
  const sorted = [
    ...tagOrder.filter((t) => byTag[t]),
    ...Object.keys(byTag).filter((t) => !tagOrder.includes(t)),
  ];

  let total = 0;
  for (const tag of sorted) {
    const routes = byTag[tag];
    lines.push(`## ${tag.charAt(0).toUpperCase() + tag.slice(1)}`);
    lines.push("");
    lines.push("| Method | Path | Summary |");
    lines.push("|--------|------|---------|");
    for (const r of routes) {
      lines.push(`| \`${r.method}\` | \`${r.path}\` | ${r.summary} |`);
      total++;
    }
    lines.push("");
  }

  lines.push(`---`);
  lines.push(`_${total} endpoints total — generated by \`npm run docs:openapi\`_`);
  lines.push("");

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Write output files
// ─────────────────────────────────────────────────────────────────────────────

const OUTPUT_DIR = join(process.cwd(), "public", "openapi");
mkdirSync(OUTPUT_DIR, { recursive: true });

const json = JSON.stringify(document, null, 2);
const jsonPath = join(OUTPUT_DIR, "mobile-v1.json");
writeFileSync(jsonPath, json, "utf-8");

const md = buildMarkdown(document);
const mdPath = join(OUTPUT_DIR, "mobile-v1.md");
writeFileSync(mdPath, md, "utf-8");

const routes = Object.values(document.paths ?? {}).flatMap((p) => Object.keys(p ?? {})).length;
console.log(`✓  ${jsonPath}  (${json.length.toLocaleString()} B, ${routes} operations)`);
console.log(`✓  ${mdPath}`);
