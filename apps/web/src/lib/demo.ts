// Demo mode: when built with VITE_DEMO=1 (see vite.config.ts `define`), the app
// serves baked-in fixture data instead of calling the live API, so it can be
// deployed as a static preview with no backend.
import type { InternalAxiosRequestConfig } from "axios";

declare const __DEMO__: boolean;
export const DEMO: boolean = typeof __DEMO__ !== "undefined" && __DEMO__;

const competencies = [
  { id: "c-well", code: "TECH-WELL", name_en: "Well Operations", name_ar: "عمليات الآبار", family: "TECHNICAL" },
  { id: "c-proc", code: "TECH-PROC", name_en: "Process Control", name_ar: "التحكم في العمليات", family: "TECHNICAL" },
  { id: "c-psm", code: "HSE-PSM", name_en: "Process Safety Management", name_ar: "إدارة سلامة العمليات", family: "HSE" },
  { id: "c-emrg", code: "HSE-EMRG", name_en: "Emergency Response", name_ar: "الاستجابة للطوارئ", family: "HSE" },
  { id: "c-comm", code: "BEH-COMM", name_en: "Communication", name_ar: "التواصل", family: "BEHAVIORAL" },
  { id: "c-dec", code: "LEAD-DEC", name_en: "Decision Making", name_ar: "اتخاذ القرار", family: "LEADERSHIP" },
  { id: "c-data", code: "DIG-DATA", name_en: "Data & Digital Literacy", name_ar: "الثقافة الرقمية والبيانات", family: "DIGITAL" },
  { id: "c-evd", code: "EVD-DOC", name_en: "Evidence Documentation", name_ar: "توثيق الأدلة", family: "EVIDENCE_STANDARD" },
];
const cName = Object.fromEntries(competencies.map((c) => [c.id, c]));

interface Person { id: string; emp: string; en: string; ar: string; job_en: string; job_ar: string; readiness: number; status: string; seed: number[]; }
const PEOPLE: Person[] = [
  { id: "p1", emp: "e1", en: "Ahmed Al-Mansouri", ar: "أحمد المنصوري", job_en: "Senior Field Operator", job_ar: "مشغل حقل أول", readiness: 86, status: "TRUSTED", seed: [5, 4, 5, 4, 4] },
  { id: "p2", emp: "e2", en: "Fatima Al-Zawawi", ar: "فاطمة الزواوي", job_en: "Process Engineer", job_ar: "مهندسة عمليات", readiness: 74, status: "HR_VALIDATED", seed: [4, 4, 3, 3, 4] },
  { id: "p3", emp: "e3", en: "Khalid Bin Omar", ar: "خالد بن عمر", job_en: "Field Operator", job_ar: "مشغل حقل", readiness: 63, status: "MANAGER_APPROVED", seed: [3, 3, 3, 2, 4] },
  { id: "p4", emp: "e4", en: "Layla Haddad", ar: "ليلى حداد", job_en: "HSE Officer", job_ar: "مسؤولة سلامة", readiness: 58, status: "MANAGER_APPROVED", seed: [3, 2, 4, 3, 2] },
  { id: "p5", emp: "e5", en: "Yusuf Al-Tayeb", ar: "يوسف الطيب", job_en: "Junior Operator", job_ar: "مشغل مبتدئ", readiness: 44, status: "DRAFT", seed: [2, 2, 2, 2, 3] },
  { id: "p6", emp: "e6", en: "Mariam Saleh", ar: "مريم صالح", job_en: "Control Room Operator", job_ar: "مشغلة غرفة تحكم", readiness: 39, status: "DRAFT", seed: [2, 3, 1, 2, 2] },
  { id: "p7", emp: "e7", en: "Omar Al-Fitouri", ar: "عمر الفيتوري", job_en: "Shift Supervisor", job_ar: "مشرف وردية", readiness: 79, status: "TRUSTED", seed: [4, 5, 4, 4, 3] },
  { id: "p8", emp: "e8", en: "Huda Barakat", ar: "هدى بركات", job_en: "Reliability Engineer", job_ar: "مهندسة موثوقية", readiness: 69, status: "HR_VALIDATED", seed: [4, 3, 4, 3, 4] },
];

const FIVE = ["c-well", "c-proc", "c-psm", "c-comm", "c-data"];
function detailFor(p: Person) {
  const required = [4, 4, 5, 3, 3];
  return {
    id: p.id, employee_id: p.emp, name_en: p.en, name_ar: p.ar,
    job_en: p.job_en, job_ar: p.job_ar, readiness_index: p.readiness, status: p.status,
    competency_results: FIVE.map((cid, i) => ({
      competency_id: cid, competency_en: cName[cid].name_en, competency_ar: cName[cid].name_ar,
      family: cName[cid].family, assessed_level: p.seed[i], required_level: required[i],
      confidence: 0.7 + ((i + p.seed[i]) % 3) * 0.09,
      status: p.seed[i] >= required[i] ? "APPROVED" : "PENDING_REVIEW",
    })),
    approvals: [
      ...(["MANAGER_APPROVED", "HR_VALIDATED", "TRUSTED"].includes(p.status) ? [{ role: "LINE_MANAGER", decision: "APPROVED", approver_user_id: "u1" }] : []),
      ...(["HR_VALIDATED", "TRUSTED"].includes(p.status) ? [{ role: "HR_VALIDATOR", decision: "APPROVED", approver_user_id: "u2" }] : []),
    ],
    certificates: [
      { en: "IOSH Managing Safely", ar: "شهادة IOSH لإدارة السلامة", year: 2025 },
      { en: "Well Control (IWCF)", ar: "التحكم في الآبار (IWCF)", year: 2024 },
    ],
    training: [
      { en: "Process Safety Management — L5", ar: "إدارة سلامة العمليات — المستوى 5", stage: p.readiness >= 70 ? "AFTER" : "DURING", closure: p.readiness >= 70 ? 80 : 35 },
      { en: "Digital & Data Literacy", ar: "الثقافة الرقمية والبيانات", stage: "BEFORE", closure: 0 },
    ],
    activity: [
      { en: "Completed Process Control assessment", ar: "أكمل تقييم التحكم في العمليات", when: "2d" },
      { en: "Manager validated profile", ar: "اعتمد المدير البروفايل", when: "1w" },
      { en: "Evidence uploaded: safety record", ar: "رفع دليل: سجل السلامة", when: "2w" },
    ],
  };
}
const profileDetail: Record<string, unknown> = Object.fromEntries(PEOPLE.map((p) => [p.id, detailFor(p)]));

const gaps = [
  { id: "g1", scope: "INDIVIDUAL", subject_id: "e5", competency_id: "c-psm", current_level: 2, target_level: 5, gap_size: 3, priority: "VERY_HIGH", confidence: 0.88 },
  { id: "g2", scope: "INDIVIDUAL", subject_id: "e6", competency_id: "c-psm", current_level: 1, target_level: 5, gap_size: 4, priority: "VERY_HIGH", confidence: 0.83 },
  { id: "g3", scope: "INDIVIDUAL", subject_id: "e3", competency_id: "c-comm", current_level: 2, target_level: 3, gap_size: 1, priority: "MEDIUM", confidence: 0.72 },
  { id: "g4", scope: "INDIVIDUAL", subject_id: "e4", competency_id: "c-proc", current_level: 2, target_level: 4, gap_size: 2, priority: "HIGH", confidence: 0.79 },
  { id: "g5", scope: "TEAM", subject_id: "ops-a", competency_id: "c-data", current_level: 2, target_level: 4, gap_size: 2, priority: "HIGH", confidence: 0.75 },
  { id: "g6", scope: "DEPARTMENT", subject_id: "ops", competency_id: "c-well", current_level: 3, target_level: 4, gap_size: 1, priority: "MEDIUM", confidence: 0.7 },
];

const tree = [{
  id: "noc", node_type: "NOC", name_en: "National Oil Corporation", name_ar: "المؤسسة الوطنية للنفط", activity_segment: null,
  children: [
    { id: "agoco", node_type: "SUBSIDIARY", name_en: "Arabian Gulf Oil Co.", name_ar: "شركة الخليج العربي للنفط", activity_segment: null, children: [
      { id: "prod", node_type: "ACTIVITY", name_en: "Production", name_ar: "الإنتاج", activity_segment: "PRODUCTION", children: [
        { id: "ops", node_type: "DEPARTMENT", name_en: "Field Operations", name_ar: "عمليات الحقل", activity_segment: null, children: [
          { id: "opsa", node_type: "SECTION", name_en: "Operations Section A", name_ar: "قسم العمليات أ", activity_segment: null, children: [] },
          { id: "opsb", node_type: "SECTION", name_en: "Operations Section B", name_ar: "قسم العمليات ب", activity_segment: null, children: [] },
        ] },
      ] },
    ] },
    { id: "waha", node_type: "SUBSIDIARY", name_en: "Waha Oil Co.", name_ar: "شركة الواحة للنفط", activity_segment: null, children: [] },
  ],
}];

const valueDims = [
  { key: "readiness_visibility", en: "Readiness Visibility", ar: "وضوح الجاهزية", score: 88 },
  { key: "risk_control", en: "Risk Control", ar: "ضبط المخاطر", score: 72 },
  { key: "training_roi", en: "Training ROI", ar: "عائد التدريب", score: 65 },
  { key: "succession_strength", en: "Succession Strength", ar: "قوة الإحلال", score: 58 },
  { key: "decision_speed", en: "Decision Speed", ar: "سرعة القرار", score: 81 },
  { key: "fairness_transparency", en: "Fairness & Transparency", ar: "العدالة والشفافية", score: 79 },
];

const readinessTrend = [
  { m: "Jul", v: 58 }, { m: "Aug", v: 60 }, { m: "Sep", v: 61 }, { m: "Oct", v: 64 },
  { m: "Nov", v: 66 }, { m: "Dec", v: 67 }, { m: "Jan", v: 69 }, { m: "Feb", v: 70 },
  { m: "Mar", v: 70 }, { m: "Apr", v: 71 }, { m: "May", v: 72 }, { m: "Jun", v: 73 },
];

