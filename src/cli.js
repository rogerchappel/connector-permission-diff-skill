#!/usr/bin/env node
import { diffPermissions, readJsonFile, renderMarkdown } from "./index.js";

function parseArgs(argv) {
  const hasHelp = argv.includes("--help") || argv.includes("-h");
  if (hasHelp && argv.length !== 1) {
    throw new Error("--help and -h must be used alone.");
  }

  const args = {
    format: "markdown",
    failOnBlocked: false
  };
  const seenValueOptions = new Set();

  const readValue = (option, index) => {
    if (seenValueOptions.has(option)) {
      throw new Error(`${option} may only be specified once.`);
    }

    const value = argv[index + 1];
    if (value === undefined || value.startsWith("-")) {
      throw new Error(`${option} requires a value.`);
    }

    seenValueOptions.add(option);
    return value;
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--manifest") args.manifest = readValue(token, index++);
    else if (token === "--policy") args.policy = readValue(token, index++);
    else if (token === "--format") args.format = readValue(token, index++);
    else if (token === "--fail-on-blocked") args.failOnBlocked = true;
    else if (token === "--help" || token === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

function usage() {
  return `Usage: connector-permission-diff --manifest manifest.json --policy policy.json [--format markdown|json] [--fail-on-blocked]

Compares one or more requested connector actions against an approval policy. Empty action lists are rejected.
Blank required strings are rejected.
Every policy rule requires an explicit allow, needs_approval, or deny decision.
Value options must be provided once and followed by a value, not another option.
The command is read-only and dry-run only. Markdown cell delimiters and line breaks are escaped.
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
