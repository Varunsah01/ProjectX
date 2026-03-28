type SanitizeOptions = {
  excludeKeys?: string[];
};

const CONTROL_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F]/g;
const SCRIPT_BLOCKS = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const HTML_TAGS = /<\/?[^>]+>/g;
const JAVASCRIPT_PROTOCOL = /javascript:/gi;

export function sanitizeText(value: string) {
  return value
    .replace(CONTROL_CHARS, "")
    .replace(SCRIPT_BLOCKS, "")
    .replace(HTML_TAGS, "")
    .replace(JAVASCRIPT_PROTOCOL, "")
    .trim();
}

export function sanitizeOptionalText(value: string | null | undefined) {
  if (value == null) {
    return value;
  }

  const sanitized = sanitizeText(value);
  return sanitized.length ? sanitized : "";
}

export function sanitizeInputStrings<T>(
  value: T,
  options: SanitizeOptions = {},
): T {
  const excludedKeys = new Set(options.excludeKeys ?? []);

  const sanitizeValue = (input: unknown, parentKey?: string): unknown => {
    if (typeof input === "string") {
      if (parentKey && excludedKeys.has(parentKey)) {
        return input;
      }

      return sanitizeText(input);
    }

    if (Array.isArray(input)) {
      return input.map((item) => sanitizeValue(item));
    }

    if (input && typeof input === "object" && !(input instanceof Date)) {
      return Object.fromEntries(
        Object.entries(input).map(([key, entryValue]) => [
          key,
          sanitizeValue(entryValue, key),
        ]),
      );
    }

    return input;
  };

  return sanitizeValue(value) as T;
}

export function validateUploadedFile(
  file: File,
  options: {
    maxSizeBytes: number;
    allowedMimeTypes: string[];
  },
) {
  if (file.size > options.maxSizeBytes) {
    throw new Error("Uploaded file exceeds the allowed size limit");
  }

  if (!options.allowedMimeTypes.includes(file.type)) {
    throw new Error("Uploaded file type is not allowed");
  }
}
