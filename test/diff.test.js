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

test("rejects duplicate policy actions instead of using rule order", () => {
  assert.throws(
    () =>
      diffPermissions(
        {
          connector: "demo-crm",
          actions: [{ name: "contacts.read", effect: "read", scope: "crm.contacts" }]
        },
        {
          connector: "demo-crm",
          rules: [
            { action: "contacts.read", decision: "deny" },
            { action: "contacts.read", decision: "allow" }
          ]
        }
      ),
    /duplicate action "contacts\.read" at index 1\. Each action must appear once\./
  );
});

test("rejects defaultDecision and explains the deny-by-default contract", () => {
  assert.throws(
    () =>
      diffPermissions(
        {
          connector: "demo-crm",
          actions: [{ name: "notes.export", effect: "read", scope: "crm.notes" }]
        },
        { connector: "demo-crm", defaultDecision: "allow", rules: [] }
      ),
    /defaultDecision is not supported; omit it\. Unknown actions are denied by default\./
  );
});

test("rejects manifests with no actions", () => {
  assert.throws(
    () => diffPermissions({ connector: "demo-crm", actions: [] }, policy),
    /Manifest requires at least one action\./
  );
});

test("rejects connector mismatches", () => {
  assert.throws(
    () =>
      diffPermissions(
        {
          connector: "demo-mail",
          actions: [{ name: "messages.read", effect: "read", scope: "mail.messages" }]
        },
        policy
      ),
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

test("renders user and policy values without breaking markdown table cells", () => {
  const diff = diffPermissions(
    {
      connector: "demo-crm",
      actions: [
        {
          name: "contacts|read\narchived",
          effect: "read|export\npreview",
          scope: "crm|contacts\narchive",
          rationale: "Investigate|compare\nwithout mutation."
        }
      ]
    },
    {
      connector: "demo-crm",
      rules: [
        {
          action: "contacts|read\narchived",
          decision: "needs_approval",
          reason: "Archived|records\nneed review.",
          approver: "records|owner\non-call"
        }
      ]
    }
  );

  const markdown = renderMarkdown(diff);
  assert.match(
    markdown,
    /\| contacts\\\|read<br>archived \| read\\\|export<br>preview \| crm\\\|contacts<br>archive \| needs_approval \| Archived\\\|records<br>need review\. \| records\\\|owner<br>on-call \| Investigate\\\|compare<br>without mutation\. \|/
  );
  assert.equal(markdown.split("\n").filter((line) => line.startsWith("| ")).length, 3);
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

test("cli rejects manifests with no actions", () => {
  assert.throws(
    () =>
      run([
        "--manifest",
        "fixtures/empty-manifest.json",
        "--policy",
        "fixtures/approval-policy.json"
      ]),
    /Manifest requires at least one action\./
  );
});

test("cli rejects duplicate policy actions", () => {
  assert.throws(
    () =>
      run([
        "--manifest",
        "fixtures/connector-manifest.json",
        "--policy",
        "fixtures/duplicate-action-policy.json"
      ]),
    /duplicate action "contacts\.read" at index 1/
  );
});

test("cli rejects unsupported defaultDecision", () => {
  assert.throws(
    () =>
      run([
        "--manifest",
        "fixtures/unknown-action-manifest.json",
        "--policy",
        "fixtures/default-decision-policy.json"
      ]),
    /defaultDecision is not supported/
  );
});
