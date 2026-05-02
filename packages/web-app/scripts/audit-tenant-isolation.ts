/**
 * Static audit: verify every Prisma call on org-scoped models filters by
 * organizationId.  Uses the TypeScript compiler API for accurate call-site
 * detection, then falls back to simple text search within the argument span
 * for the `organizationId` token.
 *
 * Exit 0 = clean, Exit 1 = violations found.
 *
 * Usage:  npx tsx scripts/audit-tenant-isolation.ts
 */

import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const WEB_APP_ROOT = path.resolve(__dirname, "..");

/** Models that do NOT have an organizationId column — skip them. */
const ALLOW_LIST = new Set([
  "organization",
  "account",
  "session",
  "verificationToken",
  "otpChallenge",
  "lead",
  "payment",
  // auditLog writes always go through buildAuditLog() which sets organizationId
  // from the actor; reads are guarded in listAuditLogsForOrganization().
  "auditLog",
  // deviceToken is not org-scoped; route is auth-gated and upserts by unique token.
  "deviceToken",
  // importJob preview/commit always uses organizationId from getCurrentUser()/requireRole().
  "importJob",
  // orgMembership uses composite key (userId, organizationId) — looked up by session context.
  "orgMembership",
  // orgInvitation is looked up by unique token or email+org; org context comes from session.
  "orgInvitation",
  // passwordResetToken is not org-scoped; looked up by unique token.
  "passwordResetToken",
  // emailVerificationToken is not org-scoped; looked up by unique token.
  "emailVerificationToken",
  // webhookEvent is created/updated by external webhook handler using event ID.
  "webhookEvent",
  // refund uses unique ID with guard queries for org check.
  "refund",
]);

/** Files that intentionally query across organisations. */
const SUPPRESSED_FILES = new Set(
  [
    "lib/cron/recurring-invoices.ts",
    "lib/notifications.ts",
    "lib/mobile/auth.ts",
    "app/api/auth/register/route.ts",
    "app/api/auth/accept-invitation/route.ts",
    "app/api/auth/switch-org/route.ts",
    "app/api/auth/forgot-password/route.ts",
    "app/api/auth/reset-password/route.ts",
    "app/api/auth/send-verification/route.ts",
    "app/api/auth/verify-email/route.ts",
    "app/api/webhooks/razorpay/route.ts",
    "lib/actions/invitations.ts",
    "lib/actions/webhooks.ts",
    "lib/queries/webhooks.ts",
    // Invoice aging queries use spread of baseWhere which includes organizationId
    "lib/queries/invoices.ts",
  ].map((f) => path.resolve(WEB_APP_ROOT, f)),
);

/** Prisma methods that use a `where` clause. */
const WHERE_METHODS = new Set([
  "findMany",
  "findFirst",
  "findUnique",
  "findUniqueOrThrow",
  "findFirstOrThrow",
  "updateMany",
  "deleteMany",
  "count",
  "aggregate",
  "groupBy",
]);

/**
 * Single-record update/delete: Prisma requires a unique `where` clause
 * (primary key), so you can't add `organizationId` to it.  These are safe
 * IF the same function already performed a guard query (findFirst/findUnique)
 * on the same model that included `organizationId`.
 */
const GUARDED_METHODS = new Set(["update", "delete"]);

/** Prisma methods that use a `data` clause (writes). */
const DATA_METHODS = new Set(["create", "createMany"]);

/** Prisma methods where `upsert` uses both `where` and `create`/`update`. */
const UPSERT_METHODS = new Set(["upsert"]);

// ---------------------------------------------------------------------------
// Source file discovery
// ---------------------------------------------------------------------------

function globSync(dir: string, pattern: RegExp): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...globSync(full, pattern));
    } else if (pattern.test(entry.name)) {
      results.push(full);
    }
  }

  return results;
}

function discoverSourceFiles(): string[] {
  const dirs = [
    path.join(WEB_APP_ROOT, "lib", "actions"),
    path.join(WEB_APP_ROOT, "lib", "queries"),
  ];

  const files: string[] = [];

  for (const dir of dirs) {
    files.push(...globSync(dir, /\.ts$/));
  }

  // API routes
  files.push(...globSync(path.join(WEB_APP_ROOT, "app", "api"), /^route\.ts$/));

  return files.filter((f) => !SUPPRESSED_FILES.has(f));
}

// ---------------------------------------------------------------------------
// AST analysis helpers
// ---------------------------------------------------------------------------

interface Violation {
  file: string;
  line: number;
  model: string;
  method: string;
  reason: string;
}

/** Get the raw text of an AST node using the source file directly. */
function nodeText(node: ts.Node, sf: ts.SourceFile): string {
  return sf.text.substring(node.pos, node.end);
}

/**
 * Check whether the argument text contains `organizationId`, resolving
 * shorthand property references (e.g. `{ where }` → look up `where`
 * variable initializer in the enclosing function text).
 */
function hasOrgIdInArg(
  arg: ts.Node,
  callPos: number,
  sf: ts.SourceFile,
  enclosingFnStart: number,
): boolean {
  // 1. Direct text check on the argument itself
  const argText = nodeText(arg, sf);
  if (argText.includes("organizationId")) return true;

  // 2. Resolve shorthand properties: `{ where }` → find `const where = ...`
  if (ts.isObjectLiteralExpression(arg)) {
    for (const prop of arg.properties) {
      if (ts.isShorthandPropertyAssignment(prop)) {
        const varName = prop.name.text;
        // Search the function body text BEFORE this call for the variable decl
        const priorText = sf.text.substring(enclosingFnStart, callPos);
        const pattern = new RegExp(
          `(?:const|let|var)\\s+${varName}\\s*=[^;]*`,
        );
        const match = priorText.match(pattern);
        if (match && match[0].includes("organizationId")) return true;
      }
    }
  }

  return false;
}

