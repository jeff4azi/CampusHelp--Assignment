import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { PostsProvider } from "./context/PostsContext.jsx";
import { SessionsProvider } from "./context/SessionsContext.jsx";
import { NotificationsProvider } from "./context/NotificationsContext.jsx";
import AuthGuard from "./components/AuthGuard.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import DashboardHome from "./pages/DashboardHome.jsx";
import Marketplace from "./pages/Marketplace.jsx";
import MyJobs from "./pages/MyJobs.jsx";
import Helping from "./pages/Helping.jsx";
import Completed from "./pages/Completed.jsx";
import WorkSession from "./pages/WorkSession.jsx";
import Settings from "./pages/Settings.jsx";
import Notifications from "./pages/Notifications.jsx";

function PrivateRoute({ children }) {
  return <AuthGuard>{children}</AuthGuard>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <NotificationsProvider>
            <SessionsProvider>
              <PostsProvider>
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 3500,
                    style: {
                      background: "#0d1424",
                      color: "#e2e8f0",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "12px",
                      fontSize: "13px",
                      padding: "10px 14px",
                    },
                    success: {
                      iconTheme: { primary: "#34d399", secondary: "#0d1424" },
                    },
                    error: {
                      iconTheme: { primary: "#f87171", secondary: "#0d1424" },
                    },
                  }}
                />
                <Routes>
                  {/* Public */}
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />

                  {/* Private */}
                  <Route
                    path="/dashboard"
                    element={
                      <PrivateRoute>
                        <DashboardHome />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/marketplace"
                    element={
                      <PrivateRoute>
                        <Marketplace />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/my-jobs"
                    element={
                      <PrivateRoute>
                        <MyJobs />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/helping"
                    element={
                      <PrivateRoute>
                        <Helping />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/completed"
                    element={
                      <PrivateRoute>
                        <Completed />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/session/:id"
                    element={
                      <PrivateRoute>
                        <WorkSession />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <PrivateRoute>
                        <Settings />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/notifications"
                    element={
                      <PrivateRoute>
                        <Notifications />
                      </PrivateRoute>
                    }
                  />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </PostsProvider>
            </SessionsProvider>
          </NotificationsProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
