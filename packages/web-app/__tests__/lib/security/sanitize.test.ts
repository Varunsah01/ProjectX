import { describe, it, expect } from "vitest";
import {
  sanitizeText,
  sanitizeOptionalText,
  sanitizeInputStrings,
  validateUploadedFile,
} from "@/lib/security/sanitize";

describe("sanitizeText", () => {
  it("removes control characters", () => {
    expect(sanitizeText("hello\x00world\x1F")).toBe("helloworld");
  });

  it("removes script tags", () => {
    expect(sanitizeText('Hello<script>alert("xss")</script>World')).toBe(
      "HelloWorld",
    );
  });

  it("removes HTML tags", () => {
    expect(sanitizeText("<b>bold</b> and <i>italic</i>")).toBe(
      "bold and italic",
    );
  });

  it("removes javascript: protocol", () => {
    expect(sanitizeText("javascript:alert(1)")).toBe("alert(1)");
  });

  it("trims whitespace", () => {
    expect(sanitizeText("  hello  ")).toBe("hello");
  });

  it("handles clean text unchanged", () => {
    expect(sanitizeText("Normal text here")).toBe("Normal text here");
  });
});

describe("sanitizeOptionalText", () => {
  it("returns null for null", () => {
    expect(sanitizeOptionalText(null)).toBeNull();
  });

  it("returns undefined for undefined", () => {
    expect(sanitizeOptionalText(undefined)).toBeUndefined();
  });

  it("sanitizes and returns string", () => {
    expect(sanitizeOptionalText("<b>hello</b>")).toBe("hello");
  });

  it("returns empty string for tags-only input", () => {
    expect(sanitizeOptionalText("<script>x</script>")).toBe("");
  });
});

describe("sanitizeInputStrings", () => {
  it("sanitizes all string values in an object", () => {
    const input = {
      name: "<b>John</b>",
      email: "john@test.com",
    };
    const result = sanitizeInputStrings(input);
    expect(result.name).toBe("John");
    expect(result.email).toBe("john@test.com");
  });

  it("sanitizes strings in arrays", () => {
    const input = ["<script>x</script>", "normal"];
    const result = sanitizeInputStrings(input);
    expect(result).toEqual(["", "normal"]);
  });

  it("handles nested objects", () => {
    const input = {
      outer: { inner: "<b>nested</b>" },
    };
    const result = sanitizeInputStrings(input);
    expect(result.outer.inner).toBe("nested");
  });

  it("excludes specified keys", () => {
    const input = {
      name: "<b>John</b>",
      description: "<p>Safe HTML here</p>",
    };
    const result = sanitizeInputStrings(input, {
      excludeKeys: ["description"],
    });
    expect(result.name).toBe("John");
    expect(result.description).toBe("<p>Safe HTML here</p>");
  });

  it("preserves non-string values", () => {
    const date = new Date();
    const input = { count: 42, active: true, created: date };
    const result = sanitizeInputStrings(input);
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
    expect(result.created).toBe(date);
  });
});

describe("validateUploadedFile", () => {
  function makeFile(
    name: string,
    content: string,
    type: string,
  ): File {
    return new File([content], name, { type });
  }

  it("passes for valid file", () => {
    const file = makeFile("photo.jpg", "x".repeat(100), "image/jpeg");
    expect(() =>
      validateUploadedFile(file, {
        maxSizeBytes: 1000,
        allowedMimeTypes: ["image/jpeg", "image/png"],
      }),
    ).not.toThrow();
  });

  it("throws for oversized file", () => {
    const file = makeFile("big.jpg", "x".repeat(2000), "image/jpeg");
    expect(() =>
      validateUploadedFile(file, {
        maxSizeBytes: 1000,
        allowedMimeTypes: ["image/jpeg"],
      }),
    ).toThrow("exceeds the allowed size limit");
  });

  it("throws for disallowed mime type", () => {
    const file = makeFile("doc.pdf", "x", "application/pdf");
    expect(() =>
      validateUploadedFile(file, {
        maxSizeBytes: 10000,
        allowedMimeTypes: ["image/jpeg", "image/png"],
      }),
    ).toThrow("file type is not allowed");
  });
});
