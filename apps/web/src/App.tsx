import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./layouts/AppLayout";
import Competencies from "./pages/Competencies";
import Dashboard from "./pages/Dashboard";
import Diagnostic from "./pages/Diagnostic";
import Enablement from "./pages/Enablement";
import Gaps from "./pages/Gaps";
import Governance from "./pages/Governance";
import Hierarchy from "./pages/Hierarchy";
import Login from "./pages/Login";
import Reports from "./pages/Reports";
import { useAuth } from "./store/auth";

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuth((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
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
        <Route path="/competencies" element={<Competencies />} />
        <Route path="/gaps" element={<Gaps />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/governance" element={<Governance />} />
        <Route path="/enablement" element={<Enablement />} />
        <Route path="/diagnostic" element={<Diagnostic />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
