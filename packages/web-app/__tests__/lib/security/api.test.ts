import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseJsonBody, parseRouteParams, jsonError } from "@/lib/security/api";

describe("parseJsonBody", () => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
  });

  it("parses valid JSON body", async () => {
    const req = new Request("http://localhost/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alice", age: 30 }),
    });

    const result = await parseJsonBody(req, schema);
    expect(result).toEqual({ name: "Alice", age: 30 });
  });

  it("throws on invalid body", async () => {
    const req = new Request("http://localhost/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: 123 }),
    });

    await expect(parseJsonBody(req, schema)).rejects.toThrow();
  });
});

describe("parseRouteParams", () => {
  const schema = z.object({
    id: z.string().uuid(),
  });

  it("parses valid params", () => {
    const result = parseRouteParams(
      { id: "550e8400-e29b-41d4-a716-446655440000" },
      schema,
    );
    expect(result.id).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("throws on invalid params", () => {
    expect(() => parseRouteParams({ id: "not-a-uuid" }, schema)).toThrow();
  });
});

describe("jsonError", () => {
  it("returns JSON response with error message and default 400 status", async () => {
    const response = jsonError("Bad request");
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Bad request");
  });

  it("accepts custom status code", async () => {
    const response = jsonError("Not found", 404);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Not found");
  });

  it("returns 500 for server errors", async () => {
    const response = jsonError("Internal error", 500);
    expect(response.status).toBe(500);
  });
});
