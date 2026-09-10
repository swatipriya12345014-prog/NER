import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import MainLayout from './components/layout/MainLayout';
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
import Alerts from './pages/Alerts';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          
          <Route element={<MainLayout />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/live-map" element={<LiveMap />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/shipments" element={<Shipments />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/risk-analysis" element={<RiskAnalysis />} />
            <Route path="/mesh" element={<Mesh />} />
            <Route path="/driver-dashboard" element={<DriverDashboard />} />
            <Route path="/field-officer" element={<FieldOfficer />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
