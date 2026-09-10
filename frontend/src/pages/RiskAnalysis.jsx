import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, Shield, CloudRain, Mountain, AlertTriangle, 
  TrendingUp, Compass, MapPin, Info, ArrowRight, ExternalLink, 
  Activity, CheckCircle2, ChevronRight, Gauge
} from 'lucide-react';

const NER_STATES_RISK = [
  {
    state: 'Arunachal Pradesh',
    capital: 'Itanagar',
    riskScore: 84,
    riskLevel: 'HIGH',
    rainfallMm: 165,
    rainfallScore: 36, // max 40
    roadCondScore: 21, // max 25
    incidentScore: 16, // max 20
    terrainScore: 11,  // max 15
    elevationRange: '200m – 7,090m',
    criticalPasses: ['Sela Pass (4,170m)', 'Bum La (4,630m)', 'Bhalukpong Gorge'],
    primaryHighway: 'NH-13 (Trans-Arunachal Highway)',
    weatherAlert: 'Continuous Monsoonal Deluge over Kameng & Tawang ridges',
    advisory: 'Strict 4x4 convoys with satellite radio. Avoid night travel over Sela pass.'
  },
  {
    state: 'Sikkim',
    capital: 'Gangtok',
    riskScore: 78,
    riskLevel: 'HIGH',
    rainfallMm: 142,
    rainfallScore: 33,
    roadCondScore: 19,
    incidentScore: 15,
    terrainScore: 11,
    elevationRange: '280m – 8,586m',
    criticalPasses: ['Birik Dara Slump', 'Rangpo Valley', 'Nathu La Pass'],
    primaryHighway: 'NH-10 (Teesta River Highway)',
    weatherAlert: 'Teesta Riverbank active soil erosion',
    advisory: 'Light relief vehicles only via Lava-Algarah bypass. Heavy trucks restricted.'
  },
  {
    state: 'Nagaland',
    capital: 'Kohima',
    riskScore: 72,
    riskLevel: 'HIGH',
    rainfallMm: 118,
    rainfallScore: 28,
    roadCondScore: 20,
    incidentScore: 14,
    terrainScore: 10,
    elevationRange: '194m – 3,840m',
    criticalPasses: ['Chumukedima Rockslide Gorge', 'Dzükou Foothills', 'Zunheboto Ridge'],
    primaryHighway: 'NH-29 (Dimapur - Kohima Highway)',
    weatherAlert: 'Loose boulder rockfall warnings along Chumukedima corridor',
    advisory: 'Emergency relief escorted through Old Chumukedima military bypass.'
  },
  {
    state: 'Meghalaya',
    capital: 'Shillong',
    riskScore: 66,
    riskLevel: 'MEDIUM',
    rainfallMm: 210,
    rainfallScore: 38,
    roadCondScore: 12,
    incidentScore: 9,
    terrainScore: 7,
    elevationRange: '150m – 1,961m',
    criticalPasses: ['Lumshnong Causeway', 'Sonapur Tunnel', 'Umiam Dam Bypass'],
    primaryHighway: 'NH-06 (Shillong - Silchar Expressway)',
    weatherAlert: 'World-record monsoonal rainfall in East Jaintia Hills',
    advisory: 'Pilot vehicle convoys through Lumshnong causeway. Maintain speed < 40 km/h.'
  },
  {
    state: 'Manipur',
    capital: 'Imphal',
    riskScore: 62,
    riskLevel: 'MEDIUM',
    rainfallMm: 95,
    rainfallScore: 22,
    roadCondScore: 18,
    incidentScore: 13,
    terrainScore: 9,
    elevationRange: '760m – 2,994m',
    criticalPasses: ['Senapati Hill Cutting', 'Kangpokpi Slump', 'Loktak Basin'],
    primaryHighway: 'NH-02 / AH-1 (Asian Highway 1)',
    weatherAlert: 'Intermittent hillside mud runoff after thunderstorm bursts',
    advisory: 'Convoy radar tracking active. Ensure fuel margin exceeds +25L buffer.'
  },
  {
    state: 'Mizoram',
    capital: 'Aizawl',
    riskScore: 58,
    riskLevel: 'MEDIUM',
    rainfallMm: 85,
    rainfallScore: 19,
    roadCondScore: 17,
    incidentScore: 12,
    terrainScore: 10,
    elevationRange: '21m – 2,157m',
    criticalPasses: ['Kolasib Ghat', 'Bairabi Railhead Pass', 'Aizawl North Incline'],
    primaryHighway: 'NH-54 / NH-306',
    weatherAlert: 'Steep hill incline warnings with morning fog cover',
    advisory: 'Engage low-gear mountain descent protocols. Check brake air pressure.'
  },
  {
    state: 'Assam',
    capital: 'Dispur / Guwahati',
    riskScore: 38,
    riskLevel: 'LOW',
    rainfallMm: 72,
    rainfallScore: 15,
    roadCondScore: 11,
    incidentScore: 7,
    terrainScore: 5,
    elevationRange: '35m – 1,960m',
    criticalPasses: ['Brahmaputra Flood Plain', 'Kaziranga Animal Corridor', 'Kaliabor Bypass'],
    primaryHighway: 'NH-27 (East-West Corridor)',
    weatherAlert: 'Smooth transit across 4-lane expressway network',
    advisory: 'Optimal hub corridor. Safe cruising speeds up to 80 km/h.'
  },
  {
    state: 'Tripura',
    capital: 'Agartala',
    riskScore: 28,
    riskLevel: 'LOW',
    rainfallMm: 55,
    rainfallScore: 10,
    roadCondScore: 8,
    incidentScore: 6,
    terrainScore: 4,
    elevationRange: '15m – 939m',
    criticalPasses: ['Baramura Hill Range', 'Ambassa Outpost', 'Churaibari Border'],
    primaryHighway: 'NH-08',
    weatherAlert: 'Clear skies and dry highway stretches',
    advisory: 'Unrestricted humanitarian relief dispatch. Normal operations.'
  }
];

