# Safety Model

The package follows a dry-run-only safety model.

## Guarantees

- Reads local JSON files.
- Prints JSON or Markdown reports.
- Does not import connector SDKs.
- Does not perform network requests.
- Denies unknown actions by default.

## Reviewer Guidance

Treat `deny` as blocked and `needs_approval` as pending human approval. A report from this tool is evidence for review, not delegated permission to call a connector.
