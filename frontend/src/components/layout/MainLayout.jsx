import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert, X } from 'lucide-react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import AIChatWidget from '../AIChatWidget';

const MainLayout = () => {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleNotice, setRoleNotice] = useState(null);

  // Check for security role violation on navigation
  useEffect(() => {
    try {
      const rawNotice = sessionStorage.getItem('ner_role_violation_notice');
      if (rawNotice) {
        const parsed = JSON.parse(rawNotice);
        setRoleNotice(parsed);
        sessionStorage.removeItem('ner_role_violation_notice');
        const timer = setTimeout(() => setRoleNotice(null), 8000);
        return () => clearTimeout(timer);
      }
    } catch (e) {}
  }, [location.pathname]);

  const handleMenuToggle = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileMenuOpen(prev => !prev);
    } else {
      setSidebarCollapsed(prev => !prev);
    }
  };

  // Keyboard shortcut: Ctrl+B or Cmd+B toggles sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleMenuToggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100 relative">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar 
          onMenuToggle={handleMenuToggle} 
          sidebarCollapsed={sidebarCollapsed}
          mobileOpen={mobileMenuOpen}
        />

        {/* Dynamic RBAC Security Alert Banner */}
        {roleNotice && (
          <div className="bg-amber-950/95 border-b border-amber-600/70 px-4 py-2.5 flex items-center justify-between text-xs text-amber-200 z-40 backdrop-blur-md animate-in slide-in-from-top duration-300">
            <div className="flex items-center space-x-2.5">
              <ShieldAlert size={16} className="text-amber-400 flex-shrink-0" />
              <span>
                <strong>Role Access Boundary Enforced:</strong> Signed in as <span className="font-bold text-white underline decoration-amber-400">{roleNotice.roleName}</span>. Direct access to <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-300 font-mono text-[11px]">{roleNotice.attemptedPath}</code> was blocked because that workspace belongs to another operational role.
              </span>
            </div>
            <button
              onClick={() => setRoleNotice(null)}
              className="p-1 hover:bg-amber-900/60 rounded text-amber-300 hover:text-white cursor-pointer ml-3 flex-shrink-0"
              title="Dismiss Notice"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-950 scroll-smooth">
          <div className="animate-fade-in transition-all duration-300 min-h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Universal AI Chatbot Widget */}
      <AIChatWidget />
    </div>
  );
};

export default MainLayout;
