#!/usr/bin/env node
import { diffPermissions, readJsonFile, renderMarkdown } from "./index.js";

function parseArgs(argv) {
  const args = {
    format: "markdown",
    failOnBlocked: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--manifest") args.manifest = argv[++index];
    else if (token === "--policy") args.policy = argv[++index];
    else if (token === "--format") args.format = argv[++index];
    else if (token === "--fail-on-blocked") args.failOnBlocked = true;
    else if (token === "--help" || token === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

function usage() {
  return `Usage: connector-permission-diff --manifest manifest.json --policy policy.json [--format markdown|json] [--fail-on-blocked]

Compares requested connector actions against an approval policy. The command is read-only and dry-run only.
`;
}

export function run(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    return usage();
  }
  if (!args.manifest || !args.policy) {
    throw new Error("Both --manifest and --policy are required.");
  }
  if (!["markdown", "json"].includes(args.format)) {
    throw new Error("--format must be markdown or json.");
  }

  const diff = diffPermissions(readJsonFile(args.manifest), readJsonFile(args.policy));
  if (args.failOnBlocked && diff.status === "blocked") {
    process.exitCode = 2;
  }
  return args.format === "json" ? `${JSON.stringify(diff, null, 2)}\n` : renderMarkdown(diff);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.stdout.write(run());
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
