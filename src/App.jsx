import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { PostsProvider } from "./context/PostsContext.jsx";
import { SessionsProvider } from "./context/SessionsContext.jsx";
import { NotificationsProvider } from "./context/NotificationsContext.jsx";
import { ChatProvider } from "./context/ChatContext.jsx";
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
import AdminDashboard from "./pages/AdminDashboard.jsx";
import Earnings from "./pages/Earnings.jsx";
import DisputeDetail from "./pages/DisputeDetail.jsx";
import AdminGuard from "./admin/components/AdminGuard.jsx";
import AdminLogin from "./admin/pages/AdminLogin.jsx";
import AdminOverview from "./admin/pages/AdminOverview.jsx";
import AdminUsers from "./admin/pages/AdminUsers.jsx";
import AdminPosts from "./admin/pages/AdminPosts.jsx";
import AdminSessions from "./admin/pages/AdminSessions.jsx";
import AdminWithdrawals from "./admin/pages/AdminWithdrawals.jsx";
import AdminDisputes from "./admin/pages/AdminDisputes.jsx";
import AdminAnalytics from "./admin/pages/AdminAnalytics.jsx";
import AdminSettings from "./admin/pages/AdminSettings.jsx";

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
              <ChatProvider>
                <PostsProvider>
                  <Toaster
                    position="top-right"
                    toastOptions={{
                      duration: 3500,
                      style: {
                        background: "#0c1018",
                        color: "#eef2ff",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: "14px",
                        fontSize: "13px",
                        fontFamily:
                          "'Plus Jakarta Sans', system-ui, sans-serif",
                        fontWeight: "500",
                        padding: "12px 16px",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                      },
                      success: {
                        iconTheme: { primary: "#34d399", secondary: "#0c1018" },
                      },
                      error: {
                        iconTheme: { primary: "#f87171", secondary: "#0c1018" },
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
                    <Route
                      path="/admin"
                      element={
                        <PrivateRoute>
                          <AdminDashboard />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/earnings"
                      element={
                        <PrivateRoute>
                          <Earnings />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/dispute/:id"
                      element={
                        <PrivateRoute>
                          <DisputeDetail />
                        </PrivateRoute>
                      }
                    />

                    <Route path="*" element={<Navigate to="/" replace />} />

                    {/* ── Admin (separate auth system) ── */}
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route
                      path="/admin"
                      element={
                        <AdminGuard>
                          <AdminOverview />
                        </AdminGuard>
                      }
                    />
                    <Route
                      path="/admin/users"
                      element={
                        <AdminGuard>
                          <AdminUsers />
                        </AdminGuard>
                      }
                    />
                    <Route
                      path="/admin/posts"
                      element={
                        <AdminGuard>
                          <AdminPosts />
                        </AdminGuard>
                      }
                    />
                    <Route
                      path="/admin/sessions"
                      element={
                        <AdminGuard>
                          <AdminSessions />
                        </AdminGuard>
                      }
                    />
                    <Route
                      path="/admin/withdrawals"
                      element={
                        <AdminGuard>
                          <AdminWithdrawals />
                        </AdminGuard>
                      }
                    />
                    <Route
                      path="/admin/disputes"
                      element={
                        <AdminGuard>
                          <AdminDisputes />
                        </AdminGuard>
                      }
                    />
                    <Route
                      path="/admin/analytics"
                      element={
                        <AdminGuard>
                          <AdminAnalytics />
                        </AdminGuard>
                      }
                    />
                    <Route
                      path="/admin/settings"
                      element={
                        <AdminGuard>
                          <AdminSettings />
                        </AdminGuard>
                      }
                    />
                  </Routes>
                </PostsProvider>
              </ChatProvider>
            </SessionsProvider>
          </NotificationsProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
