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
  "/governance/decisions": [
    { id: "d2", kind: "RECOMMENDATION", subject_ref: "recommendation:r1", ai_recommendation: "Targeted PSM development for Yusuf Al-Tayeb: raise level 2→5.", confidence: 0.62, governance_status: "PENDING_REVIEW" },
    { id: "d3", kind: "COMPETENCY_RESULT", subject_ref: "assessment:a8", ai_recommendation: "Mariam Saleh — Process Safety assessed level 1.", confidence: 0.58, governance_status: "PENDING_REVIEW" },
  ],
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
  if (url.startsWith("/assessments/questions/")) return questionsFor(url.split("/").pop() || "c-psm");
  if (url.startsWith("/profiles/") && method === "get") return profileDetail[url.split("/").pop() || "p1"] ?? profileDetail.p1;

  if (method === "post" && url === "/assessments/grade")
    return { assessed_level: 3, required_level: 4, confidence: 0.62, status: "PENDING_REVIEW", needs_human_review: true };
  if (method === "post") return { ok: true, status: "PENDING", text_en: "Demo action recorded.", text_ar: "تم تسجيل إجراء تجريبي." };

  return GET[url] ?? [];
}
