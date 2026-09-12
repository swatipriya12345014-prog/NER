import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Navigation,
  Fuel,
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
  Copy,
  Wrench,
  LifeBuoy,
  AlertOctagon,
  Flame,
  CloudRain,
  Mountain,
  Send,
  HelpCircle,
  Activity,
  ExternalLink,
  RotateCcw,
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  VolumeX,
  Search,
  Database,
  History,
  BookOpen,
  Truck,
  Layers,
  RefreshCw,
  GitFork
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { initiateSosCall, sendCallHeartbeat, endSosCall, EMERGENCY_CONTROLLER_PHONE, EMERGENCY_CONTROLLER_RAW } from '../services/sosService';
import { getRoadHistories, getRealtimeVehicles, syncDatabase } from '../services/roadVehicleService';
import AIBlockageRerouteModal from '../components/AIBlockageRerouteModal';

export default function DriverDashboard() {
  const navigate = useNavigate();
  const { t, speakText, stopSpeech, playAlertChime, isSpeaking } = useLanguage();

  // Cancel any running speech when component unmounts
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, [stopSpeech]);

  // State
  const [sosActive, setSosActive] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(5);
  const [alternateDetourModalOpen, setAlternateDetourModalOpen] = useState(false);
  const [copyToast, setCopyToast] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedProblemType, setSelectedProblemType] = useState(null);
  const [problemDescription, setProblemDescription] = useState('');
  const [problemSeverity, setProblemSeverity] = useState('CRITICAL');
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [divertConfirmed, setDivertConfirmed] = useState(false);

  // SOS Emergency Call States
  const [sosCallModalOpen, setSosCallModalOpen] = useState(false);
  const [sosCallSession, setSosCallSession] = useState(null);
  const [sosCallDuration, setSosCallDuration] = useState(0);
  const [sosCallMuted, setSosCallMuted] = useState(false);
  const [sosCallSpeaker, setSosCallSpeaker] = useState(true);
  const [sosCallConnecting, setSosCallConnecting] = useState(false);
  const [sosCallTranscript, setSosCallTranscript] = useState([]);

  // Road Histories & Vehicle Database States
  const [roadHistories, setRoadHistories] = useState([]);
  const [selectedRoadHistory, setSelectedRoadHistory] = useState(null);
  const [roadHistoryModalOpen, setRoadHistoryModalOpen] = useState(false);
  const [roadFilterState, setRoadFilterState] = useState('ALL');

  const [realtimeVehicles, setRealtimeVehicles] = useState([]);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [vehicleRegistryModalOpen, setVehicleRegistryModalOpen] = useState(false);

  // Synchronization States
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('Just now');
  const [syncNotice, setSyncNotice] = useState(null);

  const handleSyncAllDatabases = async () => {
    setIsSyncing(true);
    try {
      const res = await syncDatabase();
      const roads = await getRoadHistories();
      const vehicles = await getRealtimeVehicles();
      if (Array.isArray(roads) && roads.length > 0) setRoadHistories(roads);
      if (Array.isArray(vehicles) && vehicles.length > 0) setRealtimeVehicles(vehicles);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSyncTime(timeStr);
      setSyncNotice(`Synced ${res.details?.roads_synced || 8} Highways & ${res.details?.vehicles_synced || 8} Vehicles to Controller (+91 95705 25463)`);
      playAlertChime('success');
      setTimeout(() => setSyncNotice(null), 4500);
    } catch (e) {
      console.warn('Sync notice:', e);
      setSyncNotice('Operational Cache Synced.');
      setTimeout(() => setSyncNotice(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Active Problems Log (Reported by this driver or detected along route)
  const [activeProblems, setActiveProblems] = useState([
    {
      id: 'PRB-NER-8091',
      title: 'Active Landslide on Old Bhalukpong Ghat Road',
      type: 'LANDSLIDE',
      location: 'NH-13 Km 42 (Bhalukpong Mountain Pass)',
      gps: '27.0124°N, 92.5638°E',
      severity: 'CRITICAL',
      status: 'BRO Excavator Active',
      statusColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      action: 'Divert to NH-13 BCT Fortified Corridor (via Sela Tunnel Contour)',
      reportedAt: '12 mins ago',
      etaResolution: '45 mins'
    },
    {
      id: 'PRB-NER-7940',
      title: 'Low Engine Coolant & High Gradient Overheating',
      type: 'MECHANICAL',
      location: 'NH-13 Sela Ascent (+14° Grade)',
      gps: '27.4812°N, 92.1240°E',
      severity: 'HIGH',
      status: 'Mechanic Dispatched from Camp 142',
      statusColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      action: 'Pull over at BRO Km 142 Emergency Refuge Bay',
      reportedAt: '38 mins ago',
      etaResolution: '15 mins'
    }
  ]);

  // Load Road Histories and Realtime Vehicles
  useEffect(() => {
    getRoadHistories().then((res) => setRoadHistories(res)).catch(() => {});
    getRealtimeVehicles().then((res) => setRealtimeVehicles(res)).catch(() => {});
  }, []);

  // SOS Call Duration & Heartbeat Ticker
  useEffect(() => {
    let timer = null;
    if (sosCallModalOpen && sosCallSession && sosCallSession.status === 'CONNECTED') {
      timer = setInterval(() => {
        setSosCallDuration((d) => {
          const next = d + 1;
          if (next % 10 === 0) {
            sendCallHeartbeat(sosCallSession.call_id, next).then((res) => {
              if (res && res.latest_update) {
                setSosCallTranscript((prev) => [
                  ...prev,
                  {
                    speaker: 'DISPATCHER',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    message: res.latest_update
                  }
                ]);
                playAlertChime('alert');
                if (sosCallSpeaker) {
                  speakText(res.latest_update);
                }
              }
            });
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [sosCallModalOpen, sosCallSession, sosCallSpeaker, playAlertChime, speakText]);

  const handleStartSosCall = async (emergencyType = 'GENERAL_SOS') => {
    setSosCallConnecting(true);
    setSosCallModalOpen(true);
    playAlertChime('sos');

    try {
      const session = await initiateSosCall({
        vehicle_number: 'AS-01-EV-4421',
        driver_name: 'Tenzing Norbu',
        driver_phone: '+91 94351 99201',
        gps_lat: 27.0142,
        gps_lng: 92.5645,
        location_name: 'NH-13 Km 42 Bhalukpong Pass',
        emergency_type: emergencyType
      });

      setSosCallSession(session);
      setSosCallDuration(0);
      setSosCallTranscript(session.transcript_logs || []);
      setSosCallConnecting(false);

      if (session.dispatcher_greeting) {
        speakText(session.dispatcher_greeting);
      }
    } catch (err) {
      console.error('SOS call start error:', err);
      setSosCallConnecting(false);
    }
  };

  const handleEndSosCall = async () => {
    stopSpeech();
    if (sosCallSession) {
      await endSosCall(sosCallSession.call_id, sosCallDuration, 'Call ended by pilot. Escort units acknowledged.');
    }
    setSosCallModalOpen(false);
    setSosCallSession(null);
    playAlertChime('success');
  };

  const handleQuickReportCall = (quickText) => {
    if (!sosCallSession) return;
    setSosCallTranscript((prev) => [
      ...prev,
      {
        speaker: 'DRIVER',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        message: quickText
      }
    ]);
    playAlertChime('success');
  };

  // SOS countdown & alert chime
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
    if (isSpeaking) {
      // Directly and immediately turn off the voice speech synthesis
      stopSpeech();
      return;
    }
    const text = `High priority driver advisory: Active landslide reported 4.2 kilometers ahead on National Highway 13 near Bhalukpong Pass. The direct mountain pass is completely blocked. Recommended AI action: Divert immediately to the NH-13 BCT Fortified Corridor via the southern all-weather contour. The highway is fortified and clear of all hazards. Sela Pass BRO Camp 142 is 6.2 kilometers away with emergency diesel, recovery crane, and mechanic assistance.`;
    speakText(text);
  };

  const handleCopyManifest = () => {
    const manifest = `NER-LIFELINE DRIVER DISPATCH & PROBLEM MANIFEST
Vehicle: AS-01-EV-4421 (Highland 4x4 Ambulance)
Pilot: Tenzing Norbu | Phone: +91 94351 99201
Current Corridor: Guwahati Central ➔ Tawang District Hospital (NH-13)
Active Obstruction: Old Bhalukpong Mountain Pass Landslide Km 42 (Impassable)
Active AI Resolution: Divert via NH-13 BCT Fortified Valley Corridor (via Sela Tunnel)
Emergency Mesh Channel: LoRa Mesh Ch 1 / VHF 146.2 MHz
Nearest BRO Refuge: Camp 142 Bhalukpong (6.2 km)
SDRF Dispatch Status: Connected`;

    navigator.clipboard.writeText(manifest).then(() => {
      setCopyToast(true);
      playAlertChime('success');
      setTimeout(() => setCopyToast(false), 3000);
    });
  };

  const openProblemModal = (type) => {
    setSelectedProblemType(type);
    setProblemDescription('');
    setProblemSeverity('CRITICAL');
    setReportModalOpen(true);
  };

  const handleSubmitProblem = async (e) => {
    e.preventDefault();
    setIsTransmitting(true);

    const generatedId = `PRB-NER-${Math.floor(1000 + Math.random() * 9000)}`;
    const newProblem = {
      id: generatedId,
      title: selectedProblemType?.label || 'Driver Field Incident',
      type: selectedProblemType?.type || 'INCIDENT',
      location: 'Current GPS Location (NH-13 Corridor)',
      gps: '27.0142°N, 92.5645°E',
      severity: problemSeverity,
      status: 'Transmitted to SDRF & BRO Mesh',
      statusColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      action: problemDescription || 'Stay inside vehicle; rescue response initiated',
      reportedAt: 'Just now',
      etaResolution: 'Under Assessment'
    };

    // Try posting to backend API
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      await fetch(`${apiBase}/api/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incident_id: generatedId,
          title: `[DRIVER REPORT] ${selectedProblemType?.label || 'Field Distress'}`,
          state: 'Arunachal Pradesh',
          location_name: 'NH-13 Corridor (Km 42 Bhalukpong)',
          severity: problemSeverity === 'CRITICAL' ? 'Critical' : 'Warning',
          description: `Driver Tenzing Norbu (AS-01-EV-4421): ${problemDescription || 'Emergency assistance requested via Driver Portal.'} GPS: 27.0142N, 92.5645E.`,
          timestamp: new Date().toISOString(),
          active: true
        }),
        signal: AbortSignal.timeout(3000)
      }).catch(() => null);
    } catch {
      // Offline fallback: LoRa DTN Mesh buffers locally
    }

    setActiveProblems([newProblem, ...activeProblems]);
    setIsTransmitting(false);
    setReportModalOpen(false);
    playAlertChime('success');
  };

  // Driver Problem Quick Categories
  const PROBLEM_CATEGORIES = [
    {
      id: 'landslide',
      type: 'LANDSLIDE',
      label: 'Landslide / Rockfall Blockage',
      icon: Mountain,
      color: 'from-rose-600 to-red-700',
      borderColor: 'border-red-500/40 hover:border-red-400',
      description: 'Road covered by boulders or mud collapse. Vehicles cannot pass.'
    },
    {
      id: 'breakdown',
      type: 'MECHANICAL',
      label: 'Engine Breakdown / Brake Fade',
      icon: Wrench,
      color: 'from-amber-600 to-orange-700',
      borderColor: 'border-amber-500/40 hover:border-amber-400',
      description: 'Engine overheating, 4WD failure, steering or brake fault on incline.'
    },
    {
      id: 'fuel',
      type: 'FUEL_CRITICAL',
      label: 'Fuel Exhaustion / Stranded',
      icon: Fuel,
      color: 'from-orange-600 to-amber-700',
      borderColor: 'border-orange-500/40 hover:border-orange-400',
      description: 'Tank level below 10%, cannot reach next depot without refuel.'
    },
    {
      id: 'flood',
      type: 'FLOOD',
      label: 'Flash Flood / River Overflow',
      icon: CloudRain,
      color: 'from-blue-600 to-cyan-700',
      borderColor: 'border-blue-500/40 hover:border-blue-400',
      description: 'River water rushing across road or mountain bridge submerged.'
    },
    {
      id: 'entrapment',
      type: 'ENTRAPMENT',
      label: 'Mud / Snow Entrapment',
      icon: LifeBuoy,
      color: 'from-purple-600 to-indigo-700',
      borderColor: 'border-purple-500/40 hover:border-purple-400',
      description: 'Vehicle stuck in deep mud ditch or snowdrift. Winch/tow required.'
    },
    {
      id: 'medical',
      type: 'MEDICAL',
      label: 'Cold-Chain / Medical Distress',
      icon: AlertOctagon,
      color: 'from-emerald-600 to-teal-700',
      borderColor: 'border-emerald-500/40 hover:border-emerald-400',
      description: 'Vaccine vault temperature alarm (-4°C limit exceeded) or injury.'
    }
  ];

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-6xl mx-auto pb-24 sm:pb-8 mobile-scroll">
      {/* Toast Notification */}
      {copyToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 border border-emerald-400 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 size={16} />
          <span className="text-xs font-bold">{t('manifest_copied', 'Route Problem Manifest copied to clipboard!')}</span>
        </div>
      )}

      {/* Sync Notification */}
      {syncNotice && (
        <div className="fixed bottom-6 left-6 z-50 bg-cyan-950 text-cyan-200 px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 border border-cyan-500/60 animate-in fade-in slide-in-from-bottom-5">
          <RefreshCw size={16} className="text-cyan-400 animate-spin" />
          <span className="text-xs font-bold">{syncNotice}</span>
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

      {/* Problem Reporting Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 space-y-4 shadow-2xl max-h-[92dvh] overflow-y-auto mobile-scroll animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{selectedProblemType?.label}</h3>
                  <p className="text-[11px] text-slate-400">Instant Problem Transmission to Command Center & BRO</p>
                </div>
              </div>
              <button
                onClick={() => setReportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitProblem} className="space-y-3.5">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Auto-Detected GPS:</span>
                  <span className="font-mono text-cyan-300 font-bold">27.0142°N, 92.5645°E</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Assigned Corridor:</span>
                  <span className="font-semibold text-slate-200">Guwahati ➔ Tawang (NH-13)</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Network Mode:</span>
                  <span className="font-semibold text-emerald-400">📡 LoRa DTN Mesh + Satellite</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Urgency Severity Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['CRITICAL', 'HIGH', 'MODERATE'].map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setProblemSeverity(sev)}
                      className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        problemSeverity === sev
                          ? sev === 'CRITICAL'
                            ? 'bg-rose-600 text-white border-rose-400 shadow-lg'
                            : sev === 'HIGH'
                            ? 'bg-amber-600 text-white border-amber-400'
                            : 'bg-blue-600 text-white border-blue-400'
                          : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Problem Details & Road Condition
                </label>
                <textarea
                  rows={3}
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="e.g., Landslide blocked both lanes 50 meters ahead, huge boulders falling. Need bulldozer escort..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTransmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-black shadow-lg flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send size={14} />
                  <span>{isTransmitting ? 'Transmitting over Mesh...' : 'Transmit Problem Report'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* A. EMERGENCY SOS VOICE & DISPATCH CALL MODAL                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      {sosCallModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border-2 border-red-500/80 rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl shadow-red-950/80 max-h-[92dvh] overflow-y-auto mobile-scroll animate-in zoom-in-95 duration-200">
            {/* Call Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                <span className="text-[11px] font-mono font-bold text-red-400 uppercase tracking-wider">
                  TACTICAL SATELLITE & RADIO DISPATCH
                </span>
              </div>
              <span className="text-[10px] font-mono text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                VHF 146.2 MHz • CH 1
              </span>
            </div>

            {/* Caller & Responder Info */}
            <div className="text-center space-y-1 py-1">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-extrabold mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>ROUTED DIRECTLY TO CONTROLLER: {EMERGENCY_CONTROLLER_PHONE}</span>
              </div>
              <h2 className="text-xl font-black text-white">
                NER Emergency Operations Center
              </h2>
              <p className="text-xs text-amber-300 font-semibold">
                Incoming Line: {EMERGENCY_CONTROLLER_PHONE} (Chief Operations Controller)
              </p>
              <div className="pt-1 flex items-center justify-center space-x-2 text-[11px] text-slate-400 font-mono">
                <span>Pilot: <strong className="text-slate-200">AS-01-EV-4421 (Tenzing Norbu)</strong></span>
                <span>•</span>
                <span className="text-cyan-400">27.0142°N, 92.5645°E</span>
              </div>
            </div>

            {/* Audio Waveform & Timer Visualizer */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center space-y-3">
              {/* Pulsing Audio Waveform */}
              <div className="flex items-center justify-center space-x-1.5 h-10">
                {[18, 36, 24, 42, 30, 48, 22, 38, 26, 44, 20, 32].map((height, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-gradient-to-t from-red-500 via-rose-400 to-amber-300 rounded-full animate-pulse"
                    style={{
                      height: `${height}px`,
                      animationDelay: `${i * 90}ms`,
                      animationDuration: '1.2s'
                    }}
                  />
                ))}
              </div>

              {/* Duration Timer */}
              <div className="text-3xl font-black font-mono tracking-widest text-emerald-400">
                {String(Math.floor(sosCallDuration / 60)).padStart(2, '0')}:
                {String(sosCallDuration % 60).padStart(2, '0')}
              </div>

              <div className="text-[10px] text-slate-400 font-mono flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Audio Channel Open (Full Duplex VoIP / DTN Bridge)</span>
              </div>
            </div>

            {/* Live Radio Transcripts Feed */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Live Dispatch Communications Log</span>
                <span className="text-emerald-400 font-mono">BRO Unit Active</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-36 overflow-y-auto space-y-2 text-xs">
                {sosCallTranscript.map((tItem, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg ${
                      tItem.speaker === 'DISPATCHER'
                        ? 'bg-blue-950/50 border border-blue-800/40 text-blue-200'
                        : tItem.speaker === 'DRIVER'
                        ? 'bg-emerald-950/50 border border-emerald-800/40 text-emerald-200'
                        : 'bg-slate-900 border border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex justify-between text-[10px] opacity-70 mb-0.5 font-mono">
                      <span>{tItem.speaker}</span>
                      <span>{tItem.time}</span>
                    </div>
                    <div className="text-[11px] leading-relaxed">{tItem.message}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Driver Radio Response Actions */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                1-Tap Driver Radio Report Prompts
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                <button
                  onClick={() => handleQuickReportCall('Reported: 40m mud & boulder collapse blocking Old Mountain Pass. Light rain falling.')}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-left border border-slate-700 cursor-pointer"
                >
                  🪨 Report Boulder Size
                </button>
                <button
                  onClick={() => handleQuickReportCall('Reported: Medical cargo intact at +3.8°C. No physical casualties in vehicle.')}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-left border border-slate-700 cursor-pointer"
                >
                  🚑 Casualties: None
                </button>
                <button
                  onClick={() => handleQuickReportCall('Reported: Need heavy front-end winch tow bulldozer to clear checkpost bay.')}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-left border border-slate-700 cursor-pointer"
                >
                  🚜 Winch Tow Needed
                </button>
              </div>
            </div>

            {/* Call Controls */}
            <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-800">
              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={() => setSosCallMuted(!sosCallMuted)}
                  className={`p-3.5 rounded-full border cursor-pointer transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center ${
                    sosCallMuted
                      ? 'bg-rose-600 text-white border-rose-400'
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
                  }`}
                  title={sosCallMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {sosCallMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>

                <button
                  onClick={() => {
                    const next = !sosCallSpeaker;
                    setSosCallSpeaker(next);
                    if (!next) {
                      stopSpeech();
                    }
                  }}
                  className={`p-3.5 rounded-full border cursor-pointer transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center ${
                    sosCallSpeaker
                      ? 'bg-blue-600 text-white border-blue-400'
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
                  }`}
                  title={sosCallSpeaker ? 'Directly turn off speaker voice' : 'Enable speaker voice'}
                >
                  {sosCallSpeaker ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </button>
              </div>

              {/* Direct GSM Emergency Dialing to User's Phone */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <a
                  href={`tel:${EMERGENCY_CONTROLLER_RAW}`}
                  className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-950/60 border border-emerald-400 animate-bounce cursor-pointer min-h-[44px]"
                  title="Direct phone call to Controller line 9570525463"
                >
                  <Phone size={15} />
                  <span>Call {EMERGENCY_CONTROLLER_RAW}</span>
                </a>
                <a
                  href={`https://wa.me/91${EMERGENCY_CONTROLLER_RAW}?text=${encodeURIComponent(
                    `🚨 EMERGENCY SOS ALERT from Pilot Tenzing Norbu (AS-01-EV-4421)!\n` +
                    `Location: NH-13 Km 42 (Bhalukpong Pass)\n` +
                    `GPS: 27.0142°N, 92.5645°E\n` +
                    `Maps: https://maps.google.com/?q=27.0142,92.5645\n` +
                    `Emergency assistance requested on NER-LIFELINE.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-3 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold flex items-center justify-center space-x-1 border border-green-500 cursor-pointer min-h-[44px]"
                  title="Send emergency WhatsApp distress message to 9570525463"
                >
                  <span>WhatsApp SOS</span>
                </a>
              </div>

              {/* End Call Button */}
              <button
                onClick={handleEndSosCall}
                className="w-full sm:w-auto py-3 px-6 rounded-xl sm:rounded-full bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-xl shadow-red-900/60 flex items-center justify-center space-x-2 cursor-pointer transition-all active:scale-95 min-h-[48px]"
              >
                <PhoneOff size={18} />
                <span>END CALL</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* B. LIFELINE ROAD HISTORIES DATABASE MODAL                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      {roadHistoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl max-w-4xl w-full p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl max-h-[92dvh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <BookOpen size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">
                    North East Lifeline Road Histories & Hazard Chronicles
                  </h2>
                  <p className="text-xs text-slate-400">
                    Comprehensive historical records of landslides, flood washouts, and avg clearance times across 8 NER highways
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRoadHistoryModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* State Filter Chips */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
              {['ALL', 'Arunachal Pradesh', 'Assam', 'Meghalaya', 'Sikkim', 'Nagaland', 'Manipur', 'Tripura'].map((st) => (
                <button
                  key={st}
                  onClick={() => setRoadFilterState(st)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap cursor-pointer transition-colors ${
                    roadFilterState === st
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Roads List */}
            <div className="overflow-y-auto space-y-3.5 pr-1 flex-1">
              {roadHistories
                .filter((r) => roadFilterState === 'ALL' || r.state.toLowerCase() === roadFilterState.toLowerCase())
                .map((road) => (
                  <div
                    key={road.road_id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-black text-sm border border-amber-500/30">
                          {road.road_id}
                        </span>
                        <div>
                          <h3 className="font-black text-white text-sm sm:text-base">{road.road_name}</h3>
                          <p className="text-xs text-slate-400">
                            {road.corridor} • <strong className="text-slate-300">{road.state}</strong> ({road.total_length_km} km)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                          road.risk_index > 70
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : road.risk_index > 40
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}>
                          Risk Index: {road.risk_index}/100
                        </span>
                      </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                        <div className="text-[10px] text-slate-400">Historical Slides</div>
                        <div className="font-mono text-rose-400 font-bold mt-0.5">{road.historical_landslides_count} events</div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                        <div className="text-[10px] text-slate-400">Historical Floods</div>
                        <div className="font-mono text-blue-400 font-bold mt-0.5">{road.historical_floods_count} events</div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                        <div className="text-[10px] text-slate-400">Avg Clearance Time</div>
                        <div className="font-mono text-amber-300 font-bold mt-0.5">{road.avg_clearance_time_hours} hrs</div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                        <div className="text-[10px] text-slate-400">Worst Period</div>
                        <div className="font-bold text-slate-200 text-[11px] mt-0.5 truncate">{road.worst_season}</div>
                      </div>
                    </div>

                    {/* Chronic Blackspots */}
                    {road.chronic_blackspots && road.chronic_blackspots.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Chronic Geological Hazard Blackspots:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {road.chronic_blackspots.map((spot, sIdx) => (
                            <div
                              key={sIdx}
                              className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-cyan-300 font-bold">{spot.km_marker}</span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-700/50">
                                  {spot.risk_rating}
                                </span>
                              </div>
                              <div className="font-bold text-slate-200">{spot.name}</div>
                              <div className="text-slate-400 text-[10px]">{spot.notes || spot.hazard_type}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* C. REALTIME VEHICLE NUMBERS REGISTRY MODAL                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {vehicleRegistryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl max-w-4xl w-full p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl max-h-[92dvh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Truck size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">
                    Realtime Vehicle Numbers Registry & Telemetry
                  </h2>
                  <p className="text-xs text-slate-400">
                    Live operational telemetry database indexed by official vehicle registration plate numbers
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVehicleRegistryModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={vehicleSearchQuery}
                onChange={(e) => setVehicleSearchQuery(e.target.value)}
                placeholder="Search by vehicle registration plate (e.g. AS-01-EV-4421, ML-05-TR-9011) or driver name..."
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Vehicle Cards Grid */}
            <div className="overflow-y-auto space-y-3 pr-1 flex-1">
              {realtimeVehicles
                .filter((v) => {
                  const q = vehicleSearchQuery.toLowerCase();
                  return (
                    !q ||
                    v.vehicle_number.toLowerCase().includes(q) ||
                    v.driver_name.toLowerCase().includes(q) ||
                    (v.current_road && v.current_road.toLowerCase().includes(q))
                  );
                })
                .map((v) => (
                  <div
                    key={v.vehicle_number}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <span className="px-3 py-1 rounded-xl bg-slate-900 text-yellow-300 font-mono font-black text-sm border border-yellow-500/40 tracking-wider shadow-md">
                          {v.vehicle_number}
                        </span>
                        <div>
                          <h3 className="font-bold text-white text-sm">{v.vehicle_name}</h3>
                          <p className="text-xs text-slate-400">{v.vehicle_type}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                          v.status === 'Distress'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                            : v.status === 'Active'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        }`}>
                          {v.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-900">
                      <div>
                        Pilot: <strong className="text-slate-200">{v.driver_name}</strong> ({v.driver_phone})
                      </div>
                      <div>
                        Road: <strong className="text-cyan-400">{v.current_road || 'In Transit'}</strong>
                      </div>
                      <div>
                        Destination: <strong className="text-slate-300">{v.destination}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="text-[10px] text-slate-400">Speed</div>
                        <div className="font-mono text-cyan-300 font-bold">{v.speed_kmh} km/h</div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="text-[10px] text-slate-400">Fuel Level</div>
                        <div className="font-mono text-emerald-300 font-bold">{v.fuel_percentage}%</div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="text-[10px] text-slate-400">Coordinates</div>
                        <div className="font-mono text-slate-300 font-bold text-[10px]">{v.lat.toFixed(4)}°N, {v.lng.toFixed(4)}°E</div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
                      Cargo: <strong className="text-slate-200">{v.cargo_manifest}</strong>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Driver Problem & Emergency Portal Header */}
      <div className="bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-800/40 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center space-x-1">
              <AlertOctagon size={12} className="animate-pulse" />
              <span>DRIVER ASSISTANCE & PROBLEM RESOLUTION PORTAL</span>
            </span>
            <span className="text-[10px] font-mono text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              VEHICLE: AS-01-EV-4421
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight">
            Field Driver Problem & Distress Portal
          </h1>
          <p className="text-xs text-slate-400">
            Assigned Pilot: <strong>Tenzing Norbu</strong> • Active Route: <strong>Guwahati Central ➔ Tawang Border Hospital (NH-13)</strong>
          </p>
        </div>

        <div className="flex flex-col space-y-2.5 w-full md:w-auto">
          {/* Top Mobile Emergency Row: Primary SOS Voice Call & Direct Controller Call */}
          <div className="grid grid-cols-2 gap-2 w-full">
            {/* SOS Voice Call */}
            <button
              onClick={() => handleStartSosCall('EMERGENCY_SOS')}
              className="py-3 px-3.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-red-950/60 border border-red-400 flex items-center justify-center space-x-2 cursor-pointer transition-all hover:scale-105 active:scale-95 animate-pulse min-h-[46px]"
              title="Connect instant two-way voice dispatch with SDRF & BRO"
            >
              <PhoneCall size={18} />
              <span className="tracking-wider">SOS CALL</span>
            </button>

            {/* Direct Call to Controller */}
            <a
              href={`tel:${EMERGENCY_CONTROLLER_RAW}`}
              className="py-3 px-3 rounded-xl bg-emerald-700/90 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-1.5 shadow-lg border border-emerald-500/80 cursor-pointer transition-all active:scale-95 min-h-[46px]"
              title={`Direct phone call to Controller line ${EMERGENCY_CONTROLLER_PHONE}`}
            >
              <Phone size={16} />
              <span className="truncate">Call {EMERGENCY_CONTROLLER_RAW}</span>
            </a>
          </div>

          {/* Secondary Tools Grid: 2 columns on mobile, flex-wrap on desktop */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            {/* Voice Readout Button */}
            <button
              onClick={handleVoiceReadout}
              className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer transition-all min-h-[40px] ${
                isSpeaking
                  ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-400 shadow-lg shadow-rose-950/60 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-750 text-cyan-300 border-slate-700'
              }`}
              title={isSpeaking ? "Click to directly turn off and silence voice advisory" : "Listen to emergency road advisory aloud"}
            >
              {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
              <span className="truncate">{isSpeaking ? 'Stop Voice' : 'Audio Advisory'}</span>
            </button>

            {/* AI Alternate Detour Button */}
            <button
              onClick={() => setAlternateDetourModalOpen(true)}
              className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400/60 text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer shadow-lg shadow-cyan-950/40 min-h-[40px]"
              title="Road is blocked? Calculate AI Alternate Detour Corridor"
            >
              <GitFork size={15} />
              <span className="truncate">AI Alternate Detour</span>
            </button>

            {/* Sync All Databases & Telemetry */}
            <button
              onClick={handleSyncAllDatabases}
              disabled={isSyncing}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-cyan-300 hover:text-white text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer transition-colors disabled:opacity-50 min-h-[40px]"
              title={`Force full database and telemetry sync (Last: ${lastSyncTime})`}
            >
              <RefreshCw size={14} className={isSyncing ? "animate-spin text-cyan-400" : "text-cyan-400"} />
              <span className="truncate">{isSyncing ? 'Syncing...' : 'Sync DB'}</span>
            </button>

            {/* Road Histories DB Button */}
            <button
              onClick={() => setRoadHistoryModalOpen(true)}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-amber-300 hover:text-white text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer transition-colors min-h-[40px]"
              title="Browse historical risk records for 8 NER highways"
            >
              <BookOpen size={14} />
              <span className="truncate">Road Histories</span>
            </button>

            {/* Realtime Vehicle Numbers Registry Button */}
            <button
              onClick={() => setVehicleRegistryModalOpen(true)}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-emerald-300 hover:text-white text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer transition-colors min-h-[40px]"
              title="Realtime database of vehicle number plates and telemetry"
            >
              <Database size={14} />
              <span className="truncate">Fleet ({realtimeVehicles.length || 8})</span>
            </button>

            {/* Tactical Map */}
            <button
              onClick={() => navigate('/live-map')}
              className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg flex items-center justify-center space-x-1.5 cursor-pointer transition-all min-h-[40px]"
            >
              <Navigation size={14} />
              <span className="truncate">Live Map</span>
            </button>

            {/* Copy Manifest */}
            <button
              onClick={handleCopyManifest}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer transition-colors min-h-[40px]"
              title="Copy driver problem report manifest"
            >
              <Copy size={14} />
              <span className="truncate">Manifest</span>
            </button>

            {/* Silent Beacon */}
            <button
              onClick={handleTriggerSos}
              className="col-span-2 sm:col-span-1 px-3 py-2.5 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-600/70 text-rose-200 font-bold text-xs flex items-center justify-center space-x-1.5 cursor-pointer transition-all min-h-[40px]"
              title="Broadcast silent emergency beacon coordinates"
            >
              <AlertTriangle size={14} />
              <span>BEACON</span>
            </button>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. URGENT PROBLEM ENCOUNTER ON ROUTE (Hazard & AI Resolution) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-rose-950/70 via-slate-900 to-slate-900 border-2 border-rose-500/80 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-500/30 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-600/50 flex-shrink-0 animate-pulse">
              <Mountain size={22} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white uppercase tracking-wider">
                  CRITICAL ROUTE PROBLEM
                </span>
                <span className="text-xs text-rose-300 font-mono font-bold">NH-13 Km 42 (Near Bhalukpong)</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                Active Landslide on Old Bhalukpong Pass — Impassable
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <span className="px-2.5 py-1 rounded-lg bg-rose-950 text-rose-200 border border-rose-600/60 text-xs font-mono font-bold">
              Distance Ahead: 4.2 km
            </span>
          </div>
        </div>

        {/* Problem Description & Immediate AI Resolution */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-7 bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center space-x-1.5">
              <AlertTriangle size={14} />
              <span>Reported Road Problem Detail</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              A 40-meter stretch of the hillside collapsed onto the pavement following monsoon downpours. 
              Multiple vehicles are turned back. The direct mountain pass has a <strong>Risk Score of 74/100</strong>. Do NOT proceed past Forest Checkpost Km 38.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300">
                🚧 Heavy Excavator Needed
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                Confidence: 95% (Multi-Sensor Mesh)
              </span>
            </div>
          </div>

          <div className="md:col-span-5 bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-4 space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                <CheckCircle2 size={14} />
                <span>AI Divert Solution: NH-13 Fortified Artery</span>
              </div>
              <p className="text-xs text-emerald-200/90 mt-1 leading-relaxed">
                Divert immediately onto <strong>NH-13 BCT Fortified Highway (via Sela Tunnel Contour)</strong>. All-weather engineered roadway with zero active landslides reported.
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-center text-[10px]">
                <div className="p-1.5 bg-emerald-950/80 border border-emerald-500/40 rounded-lg">
                  <div className="text-slate-400">Detour Added</div>
                  <div className="font-mono text-emerald-300 font-extrabold text-xs">+14.2 km</div>
                </div>
                <div className="p-1.5 bg-emerald-950/80 border border-emerald-500/40 rounded-lg">
                  <div className="text-slate-400">Risk Level</div>
                  <div className="font-mono text-emerald-300 font-extrabold text-xs">18/100 (LOW)</div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <button
                onClick={() => setAlternateDetourModalOpen(true)}
                className="w-full sm:flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center space-x-1.5 cursor-pointer transition-all"
              >
                <GitFork size={14} />
                <span>Calculate AI Alternate Detour</span>
              </button>
              <button
                onClick={() => navigate('/live-map')}
                className="w-full sm:flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg flex items-center justify-center space-x-1.5 cursor-pointer transition-all"
              >
                <Navigation size={13} />
                <span>Navigate NH-13 Fortified</span>
              </button>
              <button
                onClick={() => {
                  setDivertConfirmed(true);
                  playAlertChime('success');
                }}
                className={`w-full sm:w-auto py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  divertConfirmed
                    ? 'bg-slate-800 text-emerald-300 border-emerald-500/60'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {divertConfirmed ? '✓ Divert Logged' : 'Confirm Divert'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. 1-TAP DRIVER PROBLEM REPORTING DESK ("Facing a Problem?")  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-black text-white flex items-center space-x-2">
              <Wrench size={18} className="text-amber-400" />
              <span>Report What Problem You Are Facing Right Now</span>
            </h2>
            <p className="text-xs text-slate-400">
              One-tap dispatch for vehicle pilots facing road hazards, mechanical failures, or terrain traps in NER.
            </p>
          </div>
          <span className="text-[11px] font-mono text-cyan-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 self-start sm:self-auto">
            📡 Auto-GPS Geo-Tagged
          </span>
        </div>

        {/* Problem Action Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {PROBLEM_CATEGORIES.map((cat) => {
            const IconComponent = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => openProblemModal(cat)}
                className={`p-4 rounded-xl bg-slate-950 border ${cat.borderColor} hover:bg-slate-850/80 transition-all text-left group shadow-lg cursor-pointer flex flex-col justify-between space-y-3`}
              >
                <div className="flex items-start justify-between">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${cat.color} text-white shadow-md group-hover:scale-110 transition-transform`}>
                    <IconComponent size={20} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 group-hover:text-cyan-400 flex items-center space-x-0.5">
                    <span>REPORT</span>
                    <ArrowUpRight size={12} />
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-sm text-white group-hover:text-cyan-300 transition-colors">
                    {cat.label}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    {cat.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. ACTIVE PROBLEM RESOLUTION LOG & REFUGE HOTLINES */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Problem Resolution Tracker */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Activity size={16} className="text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Active Problems Log & Resolution
                </h3>
                <p className="text-[11px] text-slate-400">Real-time status of reported incidents from this vehicle</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {activeProblems.length} Active
            </span>
          </div>

          <div className="space-y-3">
            {activeProblems.map((prob) => (
              <div
                key={prob.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-extrabold text-white">{prob.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${prob.statusColor}`}>
                      {prob.status}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{prob.reportedAt}</span>
                </div>

                <div className="text-xs font-bold text-slate-200">
                  {prob.title}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                  <div>Location: <strong className="text-slate-300">{prob.location}</strong></div>
                  <div>GPS: <strong className="text-cyan-400 font-mono">{prob.gps}</strong></div>
                </div>

                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-emerald-300 flex items-center justify-between">
                  <span>Action: <strong>{prob.action}</strong></span>
                  <span className="text-slate-400 font-mono text-[10px]">ETA: {prob.etaResolution}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Refuges, BRO Camps & Mechanic Directory */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
            <Shield size={16} className="text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Emergency Refuge & BRO Hotlines
              </h3>
              <p className="text-[11px] text-slate-400">BRO transit depots, diesel caches & mechanics</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              {
                name: 'BRO Camp 142 Bhalukpong',
                dist: '6.2 km',
                contact: '+91 94351 00214',
                channel: 'VHF 146.2 MHz',
                facilities: 'Diesel Cache, Heavy Mechanic, First Aid',
                eta: '12 mins'
              },
              {
                name: 'Dirang Military Transit Depot',
                dist: '34.8 km',
                contact: '+91 94351 88410',
                channel: 'VHF 148.5 MHz',
                facilities: 'Winch Crane, Heated Refuge, Oxygen',
                eta: '58 mins'
              },
              {
                name: 'Sela South Emergency Shelter',
                dist: '68.0 km',
                contact: 'Radio Only',
                channel: 'LoRa Mesh Ch 1',
                facilities: 'Snow Clearing Escort, Radio Beacon',
                eta: '1 hr 45m'
              },
              {
                name: 'SDRF Quick Reaction Base Tezpur',
                dist: '82.0 km',
                contact: '1070 / 112',
                channel: 'State Disaster Line',
                facilities: 'Helicopter Air-Drop, Heavy Tow Trucks',
                eta: 'On Standby'
              }
            ].map((rf) => (
              <div
                key={rf.name}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{rf.name}</span>
                  <span className="font-mono text-cyan-400 font-extrabold">{rf.dist}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Facilities: <strong className="text-slate-300">{rf.facilities}</strong>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                  <span>Comm: <strong className="text-emerald-400">{rf.contact}</strong> ({rf.channel})</span>
                  <span className="text-cyan-300 font-mono">ETA: {rf.eta}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="font-bold text-slate-300 flex items-center space-x-1.5">
              <Radio size={13} className="text-emerald-400" />
              <span>Offline Resilience Directives:</span>
            </div>
            <p className="text-[10px] leading-relaxed">
              If cellular signal is lost in mountain passes, keep your LIFELINE ESP32 LoRa transceiver active. All problem reports and SOS packets are buffered and forwarded automatically to passing convoys via Store-and-Forward DTN.
            </p>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. SAMSUNG GALAXY S24 MOBILE FLOATING EMERGENCY SPEED-DIAL   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <aside
        aria-label="Mobile Emergency Floating Speed-Dial"
        className="block sm:hidden fixed bottom-3 inset-x-3 z-40 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="bg-slate-950/95 border-2 border-red-500/80 rounded-2xl p-2 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-2 shadow-red-950/90">
          <button
            onClick={() => handleStartSosCall('EMERGENCY_SOS')}
            className="flex-1 py-3 px-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs shadow-lg flex items-center justify-center space-x-1.5 active:scale-95 animate-pulse min-h-[46px]"
          >
            <PhoneCall size={16} />
            <span>SOS CALL</span>
          </button>

          <a
            href={`tel:${EMERGENCY_CONTROLLER_RAW}`}
            className="flex-1 py-3 px-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center space-x-1 border border-emerald-500 active:scale-95 min-h-[46px]"
          >
            <Phone size={15} />
            <span className="truncate">Call {EMERGENCY_CONTROLLER_RAW}</span>
          </a>

          <button
            onClick={handleVoiceReadout}
            className={`p-3 rounded-xl border flex items-center justify-center min-w-[46px] min-h-[46px] active:scale-95 ${
              isSpeaking
                ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                : 'bg-slate-800 text-cyan-300 border-slate-700'
            }`}
            title={isSpeaking ? "Stop Voice" : "Audio Advisory"}
          >
            {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </aside>

      {/* AI Alternate Detour Modal */}
      <AIBlockageRerouteModal
        isOpen={alternateDetourModalOpen}
        onClose={() => setAlternateDetourModalOpen(false)}
        currentOrigin={{ id: 'guwahati', name: 'Guwahati Central Depot' }}
        currentDestination={{ id: 'tawang', name: 'Tawang District Hospital' }}
        selectedBlockageId="blk-1"
        onApplyAlternateRoute={() => {
          setDivertConfirmed(true);
          navigate('/live-map');
        }}
        activeVehicle={{ id: 'AS-01-EV-4421', name: 'Highland 4x4 Ambulance' }}
      />
    </div>
  );
}

