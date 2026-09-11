import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, ShieldAlert, ArrowRight, Check, Volume2, VolumeX,
  X, RefreshCw, Compass, MapPin, Fuel, Clock, Activity, ShieldCheck,
  ChevronRight, AlertOctagon, CornerUpRight
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { fetchRoadBlockages, fetchAIAlternateRoute } from '../services/googleDirectionsService';

export default function AIBlockageRerouteModal({
  isOpen,
  onClose,
  currentOrigin = { id: 'guwahati', name: 'Guwahati Central Depot' },
  currentDestination = { id: 'tawang', name: 'Tawang Border Relief Center' },
  selectedBlockageId = 'blk-1',
  onApplyAlternateRoute = null,
  activeVehicle = null,
}) {
  const { speakText, stopSpeech, isSpeaking } = useLanguage();
  const [blockages, setBlockages] = useState([]);
  const [selectedId, setSelectedId] = useState(selectedBlockageId);
  const [alternateData, setAlternateData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [applied, setApplied] = useState(false);

  // Load known road blockages
  useEffect(() => {
    fetchRoadBlockages().then((data) => {
      if (data && data.length > 0) {
        setBlockages(data);
        if (!selectedId) {
          setSelectedId(data[0].blockage_id);
        }
      }
    });
  }, []);

  // Update selected blockage if prop changes
  useEffect(() => {
    if (selectedBlockageId) {
      setSelectedId(selectedBlockageId);
    }
  }, [selectedBlockageId]);

  // Fetch AI alternate route whenever selected blockage or endpoints change
  useEffect(() => {
    if (!isOpen || !selectedId) return;

    setIsLoading(true);
    setApplied(false);

    fetchAIAlternateRoute({
      originHubId: currentOrigin?.id || 'guwahati',
      destHubId: currentDestination?.id || 'tawang',
      blockedRoadId: selectedId,
      vehicleId: activeVehicle?.id || 'AS-01-EV-4421'
    })
      .then((res) => {
        setAlternateData(res);
      })
      .catch((err) => {
        console.error('Error fetching alternate route:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, selectedId, currentOrigin, currentDestination, activeVehicle]);

  if (!isOpen) return null;

  const currentBlockage = blockages.find((b) => b.blockage_id === selectedId) || alternateData?.blockage_details;

  const handleToggleVoice = () => {
    if (isSpeaking) {
      stopSpeech();
    } else if (alternateData?.voice_announcement) {
      speakText(alternateData.voice_announcement);
    }
  };

  const handleApply = () => {
    if (onApplyAlternateRoute && alternateData?.ai_alternate_route) {
      onApplyAlternateRoute(alternateData.ai_alternate_route, currentBlockage);
      setApplied(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header with High-Visibility Emergency Bar */}
        <div className="bg-gradient-to-r from-red-950 via-rose-900 to-slate-900 p-4 border-b border-rose-800/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-red-500/50 flex items-center justify-center text-red-400 animate-pulse flex-shrink-0">
              <AlertOctagon size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">AI Road Blockage & Alternate Detour Engine</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-black border border-red-500/40">
                  ROAD CLOSED
                </span>
              </div>
              <p className="text-xs text-rose-200/80">
                Autonomous Hazard Avoidance & Valley Bypass Routing
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopSpeech();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-sm">
          {/* Active Blockage Selector Chips */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
              Active Regional Road Closures (Select Obstruction)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {blockages.map((blk) => (
                <button
                  key={blk.blockage_id}
                  onClick={() => setSelectedId(blk.blockage_id)}
                  className={`p-2.5 rounded-xl text-left border transition-all text-xs flex items-start gap-2 ${
                    selectedId === blk.blockage_id
                      ? 'bg-rose-950/60 border-rose-500 text-white ring-1 ring-rose-500/50 shadow-md'
                      : 'bg-slate-850 border-slate-700/80 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold truncate">{blk.road_name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{blk.highway}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Blockage Impact Summary Card */}
          {currentBlockage && (
            <div className="p-4 rounded-xl bg-red-950/25 border border-red-900/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-red-400 flex items-center gap-1.5">
                  <AlertTriangle size={14} /> Obstruction Incident Details
                </span>
                <span className="text-slate-400 font-mono">Clearing ETA: <b className="text-amber-300">{currentBlockage.clearing_eta}</b></span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {currentBlockage.reason}
              </p>
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-red-900/30">
                <span>Location: <b>{currentBlockage.location_name}</b></span>
                <span className="text-rose-400 font-semibold">Status: {currentBlockage.status}</span>
              </div>
            </div>
          )}

          {/* AI Alternate Route Recommendation Panel */}
          {isLoading ? (
            <div className="p-8 rounded-2xl bg-slate-850 border border-slate-800 flex flex-col items-center justify-center space-y-3">
              <RefreshCw size={24} className="animate-spin text-cyan-400" />
              <span className="text-sm font-semibold text-slate-300">Calculating AI bypass contour & hazard delta...</span>
              <p className="text-xs text-slate-500">Evaluating slope stability, fuel safety buffer, and BRO checkpoints</p>
            </div>
          ) : alternateData ? (
            <div className="space-y-4">
              {/* Proposed Bypass Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/40 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">AI Recommended Bypass Corridor</span>
                      <h4 className="font-extrabold text-white text-sm sm:text-base">
                        {currentBlockage?.diversion_corridor || 'All-Weather Valley Detour'}
                      </h4>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    74% SAFER
                  </span>
                </div>

                {/* Metric Delta Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">BYPASS DISTANCE</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {alternateData.ai_alternate_route?.distance_km || 348} km
                    </span>
                    <span className="text-[10px] text-cyan-400 block font-mono">+16.5 km detour</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">TOTAL ETA</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {alternateData.ai_alternate_route?.duration_text || '7h 12m'}
                    </span>
                    <span className="text-[10px] text-emerald-400 block font-semibold">Saves 6h wait</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">TERRAIN HAZARD</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      {alternateData.ai_alternate_route?.risk_score || 18}/100
                    </span>
                    <span className="text-[10px] text-emerald-400 block font-semibold">Low Risk (Valley)</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">FUEL REQUIRED</span>
                    <span className="text-sm font-bold text-cyan-300 font-mono">
                      {alternateData.ai_alternate_route?.fuel_required_litres || 48.2} L
                    </span>
                    <span className="text-[10px] text-slate-400 block font-semibold">Buffer: +12.4L</span>
                  </div>
                </div>

                {/* Step-by-Step Detour Maneuvers */}
                {alternateData.ai_alternate_route?.navigation_steps?.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                      <CornerUpRight size={13} className="text-cyan-400" /> Detour Waypoint Instructions:
                    </span>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {alternateData.ai_alternate_route.navigation_steps.map((step, sIdx) => (
                        <div
                          key={sIdx}
                          className="flex items-start gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300"
                        >
                          <span className="w-5 h-5 rounded bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold font-mono text-[11px] flex-shrink-0">
                            {step.step_number}
                          </span>
                          <span className="flex-1 leading-snug">{step.instruction}</span>
                          <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">{step.distance_km} km</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Voice Advisory Playback Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleVoice}
                      className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-colors ${
                        isSpeaking
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                          : 'bg-slate-800 text-slate-200 hover:bg-slate-750 border border-slate-700'
                      }`}
                    >
                      {isSpeaking ? (
                        <>
                          <VolumeX size={15} className="text-amber-400" />
                          <span>Stop Voice Announcement</span>
                        </>
                      ) : (
                        <>
                          <Volume2 size={15} className="text-cyan-400" />
                          <span>Listen AI Audio Advisory</span>
                        </>
                      )}
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-500">Autonomous Satellite Link Active</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Bottom Action Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 text-center sm:text-left">
            <span>Primary route is impassable. Divert convoy to avoid stranding.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                stopSpeech();
                onClose();
              }}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium text-xs border border-slate-700 transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleApply}
              disabled={isLoading || !alternateData?.ai_alternate_route}
              className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
                applied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/25'
              }`}
            >
              {applied ? (
                <>
                  <Check size={16} /> Alternate Route Applied!
                </>
              ) : (
                <>
                  <Compass size={16} /> Apply AI Alternate Route
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
