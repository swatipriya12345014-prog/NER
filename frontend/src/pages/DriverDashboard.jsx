import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Navigation,
  Compass,
  Fuel,
  Gauge,
  Thermometer,
  Shield,
  AlertTriangle,
  Radio,
  MapPin,
  Clock,
  PhoneCall,
  CheckCircle2,
  ChevronRight,
  ArrowUpRight,
  Volume2,
  X,
  Share2,
  Copy
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function DriverDashboard() {
  const navigate = useNavigate();
  const { t, speakText, playAlertChime, isSpeaking } = useLanguage();

  const [speed, setSpeed] = useState(54);
  const [altitude, setAltitude] = useState(2680);
  const [heading, setHeading] = useState(42);
  const [fuelPct, setFuelPct] = useState(76);
  const [cargoTemp, setCargoTemp] = useState(-4.2);
  const [sosActive, setSosActive] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(5);
  const [copyToast, setCopyToast] = useState(false);

  // Subtle live speed & telemetry fluctuation
  useEffect(() => {
    const timer = setInterval(() => {
      setSpeed((prev) => Math.max(35, Math.min(68, prev + Math.floor(Math.random() * 5) - 2)));
      setAltitude((prev) => prev + Math.floor(Math.random() * 3) - 1);
      setHeading((prev) => (prev + 1) % 360);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  // SOS countdown & alert sound
  useEffect(() => {
    let interval = null;
    if (sosActive && sosCountdown > 0) {
      playAlertChime('sos');
      interval = setInterval(() => {
        setSosCountdown((c) => c - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sosActive, sosCountdown, playAlertChime]);

  const handleTriggerSos = () => {
    setSosActive(true);
    setSosCountdown(5);
    playAlertChime('sos');
  };

  const handleVoiceReadout = () => {
    const text = `Next maneuver: Bear Right at Bhalukpong Forest Checkpost onto National Highway 13. Distance: 4.2 kilometers. Steep 14 degree climb ahead. Switch to 4WD low gear. Caution: Sela Pass Km 142 Convoy Escort Active. Current speed: ${speed} kilometers per hour. Fuel level: ${fuelPct} percent. Cold chain cargo temperature: ${cargoTemp} degrees Celsius.`;
    speakText(text);
  };

  const handleCopyManifest = () => {
    const manifest = `NER-LIFELINE DRIVER DISPATCH MANIFEST
Vehicle: AS-01-EV-4421 (Highland 4x4 Ambulance)
Assigned Pilot: Tenzing Norbu
Corridor: Guwahati Central ➔ Tawang Border Hospital via NH-13
Payload: Cold-Chain Blood Plasma & Oxygen (-4.2°C)
Current Telemetry: Altitude ${altitude}m ASL, Fuel ${fuelPct}%, Heading ${heading}° NE
Nearest Refuge: BRO Camp 142 Bhalukpong (6.2 km)
Emergency Comm: LoRa Mesh Ch 1 / VHF 146.2 MHz`;

    navigator.clipboard.writeText(manifest).then(() => {
      setCopyToast(true);
      playAlertChime('success');
      setTimeout(() => setCopyToast(false), 3000);
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Toast Notification */}
      {copyToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 border border-emerald-400 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 size={16} />
          <span className="text-xs font-bold">{t('manifest_copied', 'Route Manifest copied to clipboard!')}</span>
        </div>
      )}

      {/* SOS Alert Modal */}
      {sosActive && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-rose-950 border-2 border-rose-500 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl animate-pulse">
            <div className="w-16 h-16 bg-rose-600 rounded-full flex items-center justify-center mx-auto text-white shadow-[0_0_30px_#f43f5e]">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-black text-white">{t('driver_emergency_sos', 'EMERGENCY SOS BEACON')}</h2>
            <p className="text-xs text-rose-200">
              Broadcasting high-priority distress coordinates over LoRa DTN Mesh and Satellite Uplink to SDRF and BRO Project Vartak.
            </p>
            <div className="text-4xl font-black font-mono text-white">
              {sosCountdown > 0 ? `00:0${sosCountdown}` : t('driver_sos_sent', 'BEACON TRANSMITTED')}
            </div>
            <div className="pt-2">
              <button
                onClick={() => {
                  setSosActive(false);
                  setSosCountdown(5);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-200 font-bold text-xs border border-slate-700 cursor-pointer"
              >
                Cancel / False Alarm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Cockpit HUD Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{t('driver_cockpit_title', 'COCKPIT HUD • ACTIVE DRIVER CONSOLE')}</span>
            </span>
            <span className="text-[10px] font-mono text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              VEHICLE: AS-01-EV-4421
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight">
            Highland Pilot Guidance Console
          </h1>
          <p className="text-xs text-slate-400">
            Assigned Driver: <strong>Tenzing Norbu</strong> • Route: <strong>Guwahati Hub → Tawang District Hospital (NH-13)</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Voice Readout Button */}
          <button
            onClick={handleVoiceReadout}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-colors ${
              isSpeaking
                ? 'bg-blue-600 text-white border-blue-400 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-750 text-cyan-300 border-slate-700'
            }`}
            title="Read out navigational maneuver & telemetry aloud via offline Web Speech"
          >
            <Volume2 size={15} />
            <span>{isSpeaking ? t('voice_speaking', 'Speaking...') : t('voice_assistance', 'Voice Readout')}</span>
          </button>

          {/* Copy Manifest */}
          <button
            onClick={handleCopyManifest}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-colors"
            title="Copy digital dispatch manifest to clipboard"
          >
            <Copy size={14} />
            <span className="hidden sm:inline">{t('export_manifest', 'Copy Manifest')}</span>
          </button>

          <button
            onClick={() => navigate('/live-map')}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl flex items-center space-x-1.5 cursor-pointer transition-all hover:scale-105"
          >
            <Navigation size={14} />
            <span>{t('nav_live_map', 'Tactical Map')}</span>
          </button>

          <button
            onClick={handleTriggerSos}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg shadow-rose-900/40 flex items-center space-x-1.5 cursor-pointer transition-all hover:scale-105"
          >
            <AlertTriangle size={14} />
            <span>{t('driver_emergency_sos', 'SOS BEACON')}</span>
          </button>
        </div>
      </div>

      {/* Main HUD Gauge Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Speedometer */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center shadow-xl flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ground Speed</span>
          <div className="py-2">
            <span className="text-4xl sm:text-5xl font-black font-mono text-emerald-400">{speed}</span>
            <span className="text-xs text-slate-400 block font-bold mt-1">KM / H</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Limit: 40 km/h on curves</span>
        </div>

        {/* Altitude */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center shadow-xl flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Barometric Altitude</span>
          <div className="py-2">
            <span className="text-4xl sm:text-5xl font-black font-mono text-cyan-400">{altitude}</span>
            <span className="text-xs text-slate-400 block font-bold mt-1">METERS (ASL)</span>
          </div>
          <span className="text-[10px] text-cyan-500 font-mono">Ascending (+14° Grade)</span>
        </div>

        {/* Heading & Compass */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center shadow-xl flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Compass Bearing</span>
          <div className="py-2 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full border-2 border-cyan-400 flex items-center justify-center relative mb-1">
              <Compass size={24} className="text-cyan-400 animate-pulse" />
            </div>
            <span className="text-lg font-black font-mono text-white">{heading}° NE</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">True Heading Locked</span>
        </div>

        {/* Cold-Chain Cargo Temp */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center shadow-xl flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vaccine Cargo Vault</span>
          <div className="py-2">
            <span className="text-4xl sm:text-5xl font-black font-mono text-blue-400">{cargoTemp}</span>
            <span className="text-xs text-slate-400 block font-bold mt-1">°C (COLD-CHAIN)</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold flex items-center justify-center space-x-1">
            <CheckCircle2 size={11} />
            <span>Optimal (-2°C to -8°C)</span>
          </span>
        </div>
      </div>

      {/* Next Turn Navigation Card & Refuge Stations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Next Turn Guidance */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Navigation size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Next Maneuver Guidance</h3>
                <p className="text-[11px] text-slate-400">Turn-by-turn highland corridor instructions</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              In 4.2 km
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-2">
            <div className="text-base font-extrabold text-white flex items-center space-x-2">
              <span className="text-xl text-emerald-400 font-bold">↗</span>
              <span>Bear Right at Bhalukpong Forest Checkpost onto NH-13</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Begin high-altitude climb toward Sela Pass. Steep +14° gradient ahead. Switch to 4WD low gear. Expect intermittent mountain fog.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-900 text-[10px] text-slate-400">
              <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-slate-800">
                ⚠️ Hazard Notice: Sela Pass Km 142 Convoy Escort Active
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                Max Speed: 30 km/h
              </span>
            </div>
          </div>

          {/* Vehicle Diagnostics Bar */}
          <div className="grid grid-cols-3 gap-3 text-xs pt-1">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-850">
              <span className="text-[10px] text-slate-400 block font-bold">FUEL LEVEL</span>
              <span className="text-lg font-black font-mono text-white">{fuelPct}% (60.8 L)</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Est. Range: 410 km</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-850">
              <span className="text-[10px] text-slate-400 block font-bold">ENGINE COOLANT</span>
              <span className="text-lg font-black font-mono text-emerald-400">88°C</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Operating Temp OK</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-850">
              <span className="text-[10px] text-slate-400 block font-bold">LORA PACKET MESH</span>
              <span className="text-lg font-black font-mono text-cyan-400">CONNECTED</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">-82 dBm • Ch 1</span>
            </div>
          </div>
        </div>

        {/* Nearest Safe Refuges & Military BRO Shelters */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
            <Shield size={16} className="text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Emergency Refuge Shelters</h3>
              <p className="text-[11px] text-slate-400">BRO transit camps & fuel caches on route</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              { name: 'BRO Camp 142 Bhalukpong', dist: '6.2 km', contact: '+91 94351 00214', facilities: 'Diesel, Mechanic, First Aid', eta: '12 mins' },
              { name: 'Dirang Military Transit Depot', dist: '34.8 km', contact: '+91 94351 88410', facilities: 'Refuge, Cold Storage, Oxygen', eta: '58 mins' },
              { name: 'Sela Tunnel South Portal Shelter', dist: '68.0 km', contact: 'Radio VHF 146.2', facilities: 'Snow Clearing Escort, Radio Relay', eta: '1 hr 45m' },
            ].map((rf) => (
              <div
                key={rf.name}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">{rf.name}</span>
                  <span className="font-mono text-xs text-cyan-400 font-extrabold">{rf.dist}</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Facilities: <strong className="text-slate-300">{rf.facilities}</strong>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                  <span>Comm: <strong className="text-slate-300">{rf.contact}</strong></span>
                  <span className="text-emerald-400 font-mono">ETA: {rf.eta}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
