# Input Schema

## Manifest

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `connector` | string | yes | Must match the policy connector. |
| `actions` | array | yes | Requested connector actions. |
| `actions[].name` | string | yes | Exact action key. |
| `actions[].effect` | string | yes | Typical values: `read`, `write`, `delete`, `send`, `publish`. |
| `actions[].scope` | string | yes | Human-readable resource scope. |
| `actions[].rationale` | string | no | Why the agent requested the action. |

## Policy

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `connector` | string | yes | Must match the manifest connector. |
| `rules` | array | yes | Exact action rules. |
| `rules[].action` | string | yes | Action name to match. |
| `rules[].decision` | string | yes | `allow`, `needs_approval`, or `deny`. |
| `rules[].reason` | string | no | Review explanation. |
| `rules[].approver` | string | no | Human or role expected to approve. |

Unknown actions are denied even when `defaultDecision` is omitted.

See `fixtures/read-only-policy.json` for a stricter policy variant that blocks write actions.
