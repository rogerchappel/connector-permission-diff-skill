# Library API

```js
import { diffPermissions, renderMarkdown } from "connector-permission-diff-skill";

const diff = diffPermissions(manifest, policy);
console.log(renderMarkdown(diff));
```

## `diffPermissions(manifest, policy)`

The manifest must request at least one action. The function throws
`Manifest requires at least one action.` for an empty `manifest.actions` array.

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
