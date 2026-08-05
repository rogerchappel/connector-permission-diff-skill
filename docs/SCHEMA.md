# Input Schema

## Manifest

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `connector` | string | yes | Must match the policy connector. |
| `actions` | non-empty array | yes | One or more requested connector actions. Empty arrays are rejected. |
| `actions[].name` | string | yes | Exact action key. |
| `actions[].effect` | string | yes | Typical values: `read`, `write`, `delete`, `send`, `publish`. |
| `actions[].scope` | string | yes | Human-readable resource scope. |
| `actions[].rationale` | string | no | Why the agent requested the action. |

## Policy

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `connector` | string | yes | Must match the manifest connector. |
| `rules` | array | yes | Exact action rules. Each action may appear only once. |
| `rules[].action` | string | yes | Action name to match. |
| `rules[].decision` | string | yes | `allow`, `needs_approval`, or `deny`. |
| `rules[].reason` | string | no | Review explanation. |
| `rules[].approver` | string | no | Human or role expected to approve. |

Unknown actions are always denied. The `defaultDecision` field is unsupported
and rejected so a policy cannot appear to change this safe default while being
silently ignored. Omit the field from policy files.

Duplicate `rules[].action` values are invalid. Normalization reports the
duplicate action and its zero-based rule index instead of allowing later rules
to overwrite earlier decisions.

An empty `actions` array is invalid rather than an allowed no-op. This prevents an
empty permission diff from being interpreted as evidence that a request is allowed.

In Markdown output, pipe delimiters in action and policy values are escaped as
`\|`, and line breaks within those values are rendered as `<br>`. This keeps
action name, effect, scope, reason, approver, and rationale values inside their
intended table cells.

See `fixtures/read-only-policy.json` for a stricter policy variant that blocks write actions.
