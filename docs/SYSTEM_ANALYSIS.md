# 360° PETROCORE — System Analysis (authoritative spec)

> Source of truth for the **Workforce Competency, Qualification & Readiness Assessment Core** —
> an *extensible* core that grows into the full sector platform. Supersedes the narrower
> 10-layer framing in `ARCHITECTURE.md` where they differ; that doc remains the implemented
> baseline while we evolve toward this model.

## 1. Governing architectural principle
Build a **scalable core**, not a single assessment tool. Four pillars:
1. **Stable core tables** — institution, company, employee, role, competency, assessment, result, gap.
2. **Configurable master data** — families, levels, assessment types, evidence types, weights,
   pathways, risk grades are *data*, not code (`LookupType`/`LookupValue`).
3. **Generic entity-link table** — any entity ↔ any entity (`EntityLink`): employee↔project,
   competency↔asset, strategy↔competency, gap↔training, …
4. **Versioning + audit** — no dictionary/result/weight changes without a version + approval trail.

Plus: **custom fields** (`CustomFieldDefinition`/`Value`) so new attributes need no schema change.

## 2. End-to-end flow
Setup (Sector → Institution → Company → Org Units → Workforce Families → Career Streams → Role
Archetypes → Role Levels → Job Roles → Employees → Assignments) → **Workforce Classification** →
**Competency Dictionary** (Domain → Cluster → Competency → Proficiency Level → Descriptor → Evidence
Requirement → Assessment Method → Approval) → **Role Competency Matrix** → **Employee 360** →
**Assessment Blueprint** → **AI Question/Scenario generation → human review → approved bank** →
**Assessment execution** → **Gap analysis** → **Readiness scoring** → **Development plan** →
**Talent & succession** → **Executive reporting** — every sensitive step behind an approval workflow.

## 3. Core entity groups (target data model)
- **Config/extensibility:** LookupType, LookupValue, EntityType, EntityLink, CustomFieldDefinition, CustomFieldValue.
- **Enterprise/org:** ParentInstitution, SubsidiaryCompany, OrganizationUnit (Department/Section/Unit unified).
- **Workforce architecture:** WorkforceFamily, CareerStream, RoleLevel (L1–L8), RoleArchetype, JobRole.
- **Employee 360:** Employee, EmployeeAssignment, EmployeeQualification, EmployeeCertification, EmployeeExperience.
- **Competency:** CompetencyDomain, CompetencyCluster, Competency, ProficiencyLevel (P1–P5), CompetencyLevelDescriptor.
- **Role matrix:** RoleCompetencyProfile, RoleCompetencyRequirement, EvidenceRequirementProfile.
- **Assessment:** AssessmentBlueprint(+Competency,+Rule), Assessment, AssessmentParticipant, AssessmentAttempt, AssessmentResponse, AssessmentResult.
- **AI/questions:** AIQuestionGenerationRequest, AIGeneratedQuestion, QuestionBank, Question, QuestionTag, QuestionReview, ScoringRubric, PromptTemplate, AIRequest/Output/Review.
- **Evidence:** EvidenceType, Evidence, EvidenceReview.
- **Gap/readiness:** GapAnalysis, ReadinessScore (per employee/group/dept/family/level/company).
- **Development:** LearningNeed, DevelopmentPlan, DevelopmentPlanItem.
- **Talent/succession:** TalentProfile, SuccessionPlan, SuccessorCandidate, CriticalRole, KnowledgeHolder, KnowledgeTransferPlan.
- **Groups:** WorkforceGroup, WorkforceGroupMember.
- **Governance/security:** SystemUser, PermissionRole, UserPermissionRole, WorkflowInstance, Approval, AuditLog.

## 4. Readiness & gap logic
`Gap = Required level − Actual level`, but the verdict weights competency weight, criticality,
role level, gap type, **evidence confidence**, and risk impact. Dimensions assessed: Qualification,
Certification, Experience, Knowledge, Skill, Behavior, Leadership, Supervisory, Technical/Functional.
`Readiness Index = CompetencyScore × EvidenceConfidence × DataQuality × RiskAdjustment ×
RoleCriticality × Recency`. Statuses: Ready · Ready w/ minor gaps · Development required · Not ready
for critical role · Evidence insufficient · Reassessment required · Succession candidate · High potential.

## 5. Non-negotiables that carry over
Bilingual everywhere; AI suggests/analyzes but **never decides** (human-in-the-loop by output type);
every result explainable (what was measured, evidence, confidence, gap, action, who approved);
configurable (weights/levels/risk/workflows/AI limits in master data, not code); full audit;
RLS multi-tenant (enforced under a non-superuser DB role).

