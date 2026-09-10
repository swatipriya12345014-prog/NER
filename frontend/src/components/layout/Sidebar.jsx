import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Map, Truck, Package, AlertTriangle,
  ShieldAlert, Network, Bell, BarChart3, Settings, LogOut,
  ChevronLeft, ChevronRight, Activity, Gauge, Shield
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const navItems = [
  { key: 'nav_dashboard', name: 'Dashboard', path: '/admin-dashboard', icon: LayoutDashboard },
  { key: 'nav_live_map', name: 'Live Map', path: '/live-map', icon: Map },
  { key: 'nav_vehicles', name: 'Vehicles', path: '/vehicles', icon: Truck },
  { key: 'nav_shipments', name: 'Shipments', path: '/shipments', icon: Package },
  { key: 'nav_incidents', name: 'Incidents', path: '/incidents', icon: AlertTriangle },
  { key: 'nav_risk_analysis', name: 'Risk Analysis', path: '/risk-analysis', icon: ShieldAlert },
  { key: 'nav_mesh', name: 'LIFELINE MESH', path: '/mesh', icon: Network },
  { key: 'nav_driver', name: 'Driver Cockpit', path: '/driver-dashboard', icon: Gauge },
  { key: 'nav_field_officer', name: 'Field Officer', path: '/field-officer', icon: Shield },
  { key: 'nav_alerts', name: 'Alerts', path: '/alerts', icon: Bell },
  { key: 'nav_analytics', name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { key: 'nav_settings', name: 'Settings', path: '/settings', icon: Settings },
];

const Sidebar = ({ collapsed, onToggle }) => {
  const { t } = useLanguage();

  return (
    <aside
      className={`hidden md:flex flex-col h-full bg-slate-900 border-r border-slate-800 transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand */}
      <div className="flex items-center h-16 px-4 border-b border-slate-800">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="flex-shrink-0 w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <Activity className="text-white" size={20} />
          </div>
          {!collapsed && (
            <div className="whitespace-nowrap">
              <h1 className="text-white font-bold text-lg leading-none tracking-wide">NER-LIFELINE</h1>
              <span className="text-[10px] text-blue-400 font-medium tracking-widest uppercase">Command Center</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const localizedName = t(item.key, item.name);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={localizedName}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border-l-2 border-blue-400 -ml-[1px]'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`
              }
            >
              <Icon size={20} className="flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium truncate">{localizedName}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-slate-800 p-3">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center py-2 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Logout */}
      <div className="border-t border-slate-800 p-3">
        <NavLink
          to="/"
          className="flex items-center space-x-3 px-3 py-2.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <LogOut size={20} className="flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;
