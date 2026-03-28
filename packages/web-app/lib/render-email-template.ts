import type * as React from "react";
import { render } from "@react-email/render";

export async function renderEmailTemplate(element: React.ReactElement) {
  return render(element);
}