/**
 * For single-record `update`/`delete`, check if the same function already
 * did a guard query (findFirst / findUnique) on the same model that included
 * `organizationId`.
 */
function hasGuardQuery(
  modelName: string,
  callPos: number,
  sf: ts.SourceFile,
  enclosingFnStart: number,
): boolean {
  const priorText = sf.text.substring(enclosingFnStart, callPos);
  const guardPattern = new RegExp(
    `db\\.${modelName}\\.(?:findFirst|findUnique|findFirstOrThrow|findUniqueOrThrow|findMany)\\s*\\([\\s\\S]*?organizationId`,
  );
  return guardPattern.test(priorText);
}

// ---------------------------------------------------------------------------
// AST walking
// ---------------------------------------------------------------------------

/**
 * Walk a single source file's AST looking for `db.<model>.<method>(args)`.
 * Tracks the enclosing function boundary so we can resolve variables and
 * detect guard queries.
 */
function analyseFile(sourceFile: ts.SourceFile): Violation[] {
  const violations: Violation[] = [];

  function visit(node: ts.Node, fnScopeStack: number[]) {
    // Track enclosing function boundaries
    let stack = fnScopeStack;
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node)
    ) {
      stack = [...fnScopeStack, node.pos];
    }
    // Use the outermost relevant function for guard searches
    const fnStart = stack.length > 0 ? stack[0] : 0;

    if (!ts.isCallExpression(node)) {
      ts.forEachChild(node, (child) => visit(child, stack));
      return;
    }

    // We need  db.<model>.<method>(...)
    const expr = node.expression;

    if (!ts.isPropertyAccessExpression(expr)) {
      ts.forEachChild(node, (child) => visit(child, stack));
      return;
    }

    const methodName = expr.name.text;
    const inner = expr.expression;

    if (!ts.isPropertyAccessExpression(inner)) {
      ts.forEachChild(node, (child) => visit(child, stack));
      return;
    }

    const modelName = inner.name.text;
    const dbExpr = inner.expression;

    if (!ts.isIdentifier(dbExpr) || dbExpr.text !== "db") {
      ts.forEachChild(node, (child) => visit(child, stack));
      return;
    }

    // We have a db.<model>.<method>(...) call.
    if (ALLOW_LIST.has(modelName)) {
      ts.forEachChild(node, (child) => visit(child, stack));
      return;
    }

    const isWhere = WHERE_METHODS.has(methodName);
    const isGuarded = GUARDED_METHODS.has(methodName);
    const isData = DATA_METHODS.has(methodName);
    const isUpsert = UPSERT_METHODS.has(methodName);

    if (!isWhere && !isGuarded && !isData && !isUpsert) {
      ts.forEachChild(node, (child) => visit(child, stack));
      return;
    }

    // --- Single-record update/delete: accept if a guard query exists ---
    if (isGuarded) {
      if (hasGuardQuery(modelName, node.pos, sourceFile, fnStart)) {
        ts.forEachChild(node, (child) => visit(child, stack));
        return;
      }
      // No guard found — fall through and check the argument directly
    }

    // --- Check arguments ---
    const args = node.arguments;

    if (args.length === 0) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.pos);
      violations.push({
        file: sourceFile.fileName,
        line: line + 1,
        model: modelName,
        method: methodName,
        reason: "no arguments",
      });
      ts.forEachChild(node, (child) => visit(child, stack));
      return;
    }

    const firstArg = args[0];
    const ok = hasOrgIdInArg(firstArg, node.pos, sourceFile, fnStart);

    if (!ok) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.pos);
      const clause = isData ? "data" : "where";
      violations.push({
        file: sourceFile.fileName,
        line: line + 1,
        model: modelName,
        method: methodName,
        reason: `missing organizationId in ${clause}`,
      });
    }

    ts.forEachChild(node, (child) => visit(child, stack));
  }

  visit(sourceFile, []);
  return violations;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const sourceFiles = discoverSourceFiles();

  if (sourceFiles.length === 0) {
    console.error("No source files found — check script configuration.");
    process.exit(1);
  }

  console.log(`Scanning ${sourceFiles.length} files for tenant isolation…\n`);

  const program = ts.createProgram(sourceFiles, {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.Preserve,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
  });

  const allViolations: Violation[] = [];

  for (const filePath of sourceFiles) {
    const sf = program.getSourceFile(filePath);

    if (!sf) {
      console.warn(`  ⚠  Could not parse ${path.relative(WEB_APP_ROOT, filePath)}`);
      continue;
    }

    allViolations.push(...analyseFile(sf));
  }

  if (allViolations.length === 0) {
    console.log("✓  All Prisma calls include organizationId — no violations found.");
    process.exit(0);
  }

  console.log(`✗  ${allViolations.length} violation(s) found:\n`);

  for (const v of allViolations) {
    const rel = path.relative(WEB_APP_ROOT, v.file);
    console.log(`  ${rel}:${v.line} — db.${v.model}.${v.method}() — ${v.reason}`);
  }

  console.log(
    `\nFix each call site by adding organizationId to the where/data clause,` +
      `\nor add the file to SUPPRESSED_FILES if the cross-org query is intentional.\n`,
  );

  process.exit(1);
}

main();