## 6. Mapping: current build → target spec
| Target | Current status |
|--------|----------------|
| ParentInstitution / Subsidiary / OrgUnit | ✅ `l1_org_node` (hierarchy tree) |
| Employee / Assignment | ✅ `l2_employee` (+assignment partial) |
| JobRole | ✅ `l2_job` (needs family/stream/archetype/level refs) |
| Competency (flat) | ✅ `l3_competency` (needs Domain/Cluster/Descriptor) |
| Role competency requirement | ✅ `l3_competency_requirement` (needs Profile/version) |
| Assessment / question / evidence / gap / readiness | ✅ L7/L8 (needs blueprint, attempt/response split, multi-factor readiness) |
| Training / development | ✅ L9 |
| Governance / audit | ✅ `gov_decision` + tamper-evident `audit_log` |
| **Configurable master data (LookupType/Value)** | 🆕 added (this increment) |
| **Generic EntityLink** | 🆕 added (this increment) |
| **CustomFieldDefinition/Value** | 🆕 added (this increment) |
| **WorkforceFamily / CareerStream / RoleLevel / RoleArchetype** | 🆕 added (this increment) |
| CompetencyDomain/Cluster/ProficiencyLevel/Descriptor | ✅ P-B (`cd_*` tables + taxonomy + descriptors) |
| RoleCompetencyProfile/Requirement (versioned) | ✅ P-B (`rc_profile`/`rc_requirement`, P1–P5) |
| EmployeeQualification/Certification/Experience | ✅ P-B (`e360_*` tables) |
| AssessmentBlueprint(+Competency,+Rule) + ScoringRubric | ✅ P-C (`ab_*` tables) |
| AIQuestionGenerationRequest/AIGeneratedQuestion/QuestionReview | ✅ P-C (`qg_*` tables → promote to `l7_question`) |
| Talent/Succession/KnowledgeContinuity entities | ✅ P-E (`tal_*` tables + succession ranking) |
| Multi-factor ReadinessScore (per group/family/level) | ✅ P-D (`rs_score` + readiness engine) |

## 7. Phased plan to converge on the spec
- **P-A (this increment):** extensible core (LookupType/Value, EntityType/EntityLink, CustomField*) +
  workforce segmentation (Family/Stream/RoleLevel/RoleArchetype) — additive tables, seed, read/link APIs, tests.
- **P-B ✅:** competency depth (Domain/Cluster/ProficiencyLevel/Descriptor) + versioned RoleCompetencyProfile/Requirement;
  Employee qualifications/certifications/experience. Migration 0003; APIs under `/competencies`, `/competency-domains`,
  `/jobs/{id}/competency-profile`, `/employees/{id}/{qualifications,certifications,experience}`.
- **P-C ✅:** governed AssessmentBlueprint engine (`ab_blueprint` + `_competency` + `_rule`) derived from a
  job's latest APPROVED competency profile, scoring rubrics (`ab_scoring_rubric`), and the AI
  question workflow (`qg_request`/`qg_question`/`qg_review`): the gateway *drafts* questions with a
  confidence score, a human reviewer (SME/HR/Governance) Approves/Returns/Rejects, and an approved
  draft is *promoted* into the live `l7_question` bank — every step audited. Migration 0004; APIs under
  `/jobs`, `/jobs/{id}/blueprint`, `/blueprints[/{id}][/submit|/approve|/generate-questions]`,
  `/ai-questions[/{id}/review]`, `/scoring-rubrics`. Also hardened the audit hash chain with a monotonic
  `seq` (ties on transaction `created_at` no longer reorder the chain).
- **P-D ✅:** multi-factor, explainable ReadinessScore (`rs_score`) for any entity
  (employee/department/company/family/level/group). The readiness engine combines the six §4
  factors — CompetencyScore × EvidenceConfidence × DataQuality × RiskAdjustment × RoleCriticality ×
  Recency — surfacing the geometric mean as a 0–100 index (monotonic in the product) while recording
  the raw product and every factor for defensibility. Status bands + quality floors are configurable;
  the catalog covers the §4 statuses (Ready · Ready w/ minor gaps · Development required · Not ready for
  critical role · Evidence insufficient · Reassessment required · + talent flags for P-E). Employee
  scores roll up the org tree by averaging factors and recomputing. Migration 0005; APIs under
  `/readiness/{statuses,employees/{id}[/compute],nodes/{id}[/compute]}` and `GET /readiness`. Every
  compute/aggregate is audited.
- **P-E ✅:** talent, succession & knowledge continuity (`tal_profile`, `tal_succession_plan`,
  `tal_successor`, `tal_knowledge_holder`, `tal_kt_plan`). Succession ranks candidates for a critical
  role by their multi-factor readiness (P-D) and remaining gaps vs the role's approved profile (P-B),
  computing bench strength + time-to-ready; building a plan opens a `gov_decision` (human-in-the-loop)
  and every write is audited. Migration 0006; APIs under `/talent/{pipeline,profiles,critical-roles,
  jobs/{id}/succession-plan,succession-plans[/{id}],successors/{id}/decision,knowledge-holders,
  transfer-plans}`. (Workforce planning + HR/LMS/ERP/CMMS/HSE integrations remain for a later increment.)
- **P-F ✅:** Phase-4 intelligence — workforce planning (supply/demand, critical-role coverage,
  retirement risk, training demand), predictive readiness (deterministic, explainable horizon
  projection), knowledge graph (traversal over the generic `cfg_entity_link` seam), psychometrics &
  calibration (item difficulty/discrimination/reliability + retire recommendations), cross-company
  benchmarking, and an integration registry (`intg_connector`/`intg_sync_log`, migration 0007) for
  HR/LMS/ERP/CMMS/HSE/DMS/IAM/BI. APIs under `/workforce-planning/*`, `/readiness/forecast[/{id}]`,
  `/knowledge-graph[/summary]`, `/psychometrics/*`, `/benchmarking/companies`,
  `/integration/{connectors,sync-logs}`. Read-only analytics over existing data (no new workforce
  facts invented); connector runs are audited.

MVP (per spec §30): setup → segmentation → Employee 360 basic → competency matrix → blueprint →
basic AI questions w/ review → bank → assessment → gaps → readiness → dev plan → dashboard → RBAC →
workflow → audit → manual import.
