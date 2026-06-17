import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./layouts/AppLayout";
import { useAuth } from "./store/auth";

// Route-level code splitting: each page is its own chunk, loaded on demand.
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Hierarchy = lazy(() => import("./pages/Hierarchy"));
const Profiles = lazy(() => import("./pages/Profiles"));
const ProfileDetail = lazy(() => import("./pages/ProfileDetail"));
const Competencies = lazy(() => import("./pages/Competencies"));
const Assessment = lazy(() => import("./pages/Assessment"));
const Gaps = lazy(() => import("./pages/Gaps"));
const Training = lazy(() => import("./pages/Training"));
const Reports = lazy(() => import("./pages/Reports"));
const Governance = lazy(() => import("./pages/Governance"));
const Enablement = lazy(() => import("./pages/Enablement"));
const Diagnostic = lazy(() => import("./pages/Diagnostic"));

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuth((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/hierarchy" element={<Hierarchy />} />
          <Route path="/profiles" element={<Profiles />} />
          <Route path="/profiles/:id" element={<ProfileDetail />} />
          <Route path="/competencies" element={<Competencies />} />
          <Route path="/assessment" element={<Assessment />} />
          <Route path="/gaps" element={<Gaps />} />
          <Route path="/training" element={<Training />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/governance" element={<Governance />} />
          <Route path="/enablement" element={<Enablement />} />
          <Route path="/diagnostic" element={<Diagnostic />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
