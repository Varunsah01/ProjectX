export type JobIssueType =
  | "diagnosis"
  | "mechanical"
  | "electrical"
  | "installation"
  | "maintenance"
  | "inspection"
  | "parts_replacement"
  | "other";

export interface ServiceReportFormValues {
  serviceNotes: string;
  issueType: JobIssueType | "";
  workDone: string;
  followUpRequired: boolean;
}

export interface ServiceReportFormErrors {
  serviceNotes?: string;
  issueType?: string;
  workDone?: string;
}

export const issueTypeOptions: Array<{
  value: JobIssueType;
  label: string;
}> = [
  { value: "diagnosis", label: "Diagnosis" },
  { value: "mechanical", label: "Mechanical" },
  { value: "electrical", label: "Electrical" },
  { value: "installation", label: "Installation" },
  { value: "maintenance", label: "Maintenance" },
  { value: "inspection", label: "Inspection" },
  { value: "parts_replacement", label: "Parts" },
  { value: "other", label: "Other" },
];

const issueTypeLabelMap: Record<JobIssueType, string> = issueTypeOptions.reduce(
  (accumulator, option) => ({
    ...accumulator,
    [option.value]: option.label,
  }),
  {} as Record<JobIssueType, string>,
);

const reportPattern =
  /Service Notes:\s*([\s\S]*?)\n\nIssue Type:\s*(.*?)\n\nWork Done:\s*([\s\S]*?)\n\nFollow-up Required:\s*(Yes|No)\s*$/;

export function createEmptyServiceReportForm(): ServiceReportFormValues {
  return {
    serviceNotes: "",
    issueType: "",
    workDone: "",
    followUpRequired: false,
  };
}

export function parseServiceReport(value?: string): ServiceReportFormValues {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return createEmptyServiceReportForm();
  }

  const matches = trimmedValue.match(reportPattern);

  if (!matches) {
    return {
      serviceNotes: trimmedValue,
      issueType: "",
      workDone: "",
      followUpRequired: false,
    };
  }

  const parsedIssueType = issueTypeOptions.find(
    (option) => option.label.toLowerCase() === matches[2]?.trim().toLowerCase(),
  );

  return {
    serviceNotes: matches[1]?.trim() ?? "",
    issueType: parsedIssueType?.value ?? "",
    workDone: matches[3]?.trim() ?? "",
    followUpRequired: matches[4]?.trim().toLowerCase() === "yes",
  };
}

export function validateServiceReportForm(
  values: ServiceReportFormValues,
): ServiceReportFormErrors {
  const errors: ServiceReportFormErrors = {};

  if (!values.serviceNotes.trim()) {
    errors.serviceNotes = "Service notes are required.";
  }

  if (!values.issueType) {
    errors.issueType = "Select the issue type.";
  }

  if (!values.workDone.trim()) {
    errors.workDone = "Work done is required.";
  }

  return errors;
}

export function buildServiceReport(values: ServiceReportFormValues) {
  return [
    "Service Notes:",
    values.serviceNotes.trim(),
    "",
    "Issue Type:",
    values.issueType ? issueTypeLabelMap[values.issueType] : "Not set",
    "",
    "Work Done:",
    values.workDone.trim(),
    "",
    "Follow-up Required:",
    values.followUpRequired ? "Yes" : "No",
  ].join("\n");
}
