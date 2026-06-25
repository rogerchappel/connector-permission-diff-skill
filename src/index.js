import fs from "node:fs";

const VALID_DECISIONS = new Set(["allow", "needs_approval", "deny"]);

export function readJsonFile(path) {
  try {
    return JSON.parse(fs.readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read JSON file ${path}: ${error.message}`);
  }
}

export function normalizeManifest(manifest) {
  if (!manifest || typeof manifest !== "object") {
    throw new Error("Manifest must be a JSON object.");
  }
  if (!manifest.connector || typeof manifest.connector !== "string") {
    throw new Error("Manifest requires a connector string.");
  }
  if (!Array.isArray(manifest.actions)) {
    throw new Error("Manifest requires an actions array.");
  }

  return {
    connector: manifest.connector,
    actions: manifest.actions.map((action, index) => normalizeAction(action, index))
  };
}

export function normalizePolicy(policy) {
  if (!policy || typeof policy !== "object") {
    throw new Error("Policy must be a JSON object.");
  }
  if (!policy.connector || typeof policy.connector !== "string") {
    throw new Error("Policy requires a connector string.");
  }
  if (!Array.isArray(policy.rules)) {
    throw new Error("Policy requires a rules array.");
  }

  const rules = new Map();
  for (const rule of policy.rules) {
    if (!rule || typeof rule !== "object") {
      throw new Error("Policy rules must be objects.");
    }
    if (!rule.action || typeof rule.action !== "string") {
      throw new Error("Policy rule requires an action string.");
    }
    const decision = rule.decision ?? "deny";
    if (!VALID_DECISIONS.has(decision)) {
      throw new Error(`Policy rule ${rule.action} has invalid decision ${decision}.`);
    }
    rules.set(rule.action, {
      action: rule.action,
      decision,
      reason: rule.reason ?? "No reason provided.",
      approver: rule.approver ?? null
    });
  }

  return {
    connector: policy.connector,
    defaultDecision: policy.defaultDecision ?? "deny",
    rules
  };
}

export function diffPermissions(manifestInput, policyInput) {
  const manifest = normalizeManifest(manifestInput);
  const policy = normalizePolicy(policyInput);

  if (manifest.connector !== policy.connector) {
    throw new Error(`Connector mismatch: manifest=${manifest.connector} policy=${policy.connector}`);
  }

  const actions = manifest.actions.map((action) => {
    const rule = policy.rules.get(action.name);
    if (!rule) {
      return {
        ...action,
        decision: "deny",
        reason: "No matching policy rule; deny by default.",
        approver: null
      };
    }
    return {
      ...action,
      decision: rule.decision,
      reason: rule.reason,
      approver: rule.approver
    };
  });

  const summary = {
    allow: actions.filter((action) => action.decision === "allow").length,
    needs_approval: actions.filter((action) => action.decision === "needs_approval").length,
    deny: actions.filter((action) => action.decision === "deny").length
  };

  return {
    connector: manifest.connector,
    status: summary.deny > 0 ? "blocked" : summary.needs_approval > 0 ? "approval_required" : "allowed",
    summary,
    actions
  };
}

export function renderMarkdown(diff) {
  const lines = [
    `# Connector Permission Diff: ${diff.connector}`,
    "",
    `Status: ${diff.status}`,
    "",
    "| Action | Effect | Scope | Decision | Reason | Approver |",
    "| --- | --- | --- | --- | --- | --- |"
  ];

  for (const action of diff.actions) {
    lines.push(
      `| ${action.name} | ${action.effect} | ${action.scope} | ${action.decision} | ${action.reason} | ${action.approver ?? ""} |`
    );
  }

  lines.push(
    "",
    `Summary: ${diff.summary.allow} allowed, ${diff.summary.needs_approval} approval-required, ${diff.summary.deny} denied.`
  );

  return `${lines.join("\n")}\n`;
}

function normalizeAction(action, index) {
  if (!action || typeof action !== "object") {
    throw new Error(`Manifest action ${index} must be an object.`);
  }
  for (const field of ["name", "effect", "scope"]) {
    if (!action[field] || typeof action[field] !== "string") {
      throw new Error(`Manifest action ${index} requires ${field}.`);
    }
  }
  return {
    name: action.name,
    effect: action.effect,
    scope: action.scope,
    rationale: action.rationale ?? ""
  };
}
