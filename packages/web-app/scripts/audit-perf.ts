/**
 * Static audit: flag Prisma performance anti-patterns.
 *
 * Rules:
 *   1. findMany without `take` or `select` (wide / unbounded query)
 *   2. await db/tx.<model>.<method>() inside a for-of / for-in / for loop (N+1)
 *
 * Uses the TypeScript compiler API, same approach as audit-tenant-isolation.ts.
 *
 * Exit 0 = clean, Exit 1 = findings.
 *
 * Usage:  npx tsx scripts/audit-perf.ts
 */

import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const WEB_APP_ROOT = path.resolve(__dirname, "..");

/** Files that intentionally run unbounded queries (cron jobs). */
const SUPPRESSED_UNBOUNDED = new Set(
  [
    "lib/cron/recurring-invoices.ts",
    "lib/cron/invoice-reminders.ts",
    "lib/cron/contract-renewals.ts",
  ].map((f) => path.resolve(WEB_APP_ROOT, f)),
);

/** Files that intentionally have awaits in loops (already reviewed). */
const SUPPRESSED_N_PLUS_1 = new Set(
  [
    "lib/cron/recurring-invoices.ts",
    "lib/cron/invoice-reminders.ts",
    "lib/cron/contract-renewals.ts",
  ].map((f) => path.resolve(WEB_APP_ROOT, f)),
);

const PRISMA_IDENTIFIERS = new Set(["db", "tx"]);

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

  return files;
}

// ---------------------------------------------------------------------------
// AST analysis
// ---------------------------------------------------------------------------

interface Finding {
  file: string;
  line: number;
  rule: "unbounded" | "n+1";
  model: string;
  method: string;
  detail: string;
}

function nodeText(node: ts.Node, sf: ts.SourceFile): string {
  return sf.text.substring(node.pos, node.end);
}

/**
 * Check if a call expression is `db.<model>.findMany(args)` or
 * `tx.<model>.findMany(args)`.
 */
function parsePrismaCall(
  node: ts.CallExpression,
): { dbIdent: string; model: string; method: string } | null {
  const expr = node.expression;
  if (!ts.isPropertyAccessExpression(expr)) return null;

  const method = expr.name.text;
  const inner = expr.expression;
  if (!ts.isPropertyAccessExpression(inner)) return null;

  const model = inner.name.text;
  const dbExpr = inner.expression;
  if (!ts.isIdentifier(dbExpr)) return null;
  if (!PRISMA_IDENTIFIERS.has(dbExpr.text)) return null;

  return { dbIdent: dbExpr.text, model, method };
}

/**
 * Check whether a node is inside a for-of, for-in, or classic for loop body.
 */
function isInsideLoopBody(node: ts.Node): boolean {
  let current = node.parent;

  while (current) {
    if (
      ts.isForOfStatement(current) ||
      ts.isForInStatement(current) ||
      ts.isForStatement(current)
    ) {
      // Only flag if the node is in the loop's statement (body), not the initializer
      const body =
        ts.isForOfStatement(current) || ts.isForInStatement(current)
          ? current.statement
          : current.statement;

      if (isDescendantOf(node, body)) {
        return true;
      }
    }
    current = current.parent;
  }

  return false;
}

function isDescendantOf(node: ts.Node, ancestor: ts.Node): boolean {
  let current = node.parent;
  while (current) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
}

function analyseFile(sourceFile: ts.SourceFile): Finding[] {
  const findings: Finding[] = [];
  const filePath = sourceFile.fileName;
  const suppressUnbounded = SUPPRESSED_UNBOUNDED.has(filePath);
  const suppressN1 = SUPPRESSED_N_PLUS_1.has(filePath);

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const parsed = parsePrismaCall(node);

      if (parsed) {
        // Rule 1: findMany without take or select
        if (parsed.method === "findMany" && !suppressUnbounded) {
          const args = node.arguments;
          if (args.length > 0) {
            const argText = nodeText(args[0], sourceFile);
            const hasTake = argText.includes("take");
            const hasSelect = argText.includes("select");
            if (!hasTake && !hasSelect) {
              const { line } = sourceFile.getLineAndCharacterOfPosition(node.pos);
              findings.push({
                file: filePath,
                line: line + 1,
                rule: "unbounded",
                model: parsed.model,
                method: parsed.method,
                detail: "no take/select",
              });
            }
          } else {
            const { line } = sourceFile.getLineAndCharacterOfPosition(node.pos);
            findings.push({
              file: filePath,
              line: line + 1,
              rule: "unbounded",
              model: parsed.model,
              method: parsed.method,
              detail: "no arguments",
            });
          }
        }

        // Rule 2: Prisma call inside loop body (N+1)
        if (!suppressN1 && isInsideLoopBody(node)) {
          // Only flag if there's an await on this call
          const parent = node.parent;
          if (parent && ts.isAwaitExpression(parent)) {
            const { line } = sourceFile.getLineAndCharacterOfPosition(node.pos);
            findings.push({
              file: filePath,
              line: line + 1,
              rule: "n+1",
              model: parsed.model,
              method: parsed.method,
              detail: "Prisma call inside loop",
            });
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
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

  console.log(`Scanning ${sourceFiles.length} files for performance issues…\n`);

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

  const allFindings: Finding[] = [];

  for (const filePath of sourceFiles) {
    const sf = program.getSourceFile(filePath);

    if (!sf) {
      console.warn(`  ⚠  Could not parse ${path.relative(WEB_APP_ROOT, filePath)}`);
      continue;
    }

    allFindings.push(...analyseFile(sf));
  }

  if (allFindings.length === 0) {
    console.log("✓  No performance findings — all Prisma calls look good.");
    process.exit(0);
  }

  console.log(`✗  ${allFindings.length} finding(s):\n`);

  for (const f of allFindings) {
    const rel = path.relative(WEB_APP_ROOT, f.file);
    const tag = f.rule === "unbounded" ? "[unbounded]" : "[n+1]      ";
    console.log(`  ${tag} ${rel}:${f.line} — ${f.model}.${f.method}() — ${f.detail}`);
  }

  console.log(
    `\nFix each call site by adding take/select, or move Prisma calls outside loops.` +
      `\nAdd the file to the suppression list if the pattern is intentional.\n`,
  );

  process.exit(1);
}

main();
