# Input Schema

## Manifest

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `connector` | non-blank string | yes | Must match the policy connector exactly. |
| `actions` | non-empty array | yes | One or more requested connector actions. Empty arrays are rejected. |
| `actions[].name` | non-blank string | yes | Exact action key. Each name may appear only once. |
| `actions[].effect` | non-blank string | yes | Typical values: `read`, `write`, `delete`, `send`, `publish`. |
| `actions[].scope` | non-blank string | yes | Human-readable resource scope. |
| `actions[].rationale` | string | no | Why the agent requested the action. If omitted, normalizes to an empty string. |

## Policy

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `connector` | non-blank string | yes | Must match the manifest connector exactly. |
| `rules` | array | yes | Exact action rules. Each action may appear only once. |
| `rules[].action` | non-blank string | yes | Action name to match exactly. |
| `rules[].decision` | string | yes | `allow`, `needs_approval`, or `deny`. |
| `rules[].reason` | string | no | Review explanation. If omitted, normalizes to `No reason provided.` |
| `rules[].approver` | string | no | Human or role expected to approve. If omitted, normalizes to `null`. |

Unknown actions are always denied. The `defaultDecision` field is unsupported
and rejected so a policy cannot appear to change this safe default while being
silently ignored. Omit the field from policy files.

Every listed policy rule must explicitly provide `decision`. Omitting it is a
validation error that identifies the zero-based rule index and action name;
deny by default applies only when an action has no matching rule.

Required string fields reject empty values and values containing only
whitespace. Valid values are preserved exactly: validation does not trim them,
and connector and action matching remains exact.

Duplicate `rules[].action` values are invalid. Normalization reports the
duplicate action and its zero-based rule index instead of allowing later rules
to overwrite earlier decisions.

Duplicate `actions[].name` values are also invalid. Normalization reports the
duplicate name and its zero-based manifest action index so review counts cannot
include indistinguishable rows.

When present, `actions[].rationale`, `rules[].reason`, and `rules[].approver`
must be strings; objects, arrays, numbers, booleans, and `null` are rejected
with the zero-based action or rule index. Omitting these optional fields keeps
the defaults documented in the tables above.

An empty `actions` array is invalid rather than an allowed no-op. This prevents an
empty permission diff from being interpreted as evidence that a request is allowed.

In Markdown output, pipe delimiters in action and policy values are escaped as
`\|`, and line breaks within those values are rendered as `<br>`. This keeps
action name, effect, scope, reason, approver, and rationale values inside their
intended table cells.

See `fixtures/read-only-policy.json` for a stricter policy variant that blocks write actions.
