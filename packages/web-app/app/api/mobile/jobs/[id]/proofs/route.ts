import {
  GET as v1GET,
  POST as v1POST,
} from "../../../v1/jobs/[id]/proofs/route";
import { withDeprecation } from "@/lib/mobile/deprecation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withDeprecation(v1GET);
export const POST = withDeprecation(v1POST);
