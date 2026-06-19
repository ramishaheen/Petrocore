import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./layouts/AppLayout";
import { homeForRole } from "./lib/roles";
import { useAuth } from "./store/auth";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MyWorkspace = lazy(() => import("./pages/MyWorkspace"));
const MyTeam = lazy(() => import("./pages/MyTeam"));
const Department = lazy(() => import("./pages/Department"));
const Hierarchy = lazy(() => import("./pages/Hierarchy"));
const Profiles = lazy(() => import("./pages/Profiles"));
const ProfileDetail = lazy(() => import("./pages/ProfileDetail"));
const Competencies = lazy(() => import("./pages/Competencies"));
const CompetencyDetail = lazy(() => import("./pages/CompetencyDetail"));
const Assessment = lazy(() => import("./pages/Assessment"));
const Blueprints = lazy(() => import("./pages/Blueprints"));
const Readiness = lazy(() => import("./pages/Readiness"));
const Gaps = lazy(() => import("./pages/Gaps"));
const Succession = lazy(() => import("./pages/Succession"));
const Training = lazy(() => import("./pages/Training"));
const Reports = lazy(() => import("./pages/Reports"));
const Governance = lazy(() => import("./pages/Governance"));
const Enablement = lazy(() => import("./pages/Enablement"));
const Diagnostic = lazy(() => import("./pages/Diagnostic"));

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuth((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function RoleHome() {
  const role = useAuth((s) => s.role);
  return <Navigate to={homeForRole(role)} replace />;
}

function Fallback() {
  const { t } = useTranslation();
  return <div className="p-8 text-slate-500">{t("common.loading")}</div>;
}

export default function App() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <Protected>
              <AppLayout />
            </Protected>
          }
        >
          <Route path="/my-workspace" element={<MyWorkspace />} />
          <Route path="/my-team" element={<MyTeam />} />
          <Route path="/department" element={<Department />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/hierarchy" element={<Hierarchy />} />
          <Route path="/profiles" element={<Profiles />} />
          <Route path="/profiles/:id" element={<ProfileDetail />} />
          <Route path="/competencies" element={<Competencies />} />
          <Route path="/competencies/:id" element={<CompetencyDetail />} />
          <Route path="/assessment" element={<Assessment />} />
          <Route path="/blueprints" element={<Blueprints />} />
          <Route path="/readiness" element={<Readiness />} />
          <Route path="/gaps" element={<Gaps />} />
          <Route path="/succession" element={<Succession />} />
          <Route path="/training" element={<Training />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/governance" element={<Governance />} />
          <Route path="/enablement" element={<Enablement />} />
          <Route path="/diagnostic" element={<Diagnostic />} />
        </Route>
        <Route path="*" element={<Protected><RoleHome /></Protected>} />
      </Routes>
    </Suspense>
  );
}
