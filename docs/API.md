# Library API

```js
import { diffPermissions, renderMarkdown } from "connector-permission-diff-skill";

const diff = diffPermissions(manifest, policy);
console.log(renderMarkdown(diff));
```

## `diffPermissions(manifest, policy)`

Returns:

- `connector`: connector name
- `status`: `allowed`, `approval_required`, or `blocked`
- `summary`: counts by decision
- `actions`: normalized action decisions

## `renderMarkdown(diff)`

Returns a paste-ready Markdown review table.

## `readJsonFile(path)`

Reads and parses a local JSON file with an error message suitable for CLI output.
