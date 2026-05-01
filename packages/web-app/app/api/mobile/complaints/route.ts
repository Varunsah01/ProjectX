import { GET as v1GET } from "../v1/complaints/route";
import { withDeprecation } from "@/lib/mobile/deprecation";

export const dynamic = "force-dynamic";

export const GET = withDeprecation(v1GET);
