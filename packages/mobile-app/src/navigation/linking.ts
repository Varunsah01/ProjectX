import type { LinkingOptions } from "@react-navigation/native";
import type { RootStackParamList } from "./types";

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ["recuring://"],
  config: {
    screens: {
      JobDetail: "job/:jobId",
      ComplaintDetail: "complaint/:complaintId",
    },
  },
};
