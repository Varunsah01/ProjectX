import type { JobClosureType } from "../types/domain";

export type AuthStackParamList = {
  Login: undefined;
};

export type TabParamList = {
  Home: undefined;
  Jobs: undefined;
  Complaints: undefined;
  Profile: undefined;
};

export type MainTabRouteName = keyof TabParamList;

export type RootStackParamList = {
  Tabs: { screen?: MainTabRouteName } | undefined;
  JobDetail: { jobId: string };
  ComplaintDetail: { complaintId: string };
  JobUpdateStatus: { jobId: string };
  JobAddNotes: { jobId: string };
  JobUploadProof: { jobId: string };
  JobOutcome: { jobId: string; outcome: JobClosureType };
  DeviceCheck: undefined;
  Diagnostics: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
