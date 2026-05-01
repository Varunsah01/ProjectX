import { POST as v1POST } from "../../v1/auth/login/route";
import { withDeprecation } from "@/lib/mobile/deprecation";

export const dynamic = "force-dynamic";

export const POST = withDeprecation(v1POST);
