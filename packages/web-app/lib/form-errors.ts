import { ZodError } from "zod";

export type FormErrors = Record<string, string>;

export function getFormErrors(error: ZodError): FormErrors {
  const errors: FormErrors = {};

  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_form";

    if (!errors[key]) {
      errors[key] = issue.message;
    }
  }

  return errors;
}

export function clearFormError(
  errors: FormErrors,
  field: string,
): FormErrors {
  if (!errors[field]) {
    return errors;
  }

  const next = { ...errors };
  delete next[field];
  return next;
}
