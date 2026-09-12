import React, { useState } from 'react';
import { User, Plus, X, Shield, ArrowRight } from 'lucide-react';

const DEFAULT_ACCOUNTS = [
  {
    name: 'Ramesh Kalita (Normal Driver)',
    email: 'ramesh.highway.driver@gmail.com',
    avatarBg: 'bg-emerald-600',
    initial: 'R',
    roleTag: 'Commercial Driver',
  },
  {
    name: 'Swati Priya',
    email: 'swatipriya12345014@gmail.com',
    avatarBg: 'bg-teal-600',
    initial: 'S',
    roleTag: 'Primary Account',
  },
  {
    name: 'NER Field Operations',
    email: 'operations.ner@gmail.com',
    avatarBg: 'bg-blue-600',
    initial: 'N',
    roleTag: 'Field Operations',
  },
  {
    name: 'Dr. R. Sharma (Admin)',
    email: 'admin.lifeline@gov.in',
    avatarBg: 'bg-purple-600',
    initial: 'R',
    roleTag: 'Regional Directorate',
  },
];

const GoogleAccountChooserModal = ({ isOpen, onClose, onSelectAccount, selectedRole }) => {
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');

  if (!isOpen) return null;

  const handleSelect = (account) => {
    onSelectAccount({
      uid: 'google-user-' + Date.now(),
      displayName: account.name,
      email: account.email,
      photoURL: account.photoURL || null,
      provider: 'google.com',
    });
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customEmail) return;
    const name = customName.trim() || customEmail.split('@')[0];
    onSelectAccount({
      uid: 'google-custom-' + Date.now(),
      displayName: name,
      email: customEmail.trim(),
      photoURL: null,
      provider: 'google.com',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
        {/* Header with Google Logo */}
        <div className="p-6 pb-4 border-b border-gray-100 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <svg className="w-7 h-7" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.37 7.32 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.32 0 3.25 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <div>
              <h2 className="text-xl font-bold text-gray-900 leading-tight">Choose an account</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                to continue to <span className="font-semibold text-blue-600">NER-LIFELINE</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Selected Role Badge */}
        <div className="px-6 py-2.5 bg-blue-50/60 border-b border-blue-100/70 flex items-center justify-between text-xs">
          <span className="text-gray-600 flex items-center space-x-1.5">
            <Shield size={13} className="text-blue-600" />
            <span>Signing in as:</span>
          </span>
          <span className="font-bold text-blue-700 uppercase tracking-wide">
            {selectedRole === 'normal_driver'
              ? 'NORMAL DRIVER (COMMERCIAL & HIGHWAY)'
              : (selectedRole?.replace('_', ' ') || 'ADMIN')}
          </span>
        </div>

        {/* Account List */}
        <div className="p-4 max-h-80 overflow-y-auto divide-y divide-gray-100">
          {!customMode ? (
            <>
              {DEFAULT_ACCOUNTS.map((acc, index) => (
                <button
                  key={index}
                  onClick={() => handleSelect(acc)}
                  className="w-full flex items-center space-x-3.5 p-3 hover:bg-blue-50/50 rounded-2xl transition-all text-left group cursor-pointer"
                >
                  <div
                    className={`w-10 h-10 rounded-full ${acc.avatarBg} text-white font-bold flex items-center justify-center text-sm shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform`}
                  >
                    {acc.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {acc.name}
                      </p>
                      <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                        {acc.roleTag}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{acc.email}</p>
                  </div>
                  <ArrowRight
                    size={15}
                    className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                  />
                </button>
              ))}

              {/* Use another account button */}
              <button
                onClick={() => setCustomMode(true)}
                className="w-full flex items-center space-x-3.5 p-3 hover:bg-gray-50 rounded-2xl transition-all text-left text-gray-700 mt-1 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0">
                  <Plus size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">Use another account</p>
                  <p className="text-xs text-gray-400">Sign in with a different Google account</p>
                </div>
              </button>
            </>
          ) : (
            <form onSubmit={handleCustomSubmit} className="p-2 space-y-3">
              <p className="text-xs text-gray-600 font-medium mb-1">
                Enter your Google Account email:
              </p>
              <div>
                <input
                  type="text"
                  placeholder="Full Name (optional)"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <input
                  type="email"
                  required
                  placeholder="name@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCustomMode(false)}
                  className="flex-1 py-2 px-3 border border-gray-300 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Back to List
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                >
                  Continue
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-500 leading-relaxed text-center">
          To continue, Google will verify your identity and share your name and email address with <strong className="text-gray-700">NER-LIFELINE</strong>.
        </div>
      </div>
    </div>
  );
};

export default GoogleAccountChooserModal;
