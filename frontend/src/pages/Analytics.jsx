import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, TrendingUp, Fuel, Shield, Clock, CheckCircle2, 
  Truck, ArrowRight, Mountain, Activity, Download, Calendar
} from 'lucide-react';

export default function Analytics() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('30d');

  const STATE_PERFORMANCE = [
    { state: 'Arunachal Pradesh', dispatches: 38, fuelSavedL: 680, onTimeRate: '94.2%', safetyScore: 84 },
    { state: 'Assam', dispatches: 64, fuelSavedL: 820, onTimeRate: '98.5%', safetyScore: 96 },
    { state: 'Meghalaya', dispatches: 42, fuelSavedL: 450, onTimeRate: '95.1%', safetyScore: 88 },
    { state: 'Nagaland', dispatches: 26, fuelSavedL: 380, onTimeRate: '91.8%', safetyScore: 82 },
    { state: 'Sikkim', dispatches: 22, fuelSavedL: 290, onTimeRate: '92.4%', safetyScore: 80 },
    { state: 'Manipur', dispatches: 18, fuelSavedL: 220, onTimeRate: '93.0%', safetyScore: 86 }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <BarChart3 size={20} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Highland Logistics Intelligence & Analytics
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Performance metrics evaluating AI route risk mitigation, fuel optimization across mountain ghats, and cold-chain compliance.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last Quarter (Monsoon)</option>
          </select>

          <button
            onClick={() => navigate('/live-map')}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white flex items-center space-x-1.5 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <span>AI Route Optimizer</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Fuel Saved by AI Routing</span>
            <Fuel size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">2,840 L</div>
          <p className="text-[10px] text-emerald-400/80">Avoiding steep risk climbs</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Avg Incident Clear Time</span>
            <Clock size={16} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white">4.2 Hours</div>
          <p className="text-[10px] text-slate-500">BRO Project Vartak/Swastik</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Safest Route Adoption</span>
            <Shield size={16} className="text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-400">84.2%</div>
          <p className="text-[10px] text-blue-400/80">Preferred over risky shortcut</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Cold-Chain Integrity</span>
            <CheckCircle2 size={16} className="text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400">100.0%</div>
          <p className="text-[10px] text-purple-400/80">Zero thermal excursions</p>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Mountain Fuel Burn by Terrain Grade */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center space-x-2">
              <Mountain size={16} className="text-amber-400" />
              <span>Fleet Fuel Burn by Highway Terrain</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Real Ingested Telemetry</span>
          </div>

          <p className="text-xs text-slate-300">
            Vehicles traveling over steep mountain ghats burn more than double the fuel of plains corridors:
          </p>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-rose-400 font-bold">Steep Mountain Ghats (+18° climb)</span>
                <span className="font-mono text-white font-bold">5.2 km/L (Heavy Burn)</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full w-[44%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-amber-400 font-bold">Rolling Valleys & Passes (+6° grade)</span>
                <span className="font-mono text-white font-bold">8.5 km/L (Standard Burn)</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full w-[72%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-emerald-400 font-bold">4-Lane National Highway Expressway (NH-27)</span>
                <span className="font-mono text-white font-bold">11.8 km/L (Optimal Cruising)</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full w-[100%]" />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            <strong className="text-emerald-300">AI Optimization Insight:</strong> Re-routing convoys away from Sela Ridge uphill climbs saved an estimated <strong>42 Litres per vehicle</strong> on the Guwahati–Tawang mission alone.
          </div>
        </div>

        {/* Chart 2: Safest vs Shortest Corridor Risk Comparison */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center space-x-2">
              <Shield size={16} className="text-emerald-400" />
              <span>Safest vs Shortest Corridor Comparison</span>
            </h3>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">-74% Hazard Reduction</span>
          </div>

          <p className="text-xs text-slate-300">
            Demonstrating why taking the AI-recommended Safest Route prevents catastrophic vehicle stranding:
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-rose-900/60 space-y-2">
              <span className="font-bold text-rose-400 text-xs">Shortest Corridor (NH-6/13)</span>
              <div className="space-y-1 text-slate-300 text-[11px]">
                <div>• Average Distance: <strong>215 km</strong></div>
                <div>• Elevation Gain: <strong className="text-rose-400">+3,200m</strong></div>
                <div>• Landslide Exposure: <strong className="text-rose-400">78% High Risk</strong></div>
                <div>• Convoy Entrapment: <strong>14.2%</strong></div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-900/60 space-y-2">
              <span className="font-bold text-emerald-400 text-xs">Safest Corridor (AI Recommended)</span>
              <div className="space-y-1 text-slate-300 text-[11px]">
                <div>• Average Distance: <strong>254 km (+18%)</strong></div>
                <div>• Elevation Gain: <strong className="text-emerald-400">+1,250m</strong></div>
                <div>• Landslide Exposure: <strong className="text-emerald-400">16% Low Risk</strong></div>
                <div>• Convoy Entrapment: <strong className="text-emerald-400">0.0%</strong></div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-200 leading-relaxed">
            <strong>Conclusion:</strong> Although the Safest Route is 39 km longer, fuel consumption is actually <strong>1.9L lower</strong> due to gentler highway gradients and zero roadblock idling.
          </div>
        </div>
      </div>

      {/* State-by-State Logistics Fulfillment Table */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">
            State-by-State Logistics Fulfillment & Safety Ratings
          </h3>
          <span className="text-[11px] text-slate-400">Updated Hourly</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-950 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">State</th>
                <th className="py-2.5 px-3">Dispatches</th>
                <th className="py-2.5 px-3">Fuel Saved</th>
                <th className="py-2.5 px-3">On-Time Delivery</th>
                <th className="py-2.5 px-3">Safety Compliance</th>
                <th className="py-2.5 px-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {STATE_PERFORMANCE.map((st) => (
                <tr key={st.state} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 font-bold text-white">{st.state}</td>
                  <td className="py-3 px-3 font-mono">{st.dispatches} Convoys</td>
                  <td className="py-3 px-3 font-mono text-emerald-400 font-bold">+{st.fuelSavedL} Litres</td>
                  <td className="py-3 px-3 font-mono text-cyan-300">{st.onTimeRate}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold text-[10px]">
                      {st.safetyScore}/100 Rating
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <button
                      onClick={() => navigate('/live-map')}
                      className="text-blue-400 hover:text-blue-300 font-bold hover:underline cursor-pointer"
                    >
                      View Corridors ➔
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
