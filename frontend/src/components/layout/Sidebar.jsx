import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Map, Truck, Package, AlertTriangle,
  ShieldAlert, Network, Bell, BarChart3, Settings, LogOut,
  ChevronLeft, ChevronRight, Activity, AlertOctagon, Shield, X, Bot
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const navSections = [
  {
    title: 'Core Operations',
    items: [
      { key: 'nav_dashboard', name: 'Dashboard', path: '/admin-dashboard', icon: LayoutDashboard },
      { key: 'nav_live_map', name: 'Live Map & Routes', path: '/live-map', icon: Map },
      { key: 'nav_vehicles', name: 'Fleet Vehicles', path: '/vehicles', icon: Truck },
      { key: 'nav_shipments', name: 'Relief Shipments', path: '/shipments', icon: Package },
      { key: 'nav_incidents', name: 'Road Hazards', path: '/incidents', icon: AlertTriangle },
      { key: 'nav_alerts', name: 'Emergency Alerts', path: '/alerts', icon: Bell },
    ]
  },
  {
    title: 'Field & Mesh Roles',
    items: [
      { key: 'nav_driver', name: 'Driver Problem Portal', path: '/driver-dashboard', icon: AlertOctagon },
      { key: 'nav_field_officer', name: 'Field Officer', path: '/field-officer', icon: Shield },
      { key: 'nav_mesh', name: 'LoRa Mesh Network', path: '/mesh', icon: Network },
    ]
  },
  {
    title: 'Intelligence & Config',
    items: [
      { key: 'nav_ai_assistant', name: 'Universal AI Assistant', path: '/ai-assistant', icon: Bot },
      { key: 'nav_risk_analysis', name: 'Terrain Risk Matrix', path: '/risk-analysis', icon: ShieldAlert },
      { key: 'nav_analytics', name: 'Analytics', path: '/analytics', icon: BarChart3 },
      { key: 'nav_settings', name: 'Settings & Language', path: '/settings', icon: Settings },
    ]
  }
];

const Sidebar = ({ collapsed, onToggle, mobileOpen = false, onMobileClose = () => {} }) => {
  const { t } = useLanguage();

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
                          `flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40 font-semibold'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
                          }`
                        }
                      >
                        <Icon size={18} className="flex-shrink-0" />
                        <span className="text-xs truncate">{localizedName}</span>
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
                      `flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 group ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40 font-semibold'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
                      }`
                    }
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    {!collapsed && <span className="text-xs truncate">{localizedName}</span>}
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
