import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import TacticalLoader from './components/common/TacticalLoader';
import ErrorBoundary from './components/common/ErrorBoundary';

// ═════════════════════════════════════════════════════════════════
// RESILIENT CODE SPLITTING: Dynamic loading with automatic recovery
// ═════════════════════════════════════════════════════════════════
function lazyWithRetry(componentImport) {
  return lazy(async () => {
    try {
      const module = await componentImport();
      return module;
    } catch (error) {
      console.warn('Dynamic chunk fetch failed, retrying...', error);
      // Auto reload once if a stale hash from rebuild caused the failure
      if (!sessionStorage.getItem('app_chunk_recovered')) {
        sessionStorage.setItem('app_chunk_recovered', 'true');
        window.location.reload();
      }
      throw error;
    }
  });
}

const Login = lazyWithRetry(() => import('./pages/Login'));
const AdminDashboard = lazyWithRetry(() => import('./pages/AdminDashboard'));
const LiveMap = lazyWithRetry(() => import('./pages/LiveMap'));
const Vehicles = lazyWithRetry(() => import('./pages/Vehicles'));
const Shipments = lazyWithRetry(() => import('./pages/Shipments'));
const Incidents = lazyWithRetry(() => import('./pages/Incidents'));
const RiskAnalysis = lazyWithRetry(() => import('./pages/RiskAnalysis'));
const Mesh = lazyWithRetry(() => import('./pages/Mesh'));
const DriverDashboard = lazyWithRetry(() => import('./pages/DriverDashboard'));
const FieldOfficer = lazyWithRetry(() => import('./pages/FieldOfficer'));
const Alerts = lazyWithRetry(() => import('./pages/Alerts'));
const Analytics = lazyWithRetry(() => import('./pages/Analytics'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));
const AIAssistant = lazyWithRetry(() => import('./pages/AIAssistant'));
const ManagerDashboard = lazyWithRetry(() => import('./pages/ManagerDashboard'));

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <BrowserRouter>
            <Suspense fallback={<TacticalLoader />}>
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

                  {/* 2. Logistics Operations Manager Exclusive Workspace */}
                  <Route path="/manager-dashboard" element={
                    <ProtectedRoute requiredRoles={['logistics_manager']}>
                      <ManagerDashboard />
                    </ProtectedRoute>
                  } />

                  {/* 3. Driver Exclusive Workspace */}
                  <Route path="/driver-dashboard" element={
                    <ProtectedRoute requiredRoles={['driver']}>
                      <DriverDashboard />
                    </ProtectedRoute>
                  } />

                  {/* 4. Field Officer Exclusive Workspace */}
                  <Route path="/field-officer" element={
                    <ProtectedRoute requiredRoles={['field_officer']}>
                      <FieldOfficer />
                    </ProtectedRoute>
                  } />

                  {/* 5. Logistics & Supply Chain Workspaces */}
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

                  {/* 6. Field Hazard & Terrain Workspaces */}
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

                  {/* 7. Universal Operational Tools */}
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
            </Suspense>
          </BrowserRouter>
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