const GET: Record<string, unknown> = {
  "/dashboards/executive": {
    workforce_readiness_index: 73, profiles: PEOPLE.length, critical_jobs_total: 6, high_risk_critical_jobs: 2,
    high_risk_pct: 33, profiles_trusted: PEOPLE.filter((p) => p.status === "TRUSTED").length,
    top_competency_gaps: [{ competency_id: "c-psm", count: 4 }, { competency_id: "c-proc", count: 3 }, { competency_id: "c-data", count: 3 }, { competency_id: "c-comm", count: 2 }, { competency_id: "c-well", count: 1 }],
    companies: [
      { id: "agoco", name_en: "Arabian Gulf Oil Co.", name_ar: "شركة الخليج العربي للنفط", readiness: 76 },
      { id: "waha", name_en: "Waha Oil Co.", name_ar: "شركة الواحة للنفط", readiness: 68 },
      { id: "sirte", name_en: "Sirte Oil Co.", name_ar: "شركة سرت للنفط", readiness: 71 },
    ],
    readiness_trend: readinessTrend,
    critical_role_risk: [
      { en: "Shift Supervisor", ar: "مشرف وردية", likelihood: 0.7, impact: 0.9, readiness: 79 },
      { en: "Process Engineer", ar: "مهندس عمليات", likelihood: 0.4, impact: 0.8, readiness: 74 },
      { en: "Control Room Operator", ar: "مشغل غرفة تحكم", likelihood: 0.8, impact: 0.6, readiness: 39 },
      { en: "HSE Officer", ar: "مسؤول سلامة", likelihood: 0.5, impact: 0.7, readiness: 58 },
      { en: "Reliability Engineer", ar: "مهندس موثوقية", likelihood: 0.3, impact: 0.6, readiness: 69 },
    ],
    talent_pipeline: [
      { en: "Skilled", ar: "مهرة", count: 8 },
      { en: "Candidates", ar: "مرشحون", count: 5 },
      { en: "Nominated", ar: "مرشّحون للترقية", count: 3 },
      { en: "Ready", ar: "جاهزون", count: 2 },
    ],
    family_radar: [
      { family: "Technical", en: "Technical", ar: "تقنية", score: 78 },
      { family: "HSE", en: "HSE", ar: "السلامة", score: 64 },
      { family: "Behavioral", en: "Behavioral", ar: "سلوكية", score: 72 },
      { family: "Leadership", en: "Leadership", ar: "قيادية", score: 60 },
      { family: "Digital", en: "Digital", ar: "رقمية", score: 55 },
    ],
    modules: ["Workforce Readiness Index", "Company Readiness Comparison", "Critical Competency Gaps", "Training Impact Overview", "Succession Readiness", "Talent Pipeline", "Critical Role Risk", "Decision Priorities"],
  },
  "/dashboards/diagnostic": [
    { layer: "L1", name_en: "Strategy & Institutional Context", name_ar: "الاستراتيجية والسياق المؤسسي", status: "READY", detail: "Hierarchy + strategy elements loaded." },
    { layer: "L2", name_en: "HR, Jobs & Performance", name_ar: "الموارد البشرية والوظائف", status: "READY", detail: "6 employees, 4 jobs." },
    { layer: "L3", name_en: "Competency Dictionary", name_ar: "قاموس الجدارات", status: "READY", detail: "8 competencies across 6 families." },
    { layer: "L5", name_en: "Employee 360° Profile", name_ar: "البروفايل الشامل", status: "READY", detail: "6 profiles." },
    { layer: "L6", name_en: "Critical Roles", name_ar: "الوظائف الحرجة", status: "NEEDS_REVIEW", detail: "Verify completeness for Section B." },
    { layer: "L8", name_en: "Gap Analysis", name_ar: "تحليل الفجوات", status: "READY", detail: "Gaps computed for all profiles." },
    { layer: "L9", name_en: "Training Governance", name_ar: "حوكمة التدريب", status: "NEEDS_REVIEW", detail: "2 programs awaiting impact data." },
  ],
  "/profiles": PEOPLE.map((p) => ({ id: p.id, employee_id: p.emp, name_en: p.en, name_ar: p.ar, job_en: p.job_en, job_ar: p.job_ar, readiness_index: p.readiness, status: p.status })),
  "/competencies": competencies,
  "/competencies/families": {
    families: { TECHNICAL: "تقنية", HSE: "الصحة والسلامة والبيئة", BEHAVIORAL: "سلوكية", LEADERSHIP: "قيادية", DIGITAL: "رقمية", EVIDENCE_STANDARD: "معايير الأدلة" },
    admin_levels: [
      { level: 1, en: "Operator — Apply & Operate", ar: "تطبيق وتشغيل" },
      { level: 2, en: "Supervisor — Guide & Monitor", ar: "توجيه ومتابعة" },
      { level: 3, en: "Section Head — Plan & Measure", ar: "تخطيط ومؤشرات" },
      { level: 4, en: "Department Manager — Govern & Decide", ar: "حوكمة وقرار" },
      { level: 5, en: "Executive — Strategy & Sustainability", ar: "استراتيجية واستدامة" },
    ],
    proficiency_bands: [
      { band: "AWARENESS", range: "0–2", ar: "وعي" }, { band: "BASIC", range: "3–5", ar: "تطبيق أساسي" },
      { band: "INDEPENDENT", range: "6–10", ar: "ممارسة مستقلة" }, { band: "ADVANCED", range: "10+", ar: "إتقان متقدم" },
      { band: "EXPERT_COACH", range: "—", ar: "خبير/مُرشد" },
    ],
  },
  "/org/tree": tree,
  "/gaps": gaps,
  "/reports/institutional-value": { dimensions: valueDims, value_index: 73 },
  "/reports/succession": {
    critical_roles_total: 6, roles_at_risk: 2, roles_at_risk_pct: 33, ready_successors: 2, overall_readiness: 60.7,
    pipeline: { identified: 8, ready_now: 2, ready_6_12m: 3, ready_12m_plus: 3 },
    critical_roles: [
      { role_en: "Shift Supervisor", role_ar: "مشرف وردية", function_en: "Operations", function_ar: "العمليات", loss_risk: "High", impact: "High", readiness: 79, successor_en: "Omar Al-Fitouri", successor_ar: "عمر الفيتوري" },
      { role_en: "Process Engineer", role_ar: "مهندس عمليات", function_en: "Processing", function_ar: "المعالجة", loss_risk: "Medium", impact: "High", readiness: 74, successor_en: "Huda Barakat", successor_ar: "هدى بركات" },
      { role_en: "Control Room Operator", role_ar: "مشغل غرفة تحكم", function_en: "Operations", function_ar: "العمليات", loss_risk: "High", impact: "Medium", readiness: 39, successor_en: "—", successor_ar: "—" },
    ],
    knowledge_transfer: [
      { en: "Document offshore startup procedure (Supervisor)", ar: "توثيق إجراء بدء التشغيل البحري (المشرف)" },
      { en: "Mentor junior operators on PSM", ar: "إرشاد المشغلين المبتدئين في سلامة العمليات" },
      { en: "Shadow rotation for control-room handover", ar: "تناوب مرافقة لتسليم غرفة التحكم" },
    ],
  },
  "/reports/department-readiness": { departments: [
    { tenant_id: "opsa", name_en: "Operations Section A", name_ar: "قسم العمليات أ", avg_readiness: 71, employees: 3 },
    { tenant_id: "opsb", name_en: "Operations Section B", name_ar: "قسم العمليات ب", avg_readiness: 49, employees: 3 },
  ] },
  "/reports/training-impact": { programs_measured: 3, avg_gap_closure_pct: 71, records: [] },
  "/reports/governance-audit": { audit_chain_intact: true, decisions: [
    { id: "d1", kind: "COMPETENCY_RESULT", status: "APPROVED", confidence: 0.86 },
    { id: "d2", kind: "RECOMMENDATION", status: "PENDING_REVIEW", confidence: 0.62 },
    { id: "d3", kind: "COMPETENCY_RESULT", status: "PENDING_REVIEW", confidence: 0.58 },
  ] },
  "/governance/audit/verify": { intact: true },
  "/enablement/pilot-entry": {
    candidates: [
      { id: "agoco", name_en: "Arabian Gulf Oil Co.", name_ar: "شركة الخليج العربي للنفط", readiness: 76, strategic_impact: 88, score: 82 },
      { id: "sirte", name_en: "Sirte Oil Co.", name_ar: "شركة سرت للنفط", readiness: 71, strategic_impact: 80, score: 75.5 },
      { id: "waha", name_en: "Waha Oil Co.", name_ar: "شركة الواحة للنفط", readiness: 68, strategic_impact: 74, score: 71 },
    ],
    best_starting_point: { id: "agoco", name_en: "Arabian Gulf Oil Co.", name_ar: "شركة الخليج العربي للنفط", readiness: 76, strategic_impact: 88, score: 82 },
    scopes: ["Subsidiary Company", "Technical Department", "Job Family", "Critical Roles", "Management Level", "Employee Group"],
    principle: "Start with the smartest, not the biggest.",
  },
  "/enablement/calibration": { calibration_score: 89, target: 92, on_target: false, scale_up_roadmap: [{ phase: 1, en: "Expand Units", ar: "توسيع الوحدات" }, { phase: 2, en: "Additional Use Cases", ar: "حالات استخدام إضافية" }, { phase: 3, en: "Enterprise Rollout", ar: "النشر المؤسسي" }] },
  "/training/cohorts": [
    { competency_id: "c-psm", target_level: 5, learners: ["e5", "e6"], size: 2 },
    { competency_id: "c-proc", target_level: 4, learners: ["e4"], size: 1 },
    { competency_id: "c-data", target_level: 4, learners: ["e3", "e6"], size: 2 },
  ],
  "/training/programs": [
    { id: "pr1", title_en: "Process Safety Management — Level 5", title_ar: "إدارة سلامة العمليات — المستوى 5", method: "BLENDED", provider: "Murzuq Academy", impact_kpi: "Readiness uplift" },
    { id: "pr2", title_en: "Digital & Data Literacy", title_ar: "الثقافة الرقمية والبيانات", method: "DIGITAL", provider: "Murzuq Academy", impact_kpi: "Digital maturity index" },
  ],
};

