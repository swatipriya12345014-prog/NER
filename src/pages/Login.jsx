import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Truck, MapPin, Building, Activity, Users } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    // Dummy authentication routing based on role
    switch (role) {
      case 'admin':
        navigate('/admin-dashboard');
        break;
      case 'driver':
        navigate('/driver-dashboard');
        break;
      case 'field_officer':
        navigate('/field-officer');
        break;
      case 'logistics_manager':
        navigate('/shipments'); // Placeholder for Logistics Manager dashboard
        break;
      default:
        navigate('/admin-dashboard');
    }
  };

  const roleOptions = [
    { id: 'admin', label: 'Administrator', icon: <Shield size={18} /> },
    { id: 'logistics_manager', label: 'Logistics Manager', icon: <Building size={18} /> },
    { id: 'field_officer', label: 'Field Officer', icon: <Users size={18} /> },
    { id: 'driver', label: 'Driver', icon: <Truck size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 relative">
        <div className="flex justify-center mb-4">
          <div className="bg-slate-800/80 p-4 rounded-full border border-slate-600 shadow-xl backdrop-blur-sm">
            <Activity className="text-blue-400" size={48} />
          </div>
        </div>
        <h2 className="text-center text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
          NER-LIFELINE
        </h2>
        <p className="mt-2 text-center text-sm text-blue-300 font-medium tracking-wide uppercase">
          Department of Smart Logistics & Accessibility
        </p>
        <p className="mt-2 text-center text-xs text-slate-400 max-w-xs mx-auto">
          AI-Driven Emergency Management & Logistics Platform for the North Eastern Region
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-slate-800/90 backdrop-blur-xl py-8 px-4 shadow-[0_0_40px_rgba(0,0,0,0.5)] sm:rounded-xl sm:px-10 border border-slate-700 relative overflow-hidden">
          
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-indigo-500"></div>

          <form className="space-y-6 relative" onSubmit={handleLogin}>
            
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Authentication Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                {roleOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRole(opt.id)}
                    className={`flex items-center justify-center space-x-2 py-2 px-3 border rounded-lg text-sm font-medium transition-all ${
                      role === opt.id
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                        : 'bg-slate-900/50 border-slate-600 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-700/50">
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Official Email Address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`${role}@ner-lifeline.gov.in`}
                  className="appearance-none block w-full px-4 py-3 border border-slate-600 rounded-lg bg-slate-900/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm shadow-inner"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Security Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="appearance-none block w-full px-4 py-3 border border-slate-600 rounded-lg bg-slate-900/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm shadow-inner"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-600 rounded bg-slate-900"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-400">
                  Save credentials securely
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
                  Request access reset
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-900 transition-all active:scale-[0.98]"
              >
                AUTHORIZE ACCESS
              </button>
            </div>
          </form>
          
          <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-700/50 pt-4">
            Secured by NER-LIFELINE Gov Protocol v2.4
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
