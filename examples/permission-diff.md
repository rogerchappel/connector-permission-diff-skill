# Connector Permission Diff: demo-crm

Status: blocked

| Action | Effect | Scope | Decision | Reason | Approver | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| contacts.read | read | crm.contacts | allow | Read-only lookup is approved for CRM prep. |  | Look up account owner before drafting a follow-up. |
| deals.update | write | crm.deals | needs_approval | Pipeline changes require account-owner approval. | account-owner | Move a deal stage after a call. |
| contacts.delete | delete | crm.contacts | deny | Destructive contact changes are out of scope. |  | Remove duplicate contacts. |

Summary: 1 allowed, 1 approval-required, 1 denied.