function questionsFor(cid: string) {
  return [
    { id: `${cid}-q1`, competency_id: cid, kind: "MCQ", difficulty: 2, body_en: "Select the correct shutdown sequence.", body_ar: "اختر تسلسل الإيقاف الصحيح.", options: { choices: ["A", "B", "C", "D"] } },
    { id: `${cid}-q2`, competency_id: cid, kind: "SCENARIO", difficulty: 4, body_en: "A pressure anomaly is detected — describe your response.", body_ar: "تم رصد خلل في الضغط — صف استجابتك.", options: {} },
  ];
}

const ROLE_AR: Record<string, string> = {
  PLATFORM_ADMIN: "مسؤول المنصة", NOC_EXECUTIVE: "الإدارة العليا", HR_VALIDATOR: "الموارد البشرية",
  LINE_MANAGER: "المدير المباشر", LD_MANAGER: "مدير التدريب والتطوير", DEPT_MANAGER: "مدير الإدارة",
  EMPLOYEE: "الموظف", COMPANY_ADMIN: "مسؤول الشركة", CONSULTANT: "الفريق الاستشاري",
};

/* ---------------------------------------------- P-C: assessment blueprints */
const jobs = [
  { id: "j-op3", code: "OP-3", title_en: "Senior Field Operator", title_ar: "مشغل حقل أول", job_family: "Operations", admin_level: 2, activity_segment: "PRODUCTION", has_approved_profile: true },
  { id: "j-pe2", code: "PE-2", title_en: "Process Engineer", title_ar: "مهندس عمليات", job_family: "Engineering", admin_level: 3, activity_segment: "PROCESSING", has_approved_profile: true },
  { id: "j-hse2", code: "HSE-2", title_en: "HSE Officer", title_ar: "مسؤول سلامة", job_family: "HSE", admin_level: 2, activity_segment: "PRODUCTION", has_approved_profile: false },
];

const blueprints = [
  { id: "bp-op3", code: "OP-3-BP-v1", name: "Senior Field Operator — Assessment Blueprint", name_ar: "مشغل حقل أول — مخطط التقييم", job_id: "j-op3", assessment_purpose: "Baseline", approval_status: "PUBLISHED", version: 1, competency_count: 4 },
  { id: "bp-pe2", code: "PE-2-BP-v1", name: "Process Engineer — Assessment Blueprint", name_ar: "مهندس عمليات — مخطط التقييم", job_id: "j-pe2", assessment_purpose: "Promotion", approval_status: "DRAFT", version: 1, competency_count: 3 },
];

const BP_COMPS: Record<string, Array<Record<string, unknown>>> = {
  "bp-op3": [
    { competency_en: "Well Operations", competency_ar: "عمليات الآبار", required_level: "P4", weight: 1, question_count: 4, evidence_required: false },
    { competency_en: "Process Safety Management", competency_ar: "إدارة سلامة العمليات", required_level: "P5", weight: 2, question_count: 5, evidence_required: true },
    { competency_en: "Communication", competency_ar: "التواصل", required_level: "P3", weight: 1, question_count: 3, evidence_required: false },
    { competency_en: "Data & Digital Literacy", competency_ar: "الثقافة الرقمية والبيانات", required_level: "P3", weight: 1, question_count: 3, evidence_required: false },
  ],
  "bp-pe2": [
    { competency_en: "Process Control", competency_ar: "التحكم في العمليات", required_level: "P4", weight: 1.5, question_count: 4, evidence_required: false },
    { competency_en: "Process Safety Management", competency_ar: "إدارة سلامة العمليات", required_level: "P4", weight: 2, question_count: 4, evidence_required: true },
    { competency_en: "Decision Making", competency_ar: "اتخاذ القرار", required_level: "P3", weight: 1, question_count: 3, evidence_required: false },
  ],
};

function blueprintDetail(id: string) {
  const bp = blueprints.find((b) => b.id === id) ?? blueprints[0];
  return {
    ...bp, passing_threshold: 0.6, readiness_threshold: 0.75,
    scoring_rubric: { code: "WEIGHTED", model: "weighted" },
    competencies: BP_COMPS[bp.id] ?? BP_COMPS["bp-op3"],
    rules: [
      { rule_type: "TimeLimit", rule_value: "60" },
      { rule_type: "Randomization", rule_value: "true" },
      { rule_type: "ReviewerRequired", rule_value: "SME" },
      ...(((BP_COMPS[bp.id] ?? []).some((c) => c.evidence_required)) ? [{ rule_type: "EvidenceRequired", rule_value: "true" }] : []),
    ],
  };
}

const aiQuestions = [
  { id: "q1", competency_en: "Process Safety Management", question_text: "[SCENARIO] At the Expert (P5) level, a gas detector alarms during a hot-work permit — outline your decision sequence and the evidence you would document.", question_text_ar: "[SCENARIO] عند مستوى خبير (P5)، يصدر كاشف الغاز إنذارًا أثناء تصريح عمل ساخن — اشرح تسلسل قرارك والأدلة التي ستوثّقها.", question_type: "SCENARIO", difficulty_level: 5, ai_confidence_score: 0.84, risk_level: "MED", review_status: "DRAFT", published_question_id: null },
  { id: "q2", competency_en: "Process Safety Management", question_text: "[MCQ] Which control is the FIRST line of defence under the process-safety hierarchy?", question_text_ar: "[MCQ] أي ضابط يُعدّ خط الدفاع الأول وفق هرم سلامة العمليات؟", question_type: "MCQ", difficulty_level: 5, ai_confidence_score: 0.58, risk_level: "HIGH", review_status: "DRAFT", published_question_id: null },
  { id: "q3", competency_en: "Well Operations", question_text: "[MCQ] Select the correct shut-in sequence for a kick during tripping.", question_text_ar: "[MCQ] اختر تسلسل الإغلاق الصحيح عند حدوث اندفاع أثناء سحب الأنابيب.", question_type: "MCQ", difficulty_level: 4, ai_confidence_score: 0.9, risk_level: "MED", review_status: "DRAFT", published_question_id: null },
  { id: "q4", competency_en: "Well Operations", question_text: "[SCENARIO] At the Advanced (P4) level, describe how you would verify barrier integrity before resuming operations.", question_text_ar: "[SCENARIO] عند مستوى متقدم (P4)، صف كيف ستتحقق من سلامة الحواجز قبل استئناف العمليات.", question_type: "SCENARIO", difficulty_level: 4, ai_confidence_score: 0.79, risk_level: "MED", review_status: "APPROVED", published_question_id: "lq-aproved-1" },
  { id: "q5", competency_en: "Communication", question_text: "[SCENARIO] A shift handover missed a critical isolation — how do you address it with the team?", question_text_ar: "[SCENARIO] أغفل تسليم الوردية عزلًا حرجًا — كيف تعالج ذلك مع الفريق؟", question_type: "SCENARIO", difficulty_level: 3, ai_confidence_score: 0.66, risk_level: "MED", review_status: "RETURNED", published_question_id: null },
  { id: "q6", competency_en: "Data & Digital Literacy", question_text: "[MCQ] Which chart best surfaces a drift in a process variable over a shift?", question_text_ar: "[MCQ] أي رسم بياني يُظهر انحراف متغيّر عملية عبر الوردية بأفضل شكل؟", question_type: "MCQ", difficulty_level: 3, ai_confidence_score: 0.72, risk_level: "MED", review_status: "DRAFT", published_question_id: null },
];

const scoringRubrics = [
  { id: "r1", code: "WEIGHTED", name: "Weighted competency score", model: "weighted", status: "ACTIVE" },
  { id: "r2", code: "RUBRIC", name: "Behaviour rubric", model: "rubric", status: "ACTIVE" },
  { id: "r3", code: "PASS_FAIL", name: "Pass / fail gate", model: "pass_fail", status: "ACTIVE" },
];

/* ----------------------------------------------- P-D: multi-factor readiness */
const rsStatuses = [
  { code: "READY", name_en: "Ready", name_ar: "جاهز" },
  { code: "READY_MINOR_GAPS", name_en: "Ready with minor gaps", name_ar: "جاهز مع فجوات طفيفة" },
  { code: "DEVELOPMENT_REQUIRED", name_en: "Development required", name_ar: "يتطلب تطويراً" },
  { code: "NOT_READY_CRITICAL", name_en: "Not ready for critical role", name_ar: "غير جاهز لدور حرج" },
  { code: "EVIDENCE_INSUFFICIENT", name_en: "Evidence insufficient", name_ar: "الأدلة غير كافية" },
  { code: "REASSESSMENT_REQUIRED", name_en: "Reassessment required", name_ar: "إعادة التقييم مطلوبة" },
  { code: "SUCCESSION_CANDIDATE", name_en: "Succession candidate", name_ar: "مرشح للإحلال" },
  { code: "HIGH_POTENTIAL", name_en: "High potential", name_ar: "إمكانات عالية" },
];

