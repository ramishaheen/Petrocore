# 360° PETROCORE — Data Model

> Living document. Tables are namespaced by layer (`l1_…` … `l10_…`).
> Every tenant-scoped table carries `tenant_id` (FK → `l1_org_node.id`) for Row-Level Security.

## Cross-cutting

- **`tenant_id`** on every tenant-scoped row → an `l1_org_node`. RLS restricts to the requester's subtree.
- **`confidence`** (numeric 0–1) and **`evidence_id`** on every competency result, gap, and recommendation.
- **`app_user`**, **`audit_log`** (immutable, tamper-evident) are global.

## L1 · Strategy & Institutional Context

- **`l1_org_node`** — the institutional hierarchy *and* tenant tree.
  `id, parent_id (self-FK), node_type (NOC|SUBSIDIARY|ACTIVITY|DEPARTMENT|SECTION|JOB|EMPLOYEE),
  name_en, name_ar, path (ltree-style materialized path), code, metadata jsonb`.
- **`l1_strategic_element`** — `id, node_id, kind (CORPORATE_STRATEGY|SUBSIDIARY_STRATEGY|DEPT_STRATEGY|HR_STRATEGY|POLICY|PERFORMANCE_PRIORITY), title_en, title_ar, body_en, body_ar`.

`node_type` ACTIVITY values map to the 7 operating segments: EXPLORATION, DRILLING, PRODUCTION,
PROCESSING, REFINING, PETROCHEMICALS, STORAGE_TRANSPORT.

## L2 · HR, Jobs & Performance

- **`l2_employee`** — `id, tenant_id, employee_no, full_name_en, full_name_ar, email(enc), national_id(enc), hire_date, years_experience, current_job_id, section_id`.
- **`l2_job`** — `id, tenant_id, code, title_en, title_ar, job_family, admin_level (1–5), activity_segment`.
- **`l2_org_assignment`** — `id, employee_id, node_id, role_in_node, start_date, end_date`.
- **`l2_appraisal`** — `id, employee_id, period, rating, kpi_score, notes_en, notes_ar`.
- **`l2_kpi`** — `id, tenant_id, name_en, name_ar, target, actual, unit`.

## L3 · Competency Dictionary & Professional Standards

- **`l3_competency`** — `id, code, name_en, name_ar, family (TECHNICAL|HSE|BEHAVIORAL|LEADERSHIP|DIGITAL|EVIDENCE_STANDARD), description_en, description_ar`.
- **`l3_competency_requirement`** — calibration: `id, competency_id, job_id|admin_level, required_level (1–5), min_experience_band, risk_weight, activity_segment`.
- **Proficiency bands** (enum): AWARENESS(0–2) · BASIC(3–5) · INDEPENDENT(6–10) · ADVANCED(10+) · EXPERT_COACH.
- **Admin levels** (1–5): OPERATOR · SUPERVISOR · SECTION_HEAD · DEPT_MANAGER · EXECUTIVE.

## L4 · Department Planning & Operational Requirements

- **`l4_department_plan`** — `id, tenant_id, period, objectives_en, objectives_ar`.
- **`l4_operational_requirement`** — `id, plan_id, title_en, title_ar, required_competency_id, criticality, readiness_priority`.

## L5 · Employee 360° Profile (Competency Passport)

- **`l5_profile`** — `id, employee_id, readiness_index (0–100), status (DRAFT|MANAGER_APPROVED|HR_VALIDATED|TRUSTED)`.
- **`l5_profile_approval`** — `id, profile_id, approver_user_id, role (LINE_MANAGER|HR_VALIDATOR), decision, decided_at` (dual sign-off → TRUSTED).
- **`l5_competency_result`** — `id, profile_id, competency_id, assessed_level (1–5), required_level, confidence, evidence_id, source, status`.

## L6 · Asset, Equipment & Critical Role

- **`l6_asset`** — `id, tenant_id, name_en, name_ar, asset_type, activity_segment`.
- **`l6_competency_asset_link`** — `id, competency_id, asset_id`.
- **`l6_critical_role`** — `id, job_id, criticality, loss_risk, business_impact`.

## L7 · AI Assessment & Evidence

- **`l7_question`** — smart question bank: `id, competency_id, kind (MCQ|SCENARIO|EVIDENCE), difficulty, body_en, body_ar, options jsonb, answer_key jsonb`.
- **`l7_assessment`** — `id, employee_id, competency_id, status, adaptive_path jsonb, confidence, started_at, finished_at`.
- **`l7_assessment_item`** — `id, assessment_id, question_id, response jsonb, correct, score`.
- **`l7_evidence`** — `id, tenant_id, employee_id, kind, uri, text, embedding vector(1536), confidence`.
- **`l7_audit_trail`** — per-assessment audit entries.

## L8 · AI Data Fusion & Gap Analysis

- **`l8_gap`** — `id, scope (INDIVIDUAL|TEAM|DEPARTMENT|COMPANY), subject_id, competency_id, current_level, target_level, gap_size, priority, confidence, evidence_id`.
- **`l8_gap_report`** — materialized report payloads (`kind, scope, subject_id, payload jsonb, generated_at`).
- **`l8_recommendation`** — `id, gap_id, text_en, text_ar, confidence, status (PENDING|REVIEWED|APPROVED|REJECTED)`.

## L9 · Training & Development Governance

- **`l9_training_need`** — derived from verified gaps.
- **`l9_program`** — `id, title_en, title_ar, method (BLENDED|ILT|DIGITAL|SELF_PACED), provider, target_group, impact_kpi`.
- **`l9_nomination`** — `id, employee_id, program_id, gap_id, stage (BEFORE|DURING|AFTER), status`.
- **`l9_impact`** — pre/post level, gap closure, performance link; writes back to `l5_profile.readiness_index`.

## L10 · Dashboards & Reports

Read-models / views over L1–L9. Eight reports (§9 of spec) + Executive Dashboard modules.
Materialized via `l8_gap_report` and dedicated read views.

## Governance (cross-cutting)

- **`gov_decision`** — `id, kind, subject_ref, ai_recommendation, confidence, reviewer_user_id, governance_status, decided_at`. No recommendation enters a decision without review + approval.
- **`audit_log`** — immutable: `id, actor_user_id, action, entity, entity_id, before jsonb, after jsonb, at, hash, prev_hash` (tamper-evident chain).