export default function RiskAnalysis() {
  const navigate = useNavigate();
  const [selectedState, setSelectedState] = useState(NER_STATES_RISK[0]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldAlert size={20} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              NER Regional Terrain & Route-Risk Intelligence
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Multi-factor vulnerability indices analyzing high-altitude monsoon rainfall, landslide propensity, and road blockages across all 8 North Eastern states.
          </p>
        </div>

        <button
          onClick={() => navigate('/live-map')}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white flex items-center space-x-1.5 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
        >
          <span>Live Tactical Map</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* NER-LIFELINE 4-Factor Risk Model Explanation Card */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity size={17} className="text-emerald-400" />
            <h2 className="font-extrabold text-sm text-white uppercase tracking-wider">
              NER-LIFELINE 4-Factor Risk Calculation Engine
            </h2>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono font-bold">
            0–100 Scale Index
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Standard consumer navigation algorithms fail in the North East because they prioritize flat distance over mountain survival. NER-LIFELINE computes risk across 4 proprietary vulnerability dimensions:
        </p>

        {/* 4 Dimension Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
            <div className="text-cyan-400 font-bold flex items-center space-x-1">
              <CloudRain size={14} />
              <span>1. Rainfall (0–40)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Live precipitation rate (mm/h). &gt;100mm triggers immediate high-risk status.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
            <div className="text-amber-400 font-bold flex items-center space-x-1">
              <Gauge size={14} />
              <span>2. Road Cond (0–25)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Single-lane mountain ghats vs 4-lane fortified National Highway expressways.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
            <div className="text-rose-400 font-bold flex items-center space-x-1">
              <AlertTriangle size={14} />
              <span>3. Incidents (0–20)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Active landslide debris, flash flood causeways, and boulder blockages logged in 24h.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
            <div className="text-purple-400 font-bold flex items-center space-x-1">
              <Mountain size={14} />
              <span>4. Terrain (0–15)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Historical geological fault lines, soil saturation history, and high slope steepness.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: State Selector & Detailed Risk Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: 8 States List */}
        <div className="lg:col-span-1 space-y-2 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-800">
            North Eastern States Risk Index
          </div>

          <div className="space-y-1.5 max-h-[520px] overflow-y-auto">
            {NER_STATES_RISK.map((s) => (
              <button
                key={s.state}
                onClick={() => setSelectedState(s)}
                className={`w-full p-3 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between border ${
                  selectedState.state === s.state
                    ? 'bg-blue-600/15 border-blue-500/60 shadow-md'
                    : 'bg-slate-950/60 border-slate-850 hover:bg-slate-800/60'
                }`}
              >
                <div>
                  <div className="font-bold text-sm text-white">{s.state}</div>
                  <div className="text-[11px] text-slate-400">{s.capital} • {s.rainfallMm}mm rain</div>
                </div>

                <div className="text-right space-y-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold ${
                    s.riskLevel === 'HIGH' 
                      ? 'bg-rose-950 text-rose-400 border border-rose-800' 
                      : s.riskLevel === 'MEDIUM'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  }`}>
                    {s.riskScore}/100
                  </span>
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">
                    {s.riskLevel}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right column: Selected State Deep-Dive Card */}
        <div className="lg:col-span-2 space-y-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-black text-white">{selectedState.state}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  selectedState.riskLevel === 'HIGH' 
                    ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                    : selectedState.riskLevel === 'MEDIUM'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}>
                  {selectedState.riskLevel} DISASTER RISK
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Capital: {selectedState.capital} • Elevation Range: {selectedState.elevationRange}
              </p>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-400 font-semibold uppercase">Total Vulnerability Index</div>
              <div className="text-2xl font-black text-amber-400 font-mono">
                {selectedState.riskScore} / 100
              </div>
            </div>
          </div>

          {/* 4 Factor Score Decomposition Progress Bars */}
          <div className="space-y-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Factor Score Decomposition
            </div>

            {/* Rainfall */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 flex items-center space-x-1">
                  <CloudRain size={13} className="text-cyan-400" />
                  <span>Rainfall Intensity (Live Radar)</span>
                </span>
                <span className="font-mono font-bold text-white">{selectedState.rainfallScore} / 40</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-cyan-400 rounded-full transition-all duration-500" 
                  style={{ width: `${(selectedState.rainfallScore / 40) * 100}%` }}
                />
              </div>
            </div>

            {/* Road Condition */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 flex items-center space-x-1">
                  <Gauge size={13} className="text-amber-400" />
                  <span>Road Condition & Mountain Ghat Hazard</span>
                </span>
                <span className="font-mono font-bold text-white">{selectedState.roadCondScore} / 25</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-400 rounded-full transition-all duration-500" 
                  style={{ width: `${(selectedState.roadCondScore / 25) * 100}%` }}
                />
              </div>
            </div>

            {/* Recent Incidents */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 flex items-center space-x-1">
                  <AlertTriangle size={13} className="text-rose-400" />
                  <span>Recent 24h Landslides & Blockages</span>
                </span>
                <span className="font-mono font-bold text-white">{selectedState.incidentScore} / 20</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-rose-400 rounded-full transition-all duration-500" 
                  style={{ width: `${(selectedState.incidentScore / 20) * 100}%` }}
                />
              </div>
            </div>

            {/* Historical Vulnerability */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 flex items-center space-x-1">
                  <Mountain size={13} className="text-purple-400" />
                  <span>Historical Geological Slope Instability</span>
                </span>
                <span className="font-mono font-bold text-white">{selectedState.terrainScore} / 15</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-400 rounded-full transition-all duration-500" 
                  style={{ width: `${(selectedState.terrainScore / 15) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Critical Mountain Passes */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Critical Mountain Passes & Choke Points
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedState.criticalPasses.map((pass) => (
                <span 
                  key={pass}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center space-x-1"
                >
                  <Mountain size={13} className="text-amber-400" />
                  <span>{pass}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Active Weather Alert & Driver Advisory */}
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-600/40 space-y-1 text-xs">
            <div className="flex items-center space-x-1.5 text-amber-300 font-bold">
              <CloudRain size={14} />
              <span>Current Weather Warning:</span>
            </div>
            <p className="text-amber-100/90 leading-relaxed">
              {selectedState.weatherAlert}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-600/40 space-y-1 text-xs">
            <div className="flex items-center space-x-1.5 text-emerald-300 font-bold">
              <Shield size={14} />
              <span>Logistics Convoy Advisory:</span>
            </div>
            <p className="text-emerald-100/90 leading-relaxed">
              {selectedState.advisory}
            </p>
          </div>

          {/* CTA Button */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => navigate('/live-map')}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white flex items-center space-x-2 shadow-lg transition-all cursor-pointer"
            >
              <span>Calculate Safe Route in {selectedState.state}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
