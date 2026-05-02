/**
 * Static audit: verify every Prisma call on customer-scoped models filters by
 * customerId.  Uses the TypeScript compiler API for accurate call-site
 * detection, then falls back to simple text search within the argument span
 * for the `customerId` token.
 *
 * Exit 0 = clean, Exit 1 = violations found.
 *
 * Usage:  npx tsx scripts/audit-customer-isolation.ts
 */

import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PORTAL_ROOT = path.resolve(__dirname, "..");

/** Models that do NOT require customerId filtering — skip them. */
const ALLOW_LIST = new Set([
  "organization",
  "customerMagicLink",
  "customer",
  // payment is looked up by razorpayOrderId (unique) and validated via invoice chain
  "payment",
]);

/** Files that intentionally query without customerId. */
const SUPPRESSED_FILES = new Set(
  [
    "lib/db.ts",
    "lib/organization.ts",
    "lib/ticket-helpers.ts",
    "auth.ts",
  ].map((f) => path.resolve(PORTAL_ROOT, f)),
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

const GUARDED_METHODS = new Set(["update", "delete"]);
const DATA_METHODS = new Set(["create", "createMany"]);
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
    path.join(PORTAL_ROOT, "lib", "queries"),
  ];

  const files: string[] = [];

  for (const dir of dirs) {
    files.push(...globSync(dir, /\.ts$/));
  }

  // API routes
  files.push(...globSync(path.join(PORTAL_ROOT, "app", "api"), /^route\.ts$/));

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

function nodeText(node: ts.Node, sf: ts.SourceFile): string {
  return sf.text.substring(node.pos, node.end);
}

function hasCustomerIdInArg(
  arg: ts.Node,
  callPos: number,
  sf: ts.SourceFile,
  enclosingFnStart: number,
): boolean {
  const argText = nodeText(arg, sf);
  if (argText.includes("customerId")) return true;

  if (ts.isObjectLiteralExpression(arg)) {
    for (const prop of arg.properties) {
      if (ts.isShorthandPropertyAssignment(prop)) {
        const varName = prop.name.text;
        const priorText = sf.text.substring(enclosingFnStart, callPos);
        const pattern = new RegExp(
          `(?:const|let|var)\\s+${varName}\\s*=[^;]*`,
        );
        const match = priorText.match(pattern);
        if (match && match[0].includes("customerId")) return true;
      }
    }
  }

  return false;
}

function hasGuardQuery(
  modelName: string,
  callPos: number,
  sf: ts.SourceFile,
  enclosingFnStart: number,
): boolean {
  const priorText = sf.text.substring(enclosingFnStart, callPos);
  const guardPattern = new RegExp(
    `db\\.${modelName}\\.(?:findFirst|findUnique|findFirstOrThrow|findUniqueOrThrow|findMany)\\s*\\([\\s\\S]*?customerId`,
  );
  return guardPattern.test(priorText);
}

// ---------------------------------------------------------------------------
// AST walking
// ---------------------------------------------------------------------------

function analyseFile(sourceFile: ts.SourceFile): Violation[] {
  const violations: Violation[] = [];

  function visit(node: ts.Node, fnScopeStack: number[]) {
    let stack = fnScopeStack;
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node)
    ) {
      stack = [...fnScopeStack, node.pos];
    }
    const fnStart = stack.length > 0 ? stack[0] : 0;

    if (!ts.isCallExpression(node)) {
      ts.forEachChild(node, (child) => visit(child, stack));
      return;
    }

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

    // Support both `db.` and `tx.` (transaction)
    if (
      !ts.isIdentifier(dbExpr) ||
      (dbExpr.text !== "db" && dbExpr.text !== "tx")
    ) {
      ts.forEachChild(node, (child) => visit(child, stack));
      return;
    }

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

    if (isGuarded) {
      if (hasGuardQuery(modelName, node.pos, sourceFile, fnStart)) {
        ts.forEachChild(node, (child) => visit(child, stack));
        return;
      }
    }

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
    const ok = hasCustomerIdInArg(firstArg, node.pos, sourceFile, fnStart);

    if (!ok) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.pos);
      const clause = isData ? "data" : "where";
      violations.push({
        file: sourceFile.fileName,
        line: line + 1,
        model: modelName,
        method: methodName,
        reason: `missing customerId in ${clause}`,
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

  console.log(`Scanning ${sourceFiles.length} files for customer isolation…\n`);

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
      console.warn(`  ⚠  Could not parse ${path.relative(PORTAL_ROOT, filePath)}`);
      continue;
    }

    allViolations.push(...analyseFile(sf));
  }

  if (allViolations.length === 0) {
    console.log("✓  All Prisma calls include customerId — no violations found.");
    process.exit(0);
  }

  console.log(`✗  ${allViolations.length} violation(s) found:\n`);

  for (const v of allViolations) {
    const rel = path.relative(PORTAL_ROOT, v.file);
    console.log(`  ${rel}:${v.line} — db.${v.model}.${v.method}() — ${v.reason}`);
  }

  console.log(
    `\nFix each call site by adding customerId to the where/data clause,` +
      `\nor add the file to SUPPRESSED_FILES if the cross-customer query is intentional.\n`,
  );

  process.exit(1);
}

main();
