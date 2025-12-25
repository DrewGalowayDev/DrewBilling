import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import UserPortal from "./pages/UserPortal";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import Payments from "./pages/Payments";
import Devices from "./pages/Devices";
import Customers from "./pages/Customers";
import Packages from "./pages/Packages";
import Vouchers from "./pages/Vouchers";
import Sessions from "./pages/Sessions";
import Analytics from "./pages/Analytics";
import AuditLogs from "./pages/AuditLogs";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import { useAuth } from "./context/AuthContext";
import "./index.css";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/admin/login" />;
}

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<UserPortal />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          
          {/* Protected Admin Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/payments" 
            element={
              <ProtectedRoute>
                <Payments />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/devices" 
            element={
              <ProtectedRoute>
                <Devices />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/customers" 
            element={
              <ProtectedRoute>
                <Customers />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/packages" 
            element={
              <ProtectedRoute>
                <Packages />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/vouchers" 
            element={
              <ProtectedRoute>
                <Vouchers />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/sessions" 
            element={
              <ProtectedRoute>
                <Sessions />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/analytics" 
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/audit-logs" 
            element={
              <ProtectedRoute>
                <AuditLogs />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/settings" 
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