interface RSRow { entity_type: string; entity_id: string; name_en: string; name_ar: string; readiness_index: number; readiness_status: string; source_count: number; factors: Record<string, number>; is_critical: boolean; }
const readinessRows: RSRow[] = [
  { entity_type: "EMPLOYEE", entity_id: "e1", name_en: "Ahmed Al-Mansouri", name_ar: "أحمد المنصوري", readiness_index: 88.4, readiness_status: "READY", source_count: 4, is_critical: true, factors: { competency_score: 0.95, evidence_confidence: 0.86, data_quality: 0.9, risk_adjustment: 1.0, role_criticality: 0.88, recency: 0.94 } },
  { entity_type: "EMPLOYEE", entity_id: "e7", name_en: "Omar Al-Fitouri", name_ar: "عمر الفيتوري", readiness_index: 81.2, readiness_status: "READY", source_count: 4, is_critical: true, factors: { competency_score: 0.88, evidence_confidence: 0.8, data_quality: 0.85, risk_adjustment: 0.95, role_criticality: 0.85, recency: 0.9 } },
  { entity_type: "EMPLOYEE", entity_id: "e2", name_en: "Fatima Al-Zawawi", name_ar: "فاطمة الزواوي", readiness_index: 74.6, readiness_status: "READY_MINOR_GAPS", source_count: 4, is_critical: false, factors: { competency_score: 0.78, evidence_confidence: 0.74, data_quality: 0.8, risk_adjustment: 0.9, role_criticality: 1.0, recency: 0.85 } },
  { entity_type: "EMPLOYEE", entity_id: "e5", name_en: "Yusuf Al-Tayeb", name_ar: "يوسف الطيب", readiness_index: 41.0, readiness_status: "NOT_READY_CRITICAL", source_count: 3, is_critical: true, factors: { competency_score: 0.42, evidence_confidence: 0.6, data_quality: 0.55, risk_adjustment: 0.7, role_criticality: 0.88, recency: 0.7 } },
  { entity_type: "EMPLOYEE", entity_id: "e6", name_en: "Mariam Saleh", name_ar: "مريم صالح", readiness_index: 0.0, readiness_status: "EVIDENCE_INSUFFICIENT", source_count: 0, is_critical: false, factors: { competency_score: 0.3, evidence_confidence: 0.2, data_quality: 0.3, risk_adjustment: 0.8, role_criticality: 1.0, recency: 0.5 } },
  { entity_type: "DEPARTMENT", entity_id: "opsa", name_en: "Operations Section A", name_ar: "قسم العمليات أ", readiness_index: 67.9, readiness_status: "DEVELOPMENT_REQUIRED", source_count: 3, is_critical: false, factors: { competency_score: 0.71, evidence_confidence: 0.7, data_quality: 0.72, risk_adjustment: 0.88, role_criticality: 0.92, recency: 0.83 } },
  { entity_type: "DEPARTMENT", entity_id: "opsb", name_en: "Operations Section B", name_ar: "قسم العمليات ب", readiness_index: 52.3, readiness_status: "DEVELOPMENT_REQUIRED", source_count: 3, is_critical: false, factors: { competency_score: 0.55, evidence_confidence: 0.62, data_quality: 0.6, risk_adjustment: 0.8, role_criticality: 0.9, recency: 0.78 } },
];

/* ----------------------------------------------- P-E: talent & succession */
const talentPipeline = {
  talent_profiles: 3,
  by_segment: [{ segment: "HIGH_POTENTIAL", count: 2 }, { segment: "SOLID_PERFORMER", count: 1 }],
  critical_roles_total: 3, critical_roles_covered: 2, knowledge_holders: 2, knowledge_at_risk: 1,
};

const criticalRolesTal = [
  { job_id: "j-sup", job_code: "SUP-1", title_en: "Shift Supervisor", title_ar: "مشرف وردية", criticality: "VERY_HIGH", loss_risk: 0.7, business_impact: 0.9, bench_strength: 2, ready_now: 1, has_plan: true },
  { job_id: "j-pe2", job_code: "PE-2", title_en: "Process Engineer", title_ar: "مهندس عمليات", criticality: "HIGH", loss_risk: 0.4, business_impact: 0.8, bench_strength: 1, ready_now: 0, has_plan: true },
  { job_id: "j-cro", job_code: "CRO-1", title_en: "Control Room Operator", title_ar: "مشغل غرفة تحكم", criticality: "HIGH", loss_risk: 0.8, business_impact: 0.6, bench_strength: 0, ready_now: 0, has_plan: false },
];

const TAL_CANDS: Record<string, Array<Record<string, unknown>>> = {
  "j-sup": [
    { id: "sc1", employee_id: "e7", name_en: "Omar Al-Fitouri", name_ar: "عمر الفيتوري", readiness_index: 81.2, readiness_status: "READY", remaining_gaps: 0, time_to_ready_months: 0, rank: 1, recommendation_status: "PENDING" },
    { id: "sc2", employee_id: "e2", name_en: "Fatima Al-Zawawi", name_ar: "فاطمة الزواوي", readiness_index: 74.6, readiness_status: "READY_MINOR_GAPS", remaining_gaps: 1, time_to_ready_months: 3, rank: 2, recommendation_status: "PENDING" },
    { id: "sc3", employee_id: "e8", name_en: "Huda Barakat", name_ar: "هدى بركات", readiness_index: 69.0, readiness_status: "DEVELOPMENT_REQUIRED", remaining_gaps: 2, time_to_ready_months: 6, rank: 3, recommendation_status: "PENDING" },
    { id: "sc4", employee_id: "e5", name_en: "Yusuf Al-Tayeb", name_ar: "يوسف الطيب", readiness_index: 41.0, readiness_status: "NOT_READY_CRITICAL", remaining_gaps: 4, time_to_ready_months: 12, rank: 4, recommendation_status: "PENDING" },
  ],
};

function successionPlanFor(jobId: string) {
  const role = criticalRolesTal.find((r) => r.job_id === jobId) ?? criticalRolesTal[0];
  const cands = TAL_CANDS[jobId] ?? TAL_CANDS["j-sup"];
  return {
    id: "sp-" + role.job_id, job_id: role.job_id, plan_name: `${role.title_en} — Succession Plan`,
    bench_strength: cands.filter((c) => ["READY", "READY_MINOR_GAPS"].includes(c.readiness_status as string)).length,
    ready_now: cands.filter((c) => c.readiness_status === "READY").length,
    candidate_count: cands.length, approval_status: "UNDER_REVIEW", candidates: cands,
  };
}

const knowledgeHolders = [
  { id: "kh1", employee_id: "e1", name_en: "Ahmed Al-Mansouri", name_ar: "أحمد المنصوري", knowledge_domain: "Offshore startup & well control", criticality: "VERY_HIGH", retirement_risk: 0.7, transfer_status: "IN_PROGRESS" },
  { id: "kh2", employee_id: "e7", name_en: "Omar Al-Fitouri", name_ar: "عمر الفيتوري", knowledge_domain: "Turnaround planning", criticality: "HIGH", retirement_risk: 0.5, transfer_status: "OPEN" },
];

const transferPlans = [
  { id: "kt1", knowledge_holder_id: "kh1", plan_name: "Mentor second-line on PSM & startup", successor_employee_id: "e2", mentoring_flag: true, status: "ACTIVE" },
];

const talentProfiles = [
  { id: "tp1", employee_id: "e1", name_en: "Ahmed Al-Mansouri", name_ar: "أحمد المنصوري", talent_segment: "HIGH_POTENTIAL", potential_rating: "HIGH", readiness_status: "READY" },
  { id: "tp2", employee_id: "e7", name_en: "Omar Al-Fitouri", name_ar: "عمر الفيتوري", talent_segment: "HIGH_POTENTIAL", potential_rating: "HIGH", readiness_status: "READY" },
  { id: "tp3", employee_id: "e2", name_en: "Fatima Al-Zawawi", name_ar: "فاطمة الزواوي", talent_segment: "SOLID_PERFORMER", potential_rating: "MED", readiness_status: "READY_MINOR_GAPS" },
];

function rsDetail(entityId: string) {
  const row = readinessRows.find((r) => r.entity_id === entityId) ?? readinessRows[0];
  const f = row.factors;
  const raw = f.competency_score * f.evidence_confidence * f.data_quality * f.risk_adjustment * f.role_criticality * f.recency;
  return {
    entity_type: row.entity_type, entity_id: row.entity_id, name_en: row.name_en, name_ar: row.name_ar,
    readiness_index: row.readiness_index, readiness_status: row.readiness_status, source_count: row.source_count,
    factors: f, method_version: "rs-v1",
    breakdown: { raw_product: Math.round(raw * 1e6) / 1e6, method_version: "rs-v1", is_critical_role: row.is_critical },
  };
}

