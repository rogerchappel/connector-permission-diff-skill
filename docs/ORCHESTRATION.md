# Orchestration

1. Agent prepares or receives a connector manifest.
2. Agent selects a local approval policy for the same connector.
3. Agent runs the CLI in dry-run mode.
4. Agent shares Markdown output with the reviewer.
5. Reviewer handles denied or approval-required actions outside this tool.

The tool is safe to run in CI because it reads local files only and does not execute connector actions.
