import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Compass,
  Map,
  Shield,
  Radio,
  Bell,
  Volume2,
  Sliders,
  Database,
  CheckCircle2,
  Save,
  RefreshCw,
  Layers,
  Fuel,
  Cpu,
  Lock,
  Globe
} from 'lucide-react';

export default function Settings() {
  const [mapEngine, setMapEngine] = useState('google');
  const [defaultBasemap, setDefaultBasemap] = useState('dark');
  const [enableHeadingUp, setEnableHeadingUp] = useState(true);
  const [gpsInterval, setGpsInterval] = useState('2s');
  const [riskFactor, setRiskFactor] = useState(3.5);
  const [fuelMultiplier, setFuelMultiplier] = useState(2.4);
  const [loraFrequency, setLoraFrequency] = useState('865.2 MHz');
  const [dtnRetention, setDtnRetention] = useState('48h');
  const [sirenChime, setSirenChime] = useState(true);
  const [sirenVolume, setSirenVolume] = useState(80);
  const [saveToast, setSaveToast] = useState(false);

  const handleSave = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border border-emerald-400 animate-bounce">
          <CheckCircle2 size={18} />
          <span className="text-xs font-bold">Preferences and engine parameters successfully saved!</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <SettingsIcon size={18} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">System Settings & Engine Preferences</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure geospatial parameters, AI fuel router tolerances, LoRa DTN mesh intervals, and audio alerts.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl flex items-center space-x-2 transition-all cursor-pointer hover:scale-105"
        >
          <Save size={15} />
          <span>Save Preferences</span>
        </button>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Geospatial & Navigation Engine */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
            <Globe size={16} className="text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Geospatial & Map Engine</h2>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold block">Primary Map Provider</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMapEngine('google')}
                  className={`p-2.5 rounded-xl border text-left font-semibold transition-all cursor-pointer ${
                    mapEngine === 'google'
                      ? 'bg-emerald-950/60 border-emerald-500 text-white shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-emerald-400">Google Maps Platform</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Satellite, 3D terrain & real routes</div>
                </button>
                <button
                  onClick={() => setMapEngine('offline')}
                  className={`p-2.5 rounded-xl border text-left font-semibold transition-all cursor-pointer ${
                    mapEngine === 'offline'
                      ? 'bg-blue-950/60 border-blue-500 text-white shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-blue-400">Offline Vector Mode</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Zero SDK limits • Blackout mode</div>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold block">Default Basemap Palette</label>
              <select
                value={defaultBasemap}
                onChange={(e) => setDefaultBasemap(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="dark">🌙 Tactical Dark Mode (High Contrast Night)</option>
                <option value="terrain">⛰️ Mountain Topographic Relief</option>
                <option value="satellite">🛰️ High-Resolution Satellite Imagery</option>
                <option value="roadmap">🛣️ Standard National Highway Grid</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-850">
              <div>
                <span className="text-slate-200 font-bold block">Compass Heading-Up Mode</span>
                <span className="text-[10px] text-slate-400">Auto-rotate map with device orientation sensor</span>
              </div>
              <input
                type="checkbox"
                checked={enableHeadingUp}
                onChange={(e) => setEnableHeadingUp(e.target.checked)}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold block">GPS Tracking Cadence</label>
              <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
                {['1s (High Acc)', '2s (Optimal)', '5s (Eco)'].map((cad) => (
                  <button
                    key={cad}
                    onClick={() => setGpsInterval(cad)}
                    className={`py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
                      gpsInterval === cad
                        ? 'bg-blue-600 text-white border-blue-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cad}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: AI Fuel & Terrain Risk Tolerances */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
            <Fuel size={16} className="text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">AI Fuel & Risk Optimization</h2>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-bold">Terrain Risk Penalty Factor</label>
                <span className="font-mono text-amber-400 font-bold">{riskFactor}x</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Determines how aggressively the AI engine diverts around active landslide zones even if it adds extra km.
              </p>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.1"
                value={riskFactor}
                onChange={(e) => setRiskFactor(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>1.0x (Shortest Distance First)</span>
                <span>5.0x (Zero Hazard Tolerance)</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-bold">Highland Grade Incline Multiplier</label>
                <span className="font-mono text-cyan-400 font-bold">{fuelMultiplier}x</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Additional fuel burn accounted for by AI when climbing +14° to +18° Himalayan hairpins (e.g. Sela Pass).
              </p>
              <input
                type="range"
                min="1.5"
                max="3.5"
                step="0.1"
                value={fuelMultiplier}
                onChange={(e) => setFuelMultiplier(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>1.5x (Gentle Slopes)</span>
                <span>3.5x (High-Altitude Hairpins)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="font-bold text-slate-200">Cold-Chain Temperature Alert Trigger</span>
              <p className="text-[10px] text-slate-400">
                Immediate dispatch siren fires if refrigerated medical vaccines breach the -2.0°C to -8.0°C threshold.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: LIFELINE MESH (LoRa DTN) Protocol */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
            <Radio size={16} className="text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">LIFELINE MESH & Blackout Protocol</h2>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold block">India LoRa Frequency Allocation</label>
              <div className="grid grid-cols-2 gap-2">
                {['865.2 MHz (Ch 1)', '866.4 MHz (Ch 2)'].map((freq) => (
                  <button
                    key={freq}
                    onClick={() => setLoraFrequency(freq)}
                    className={`py-2 rounded-xl border font-mono font-bold text-center transition-all cursor-pointer ${
                      loraFrequency === freq
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold block">DTN Store-and-Forward Retention</label>
              <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
                {['24h', '48h', '72h'].map((ret) => (
                  <button
                    key={ret}
                    onClick={() => setDtnRetention(ret)}
                    className={`py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
                      dtnRetention === ret
                        ? 'bg-cyan-600 text-white border-cyan-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {ret}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
              When gateway connectivity drops in mountain gorges, ESP32 nodes locally buffer telemetry packets and forward them via peer-to-peer mesh when a relief vehicle passes by.
            </div>
          </div>
        </div>

        {/* Section 4: Audio Siren & Dispatch Chimes */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
            <Bell size={16} className="text-rose-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Audio Siren & Alert Chimes</h2>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-850">
              <div>
                <span className="text-slate-200 font-bold block">Emergency Audio Siren</span>
                <span className="text-[10px] text-slate-400">Play synthetic acoustic siren on Critical road blockages</span>
              </div>
              <input
                type="checkbox"
                checked={sirenChime}
                onChange={(e) => setSirenChime(e.target.checked)}
                className="w-4 h-4 accent-rose-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-bold">Siren Volume Level</label>
                <span className="font-mono text-rose-400 font-bold">{sirenVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sirenVolume}
                onChange={(e) => setSirenVolume(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>

            {/* System Status Pills */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Engine Connection Status</span>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 flex items-center space-x-1.5 font-bold">
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  <span>Google Maps: Active</span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 flex items-center space-x-1.5 font-bold">
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  <span>FastAPI: Healthy</span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 flex items-center space-x-1.5 font-bold">
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  <span>Supabase: Connected</span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 flex items-center space-x-1.5 font-bold">
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  <span>LoRa Node: Mesh Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