/* ----------------------------------------- P-F: planning, prediction, graph */
const wfpOverview = {
  total_employees: 8, ready_employees: 3, ready_pct: 37.5, critical_roles: 3,
  critical_roles_covered: 2, critical_roles_at_risk: 1, open_training_needs: 6,
  knowledge_holders: 2, knowledge_at_risk: 1,
};
const wfpSupplyDemand = [
  { family: "Operations", roles: 3, headcount: 5, ready: 2, ready_pct: 40 },
  { family: "Engineering", roles: 2, headcount: 2, ready: 1, ready_pct: 50 },
  { family: "HSE", roles: 1, headcount: 1, ready: 0, ready_pct: 0 },
];
const wfpCoverage = [
  { job_id: "j-cro", title_en: "Control Room Operator", title_ar: "مشغل غرفة تحكم", criticality: "HIGH", loss_risk: 0.8, bench_strength: 0, ready_now: 0, coverage: "AT_RISK" },
  { job_id: "j-sup", title_en: "Shift Supervisor", title_ar: "مشرف وردية", criticality: "VERY_HIGH", loss_risk: 0.7, bench_strength: 2, ready_now: 1, coverage: "COVERED" },
  { job_id: "j-pe2", title_en: "Process Engineer", title_ar: "مهندس عمليات", criticality: "HIGH", loss_risk: 0.4, bench_strength: 1, ready_now: 0, coverage: "COVERED" },
];
const wfpTrainingDemand = [
  { competency_id: "c-psm", competency_en: "Process Safety Management", competency_ar: "إدارة سلامة العمليات", learners: 4, total_gap: 11, very_high: 2 },
  { competency_id: "c-proc", competency_en: "Process Control", competency_ar: "التحكم في العمليات", learners: 3, total_gap: 6, very_high: 0 },
  { competency_id: "c-data", competency_en: "Data & Digital Literacy", competency_ar: "الثقافة الرقمية والبيانات", learners: 3, total_gap: 5, very_high: 0 },
];
const forecastPipeline = { assessed_employees: 8, current_ready: 2, projected_ready: 4, projected_uplift: 2, open_gaps: 6, horizon_months: 12 };
function forecastFor(id: string) {
  const row = readinessRows.find((r) => r.entity_id === id) ?? readinessRows[0];
  const cur = row.readiness_index;
  const proj = Math.min(100, Math.round((cur + (100 - cur) * 0.45) * 10) / 10);
  return {
    employee_id: id, current_index: cur, current_status: row.readiness_status,
    projected_index: proj, projected_status: proj >= 85 ? "READY" : proj >= 70 ? "READY_MINOR_GAPS" : "DEVELOPMENT_REQUIRED",
    horizon_months: 12,
    drivers: ["active development: yes", `competency headroom: ${Math.round((1 - row.factors.competency_score) * 100)}%`, "horizon: 12 months"],
  };
}
const kgSummary = {
  total_links: 8, total_entities: 9,
  by_link_type: [{ link_type: "Required", count: 5 }, { link_type: "EvidenceFor", count: 1 }, { link_type: "Supports", count: 1 }, { link_type: "Impacts", count: 1 }],
};
const kgGraph = {
  nodes: [
    { id: "Role:j-op3", entity_type: "Role", entity_id: "j-op3", label_en: "Senior Field Operator", label_ar: "مشغل حقل أول" },
    { id: "Competency:c-well", entity_type: "Competency", entity_id: "c-well", label_en: "Well Operations", label_ar: "عمليات الآبار" },
    { id: "Competency:c-psm", entity_type: "Competency", entity_id: "c-psm", label_en: "Process Safety Management", label_ar: "إدارة سلامة العمليات" },
    { id: "Competency:c-comm", entity_type: "Competency", entity_id: "c-comm", label_en: "Communication", label_ar: "التواصل" },
    { id: "Competency:c-data", entity_type: "Competency", entity_id: "c-data", label_en: "Data & Digital Literacy", label_ar: "الثقافة الرقمية والبيانات" },
    { id: "Employee:e1", entity_type: "Employee", entity_id: "e1", label_en: "Ahmed Al-Mansouri", label_ar: "أحمد المنصوري" },
    { id: "Asset:a1", entity_type: "Asset", entity_id: "a1", label_en: "Gas Compression Train A", label_ar: "قطار ضغط الغاز أ" },
    { id: "Strategy:s1", entity_type: "Strategy", entity_id: "s1", label_en: "Workforce Readiness 2030", label_ar: "جاهزية القوى العاملة 2030" },
    { id: "Project:prj", entity_type: "Project", entity_id: "prj", label_en: "Offshore Startup", label_ar: "بدء التشغيل البحري" },
  ],
  edges: [
    { source: "Role:j-op3", target: "Competency:c-well", link_type: "Required", weight: 1 },
    { source: "Role:j-op3", target: "Competency:c-psm", link_type: "Required", weight: 2 },
    { source: "Role:j-op3", target: "Competency:c-comm", link_type: "Required", weight: 1 },
    { source: "Role:j-op3", target: "Competency:c-data", link_type: "Required", weight: 1 },
    { source: "Employee:e1", target: "Competency:c-psm", link_type: "EvidenceFor", weight: 1 },
    { source: "Employee:e1", target: "Project:prj", link_type: "Supports", weight: 0.8 },
    { source: "Competency:c-psm", target: "Asset:a1", link_type: "Required", weight: 1 },
    { source: "Strategy:s1", target: "Competency:c-data", link_type: "Impacts", weight: 1 },
  ],
  node_count: 9, edge_count: 8,
};
const psychQuality = [
  { question_id: "c-psm-q1", competency_en: "Process Safety Management", body_en: "Select the correct shutdown sequence.", kind: "MCQ", usage: 14, avg_score: 0.61, difficulty: 0.39, discrimination: 0.34, reliability: "OK", retire_recommended: false },
  { question_id: "c-psm-q2", competency_en: "Process Safety Management", body_en: "A pressure anomaly is detected — describe your response.", kind: "SCENARIO", usage: 12, avg_score: 0.55, difficulty: 0.45, discrimination: 0.41, reliability: "OK", retire_recommended: false },
  { question_id: "c-well-q1", competency_en: "Well Operations", body_en: "Identify the well-control barrier.", kind: "MCQ", usage: 9, avg_score: 0.96, difficulty: 0.04, discrimination: 0.05, reliability: "OK", retire_recommended: true },
  { question_id: "c-data-q1", competency_en: "Data & Digital Literacy", body_en: "Interpret the trend chart.", kind: "MCQ", usage: 3, avg_score: 0.7, difficulty: 0.3, discrimination: 0.0, reliability: "INSUFFICIENT_DATA", retire_recommended: false },
];
const psychReliability = { assessments: 14, items_recorded: 96, questions_used: 16, mean_usage_per_question: 6.0, reliability_score: 1.0, items_needing_calibration: 1, items_insufficient_data: 3, bias_flags: [] };
const benchCompanies = [
  { company_id: "agoco", name_en: "Arabian Gulf Oil Co.", name_ar: "شركة الخليج العربي للنفط", avg_readiness: 76.0, assessed: 5, headcount: 6, ready: 3, ready_pct: 50, rank: 1 },
  { company_id: "sirte", name_en: "Sirte Oil Co.", name_ar: "شركة سرت للنفط", avg_readiness: 71.0, assessed: 4, headcount: 5, ready: 2, ready_pct: 40, rank: 2 },
  { company_id: "waha", name_en: "Waha Oil Co.", name_ar: "شركة الواحة للنفط", avg_readiness: 68.0, assessed: 4, headcount: 5, ready: 2, ready_pct: 40, rank: 3 },
];
const connectors = [
  { id: "co1", code: "HR-CORE", name_en: "Core HR System", name_ar: "نظام الموارد البشرية", system_type: "HR", direction: "INBOUND", status: "ACTIVE", sync_mode: "SCHEDULED", last_sync_at: "2026-06-18T22:00:00Z" },
  { id: "co2", code: "LMS", name_en: "Learning Management System", name_ar: "نظام إدارة التعلم", system_type: "LMS", direction: "BIDIRECTIONAL", status: "CONFIGURED", sync_mode: "SCHEDULED", last_sync_at: null },
  { id: "co3", code: "ERP-FIN", name_en: "ERP / Finance", name_ar: "تخطيط الموارد / المالية", system_type: "ERP", direction: "INBOUND", status: "PLANNED", sync_mode: "SCHEDULED", last_sync_at: null },
  { id: "co4", code: "CMMS", name_en: "Maintenance (CMMS)", name_ar: "إدارة الصيانة", system_type: "CMMS", direction: "INBOUND", status: "PLANNED", sync_mode: "SCHEDULED", last_sync_at: null },
  { id: "co5", code: "HSE", name_en: "HSE System", name_ar: "نظام السلامة", system_type: "HSE", direction: "INBOUND", status: "CONFIGURED", sync_mode: "SCHEDULED", last_sync_at: null },
  { id: "co6", code: "IAM", name_en: "Identity Management", name_ar: "إدارة الهوية", system_type: "IAM", direction: "INBOUND", status: "ACTIVE", sync_mode: "REALTIME", last_sync_at: "2026-06-19T06:00:00Z" },
  { id: "co7", code: "BI", name_en: "BI / Data Warehouse", name_ar: "ذكاء الأعمال", system_type: "BI", direction: "OUTBOUND", status: "ACTIVE", sync_mode: "SCHEDULED", last_sync_at: "2026-06-19T05:00:00Z" },
];
const syncLogs = [
  { id: "sl1", connector_code: "HR-CORE", direction: "INBOUND", entity_type: "Employee", records_in: 3, records_ok: 3, records_failed: 0, status: "SUCCESS", message: "Initial employee load.", at: "2026-06-18T22:00:00Z" },
];

/* ---------------------------------- P-N: self-service settings (mutable demo state) */
const demoAi = { model: "claude-opus-4-8", gateway_url: "http://ai-gateway:9000", api_key_set: false, mode: "stub" as "live" | "stub" };
// Per-connector editable config the Settings tab persists (base URL / key flag).
const demoConnCfg: Record<string, { base_url: string; api_key_set: boolean }> = {};
function connectorPublic(c: (typeof connectors)[number]) {
  const cfg = demoConnCfg[c.code] ?? { base_url: "", api_key_set: false };
  return { ...c, base_url: cfg.base_url, api_key_set: cfg.api_key_set };
}
function parseBody(config: InternalAxiosRequestConfig): Record<string, unknown> {
  try { return JSON.parse((config.data as string) || "{}"); } catch { return {}; }
}

/* ============================================================================
 * Assessment workflow (stateful demo): assign → notify → take → score → govern
 * The employee persona is Ahmed (e1); seeded so the flow is visible immediately.
 * ==========================================================================*/
const DEMO_ME = { employee_id: "e1", name_en: "Ahmed Al-Mansouri", name_ar: "أحمد المنصوري" };

// Which competencies (and required level) each blueprint assesses.
const BP_ASSIGN_COMPS: Record<string, Array<{ id: string; required_level: number }>> = {
  "bp-op3": [{ id: "c-well", required_level: 4 }, { id: "c-psm", required_level: 5 }, { id: "c-comm", required_level: 3 }, { id: "c-data", required_level: 3 }],
  "bp-pe2": [{ id: "c-proc", required_level: 4 }, { id: "c-psm", required_level: 4 }, { id: "c-dec", required_level: 3 }],
};

