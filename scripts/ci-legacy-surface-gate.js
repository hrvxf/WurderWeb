#!/usr/bin/env node

const { execSync } = require("node:child_process");

function run(command) {
  return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function resolveDiffRange() {
  const baseRef = process.env.GITHUB_BASE_REF;
  if (baseRef) {
    try {
      execSync(`git fetch --no-tags --depth=1 origin ${baseRef}`, { stdio: "ignore" });
      return `origin/${baseRef}...HEAD`;
    } catch {
      // Fall through to local diff fallback.
    }
  }

  try {
    run("git rev-parse --verify HEAD~1");
    return "HEAD~1..HEAD";
  } catch {
    return "";
  }
}

function parseChangedFiles(range) {
  if (!range) return [];
  const output = run(`git diff --name-only ${range}`);
  if (!output) return [];
  return output.split(/\r?\n/).filter(Boolean);
}

function parseAddedLines(range, file) {
  const output = run(`git diff --unified=0 --no-color ${range} -- "${file}"`);
  const lines = output.split(/\r?\n/);
  return lines.filter((line) => line.startsWith("+") && !line.startsWith("+++"));
}

const range = resolveDiffRange();
if (!range) {
  console.log("[legacy-surface-gate] No diff range available; skipping.");
  process.exit(0);
}

const files = parseChangedFiles(range);

const allowlistedPathPrefixes = [
  "src/app/api/admin/",
  "src/app/api/manager/",
  "scripts/",
  ".github/workflows/",
];

const violations = [];

for (const file of files) {
  const allowlisted = allowlistedPathPrefixes.some((prefix) => file.startsWith(prefix));
  if (allowlisted) continue;
  const isCodeFile = /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file);
  if (!isCodeFile) continue;
  const addedLines = parseAddedLines(range, file);
  for (const line of addedLines) {
    if (/\/admin\/|\/manager\//.test(line)) {
      violations.push({ file, line });
    }
  }
}

if (violations.length > 0) {
  console.error("[legacy-surface-gate] Found new /admin/ or /manager/ strings outside approved legacy maps:");
  for (const entry of violations) {
    console.error(`- ${entry.file}: ${entry.line}`);
  }
  process.exit(1);
}

console.log("[legacy-surface-gate] Passed.");

