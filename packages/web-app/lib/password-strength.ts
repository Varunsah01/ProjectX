import { zxcvbn, zxcvbnOptions } from "@zxcvbn-ts/core";
import * as commonPackage from "@zxcvbn-ts/language-common";
import * as enPackage from "@zxcvbn-ts/language-en";

zxcvbnOptions.setOptions({
  graphs: commonPackage.adjacencyGraphs,
  dictionary: {
    ...commonPackage.dictionary,
    ...enPackage.dictionary,
  },
});

export type StrengthResult = {
  score: 0 | 1 | 2 | 3 | 4;
  warning: string;
  suggestion: string;
};

export function getPasswordStrength(password: string): StrengthResult {
  if (!password) return { score: 0, warning: "", suggestion: "" };
  const result = zxcvbn(password);
  return {
    score: result.score as 0 | 1 | 2 | 3 | 4,
    warning: result.feedback.warning ?? "",
    suggestion: result.feedback.suggestions[0] ?? "",
  };
}
