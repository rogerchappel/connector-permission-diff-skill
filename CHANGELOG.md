# Changelog

## [Unreleased]

- Add release-readiness checks for package metadata, pack contents, and CI verification.
- Reject empty action manifests instead of reporting an empty diff as allowed.
- Preserve Markdown table structure when action or policy values contain pipes or line breaks.
- Reject duplicate policy action rules so rule ordering cannot overwrite a decision.
- Reject the unsupported `defaultDecision` field and document the fixed deny-by-default contract.
All notable changes to this project will be documented in this file.

## 0.1.0 - Initial release candidate

- Provides a local-first connector permission diff CLI and library.
- Compares connector manifests against approval policies without calling external services.
- Includes fixtures, tests, smoke checks, and a release readiness gate for package validation.
