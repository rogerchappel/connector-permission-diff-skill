#!/usr/bin/env bash
set -euo pipefail

npm run check
npm test
npm run smoke >/tmp/connector-permission-diff-smoke.md
grep -q "Status: blocked" /tmp/connector-permission-diff-smoke.md
grep -q "contacts.delete" /tmp/connector-permission-diff-smoke.md
