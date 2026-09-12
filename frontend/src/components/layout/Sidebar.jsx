import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Map, Truck, Package, AlertTriangle,
  ShieldAlert, Network, Bell, BarChart3, Settings, LogOut,
  ChevronLeft, ChevronRight, Activity, AlertOctagon, Shield, X, Bot
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { isRouteAllowedForRole, ROLE_CONFIG, ROLES } from '../../constants/roles';

// Role-tailored navigation definitions
const ROLE_NAV_CONFIG = {
  [ROLES.ADMIN]: {
    activeGradient: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/40 ring-1 ring-purple-400/40',
    pulseColor: 'bg-purple-400 shadow-[0_0_8px_#c084fc]',
    sections: [
      {
        title: 'State Command',
        items: [
          { key: 'nav_dashboard', name: 'State Command Dashboard', path: '/admin-dashboard', icon: LayoutDashboard },
          { key: 'nav_live_map', name: 'Live Tactical Map', path: '/live-map', icon: Map },
          { key: 'nav_alerts', name: 'Emergency Alerts', path: '/alerts', icon: Bell },
        ]
      },
      {
        title: 'Fleet & Corridors',
        items: [
          { key: 'nav_vehicles', name: 'Fleet Vehicles', path: '/vehicles', icon: Truck },
          { key: 'nav_shipments', name: 'Relief Shipments', path: '/shipments', icon: Package },
          { key: 'nav_incidents', name: 'Road Hazards', path: '/incidents', icon: AlertTriangle },
        ]
      },
      {
        title: 'System & Governance',
        items: [
          { key: 'nav_mesh', name: 'LoRa Mesh Network', path: '/mesh', icon: Network },
          { key: 'nav_ai_assistant', name: 'Universal AI Assistant', path: '/ai-assistant', icon: Bot },
          { key: 'nav_risk_analysis', name: 'Terrain Risk Matrix', path: '/risk-analysis', icon: ShieldAlert },
          { key: 'nav_analytics', name: 'Logistics Analytics', path: '/analytics', icon: BarChart3 },
          { key: 'nav_settings', name: 'Settings & Governance', path: '/settings', icon: Settings },
        ]
      }
    ]
  },
  [ROLES.LOGISTICS_MANAGER]: {
    activeGradient: 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-900/40 ring-1 ring-amber-400/40',
    pulseColor: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]',
    sections: [
      {
        title: 'Logistics Command',
        items: [
          { key: 'nav_manager_dashboard', name: 'Supply Chain Command', path: '/manager-dashboard', icon: LayoutDashboard },
          { key: 'nav_shipments', name: 'Relief Shipments', path: '/shipments', icon: Package },
          { key: 'nav_vehicles', name: 'Fleet Vehicles', path: '/vehicles', icon: Truck },
        ]
      },
      {
        title: 'Supply Intelligence',
        items: [
          { key: 'nav_live_map', name: 'Live Cargo Map', path: '/live-map', icon: Map },
          { key: 'nav_analytics', name: 'Logistics Analytics', path: '/analytics', icon: BarChart3 },
          { key: 'nav_alerts', name: 'Emergency Alerts', path: '/alerts', icon: Bell },
          { key: 'nav_ai_assistant', name: 'AI Supply Assistant', path: '/ai-assistant', icon: Bot },
        ]
      }
    ]
  },
  [ROLES.FIELD_OFFICER]: {
    activeGradient: 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-900/40 ring-1 ring-blue-400/40',
    pulseColor: 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]',
    sections: [
      {
        title: 'Field Operations',
        items: [
          { key: 'nav_field_officer', name: 'Field Recon Console', path: '/field-officer', icon: Shield },
          { key: 'nav_incidents', name: 'Ground Road Hazards', path: '/incidents', icon: AlertTriangle },
          { key: 'nav_risk_analysis', name: 'Pass Risk Matrix', path: '/risk-analysis', icon: ShieldAlert },
        ]
      },
      {
        title: 'Tactical Tools',
        items: [
          { key: 'nav_live_map', name: 'Live Tactical Map', path: '/live-map', icon: Map },
          { key: 'nav_alerts', name: 'Emergency Alerts', path: '/alerts', icon: Bell },
          { key: 'nav_ai_assistant', name: 'Tactical AI Assistant', path: '/ai-assistant', icon: Bot },
        ]
      }
    ]
  },
  [ROLES.DRIVER]: {
    activeGradient: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/40 ring-1 ring-emerald-400/40',
    pulseColor: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
    sections: [
      {
        title: 'Driver Cockpit',
        items: [
          { key: 'nav_driver', name: 'Driver Problem Portal', path: '/driver-dashboard', icon: AlertOctagon },
          { key: 'nav_live_map', name: 'Live Route Map', path: '/live-map', icon: Map },
        ]
      },
      {
        title: 'Safety & Support',
        items: [
          { key: 'nav_alerts', name: 'Emergency Alerts', path: '/alerts', icon: Bell },
          { key: 'nav_ai_assistant', name: 'AI Voice Co-Pilot', path: '/ai-assistant', icon: Bot },
        ]
      }
    ]
  }
};