interface WfResult { competency_id: string; competency_en: string; competency_ar: string; assessed_level: number; required_level: number; confidence: number; status: string; }
interface WfAssignment {
  id: string; employee_id: string; employee_en: string; employee_ar: string;
  blueprint_id: string; title_en: string; title_ar: string; purpose: string;
  competencies: Array<{ id: string; en: string; ar: string; required_level: number }>;
  assigned_by: string; due: string; status: string; created: string;
  confidence: number | null; results: WfResult[];
}
interface WfNotif { id: string; employee_id: string; kind: string; title_en: string; title_ar: string; body_en: string; body_ar: string; when: string; read: boolean; }
interface GovDecision { id: string; kind: string; subject_ref: string; ai_recommendation: string; confidence: number; governance_status: string; assignment_id?: string; competency_id?: string; }

let wfSeq = 1;
const wfAssignments: WfAssignment[] = [];
const wfNotifs: WfNotif[] = [];
const govDecisions: GovDecision[] = [
  { id: "d2", kind: "RECOMMENDATION", subject_ref: "recommendation:r1", ai_recommendation: "Targeted PSM development for Yusuf Al-Tayeb: raise level 2→5.", confidence: 0.62, governance_status: "PENDING_REVIEW" },
  { id: "d3", kind: "COMPETENCY_RESULT", subject_ref: "assessment:a8", ai_recommendation: "Mariam Saleh — Process Safety assessed level 1.", confidence: 0.58, governance_status: "PENDING_REVIEW" },
];

function bpComps(blueprintId: string) {
  const list = BP_ASSIGN_COMPS[blueprintId] ?? BP_ASSIGN_COMPS["bp-op3"];
  return list.map((c) => ({ id: c.id, en: cName[c.id]?.name_en ?? c.id, ar: cName[c.id]?.name_ar ?? c.id, required_level: c.required_level }));
}
function personName(empId: string) {
  const p = PEOPLE.find((x) => x.emp === empId);
  return { en: p?.en ?? empId, ar: p?.ar ?? empId };
}
function createAssignment(employeeId: string, blueprintId: string, assignedBy: string): WfAssignment {
  const bp = blueprints.find((b) => b.id === blueprintId) ?? blueprints[0];
  const nm = personName(employeeId);
  const a: WfAssignment = {
    id: "asg-" + wfSeq++, employee_id: employeeId, employee_en: nm.en, employee_ar: nm.ar,
    blueprint_id: bp.id, title_en: bp.name, title_ar: bp.name_ar, purpose: bp.assessment_purpose,
    competencies: bpComps(bp.id), assigned_by: assignedBy, due: "7d", status: "ASSIGNED",
    created: "now", confidence: null, results: [],
  };
  wfAssignments.unshift(a);
  wfNotifs.unshift({
    id: "ntf-" + wfSeq++, employee_id: employeeId, kind: "ASSESSMENT_ASSIGNED",
    title_en: "New assessment assigned", title_ar: "تم إسناد تقييم جديد",
    body_en: `${bp.name} — ${a.competencies.length} competencies. Due in 7 days.`,
    body_ar: `${bp.name_ar} — ${a.competencies.length} جدارات. خلال 7 أيام.`,
    when: "now", read: false,
  });
  return a;
}
function assignmentSections(a: WfAssignment) {
  return a.competencies.map((c) => ({
    competency_id: c.id, competency_en: c.en, competency_ar: c.ar, required_level: c.required_level,
    questions: questionsFor(c.id),
  }));
}
function scoreAssignment(a: WfAssignment, responses: Record<string, number>) {
  a.results = a.competencies.map((c) => {
    const qs = questionsFor(c.id);
    const itemScores = qs.map((q) => {
      const v = responses[q.id];
      if (q.kind === "MCQ") return v === 0 ? 1 : v == null ? 0 : 0.3; // choice A is the demo key
      return (v ?? 0) / 5;
    });
    const mean = itemScores.reduce((s, x) => s + x, 0) / (itemScores.length || 1);
    const variance = itemScores.reduce((s, x) => s + (x - mean) ** 2, 0) / (itemScores.length || 1);
    const consistency = Math.max(0, Math.min(1, 1 - variance * 2));
    const raw = 0.5 * mean + 0.3 * Math.min(1, 2 / 3) + 0.2 * consistency; // evidence_count = 2
    const confidence = Math.round(Math.max(0, Math.min(1, raw)) * 100) / 100;
    const assessed = Math.max(1, Math.min(5, Math.ceil(mean * 5)));
    return {
      competency_id: c.id, competency_en: c.en, competency_ar: c.ar,
      assessed_level: assessed, required_level: c.required_level, confidence,
      status: confidence >= 0.75 ? "APPROVED" : "PENDING_REVIEW",
    };
  });
  a.confidence = Math.round((a.results.reduce((s, r) => s + r.confidence, 0) / (a.results.length || 1)) * 100) / 100;
  const pending = a.results.filter((r) => r.status === "PENDING_REVIEW");
  a.status = pending.length ? "AWAITING_REVIEW" : "COMPLETED";
  pending.forEach((r) => {
    govDecisions.unshift({
      id: "gd-" + wfSeq++, kind: "COMPETENCY_RESULT", subject_ref: `assignment:${a.id}:${r.competency_id}`,
      ai_recommendation: `${a.employee_en} — ${r.competency_en} assessed level ${r.assessed_level} (confidence ${Math.round(r.confidence * 100)}%).`,
      confidence: r.confidence, governance_status: "PENDING_REVIEW", assignment_id: a.id, competency_id: r.competency_id,
    });
  });
  wfNotifs.unshift({
    id: "ntf-" + wfSeq++, employee_id: a.employee_id, kind: "ASSESSMENT_SCORED",
    title_en: pending.length ? "Assessment submitted — under review" : "Assessment completed",
    title_ar: pending.length ? "تم إرسال التقييم — قيد المراجعة" : "اكتمل التقييم",
    body_en: pending.length ? `${a.title_en}: ${pending.length} result(s) routed to governance.` : `${a.title_en}: all results approved.`,
    body_ar: pending.length ? `${a.title_ar}: تم تحويل ${pending.length} نتيجة إلى الحوكمة.` : `${a.title_ar}: تم اعتماد جميع النتائج.`,
    when: "now", read: false,
  });
  return a;
}
function resolveDecision(id: string, approve: boolean) {
  const d = govDecisions.find((x) => x.id === id);
  if (!d) return { ok: false };
  d.governance_status = approve ? "APPROVED" : "REJECTED";
  if (d.assignment_id) {
    const a = wfAssignments.find((x) => x.id === d.assignment_id);
    if (a) {
      const r = a.results.find((x) => x.competency_id === d.competency_id);
      if (r) r.status = approve ? "APPROVED" : "REJECTED";
      const stillPending = govDecisions.some((x) => x.assignment_id === a.id && x.governance_status === "PENDING_REVIEW");
      if (!stillPending) a.status = "COMPLETED";
      wfNotifs.unshift({
        id: "ntf-" + wfSeq++, employee_id: a.employee_id, kind: "RESULT_REVIEWED",
        title_en: approve ? "Assessment result approved" : "Assessment result returned",
        title_ar: approve ? "تم اعتماد نتيجة التقييم" : "تمت إعادة نتيجة التقييم",
        body_en: `${a.title_en} — ${d.competency_id} ${approve ? "approved" : "returned"} by governance.`,
        body_ar: `${a.title_ar} — ${approve ? "اعتمدت" : "أعيدت"} من الحوكمة.`,
        when: "now", read: false,
      });
    }
  }
  return { id, governance_status: d.governance_status };
}
// Seed one pending assignment for the employee persona so the loop is visible on first load.
createAssignment(DEMO_ME.employee_id, "bp-op3", "HR_VALIDATOR");

