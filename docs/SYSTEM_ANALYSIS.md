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
| AssessmentBlueprint(+Competency,+Rule) | ⬜ P-C (next) |
| Talent/Succession entities | ⬜ P-E |
| Multi-factor ReadinessScore (per group/family/level) | ⬜ P-D |

## 7. Phased plan to converge on the spec
- **P-A (this increment):** extensible core (LookupType/Value, EntityType/EntityLink, CustomField*) +
  workforce segmentation (Family/Stream/RoleLevel/RoleArchetype) — additive tables, seed, read/link APIs, tests.
- **P-B ✅:** competency depth (Domain/Cluster/ProficiencyLevel/Descriptor) + versioned RoleCompetencyProfile/Requirement;
  Employee qualifications/certifications/experience. Migration 0003; APIs under `/competencies`, `/competency-domains`,
  `/jobs/{id}/competency-profile`, `/employees/{id}/{qualifications,certifications,experience}`.
- **P-C:** AssessmentBlueprint engine (+competency,+rule) + attempt/response split + scoring rubrics; AI question review workflow.
- **P-D:** multi-factor ReadinessScore (entity = employee/group/dept/family/level/company) + readiness models per family.
- **P-E:** talent/succession/knowledge-continuity; workforce planning; integrations (HR/LMS/ERP/CMMS/HSE).
- **P-F:** psychometrics/calibration, predictive readiness, knowledge graph, benchmarking.

MVP (per spec §30): setup → segmentation → Employee 360 basic → competency matrix → blueprint →
basic AI questions w/ review → bank → assessment → gaps → readiness → dev plan → dashboard → RBAC →
workflow → audit → manual import.
