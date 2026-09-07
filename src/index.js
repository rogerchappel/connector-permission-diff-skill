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
  if (!isNonBlankString(manifest.connector)) {
    throw new Error("Manifest connector must be a non-blank string.");
  }
  if (!Array.isArray(manifest.actions)) {
    throw new Error("Manifest requires an actions array.");
  }
  if (manifest.actions.length === 0) {
    throw new Error("Manifest requires at least one action.");
  }

  const actions = [];
  const actionNames = new Set();
  for (const [index, action] of manifest.actions.entries()) {
    const normalizedAction = normalizeAction(action, index);
    if (actionNames.has(normalizedAction.name)) {
      throw new Error(
        `Manifest actions contain duplicate name ${JSON.stringify(normalizedAction.name)} at index ${index}. Each action name must appear once.`
      );
    }
    actionNames.add(normalizedAction.name);
    actions.push(normalizedAction);
  }

  return { connector: manifest.connector, actions };
}

export function normalizePolicy(policy) {
  if (!policy || typeof policy !== "object") {
    throw new Error("Policy must be a JSON object.");
  }
  if (!isNonBlankString(policy.connector)) {
    throw new Error("Policy connector must be a non-blank string.");
  }
  if (!Array.isArray(policy.rules)) {
    throw new Error("Policy requires a rules array.");
  }
  if (Object.hasOwn(policy, "defaultDecision")) {
    throw new Error(
      "Policy defaultDecision is not supported; omit it. Unknown actions are denied by default."
    );
  }

  const rules = new Map();
  for (const [index, rule] of policy.rules.entries()) {
    if (!rule || typeof rule !== "object") {
      throw new Error("Policy rules must be objects.");
    }
    if (!isNonBlankString(rule.action)) {
      throw new Error(`Policy rule ${index} action must be a non-blank string.`);
    }
    if (rules.has(rule.action)) {
      throw new Error(
        `Policy rules contain duplicate action ${JSON.stringify(rule.action)} at index ${index}. Each action must appear once.`
      );
    }
    if (!Object.hasOwn(rule, "decision")) {
      throw new Error(
        `Policy rule ${index} action ${JSON.stringify(rule.action)} decision is required.`
      );
    }
    const decision = rule.decision;
    if (!VALID_DECISIONS.has(decision)) {
      throw new Error(`Policy rule ${rule.action} has invalid decision ${decision}.`);
    }
    for (const field of ["reason", "approver"]) {
      if (Object.hasOwn(rule, field) && typeof rule[field] !== "string") {
        throw new Error(`Policy rule ${index} ${field} must be a string when provided.`);
      }
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
    `# Connector Permission Diff: ${escapeMarkdownLineBreaks(diff.connector)}`,
    "",
    `Status: ${diff.status}`,
    "",
    "| Action | Effect | Scope | Decision | Reason | Approver | Rationale |",
    "| --- | --- | --- | --- | --- | --- | --- |"
  ];

  for (const action of diff.actions) {
    lines.push(
      `| ${[
        action.name,
        action.effect,
        action.scope,
        action.decision,
        action.reason,
        action.approver,
        action.rationale
      ]
        .map(escapeMarkdownCell)
        .join(" | ")} |`
    );
  }

  lines.push(
    "",
    `Summary: ${diff.summary.allow} allowed, ${diff.summary.needs_approval} approval-required, ${diff.summary.deny} denied.`
  );

  return `${lines.join("\n")}\n`;
}

function escapeMarkdownCell(value) {
  return escapeMarkdownLineBreaks(value).replaceAll("|", "\\|");
}

function escapeMarkdownLineBreaks(value) {
  return String(value ?? "").replace(/\r\n?|\n/g, "<br>");
}

function normalizeAction(action, index) {
  if (!action || typeof action !== "object") {
    throw new Error(`Manifest action ${index} must be an object.`);
  }
  for (const field of ["name", "effect", "scope"]) {
    if (!isNonBlankString(action[field])) {
      throw new Error(`Manifest action ${index} ${field} must be a non-blank string.`);
    }
  }
  if (Object.hasOwn(action, "rationale") && typeof action.rationale !== "string") {
    throw new Error(`Manifest action ${index} rationale must be a string when provided.`);
  }
  return {
    name: action.name,
    effect: action.effect,
    scope: action.scope,
    rationale: action.rationale ?? ""
  };
}

function isNonBlankString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
