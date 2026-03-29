import type { JobClosureType } from "../types/domain";

export type MainTabRouteName = "home" | "jobs" | "complaints" | "profile";

export type AppRouteParams = {
  home: undefined;
  jobs: undefined;
  complaints: undefined;
  profile: undefined;
  jobDetail: { jobId: string };
  complaintDetail: { complaintId: string };
  jobUpdateStatus: { jobId: string };
  jobAddNotes: { jobId: string };
  jobUploadProof: { jobId: string };
  jobOutcome: { jobId: string; outcome: JobClosureType };
};

export type AppRouteName = keyof AppRouteParams;

export type AppRoute<Name extends AppRouteName = AppRouteName> =
  Name extends AppRouteName
    ? AppRouteParams[Name] extends undefined
      ? { name: Name }
      : { name: Name; params: AppRouteParams[Name] }
    : never;

export function createRoute<Name extends AppRouteName>(
  name: Name,
  ...args: AppRouteParams[Name] extends undefined ? [] : [AppRouteParams[Name]]
) {
  if (args.length === 0) {
    return { name } as AppRoute<Name>;
  }

  return {
    name,
    params: args[0],
  } as AppRoute<Name>;
}

export function getActiveTabForRoute(route: AppRoute): MainTabRouteName {
  switch (route.name) {
    case "home":
    case "jobs":
    case "complaints":
    case "profile":
      return route.name;
    case "complaintDetail":
      return "complaints";
    case "jobDetail":
    case "jobUpdateStatus":
    case "jobAddNotes":
    case "jobUploadProof":
    case "jobOutcome":
      return "jobs";
    default:
      return "home";
  }
}
