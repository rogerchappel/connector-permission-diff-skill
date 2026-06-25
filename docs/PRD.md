# Product Requirements

## Goal

Provide a reusable, local-first way for agents and reviewers to inspect connector permission changes before any external action is taken.

## Non-Goals

- Running connector actions
- Storing approvals
- Synchronizing with live CRM, project-management, or messaging systems

## Requirements

- Read a manifest and policy from local JSON files.
- Deny unknown actions by default.
- Return JSON for automation and Markdown for human review.
- Include fixtures and tests for the expected review states.
- Document side-effect boundaries clearly in `SKILL.md`.

## Success Criteria

- A reviewer can run the smoke command and paste the Markdown output into a PR.
- A package maintainer can import `diffPermissions` in tests.
- Denied and approval-required actions are visible without reading source code.
