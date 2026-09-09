import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./components/ProtectedRoute";
import AuthPage from "./pages/Auth";
import DashboardPage from "./pages/Dashboard";
import LandingPage from "./pages/Landing";
import NotFoundPage from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      {/* Sign in / sign up share one screen; the URL keeps them addressable. */}
      <Route path="/sign-in" element={<AuthPage mode="sign-in" />} />
      <Route path="/sign-up" element={<AuthPage mode="sign-up" />} />
      {/* Legacy path from the TanStack build — kept so old links still land. */}
      <Route path="/auth" element={<Navigate to="/sign-in" replace />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<DashboardPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
