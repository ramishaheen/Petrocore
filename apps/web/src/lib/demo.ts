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

const profiles = [
  { id: "p1", employee_id: "e1", name_en: "Ahmed Al-Mansouri", name_ar: "أحمد المنصوري", readiness_index: 82, status: "TRUSTED" },
  { id: "p2", employee_id: "e2", name_en: "Fatima Al-Zawawi", name_ar: "فاطمة الزواوي", readiness_index: 64, status: "HR_VALIDATED" },
  { id: "p3", employee_id: "e3", name_en: "Khalid Bin Omar", name_ar: "خالد بن عمر", readiness_index: 47, status: "MANAGER_APPROVED" },
];

function results(seed: number[]) {
  return competencies.slice(0, 5).map((c, i) => ({
    competency_id: c.id, competency_en: c.name_en, competency_ar: c.name_ar,
    assessed_level: seed[i] ?? 3, required_level: 4,
    confidence: 0.7 + (i % 3) * 0.1, status: (seed[i] ?? 3) >= 4 ? "APPROVED" : "PENDING_REVIEW",
  }));
}
const profileDetail: Record<string, unknown> = {
  p1: { id: "p1", employee_id: "e1", name_en: "Ahmed Al-Mansouri", name_ar: "أحمد المنصوري", readiness_index: 82, status: "TRUSTED",
        competency_results: results([4, 5, 4, 4, 3]), approvals: [{ role: "LINE_MANAGER", decision: "APPROVED", approver_user_id: "u1" }, { role: "HR_VALIDATOR", decision: "APPROVED", approver_user_id: "u2" }] },
  p2: { id: "p2", employee_id: "e2", name_en: "Fatima Al-Zawawi", name_ar: "فاطمة الزواوي", readiness_index: 64, status: "HR_VALIDATED",
        competency_results: results([3, 4, 3, 2, 4]), approvals: [{ role: "HR_VALIDATOR", decision: "APPROVED", approver_user_id: "u2" }] },
  p3: { id: "p3", employee_id: "e3", name_en: "Khalid Bin Omar", name_ar: "خالد بن عمر", readiness_index: 47, status: "MANAGER_APPROVED",
        competency_results: results([2, 3, 2, 2, 3]), approvals: [{ role: "LINE_MANAGER", decision: "APPROVED", approver_user_id: "u1" }] },
};

const gaps = [
  { id: "g1", scope: "INDIVIDUAL", competency_id: "c-psm", current_level: 2, target_level: 5, gap_size: 3, priority: "VERY_HIGH", confidence: 0.86 },
  { id: "g2", scope: "INDIVIDUAL", competency_id: "c-well", current_level: 2, target_level: 4, gap_size: 2, priority: "HIGH", confidence: 0.78 },
  { id: "g3", scope: "TEAM", competency_id: "c-data", current_level: 3, target_level: 4, gap_size: 1, priority: "MEDIUM", confidence: 0.71 },
  { id: "g4", scope: "DEPARTMENT", competency_id: "c-comm", current_level: 2, target_level: 3, gap_size: 1, priority: "MEDIUM", confidence: 0.66 },
];

