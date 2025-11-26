import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { Layout } from "./components/layout/Layout";
import LoginPage from "./components/auth/LoginPage";
import { Dashboard } from "./components/dashboard/Dashboard";
import { PatientRegistration } from "./components/registration/PatientRegistration";
import PatientQueue from "./components/queue/PatientQueue";
import { DoctorModule } from "./components/doctor/DoctorModule";
import StaffDashboard from "./components/Staff/StaffDashboard";
import { PharmacyModule } from "./components/pharmacy/PharmacyModule";
import SignupPage from "./components/auth/SignupPage";
import DoctorForm from "./components/auth/DoctorForm";
import Ai from "./components/doctor/Ai";
import IPDQueue from "./components/queue/IPDQueue";
import LabTestQueue from "./components/LabModule/LabTestQueue";

function App() {
  return (
    <div className="text-lg">
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/doctor" element={<DoctorForm />} />
            <Route path="/sign" element={<SignupPage />} />
            <Route path="/ai" element={<Ai />} />

            {/* ✅ UPDATED: Added "admin" to all allowedRoles arrays below */}
            
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout currentSection="dashboard">
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/registration"
              element={
                <ProtectedRoute allowedRoles={["receptionist", "admin"]}>
                  <Layout currentSection="registration">
                    <PatientRegistration />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/pre-opd"
              element={
                <ProtectedRoute
                  allowedRoles={["receptionist", "doctor", "staff-nurse", "admin"]}
                >
                  <Layout currentSection="queue">
                    <PatientQueue />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/ipd-queue"
              element={
                <ProtectedRoute
                  allowedRoles={["doctor", "staff-nurse", "receptionist", "admin"]}
                >
                  <Layout currentSection="ipd-queue">
                    <IPDQueue />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/lab-requests"
              element={
                <ProtectedRoute allowedRoles={["technician", "admin"]}>
                  <Layout currentSection="lab-requests">
                    <LabTestQueue />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/doctor-module"
              element={
                <ProtectedRoute allowedRoles={["doctor", "admin"]}>
                  <Layout currentSection="doctor">
                    <DoctorModule />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/pharmacy"
              element={
                <ProtectedRoute allowedRoles={["pharmacist", "admin"]}>
                  <Layout currentSection="pharmacy">
                    <PharmacyModule />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff"
              element={
                <ProtectedRoute allowedRoles={["staff-nurse", "admin"]}>
                  <Layout currentSection="staff">
                    <StaffDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </div>
  );
}

export default App;