import assert from "node:assert/strict";
import test from "node:test";
import { diffPermissions, renderMarkdown } from "../src/index.js";
import { run } from "../src/cli.js";

const policy = {
  connector: "demo-crm",
  rules: [
    { action: "contacts.read", decision: "allow", reason: "Read-only." },
    { action: "deals.update", decision: "needs_approval", reason: "Owner approval.", approver: "owner" },
    { action: "contacts.delete", decision: "deny", reason: "Destructive." }
  ]
};

test("classifies allow, approval-required, and denied actions", () => {
  const diff = diffPermissions(
    {
      connector: "demo-crm",
      actions: [
        { name: "contacts.read", effect: "read", scope: "crm.contacts" },
        { name: "deals.update", effect: "write", scope: "crm.deals" },
        { name: "contacts.delete", effect: "delete", scope: "crm.contacts" }
      ]
    },
    policy
  );

  assert.equal(diff.status, "blocked");
  assert.deepEqual(diff.summary, { allow: 1, needs_approval: 1, deny: 1 });
});

test("denies unknown actions by default", () => {
  const diff = diffPermissions(
    {
      connector: "demo-crm",
      actions: [{ name: "notes.export", effect: "read", scope: "crm.notes" }]
    },
    policy
  );

  assert.equal(diff.actions[0].decision, "deny");
  assert.match(diff.actions[0].reason, /deny by default/);
});

test("rejects connector mismatches", () => {
  assert.throws(
    () => diffPermissions({ connector: "demo-mail", actions: [] }, policy),
    /Connector mismatch/
  );
});

test("renders markdown review evidence", () => {
  const diff = diffPermissions(
    {
      connector: "demo-crm",
      actions: [{ name: "contacts.read", effect: "read", scope: "crm.contacts" }]
    },
    policy
  );

  assert.match(renderMarkdown(diff), /Connector Permission Diff: demo-crm/);
  assert.match(renderMarkdown(diff), /contacts.read/);
  assert.match(renderMarkdown(diff), /Rationale/);
});

test("cli returns json output", () => {
  const output = run([
    "--manifest",
    "fixtures/connector-manifest.json",
    "--policy",
    "fixtures/approval-policy.json",
    "--format",
    "json"
  ]);

  assert.equal(JSON.parse(output).summary.deny, 1);
});
