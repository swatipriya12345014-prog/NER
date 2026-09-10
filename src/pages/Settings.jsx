import React from 'react';
import { Settings as SettingsIcon, User, Bell, Shield, Database, Palette } from 'lucide-react';

const Settings = () => {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your NER-LIFELINE preferences and configurations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: 'Profile Settings', desc: 'Update your name, email and role preferences', icon: User, color: 'blue' },
          { title: 'Notification Preferences', desc: 'Configure alert thresholds and delivery channels', icon: Bell, color: 'amber' },
          { title: 'Security', desc: 'Password, 2FA, and session management', icon: Shield, color: 'emerald' },
          { title: 'Data Management', desc: 'Export logs, manage storage, and backups', icon: Database, color: 'purple' },
          { title: 'Appearance', desc: 'Theme, layout, and display preferences', icon: Palette, color: 'pink' },
          { title: 'System Config', desc: 'API keys, integrations, and MESH settings', icon: SettingsIcon, color: 'slate' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${item.color}-100 text-${item.color}-600 mb-3`}>
                <Icon size={20} />
              </div>
              <h3 className="font-bold text-gray-800">{item.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Settings;
