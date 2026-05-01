import { DELETE as v1DELETE } from "../../../../v1/jobs/[id]/proofs/[proofId]/route";
import { withDeprecation } from "@/lib/mobile/deprecation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const DELETE = withDeprecation(v1DELETE);
