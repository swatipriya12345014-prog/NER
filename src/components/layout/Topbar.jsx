import React from 'react';
import { Bell, Search, User, Menu, Wifi, Shield } from 'lucide-react';

const Topbar = ({ onMenuToggle }) => {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-20 sticky top-0 shadow-sm">
      {/* Left */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu size={22} />
        </button>
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search vehicles, shipments, routes..."
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-full bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-72 transition-all"
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center space-x-3">
        {/* System Status */}
        <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
          <Wifi size={14} className="text-green-600" />
          <span className="text-xs font-semibold text-green-700">Systems Online</span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
        </button>

        {/* Security Badge */}
        <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors hidden sm:block">
          <Shield size={20} />
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>

        {/* User */}
        <div className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-sm">
            <User size={16} className="text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-800 leading-none">Dr. R. Sharma</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Regional Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
