# Ayurvedic-CTMS

## Trial regulatory approvals and treatment certificates

The trial detail page includes Trial Regulatory & Approval records, a regulatory readiness dashboard, and Treatment Certificates. Regulatory approval evidence and review decisions are stored on the existing trial proposal record; certificates and their issuance history use a separate local certificate store while continuing to reference the existing patient and trial IDs.

Trial activation checks and first enrollment checks are enforced in the storage helpers as well as in the UI. A required prospective CTRI registration must be complete and dated before enrollment. CDSCO/DCGI applicability is a reviewer decision; permission is required only when the reviewer determines it applies. Authorized trial configurators can adjust the validation rules. Certificate issuance requires an authorized approver and the configured visit, enrollment, and recorded treatment conditions; issuance is unique per patient and trial.

### Deployment limitation

This application currently has no configured server-side API or database schema for these records. As with the existing CTMS data, the new approval, certificate, and audit records are kept in browser `localStorage`. Client-side roles and audit records are suitable only for a demonstration or trusted single-browser workflow: they are not tamper-proof, shared across users, or a substitute for server-side authorization, immutable audit storage, and controlled document storage. A regulated multi-user deployment must move these checks and records to an authenticated server/database before relying on them operationally.

## Pharmacovigilance and drug safety

The Pharmacovigilance area uses the existing trial, patient, visit, and medicine records and keeps one shared safety-report record visible from the global dashboard, trial details, patient safety history, and visit event entry point. It includes safety assessment, follow-ups, reporting assessment, data queries, in-app serious-event escalation records, aggregate analytics, and report audit history. Reporting criteria and deadlines are configured per trial; no external pharmacovigilance authority or email/SMS integration is implemented.

Safety reports and their audit, notification, escalation, and follow-up records are also stored in browser `localStorage`. Consequently, the current role checks and safety workflow are client-side only and do not meet backend-enforced access control, shared durable storage, immutable audit, or secure attachment requirements for a regulated multi-user deployment. Do not rely on this implementation for operational clinical safety reporting until authenticated server APIs, a shared database, and secure document/notification services are configured.