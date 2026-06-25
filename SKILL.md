# Connector Permission Diff Skill

## When To Use

Use this skill when an agent proposes connector or action permissions and a reviewer needs a local dry-run diff before any external write, CRM update, project-management change, message send, or content publish.

## Required Inputs

- Connector manifest JSON with `connector` and `actions`
- Approval policy JSON with `connector` and `rules`
- Optional output format: `json` or `markdown`

## Side-Effect Boundaries

This skill only reads local files and prints a report. It must not call external services, mutate remote systems, create approvals on behalf of a user, or treat a policy diff as permission to act.

## Approval Requirements

- `deny` means the action is blocked.
- `needs_approval` means a human reviewer must approve outside this tool.
- `allow` means the policy already permits the action, but downstream tools may still require their own approval checks.

## Examples

```bash
node src/cli.js --manifest fixtures/connector-manifest.json --policy fixtures/approval-policy.json --format markdown
```

## Validation Workflow

Run:

```bash
npm test
npm run check
npm run smoke
bash scripts/validate.sh
```

Paste the Markdown report into the PR or handoff when connector permissions change.
