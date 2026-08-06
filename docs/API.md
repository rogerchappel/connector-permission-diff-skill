# Library API

```js
import { diffPermissions, renderMarkdown } from "connector-permission-diff-skill";

const diff = diffPermissions(manifest, policy);
console.log(renderMarkdown(diff));
```

## `diffPermissions(manifest, policy)`

The manifest must request at least one action. The function throws
`Manifest requires at least one action.` for an empty `manifest.actions` array.
Duplicate `actions[].name` values are rejected with the zero-based duplicate
action index.

Manifest and policy connectors, manifest action names, effects, and scopes,
and policy rule actions must be non-blank strings. Errors identify the field
and the zero-based action or rule index where applicable. Valid strings are
not trimmed; connector and action matching remains exact.

Policy normalization rejects duplicate `rules[].action` values with the
duplicate rule index. It also rejects any `defaultDecision` field: unmatched
actions have a fixed `deny` decision, so callers must omit that field.

Optional `actions[].rationale`, `rules[].reason`, and `rules[].approver` values
must be strings when present. Errors identify the zero-based action or rule
index. When omitted, they continue to normalize to `""`,
`"No reason provided."`, and `null`, respectively.

Returns:

- `connector`: connector name
- `status`: `allowed`, `approval_required`, or `blocked`
- `summary`: counts by decision
- `actions`: normalized action decisions

## `renderMarkdown(diff)`

Returns a paste-ready Markdown review table. Pipe delimiters in action and policy
values are escaped, and embedded line breaks are rendered as `<br>` to preserve
the table structure.

## `readJsonFile(path)`

Reads and parses a local JSON file with an error message suitable for CLI output.
