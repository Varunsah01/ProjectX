// Side-effect-only module: extends Zod's prototype with `.openapi()` BEFORE any
// schemas are constructed. Must be imported as the very first import in the
// openapi generator script, so the patch is in place before
// `@project-x/shared/schemas/*` instantiate their schemas.
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);
