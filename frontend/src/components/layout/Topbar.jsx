import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, User, Menu, Wifi, Shield, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Topbar = ({ onMenuToggle }) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getRoleLabel = (r) => {
    switch (r) {
      case 'admin':
        return 'Regional Admin';
      case 'driver':
        return 'Active Driver';
      case 'field_officer':
        return 'Field Officer';
      case 'logistics_manager':
        return 'Logistics Manager';
      default:
        return 'Authorized User';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 z-20 sticky top-0 shadow-sm">
      {/* Left: Menu toggle & search */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          title="Toggle Navigation"
        >
          <Menu size={22} />
        </button>
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search vehicles, shipments, routes..."
            className="pl-10 pr-4 py-1.5 border border-gray-200 rounded-full bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64 lg:w-72 transition-all"
          />
        </div>
      </div>

      {/* Right: Status, notifications, user profile */}
      <div className="flex items-center space-x-3">
        {/* System Status */}
        <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
          <Wifi size={13} className="text-emerald-600" />
          <span className="text-xs font-semibold text-emerald-700">Systems Online</span>
        </div>

        {/* Notifications */}
        <button
          className="relative p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
          title="Alerts & Notifications"
        >
          <Bell size={19} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
        </button>

        {/* Security Badge */}
        <button
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors hidden sm:block cursor-pointer"
          title="Government Security Protocol Active"
        >
          <Shield size={19} />
        </button>

        {/* Divider */}
        <div className="w-px h-7 bg-gray-200 hidden sm:block"></div>

        {/* User profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2.5 cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors"
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-8 h-8 rounded-full border border-blue-400 object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : <User size={15} />}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-gray-800 leading-tight">
                {user?.displayName || 'Dr. R. Sharma'}
              </p>
              <p className="text-[10px] text-blue-600 font-medium">
                {getRoleLabel(role)}
              </p>
            </div>
            <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-800 truncate">
                  {user?.displayName || 'Authorized Officer'}
                </p>
                <p className="text-[11px] text-gray-500 truncate">
                  {user?.email || 'admin@ner-lifeline.gov.in'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-2 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
