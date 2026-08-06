import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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

const manifest = {
  connector: "demo-crm",
  actions: [{ name: "contacts.read", effect: "read", scope: "crm.contacts" }]
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

test("rejects duplicate manifest action names with the duplicate index", () => {
  assert.throws(
    () =>
      diffPermissions(
        {
          connector: "demo-crm",
          actions: [
            { name: "contacts.read", effect: "read", scope: "crm.contacts" },
            { name: "contacts.read", effect: "read", scope: "crm.contacts.archive" }
          ]
        },
        policy
      ),
    /duplicate name "contacts\.read" at index 1\. Each action name must appear once\./
  );
});

test("rejects non-string optional manifest rationale", () => {
  assert.throws(
    () =>
      diffPermissions(
        {
          connector: "demo-crm",
          actions: [
            {
              name: "contacts.read",
              effect: "read",
              scope: "crm.contacts",
              rationale: { unexpected: true }
            }
          ]
        },
        policy
      ),
    /Manifest action 0 rationale must be a string when provided\./
  );
});

test("rejects non-string optional policy reason and approver values", () => {
  for (const [field, value] of [
    ["reason", { unexpected: true }],
    ["approver", ["owner"]]
  ]) {
    assert.throws(
      () =>
        diffPermissions(
          {
            connector: "demo-crm",
            actions: [{ name: "contacts.read", effect: "read", scope: "crm.contacts" }]
          },
          {
            connector: "demo-crm",
            rules: [{ action: "contacts.read", decision: "allow", [field]: value }]
          }
        ),
      new RegExp(`Policy rule 0 ${field} must be a string when provided\\.`)
    );
  }
});

test("preserves defaults when optional fields are omitted", () => {
  const diff = diffPermissions(
    {
      connector: "demo-crm",
      actions: [{ name: "contacts.read", effect: "read", scope: "crm.contacts" }]
    },
    { connector: "demo-crm", rules: [{ action: "contacts.read", decision: "allow" }] }
  );

  assert.equal(diff.actions[0].rationale, "");
  assert.equal(diff.actions[0].reason, "No reason provided.");
  assert.equal(diff.actions[0].approver, null);
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

test("rejects every blank required manifest and policy string with its field and index", () => {
  const cases = [
    {
      update: (candidateManifest) => (candidateManifest.connector = " \t "),
      error: /Manifest connector must be a non-blank string\./
    },
    ...["name", "effect", "scope"].map((field) => ({
      update: (candidateManifest) => (candidateManifest.actions[0][field] = " \n "),
      error: new RegExp(`Manifest action 0 ${field} must be a non-blank string\\.`)
    })),
    {
      update: (_candidateManifest, candidatePolicy) => (candidatePolicy.connector = "   "),
      error: /Policy connector must be a non-blank string\./
    },
    {
      update: (_candidateManifest, candidatePolicy) => (candidatePolicy.rules[0].action = "\t"),
      error: /Policy rule 0 action must be a non-blank string\./
    }
  ];

  for (const { update, error } of cases) {
    const candidateManifest = structuredClone(manifest);
    const candidatePolicy = structuredClone(policy);
    update(candidateManifest, candidatePolicy);
    assert.throws(() => diffPermissions(candidateManifest, candidatePolicy), error);
  }
});

test("preserves whitespace in valid required strings", () => {
  const paddedManifest = {
    connector: " demo-crm ",
    actions: [{ name: " contacts.read ", effect: " read ", scope: " crm.contacts " }]
  };
  const paddedPolicy = {
    connector: " demo-crm ",
    rules: [{ action: " contacts.read ", decision: "allow" }]
  };

  const diff = diffPermissions(paddedManifest, paddedPolicy);
  assert.equal(diff.connector, " demo-crm ");
  assert.equal(diff.actions[0].name, " contacts.read ");
  assert.equal(diff.actions[0].effect, " read ");
  assert.equal(diff.actions[0].scope, " crm.contacts ");
  assert.equal(diff.actions[0].decision, "allow");
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

test("cli rejects duplicate manifest action names", () => {
  assert.throws(
    () =>
      run([
        "--manifest",
        "fixtures/duplicate-action-manifest.json",
        "--policy",
        "fixtures/approval-policy.json"
      ]),
    /duplicate name "contacts\.read" at index 1/
  );
});

test("cli rejects invalid optional-field types", () => {
  assert.throws(
    () =>
      run([
        "--manifest",
        "fixtures/invalid-rationale-manifest.json",
        "--policy",
        "fixtures/approval-policy.json"
      ]),
    /Manifest action 0 rationale must be a string when provided/
  );
  assert.throws(
    () =>
      run([
        "--manifest",
        "fixtures/connector-manifest.json",
        "--policy",
        "fixtures/invalid-optional-fields-policy.json"
      ]),
    /Policy rule 0 reason must be a string when provided/
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

test("cli rejects every blank required manifest and policy string", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "permission-diff-blank-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const cases = [
    [(candidateManifest) => (candidateManifest.connector = "   "), /Manifest connector/],
    ...["name", "effect", "scope"].map((field) => [
      (candidateManifest) => (candidateManifest.actions[0][field] = "\t"),
      new RegExp(`Manifest action 0 ${field}`)
    ]),
    [
      (_candidateManifest, candidatePolicy) => (candidatePolicy.connector = "\n"),
      /Policy connector/
    ],
    [
      (_candidateManifest, candidatePolicy) => (candidatePolicy.rules[0].action = "   "),
      /Policy rule 0 action/
    ]
  ];

  for (const [index, [update, error]] of cases.entries()) {
    const candidateManifest = structuredClone(manifest);
    const candidatePolicy = structuredClone(policy);
    update(candidateManifest, candidatePolicy);
    const manifestPath = path.join(directory, `manifest-${index}.json`);
    const policyPath = path.join(directory, `policy-${index}.json`);
    fs.writeFileSync(manifestPath, JSON.stringify(candidateManifest));
    fs.writeFileSync(policyPath, JSON.stringify(candidatePolicy));

    assert.throws(
      () => run(["--manifest", manifestPath, "--policy", policyPath]),
      error
    );
  }
});

test("a blank action can never match an allow rule", () => {
  assert.throws(
    () =>
      diffPermissions(
        { connector: "demo-crm", actions: [{ name: " ", effect: "read", scope: "crm" }] },
        { connector: "demo-crm", rules: [{ action: " ", decision: "allow" }] }
      ),
    /Manifest action 0 name must be a non-blank string\./
  );
});