/* ---------------------------------- P-G…P-M: full-spec layers (demo fixtures) */
// P-J strategy
const stObjectives = [
  { id: "obj-corp", level: "CORPORATE", title_en: "Workforce Readiness 2030", title_ar: "جاهزية القوى العاملة 2030", period: "2026-2030", parent_objective_id: null },
  { id: "obj-hse", level: "DEPARTMENT", title_en: "Cut HSE incidents 50%", title_ar: "خفض حوادث السلامة 50%", period: "2026", parent_objective_id: "obj-corp" },
];
function stObjectiveDetail(id: string) {
  const o = stObjectives.find((x) => x.id === id) ?? stObjectives[0];
  return {
    ...o,
    kpis: [{ code: "WRI", name_en: "Workforce Readiness Index", name_ar: "مؤشر جاهزية القوى العاملة", target_value: 85, current_value: 73, unit: "%" }],
    competencies: [
      { competency_id: "c-psm", competency_en: "Process Safety Management", required_level: 5, weight: 2 },
      { competency_id: "c-well", competency_en: "Well Operations", required_level: 4, weight: 1 },
    ],
    readiness_gaps: [
      { competency_id: "c-psm", required_level: 5, actual_avg_level: 3.4, gap: 1.6, readiness_pct: 68 },
      { competency_id: "c-well", required_level: 4, actual_avg_level: 3.6, gap: 0.4, readiness_pct: 90 },
    ],
  };
}
// P-I operations
const opSites = [{ id: "site-sarir", code: "SARIR", name_en: "Sarir Field", name_ar: "حقل السرير", activity_segment: "PRODUCTION" }];
const opEquipment = [
  { id: "eq-k101", tag: "K-101", name_en: "Gas Compression Train A", name_ar: "قطار ضغط الغاز أ", equipment_type: "ROTATING", criticality: "VERY_HIGH", risk_level: "HIGH" },
  { id: "eq-p200", tag: "P-200", name_en: "Export Pump", name_ar: "مضخة التصدير", equipment_type: "PUMP", criticality: "HIGH", risk_level: "MED" },
];
const opCriticalTasks = [
  { id: "t1", name_en: "Safe compressor startup", name_ar: "بدء تشغيل الضاغط بأمان", criticality: "VERY_HIGH", competency_id: "c-psm", equipment_id: "eq-k101" },
];
const opExposure = [
  { task_id: "t1", name_en: "Safe compressor startup", name_ar: "بدء تشغيل الضاغط بأمان", criticality: "VERY_HIGH", competency_id: "c-psm", competency_en: "Process Safety Management", covered_employees: 2, risk_count: 1 },
];
// P-G campaigns
const axCampaigns = [
  { id: "camp-1", name: "Senior Field Operator — Baseline", status: "PUBLISHED", blueprint_id: "bp-op3", target_entity_type: "Employee", participants: 1 },
];
function axCampaignDetail(id: string) {
  return { id, name: "Senior Field Operator — Baseline", status: "PUBLISHED", blueprint_id: "bp-op3",
    participants: [{ id: "pt1", employee_id: "e1", name_en: "Ahmed Al-Mansouri", name_ar: "أحمد المنصوري", status: "SUBMITTED" }] };
}
// P-H development plans
const devPlans = [{ id: "dp-1", plan_name: "Individual Development Plan 2026", entity_type: "Employee", entity_id: "e1", approval_status: "APPROVED" }];
function devPlanDetail(id: string) {
  return { id, plan_name: "Individual Development Plan 2026", entity_type: "Employee", entity_id: "e1", approval_status: "APPROVED",
    items: [{ id: "it1", action_type: "Training", action_description: "Process Safety Management — Level 5 program.", completion_status: "IN_PROGRESS", post_assessment_required: true }] };
}
// P-K workflows + permission roles
const wfInstances = [
  { id: "wf-1", workflow_type: "BlueprintApproval", entity_type: "AssessmentBlueprint", entity_id: "bp-op3", status: "OPEN", current_step: 2 },
];
function wfDetail(id: string) {
  return { id, workflow_type: "BlueprintApproval", entity_type: "AssessmentBlueprint", entity_id: "bp-op3", status: "OPEN", current_step: 2,
    steps: [
      { step_order: 1, step_name: "Functional Review", approver_role: "SME", status: "APPROVED" },
      { step_order: 2, step_name: "HR Review", approver_role: "HR_VALIDATOR", status: "PENDING" },
      { step_order: 3, step_name: "Governance Review", approver_role: "COMPANY_ADMIN", status: "PENDING" },
    ] };
}
const permRoles = [
  { id: "pr1", role_name: "Enterprise Administrator", role_scope: "Enterprise", description: "Full enterprise configuration and governance." },
  { id: "pr2", role_name: "Company HR Manager", role_scope: "Company", description: "Manage employees, profiles and validations within a company." },
  { id: "pr3", role_name: "Department Reviewer", role_scope: "Department", description: "Review and approve within a department subtree." },
];
// P-L AI lifecycle
const aiRequests = [
  { id: "air-1", request_type: "SuggestCompetency", status: "COMPLETED", entity_type: "Role", entity_id: null },
];
function aiRequestDetail(id: string) {
  return { id, request_type: "SuggestCompetency", status: "COMPLETED",
    outputs: [{ id: "ao-1", confidence_score: 0.78, status: "PENDING_REVIEW", output: { text: "{\"stub\": true, \"ref\": \"a1b2c3\"}" } }],
    reviews: [] };
}
const aiPromptTemplates = [
  { id: "pt-qgen", code: "QGEN", template_name: "Question Generation", use_case: "GenerateQuestion", version: 1, status: "ACTIVE" },
  { id: "pt-csug", code: "CSUG", template_name: "Competency Suggestion", use_case: "SuggestCompetency", version: 1, status: "ACTIVE" },
];
const aiModelVersions = [{ id: "mv-1", model_name: "claude-opus-4-8", version: "stub-1", provider: "gateway", status: "ACTIVE" }];
// P-M groups + pools
const grpGroups = [{ id: "g-opsa", name_en: "Operations Section A Team", name_ar: "فريق قسم العمليات أ", group_type: "Department" }];
function grpReadiness(id: string) {
  return { group_id: id, name_en: "Operations Section A Team", name_ar: "فريق قسم العمليات أ", group_type: "Department",
    members: 3, assessed: 3, avg_readiness: 67.9, ready: 1,
    member_list: [
      { employee_id: "e1", name_en: "Ahmed Al-Mansouri", name_ar: "أحمد المنصوري", readiness_index: 88.4, readiness_status: "READY" },
      { employee_id: "e2", name_en: "Fatima Al-Zawawi", name_ar: "فاطمة الزواوي", readiness_index: 74.6, readiness_status: "READY_MINOR_GAPS" },
      { employee_id: "e5", name_en: "Yusuf Al-Tayeb", name_ar: "يوسف الطيب", readiness_index: 41.0, readiness_status: "NOT_READY_CRITICAL" },
    ] };
}
const talPools = [
  { id: "pool-hipo", name_en: "High-Potential Pool", name_ar: "مجموعة الإمكانات العالية", pool_type: "HiPo" },
  { id: "pool-succ", name_en: "Successor Pool", name_ar: "مجموعة الإحلال", pool_type: "Successor" },
];

