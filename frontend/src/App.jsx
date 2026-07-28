import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { ConfirmProvider } from "./components/ConfirmDialog";
import CustomCursor from "./components/CustomCursor";

import Landing from "./pages/Landing";
import Login from "./pages/Login";

import Register from "./pages/student/Register";
import ForgotPassword from "./pages/ForgotPassword";
import StudentDashboard from "./pages/student/dashboard";

import CompanyDashboard from "./pages/company/Dashboard";

import AdminDashboard from "./pages/admin/Dashboard";
import AdminRegister from "./pages/admin/Register";

function App() {
  return (
    <ErrorBoundary>
    <ConfirmProvider>
    <CustomCursor />
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />

        {/* One shared login for student, company and admin */}
        <Route path="/login" element={<Login />} />

        {/* Universal Auth routes */}
        <Route path="/forgot-password/:role" element={<ForgotPassword />} />

        {/* Student-only pages */}
        <Route path="/student/register" element={<Register />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />

        {/* Company-only pages */}
        <Route path="/company/dashboard" element={<CompanyDashboard />} />

        {/* Admin-only pages */}
        <Route path="/admin/register" element={<AdminRegister />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
    </ConfirmProvider>
    </ErrorBoundary>
  );
}

export default App;
