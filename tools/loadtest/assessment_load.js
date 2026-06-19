// 360° PETROCORE — load test: simultaneous nationwide assessment.
//
// Simulates many employees logging in and running competency assessments at
// once (the platform targets nationwide simultaneous assessment in days, not
// months). Exercises the hot path: auth → assessment scoring → gap analysis.
//
// Run (k6 — https://k6.io):
//   BASE_URL=http://localhost:8000/api/v1 k6 run tools/loadtest/assessment_load.js
//
// Tunable via env: VUS (virtual users), DURATION, BASE_URL, EMAIL, PASSWORD.
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000/api/v1";
const EMAIL = __ENV.EMAIL || "employee@noc.ly";
const PASSWORD = __ENV.PASSWORD || "petrocore123";

const loginTrend = new Trend("login_ms");
const assessTrend = new Trend("assessment_ms");
const errorRate = new Rate("errors");

export const options = {
  scenarios: {
    nationwide_assessment: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: __ENV.RAMP || "30s", target: Number(__ENV.VUS || 200) },
        { duration: __ENV.DURATION || "2m", target: Number(__ENV.VUS || 200) },
        { duration: "20s", target: 0 },
      ],
    },
  },
  thresholds: {
    // 95% of assessment scoring under 800ms; error rate under 1%.
    assessment_ms: ["p(95)<800"],
    errors: ["rate<0.01"],
    http_req_failed: ["rate<0.01"],
  },
};

function login() {
  const res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({ email: EMAIL, password: PASSWORD }), {
    headers: { "Content-Type": "application/json" },
  });
  loginTrend.add(res.timings.duration);
  check(res, { "login 200": (r) => r.status === 200 }) || errorRate.add(1);
  return res.status === 200 ? res.json("access_token") : null;
}

export default function () {
  const token = login();
  if (!token) { errorRate.add(1); return; }
  const auth = { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } };

  // Discover an employee + competency to assess.
  const profiles = http.get(`${BASE_URL}/profiles`, auth);
  const comps = http.get(`${BASE_URL}/competencies`, auth);
  if (profiles.status !== 200 || comps.status !== 200) { errorRate.add(1); return; }
  const profileList = profiles.json();
  const compList = comps.json();
  if (!profileList.length || !compList.length) return;
  const employeeId = profileList[0].employee_id;
  const competencyId = compList[Math.floor(Math.random() * compList.length)].id;

  // Run the AI assessment (the scoring hot path).
  const res = http.post(`${BASE_URL}/assessments/run`, JSON.stringify({
    employee_id: employeeId, competency_id: competencyId,
    item_scores: [Math.random(), Math.random(), Math.random()], evidence_count: 1,
  }), auth);
  assessTrend.add(res.timings.duration);
  check(res, { "assessment 200": (r) => r.status === 200 }) || errorRate.add(1);

  sleep(1);
}
