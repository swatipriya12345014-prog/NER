import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import LiveMap from './pages/LiveMap';
import Vehicles from './pages/Vehicles';
import Shipments from './pages/Shipments';
import Incidents from './pages/Incidents';
import RiskAnalysis from './pages/RiskAnalysis';
import Mesh from './pages/Mesh';
import DriverDashboard from './pages/DriverDashboard';
import FieldOfficer from './pages/FieldOfficer';
import ManagerDashboard from './pages/ManagerDashboard';
import Alerts from './pages/Alerts';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import AIAssistant from './pages/AIAssistant';

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <BrowserRouter>
        <Routes>
          {/* Public route — Login */}
          <Route path="/" element={<Login />} />
          
          {/* Protected dashboard routes — strictly isolated by operational role */}
          <Route element={<MainLayout />}>
            {/* 1. Admin Exclusive Routes */}
            <Route path="/admin-dashboard" element={
              <ProtectedRoute requiredRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/mesh" element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Mesh />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Settings />
              </ProtectedRoute>
            } />

            {/* 1b. Logistics Manager Exclusive Workspace */}
            <Route path="/manager-dashboard" element={
              <ProtectedRoute requiredRoles={['logistics_manager']}>
                <ManagerDashboard />
              </ProtectedRoute>
            } />

            {/* 2. Driver Exclusive Workspace */}
            <Route path="/driver-dashboard" element={
              <ProtectedRoute requiredRoles={['driver']}>
                <DriverDashboard />
              </ProtectedRoute>
            } />

            {/* 3. Field Officer Exclusive Workspace */}
            <Route path="/field-officer" element={
              <ProtectedRoute requiredRoles={['field_officer']}>
                <FieldOfficer />
              </ProtectedRoute>
            } />

            {/* 4. Logistics & Supply Chain Workspaces */}
            <Route path="/shipments" element={
              <ProtectedRoute requiredRoles={['logistics_manager', 'admin']}>
                <Shipments />
              </ProtectedRoute>
            } />
            <Route path="/vehicles" element={
              <ProtectedRoute requiredRoles={['logistics_manager', 'admin']}>
                <Vehicles />
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute requiredRoles={['logistics_manager', 'admin']}>
                <Analytics />
              </ProtectedRoute>
            } />

            {/* 5. Field Hazard & Terrain Workspaces */}
            <Route path="/incidents" element={
              <ProtectedRoute requiredRoles={['field_officer', 'admin']}>
                <Incidents />
              </ProtectedRoute>
            } />
            <Route path="/risk-analysis" element={
              <ProtectedRoute requiredRoles={['field_officer', 'admin']}>
                <RiskAnalysis />
              </ProtectedRoute>
            } />

            {/* 6. Universal Operational Tools (Accessible with role-scoped capabilities) */}
            <Route path="/live-map" element={
              <ProtectedRoute requiredRoles={['admin', 'driver', 'field_officer', 'logistics_manager']}>
                <LiveMap />
              </ProtectedRoute>
            } />
            <Route path="/alerts" element={
              <ProtectedRoute requiredRoles={['admin', 'driver', 'field_officer', 'logistics_manager']}>
                <Alerts />
              </ProtectedRoute>
            } />
            <Route path="/ai-assistant" element={
              <ProtectedRoute requiredRoles={['admin', 'driver', 'field_officer', 'logistics_manager']}>
                <AIAssistant />
              </ProtectedRoute>
            } />
          </Route>
          
          {/* Catch-all — redirect unknown routes to login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;

