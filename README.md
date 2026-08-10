# connector-permission-diff-skill

Local-first agent skill and CLI for reviewing connector/action permission changes before an agent performs external work.

The tool compares a proposed connector manifest with an approval policy and returns a dry-run diff: allowed actions, approval-required actions, denied actions, and reviewer evidence. It never calls external services.

## Quickstart

```bash
npm install
npx connector-permission-diff --manifest fixtures/connector-manifest.json --policy fixtures/approval-policy.json
npm test
npm run smoke
node src/cli.js --manifest fixtures/connector-manifest.json --policy fixtures/approval-policy.json --format json
node src/cli.js --manifest fixtures/connector-manifest.json --policy fixtures/approval-policy.json --fail-on-blocked
```

For local development, `node src/cli.js` and `npm run smoke` exercise the same CLI path that the published `connector-permission-diff` bin exposes.

`--manifest`, `--policy`, and `--format` each accept exactly one value and may
appear in any order. Each may be specified only once, and its value must follow
immediately rather than being omitted or replaced by another option token.
Standalone `--help` (or `-h`) prints usage and exits successfully.

## Inputs

See [docs/SCHEMA.md](docs/SCHEMA.md) for the full input shape.

`manifest.actions` is the requested action surface and must contain at least one
uniquely named action. Empty arrays and duplicate action names are rejected so
an empty or double-counted diff cannot be reported as valid:

```json
{
  "connector": "demo-crm",
  "actions": [
    { "name": "contacts.read", "effect": "read", "scope": "crm.contacts" }
  ]
}
```

`policy.rules` defines the allowed surface. Each action may appear only once;
duplicate action rules are rejected rather than resolved by ordering. Unknown
actions are denied by default, and policies containing the unsupported
`defaultDecision` field are rejected. Every listed rule must explicitly set
`decision` to `allow`, `needs_approval`, or `deny`; only actions without a
matching rule receive the deny-by-default behavior.

Optional manifest `rationale` and policy `reason`/`approver` fields must be
strings when present. Their omission remains supported and uses the documented
normalization defaults; invalid types are rejected with an indexed error.

```json
{
  "connector": "demo-crm",
  "rules": [
    { "action": "contacts.read", "decision": "allow", "reason": "Read-only lookup." }
  ]
}
```

## Output

- `allow`: action is inside policy and needs no additional approval
- `needs_approval`: action is known but requires reviewer approval
- `deny`: action is unknown or explicitly denied

Markdown output is designed to paste into a release-candidate PR or approval
thread. Pipe delimiters in user- and policy-provided table values are escaped,
and embedded line breaks are rendered as `<br>` so each value remains in its
intended cell.

Use `--fail-on-blocked` in CI when denied actions should fail the job with exit code `2`.

See [docs/API.md](docs/API.md) for library usage.

## Limitations

- JSON files only in the MVP.
- Policy matching is exact by action name.
- The CLI does not execute connector actions or contact external accounts.

## Safety Notes

This package is dry-run only. Treat `needs_approval` and `deny` as blockers until a human reviewer approves or changes the policy in a separate review.

## Verification

```bash
npm run lint
npm run check
npm test
npm run smoke
npm run validate
npm run package:smoke
npm run release:check
```

`npm run package:smoke` fails if the npm tarball would omit the CLI, library API,
fixtures, examples, schema/API docs, skill instructions, license, security
policy, or changelog.
