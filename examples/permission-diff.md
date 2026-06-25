# Connector Permission Diff: demo-crm

Status: blocked

| Action | Effect | Scope | Decision | Reason | Approver |
| --- | --- | --- | --- | --- | --- |
| contacts.read | read | crm.contacts | allow | Read-only lookup is approved for CRM prep. |  |
| deals.update | write | crm.deals | needs_approval | Pipeline changes require account-owner approval. | account-owner |
| contacts.delete | delete | crm.contacts | deny | Destructive contact changes are out of scope. |  |

Summary: 1 allowed, 1 approval-required, 1 denied.