const tree = [{
  id: "noc", node_type: "NOC", name_en: "National Oil Corporation", name_ar: "المؤسسة الوطنية للنفط", activity_segment: null,
  children: [
    { id: "agoco", node_type: "SUBSIDIARY", name_en: "Arabian Gulf Oil Co.", name_ar: "شركة الخليج العربي للنفط", activity_segment: null, children: [
      { id: "prod", node_type: "ACTIVITY", name_en: "Production", name_ar: "الإنتاج", activity_segment: "PRODUCTION", children: [
        { id: "ops", node_type: "DEPARTMENT", name_en: "Field Operations", name_ar: "عمليات الحقل", activity_segment: null, children: [
          { id: "opsa", node_type: "SECTION", name_en: "Operations Section A", name_ar: "قسم العمليات أ", activity_segment: null, children: [] },
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

const GET: Record<string, unknown> = {
  "/dashboards/executive": {
    workforce_readiness_index: 71.4, profiles: 3, critical_jobs_total: 4, high_risk_critical_jobs: 1,
    high_risk_pct: 25, top_competency_gaps: [{ competency_id: "c-psm", count: 3 }, { competency_id: "c-well", count: 2 }, { competency_id: "c-data", count: 2 }, { competency_id: "c-comm", count: 1 }],
    companies: [{ id: "agoco", name_en: "Arabian Gulf Oil Co.", name_ar: "شركة الخليج العربي للنفط" }, { id: "waha", name_en: "Waha Oil Co.", name_ar: "شركة الواحة للنفط" }],
    modules: ["Workforce Readiness Index", "Company Readiness Comparison", "Critical Competency Gaps", "Training Impact Overview", "Succession Readiness", "Talent Pipeline", "Critical Role Risk", "Decision Priorities"],
  },
  "/dashboards/diagnostic": [
    { layer: "L1", name_en: "Strategy & Institutional Context", name_ar: "الاستراتيجية والسياق المؤسسي", status: "READY", detail: "6 records available." },
    { layer: "L5", name_en: "Employee 360° Profile", name_ar: "البروفايل الشامل للموظف", status: "READY", detail: "3 records available." },
    { layer: "L6", name_en: "Critical Roles", name_ar: "الوظائف الحرجة", status: "NEEDS_REVIEW", detail: "1 record — verify completeness." },
    { layer: "L8", name_en: "Gap Analysis", name_ar: "تحليل الفجوات", status: "READY", detail: "4 records available." },
  ],
  "/profiles": profiles,
  "/competencies": competencies,
  "/org/tree": tree,
  "/gaps": gaps,
  "/reports/institutional-value": { dimensions: valueDims, value_index: 73.8 },
  "/reports/succession": { critical_roles_total: 4, roles_at_risk: 1, ready_successors: 1, overall_readiness: 64.3, pipeline: { identified: 3, ready_now: 1, ready_6_12m: 1, ready_12m_plus: 1 } },
  "/reports/department-readiness": { departments: [{ tenant_id: "opsa-section", avg_readiness: 64.3, employees: 3 }] },
  "/reports/training-impact": { programs_measured: 2, avg_gap_closure_pct: 68.5, records: [] },
  "/reports/governance-audit": { audit_chain_intact: true, decisions: [{ id: "d1", kind: "COMPETENCY_RESULT", status: "APPROVED", confidence: 0.86 }, { id: "d2", kind: "RECOMMENDATION", status: "PENDING_REVIEW", confidence: 0.62 }] },
  "/governance/decisions": [{ id: "d2", kind: "RECOMMENDATION", subject_ref: "recommendation:r1", ai_recommendation: "Targeted development for Process Safety Management: raise level 2→5.", confidence: 0.62, governance_status: "PENDING_REVIEW" }],
  "/governance/audit/verify": { intact: true },
  "/enablement/pilot-entry": {
    candidates: [
      { id: "agoco", name_en: "Arabian Gulf Oil Co.", name_ar: "شركة الخليج العربي للنفط", readiness: 71, strategic_impact: 80, score: 75.5 },
      { id: "waha", name_en: "Waha Oil Co.", name_ar: "شركة الواحة للنفط", readiness: 58, strategic_impact: 80, score: 69 },
    ],
    best_starting_point: { id: "agoco", name_en: "Arabian Gulf Oil Co.", name_ar: "شركة الخليج العربي للنفط", readiness: 71, strategic_impact: 80, score: 75.5 },
    scopes: ["Subsidiary Company", "Technical Department", "Job Family", "Critical Roles", "Management Level", "Employee Group"],
    principle: "Start with the smartest, not the biggest.",
  },
  "/enablement/calibration": { calibration_score: 88, target: 92, on_target: false, scale_up_roadmap: [{ phase: 1, en: "Expand Units", ar: "توسيع الوحدات" }, { phase: 2, en: "Additional Use Cases", ar: "حالات استخدام إضافية" }, { phase: 3, en: "Enterprise Rollout", ar: "النشر المؤسسي" }] },
  "/training/cohorts": [
    { competency_id: "c-psm", target_level: 5, learners: ["e1", "e3"], size: 2 },
    { competency_id: "c-well", target_level: 4, learners: ["e3"], size: 1 },
  ],
  "/training/programs": [
    { id: "pr1", title_en: "Process Safety Management — Level 5 Development", title_ar: "إدارة سلامة العمليات — تطوير المستوى 5", method: "BLENDED", provider: "Murzuq Academy", impact_kpi: "Readiness Index uplift" },
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
  LINE_MANAGER: "المدير المباشر", LD_MANAGER: "مدير التدريب والتطوير", EMPLOYEE: "الموظف",
};

export function demoResponse(config: InternalAxiosRequestConfig): unknown {
  const url = (config.url || "").split("?")[0];
  const method = (config.method || "get").toLowerCase();

  if (method === "post" && url === "/auth/login") {
    const email = (() => { try { return JSON.parse(config.data || "{}").email || ""; } catch { return ""; } })();
    const role = email.startsWith("exec") ? "NOC_EXECUTIVE" : email.startsWith("hr") ? "HR_VALIDATOR"
      : email.startsWith("manager") ? "LINE_MANAGER" : email.startsWith("ld") ? "LD_MANAGER"
      : email.startsWith("employee") ? "EMPLOYEE" : "PLATFORM_ADMIN";
    return { access_token: "demo-token", token_type: "bearer", role, role_ar: ROLE_AR[role], tenant_id: "*" };
  }
  if (url.startsWith("/assessments/questions/")) return questionsFor(url.split("/").pop() || "c-psm");
  if (url.startsWith("/profiles/") && method === "get") return profileDetail[url.split("/").pop() || "p1"] ?? profileDetail.p1;

  if (method === "post" && url === "/assessments/grade")
    return { assessed_level: 3, required_level: 4, confidence: 0.62, status: "PENDING_REVIEW", needs_human_review: true };
  if (method === "post") return { ok: true, status: "PENDING", text_en: "Demo action recorded.", text_ar: "تم تسجيل إجراء تجريبي." };

  return GET[url] ?? [];
}
