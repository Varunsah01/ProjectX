import { POST as v1POST } from "../../../v1/jobs/[id]/reschedule/route";
import { withDeprecation } from "@/lib/mobile/deprecation";

export const dynamic = "force-dynamic";

export const POST = withDeprecation(v1POST);
