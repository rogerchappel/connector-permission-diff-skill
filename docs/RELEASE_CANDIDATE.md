# Release Candidate Notes

## Classification

ship

## Verification

```bash
npm test
npm run check
npm run smoke
bash scripts/validate.sh
```

## Known Limits

- JSON input only.
- Exact action-name matching only.
- Approval storage is intentionally out of scope.