export function demoResponse(config: InternalAxiosRequestConfig): unknown {
  const url = (config.url || "").split("?")[0];
  const method = (config.method || "get").toLowerCase();

  if (method === "post" && url === "/auth/login") {
    const email = (() => { try { return JSON.parse(config.data || "{}").email || ""; } catch { return ""; } })();
    const role = email.startsWith("exec") ? "NOC_EXECUTIVE" : email.startsWith("hr") ? "HR_VALIDATOR"
      : email.startsWith("manager") ? "LINE_MANAGER" : email.startsWith("dept") ? "DEPT_MANAGER"
      : email.startsWith("ld") ? "LD_MANAGER" : email.startsWith("employee") ? "EMPLOYEE" : "PLATFORM_ADMIN";
    return { access_token: "demo-token", token_type: "bearer", role, role_ar: ROLE_AR[role], tenant_id: "*" };
  }
  if (/^\/competencies\/[^/]+\/requirements$/.test(url)) {
    const bands = ["BASIC", "INDEPENDENT", "INDEPENDENT", "ADVANCED", "ADVANCED"];
    return [1, 2, 3, 4, 5].map((lvl) => ({
      id: `req-${lvl}`, admin_level: lvl, required_level: Math.min(5, 2 + Math.floor(lvl / 1.4)),
      min_experience_band: bands[lvl - 1], risk_weight: lvl >= 4 ? 2 : 1, activity_segment: "PRODUCTION",
    }));
  }
  if (url.startsWith("/assessments/questions/")) return questionsFor(url.split("/").pop() || "c-psm");
  if (url.startsWith("/profiles/") && method === "get") return profileDetail[url.split("/").pop() || "p1"] ?? profileDetail.p1;

  // P-C: assessment blueprints + AI question review
  if (url === "/jobs") return jobs;
  if (url === "/blueprints" && method === "get") return blueprints;
  if (/^\/blueprints\/[^/]+$/.test(url) && method === "get") return blueprintDetail(url.split("/")[2]);
  if (url === "/ai-questions") return aiQuestions;
  if (url === "/scoring-rubrics") return scoringRubrics;
  if (method === "post" && /^\/blueprints\/[^/]+\/generate-questions$/.test(url)) return { request_id: "req-demo", drafted: 8 };
  if (method === "post" && /^\/ai-questions\/[^/]+\/review$/.test(url)) {
    const decision = (() => { try { return JSON.parse(config.data || "{}").decision || "Approved"; } catch { return "Approved"; } })();
    const map: Record<string, string> = { Approved: "APPROVED", Returned: "RETURNED", Rejected: "REJECTED" };
    return { ai_question_id: url.split("/")[2], review_status: map[decision] ?? "APPROVED",
             published_question_id: decision === "Approved" ? "lq-" + Math.random().toString(36).slice(2, 7) : null };
  }

  // P-D: multi-factor readiness
  if (url === "/readiness/statuses") return rsStatuses;
  if (url === "/readiness" && method === "get")
    return readinessRows.map((r) => ({
      entity_type: r.entity_type, entity_id: r.entity_id, name_en: r.name_en, name_ar: r.name_ar,
      readiness_index: r.readiness_index, readiness_status: r.readiness_status, source_count: r.source_count,
    }));
  if (/^\/readiness\/(employees|nodes)\/[^/]+$/.test(url) && method === "get") return rsDetail(url.split("/")[3]);
  if (method === "post" && /^\/readiness\/(employees|nodes)\/[^/]+\/compute$/.test(url)) return rsDetail(url.split("/")[3]);

  // P-E: talent & succession
  if (url === "/talent/pipeline") return talentPipeline;
  if (url === "/talent/critical-roles") return criticalRolesTal;
  if (url === "/talent/profiles") return talentProfiles;
  if (url === "/talent/knowledge-holders" && method === "get") return knowledgeHolders;
  if (url === "/talent/transfer-plans" && method === "get") return transferPlans;
  if (url === "/talent/succession-plans" && method === "get")
    return criticalRolesTal.filter((r) => r.has_plan).map((r) => {
      const p = successionPlanFor(r.job_id);
      return { id: p.id, job_id: p.job_id, plan_name: p.plan_name, bench_strength: p.bench_strength,
               ready_now: p.ready_now, candidate_count: p.candidate_count, approval_status: p.approval_status };
    });
  if (/^\/talent\/succession-plans\/[^/]+$/.test(url) && method === "get") {
    const jid = (url.split("/")[3] || "").replace(/^sp-/, "");
    return successionPlanFor(jid);
  }
  if (method === "post" && /^\/talent\/jobs\/[^/]+\/succession-plan$/.test(url)) return successionPlanFor(url.split("/")[3]);
  if (method === "post" && /^\/talent\/successors\/[^/]+\/decision$/.test(url)) {
    const approve = (() => { try { return JSON.parse(config.data || "{}").approve !== false; } catch { return true; } })();
    return { id: url.split("/")[3], recommendation_status: approve ? "APPROVED" : "REJECTED" };
  }
  if (method === "post" && url === "/talent/knowledge-holders") {
    const b = (() => { try { return JSON.parse(config.data || "{}"); } catch { return {}; } })();
    return { id: "kh-" + Math.random().toString(36).slice(2, 7), employee_id: b.employee_id,
             knowledge_domain: b.knowledge_domain, criticality: b.criticality ?? "HIGH",
             retirement_risk: b.retirement_risk ?? 0, transfer_status: "OPEN" };
  }
  if (method === "post" && url === "/talent/transfer-plans") {
    const b = (() => { try { return JSON.parse(config.data || "{}"); } catch { return {}; } })();
    return { id: "kt-" + Math.random().toString(36).slice(2, 7), knowledge_holder_id: b.knowledge_holder_id,
             plan_name: b.plan_name, successor_employee_id: b.successor_employee_id ?? null,
             mentoring_flag: b.mentoring_flag ?? true, status: "ACTIVE" };
  }
  if (method === "post" && /^\/talent\/employees\/[^/]+\/flag$/.test(url)) {
    const b = (() => { try { return JSON.parse(config.data || "{}"); } catch { return {}; } })();
    return { id: "tp-new", employee_id: url.split("/")[3], talent_segment: b.talent_segment,
             potential_rating: b.potential_rating ?? "MED", readiness_status: "READY" };
  }

  // P-F: planning, prediction, graph, psychometrics, benchmarking, integrations
  if (url === "/workforce-planning/overview") return wfpOverview;
  if (url === "/workforce-planning/supply-demand") return wfpSupplyDemand;
  if (url === "/workforce-planning/coverage") return wfpCoverage;
  if (url === "/workforce-planning/retirement-risk") return knowledgeHolders;
  if (url === "/workforce-planning/training-demand") return wfpTrainingDemand;
  if (url === "/readiness/forecast" && method === "get") return forecastPipeline;
  if (/^\/readiness\/forecast\/[^/]+$/.test(url) && method === "get") return forecastFor(url.split("/")[3]);
  if (url === "/knowledge-graph/summary") return kgSummary;
  if (url === "/knowledge-graph" && method === "get") return kgGraph;
  if (url === "/psychometrics/question-quality") return psychQuality;
  if (url === "/psychometrics/reliability") return psychReliability;
  if (url === "/benchmarking/companies") return benchCompanies;
  if (url === "/integration/connectors" && method === "get") return connectors.map(connectorPublic);
  if (url === "/integration/sync-logs") return syncLogs;
  if (method === "post" && /^\/integration\/connectors\/[^/]+\/sync$/.test(url))
    return { id: "sl-" + Math.random().toString(36).slice(2, 7), connector_code: url.split("/")[3], status: "SUCCESS" };
  // P-N: connector connection config (Save & Test)
  if (method === "put" && /^\/integration\/connectors\/[^/]+$/.test(url)) {
    const code = url.split("/")[3];
    const b = parseBody(config);
    const prev = demoConnCfg[code] ?? { base_url: "", api_key_set: false };
    demoConnCfg[code] = {
      base_url: typeof b.base_url === "string" ? b.base_url : prev.base_url,
      api_key_set: prev.api_key_set || (typeof b.api_key === "string" && b.api_key.trim().length > 0),
    };
    const c = connectors.find((x) => x.code === code);
    return c ? { ...connectorPublic(c), status: (b.status as string) || c.status, sync_mode: (b.sync_mode as string) || c.sync_mode } : { ok: true };
  }
  if (method === "post" && /^\/integration\/connectors\/[^/]+\/test$/.test(url)) {
    const code = url.split("/")[3];
    const base = (demoConnCfg[code]?.base_url || "").trim();
    return base
      ? { ok: true, code, message: `Reached ${base} (HTTP 200).` }
      : { ok: false, code, message: "No base URL configured — set one and save before testing." };
  }

  // P-N: AI gateway settings (Save & Test)
  if (url === "/settings/ai" && method === "get") return { ...demoAi };
  if (url === "/settings/ai" && method === "put") {
    const b = parseBody(config);
    if (typeof b.model === "string" && b.model.trim()) demoAi.model = b.model.trim();
    if (typeof b.gateway_url === "string" && b.gateway_url.trim()) demoAi.gateway_url = b.gateway_url.trim();
    if (typeof b.api_key === "string" && b.api_key.trim()) { demoAi.api_key_set = true; demoAi.mode = "live"; }
    return { ...demoAi };
  }
  if (url === "/settings/ai/test" && method === "post") {
    return demoAi.mode === "live"
      ? { ok: true, mode: "live", message: `Reached ${demoAi.gateway_url} (HTTP 200).` }
      : { ok: true, mode: "stub", message: "Running in deterministic stub mode — no API key configured." };
  }

  // P-J strategy
  if (url === "/strategy/objectives" && method === "get") return stObjectives;
  if (/^\/strategy\/objectives\/[^/]+$/.test(url) && method === "get") return stObjectiveDetail(url.split("/")[3]);
  if (method === "post" && /^\/strategy\/objectives\/[^/]+\/readiness-gap$/.test(url))
    return { objective_id: url.split("/")[3], overall_readiness_pct: 79, gaps: stObjectiveDetail(url.split("/")[3]).readiness_gaps };
  // P-I operations
  if (url === "/operations/sites") return opSites;
  if (url === "/operations/equipment" && method === "get") return opEquipment;
  if (url === "/operations/critical-tasks" && method === "get") return opCriticalTasks;
  if (url === "/operations/competency-exposure") return opExposure;
  // P-G campaigns
  if (url === "/assessment-campaigns" && method === "get") return axCampaigns;
  if (/^\/assessment-campaigns\/[^/]+$/.test(url) && method === "get") return axCampaignDetail(url.split("/")[2]);
  // P-H development
  if (url === "/development/plans" && method === "get") return devPlans;
  if (/^\/development\/plans\/[^/]+$/.test(url) && method === "get") return devPlanDetail(url.split("/")[3]);
  // P-K workflows + permissions
  if (url === "/workflows" && method === "get") return wfInstances;
  if (/^\/workflows\/[^/]+$/.test(url) && method === "get") return wfDetail(url.split("/")[2]);
  if (method === "post" && /^\/workflows\/[^/]+\/act$/.test(url)) return { instance_id: url.split("/")[2], status: "OPEN", current_step: 3 };
  if (url === "/permission-roles" && method === "get") return permRoles;
  // P-L AI lifecycle
  if (url === "/ai/requests" && method === "get") return aiRequests;
  if (/^\/ai\/requests\/[^/]+$/.test(url) && method === "get") return aiRequestDetail(url.split("/")[3]);
  if (url === "/ai/prompt-templates" && method === "get") return aiPromptTemplates;
  if (url === "/ai/model-versions" && method === "get") return aiModelVersions;
  if (method === "post" && url === "/ai/requests")
    return { request_id: "air-new", output_id: "ao-new", confidence_score: 0.74, status: "PENDING_REVIEW", output: { text: "{\"stub\": true}" } };
  if (method === "post" && /^\/ai\/outputs\/[^/]+\/review$/.test(url)) return { output_id: url.split("/")[3], status: "ACCEPTED" };
  // P-M groups + pools
  if (url === "/groups" && method === "get") return grpGroups;
  if (/^\/groups\/[^/]+\/readiness$/.test(url)) return grpReadiness(url.split("/")[2]);
  if (url === "/talent-pools" && method === "get") return talPools;

  // Assessment workflow: assign → notify → take → score → govern
  if (url === "/assessment-assignments/mine" && method === "get")
    return wfAssignments.filter((a) => a.employee_id === DEMO_ME.employee_id);
  if (url === "/assessment-assignments" && method === "get") return wfAssignments;
  if (url === "/assessment-assignments" && method === "post") {
    const b = parseBody(config);
    return createAssignment(String(b.employee_id || DEMO_ME.employee_id), String(b.blueprint_id || "bp-op3"), String(b.assigned_by || "assessor"));
  }
  if (/^\/assessment-assignments\/[^/]+\/start$/.test(url) && method === "post") {
    const a = wfAssignments.find((x) => x.id === url.split("/")[2]);
    if (a && a.status === "ASSIGNED") a.status = "IN_PROGRESS";
    return a ? { id: a.id, status: a.status } : { ok: false };
  }
  if (/^\/assessment-assignments\/[^/]+\/submit$/.test(url) && method === "post") {
    const a = wfAssignments.find((x) => x.id === url.split("/")[2]);
    if (!a) return { ok: false };
    scoreAssignment(a, (parseBody(config).responses as Record<string, number>) || {});
    return { id: a.id, status: a.status, confidence: a.confidence, results: a.results };
  }
  if (/^\/assessment-assignments\/[^/]+$/.test(url) && method === "get") {
    const a = wfAssignments.find((x) => x.id === url.split("/")[2]);
    return a ? { ...a, sections: assignmentSections(a) } : { ok: false };
  }
  // Notifications
  if (url === "/notifications/mine" && method === "get")
    return wfNotifs.filter((n) => n.employee_id === DEMO_ME.employee_id);
  if (/^\/notifications\/[^/]+\/read$/.test(url) && method === "post") {
    const n = wfNotifs.find((x) => x.id === url.split("/")[2]); if (n) n.read = true; return { ok: true };
  }
  if (url === "/notifications/read-all" && method === "post") {
    wfNotifs.forEach((n) => { if (n.employee_id === DEMO_ME.employee_id) n.read = true; }); return { ok: true };
  }
  // Governance
  if (url === "/governance/decisions" && method === "get") return govDecisions;
  if (/^\/governance\/decisions\/[^/]+\/resolve$/.test(url) && method === "post")
    return resolveDecision(url.split("/")[2], parseBody(config).approve !== false);

  if (method === "post" && url === "/assessments/grade")
    return { assessed_level: 3, required_level: 4, confidence: 0.62, status: "PENDING_REVIEW", needs_human_review: true };
  if (method === "post") return { ok: true, status: "PENDING", text_en: "Demo action recorded.", text_ar: "تم تسجيل إجراء تجريبي." };

  return GET[url] ?? [];
}