const Sidebar = ({ collapsed, onToggle, mobileOpen = false, onMobileClose = () => {} }) => {
  const { t } = useLanguage();
  const { role } = useAuth();

  const currentRoleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.admin;
  const roleNav = ROLE_NAV_CONFIG[role] || ROLE_NAV_CONFIG[ROLES.ADMIN];

  // Filter sections and items strictly according to role allowed routes
  const navSections = roleNav.sections
    .map(section => ({
      ...section,
      items: section.items.filter(item => isRouteAllowedForRole(role, item.path))
    }))
    .filter(section => section.items.length > 0);

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 md:hidden transition-opacity"
          onClick={onMobileClose}
        >
          <div 
            className="fixed inset-y-0 left-0 w-72 bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl z-50 animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Header with Brand & Close Button */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                  <Activity className="text-white" size={20} />
                </div>
                <div>
                  <h1 className="text-white font-black text-lg leading-none tracking-wide">NER-LIFELINE</h1>
                  <span className="text-[10px] text-blue-400 font-bold tracking-widest uppercase">Smart Logistics Hub</span>
                </div>
              </div>
              <button
                onClick={onMobileClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                title="Close Menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mobile Role Identity Indicator */}
            <div className="px-4 pt-3 pb-1">
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px]">
                <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Active Role</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${currentRoleConfig.badgeClass}`}>
                  {currentRoleConfig.name}
                </span>
              </div>
            </div>

            {/* Navigation items for Mobile */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 scrollbar-thin">
              {navSections.map((section) => (
                <div key={section.title} className="space-y-1">
                  <div className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                    {section.title}
                  </div>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const localizedName = t(item.key, item.name);
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={onMobileClose}
                        className={({ isActive }) =>
                          `flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 ease-out group cursor-pointer ${
                            isActive
                              ? `${roleNav.activeGradient} font-bold scale-[1.01]`
                              : 'text-slate-400 hover:bg-slate-800/80 hover:text-white hover:translate-x-1 font-medium'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon size={18} className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                            <span className="text-xs truncate flex-1">{localizedName}</span>
                            {isActive && (
                              <span className={`w-1.5 h-1.5 rounded-full ${roleNav.pulseColor} animate-pulse`} />
                            )}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* Logout on mobile */}
            <div className="border-t border-slate-800 p-3">
              <NavLink
                to="/"
                onClick={onMobileClose}
                className="flex items-center space-x-3 px-3 py-2.5 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors text-xs font-medium"
              >
                <LogOut size={18} className="flex-shrink-0" />
                <span>Logout Session</span>
              </NavLink>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Docked Sidebar */}
      <aside
        className={`hidden md:flex flex-col h-full bg-slate-900 border-r border-slate-800 transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center h-16 px-4 border-b border-slate-800">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <Activity className="text-white" size={20} />
            </div>
            {!collapsed && (
              <div className="whitespace-nowrap">
                <h1 className="text-white font-black text-lg leading-none tracking-wide">NER-LIFELINE</h1>
                <span className="text-[10px] text-blue-400 font-bold tracking-widest uppercase">Smart Logistics Hub</span>
              </div>
            )}
          </div>
        </div>

        {/* Role Identity Indicator */}
        {!collapsed && (
          <div className="px-3 pt-3 pb-1">
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px]">
              <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Role</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border truncate max-w-[130px] ${currentRoleConfig.badgeClass}`}>
                {currentRoleConfig.name}
              </span>
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 scrollbar-thin">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              {!collapsed && (
                <div className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const localizedName = t(item.key, item.name);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={localizedName}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 ease-out group relative cursor-pointer ${
                        isActive
                          ? `${roleNav.activeGradient} font-bold scale-[1.01]`
                          : 'text-slate-400 hover:bg-slate-800/80 hover:text-white hover:translate-x-1 font-medium'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon size={18} className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110 group-active:scale-95" />
                        {!collapsed && (
                          <span className="text-xs truncate flex-1">{localizedName}</span>
                        )}
                        {isActive && !collapsed && (
                          <span className={`w-1.5 h-1.5 rounded-full ${roleNav.pulseColor} animate-pulse`} />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-slate-800 p-2.5">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Logout */}
        <div className="border-t border-slate-800 p-2.5">
          <NavLink
            to="/"
            className="flex items-center space-x-3 px-3 py-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors text-xs font-medium"
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span>Logout Session</span>}
          </NavLink>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
