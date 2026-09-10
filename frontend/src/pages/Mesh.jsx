import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Network, Radio, Wifi, Shield, Activity, Battery, 
  RefreshCw, CheckCircle2, AlertTriangle, ArrowRight, 
  Send, Database, Signal, HardDrive, Zap, Cpu
} from 'lucide-react';

const MESH_NODES = [
  {
    id: 'NODE-GW-01',
    name: 'Guwahati Central Base Gateway',
    type: 'Root Gateway (4G + LoRa + Fiber)',
    location: 'Guwahati Logistics Command Center',
    frequency: '865.200 MHz',
    status: 'ONLINE',
    rssi: '-68 dBm (Excellent)',
    battery: 100,
    isSolar: false,
    queuedPackets: 0,
    hopsFromRoot: 0,
    lastPing: '2 sec ago'
  },
  {
    id: 'NODE-RL-02',
    name: 'Shillong Peak Mountain Relay',
    type: 'High-Altitude Solar Relay (1,960m)',
    location: 'Shillong Ridge, East Khasi Hills',
    frequency: '865.200 MHz',
    status: 'ONLINE',
    rssi: '-78 dBm (Good)',
    battery: 92,
    isSolar: true,
    queuedPackets: 4,
    hopsFromRoot: 1,
    lastPing: '5 sec ago'
  },
  {
    id: 'NODE-RL-03',
    name: 'Sela Pass Extreme Elevation Node',
    type: 'Ruggedized DTN Store-and-Forward (4,170m)',
    location: 'Sela Pass Military Crest, Arunachal Pradesh',
    frequency: '866.500 MHz',
    status: 'ONLINE',
    rssi: '-92 dBm (Moderate)',
    battery: 84,
    isSolar: true,
    queuedPackets: 18,
    hopsFromRoot: 2,
    lastPing: '12 sec ago'
  },
  {
    id: 'NODE-VH-04',
    name: 'Ambulance 01 Mobile Transceiver',
    type: 'Mobile Vehicle Node (ESP32-S3 + SX1262)',
    location: 'En route NH-13 Kameng Corridor',
    frequency: '865.200 MHz',
    status: 'ONLINE',
    rssi: '-85 dBm (Fair)',
    battery: 96,
    isSolar: false,
    queuedPackets: 2,
    hopsFromRoot: 2,
    lastPing: '4 sec ago'
  },
  {
    id: 'NODE-RL-05',
    name: 'Chumukedima Gorge Relay',
    type: 'Gorge DTN Mountain Relay',
    location: 'NH-29 Chumukedima km 12, Nagaland',
    frequency: '866.500 MHz',
    status: 'ONLINE',
    rssi: '-88 dBm (Fair)',
    battery: 78,
    isSolar: true,
    queuedPackets: 7,
    hopsFromRoot: 1,
    lastPing: '8 sec ago'
  },
  {
    id: 'NODE-GW-06',
    name: 'Imphal Valley Base Gateway',
    type: 'Secondary Regional Gateway',
    location: 'Imphal Station Control Center',
    frequency: '865.200 MHz',
    status: 'ONLINE',
    rssi: '-72 dBm (Good)',
    battery: 100,
    isSolar: false,
    queuedPackets: 0,
    hopsFromRoot: 0,
    lastPing: '3 sec ago'
  }
];

const INITIAL_PACKETS = [
  { id: 'PKT-9921', time: '16:34:02', source: 'NODE-VH-04 (Ambulance 01)', dest: 'NODE-GW-01', type: 'GPS_TELEMETRY', hops: 2, rssi: -85, payload: 'LAT:27.128, LNG:92.451, FUEL:48L, TEMP:-4.2C' },
  { id: 'PKT-9920', time: '16:33:48', source: 'NODE-RL-03 (Sela Pass)', dest: 'NODE-GW-01', type: 'STORED_FORWARD', hops: 1, rssi: -92, payload: 'DTN BUNDLE: 6 forward cached logs forwarded to gateway' },
  { id: 'PKT-9919', time: '16:33:15', source: 'NODE-RL-05 (Chumukedima)', dest: 'NODE-GW-01', type: 'HAZARD_ALERT', hops: 1, rssi: -88, payload: 'SLOPE_MOVEMENT: 4.2mm lateral displacement detected' },
  { id: 'PKT-9918', time: '16:32:50', source: 'NODE-RL-02 (Shillong Peak)', dest: 'NODE-GW-01', type: 'NODE_HEARTBEAT', hops: 0, rssi: -78, payload: 'BATTERY:92%, SOLAR_IN:14.2V, AMBIENT:14C' },
  { id: 'PKT-9917', time: '16:31:22', source: 'NODE-VH-04 (Ambulance 01)', dest: 'NODE-GW-01', type: 'COLD_CHAIN_OK', hops: 2, rssi: -86, payload: 'VACCINE_BOX_01: -4.2C STABLE (NO EXCURSION)' }
];

export default function Mesh() {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState(MESH_NODES);
  const [packets, setPackets] = useState(INITIAL_PACKETS);
  const [selectedNode, setSelectedNode] = useState(MESH_NODES[0]);
  const [isSendingPing, setIsSendingPing] = useState(false);
  const [pingStatus, setPingStatus] = useState('');

  const handleSendPing = () => {
    setIsSendingPing(true);
    setPingStatus('Broadcasting 865.2MHz LoRa Ping...');

    setTimeout(() => {
      const newPkt = {
        id: `PKT-${Math.floor(10000 + Math.random() * 9000)}`,
        time: new Date().toLocaleTimeString(),
        source: 'DISPATCH_HQ',
        dest: selectedNode.id,
        type: 'ECHO_REQ_ACK',
        hops: selectedNode.hopsFromRoot,
        rssi: -74,
        payload: `ECHO_REPLY: ${selectedNode.name} ACK RECEIVED in 84ms`
      };

      setPackets([newPkt, ...packets]);
      setIsSendingPing(false);
      setPingStatus(`Ping ACK received from ${selectedNode.id} in 84ms!`);
      setTimeout(() => setPingStatus(''), 4000);
    }, 1200);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Radio size={20} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              LIFELINE MESH — LoRa DTN Communication Monitor
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Operating over 865–867 MHz India ISM band. Delay-Tolerant Store-and-Forward protocol bridging remote Himalayan blackout zones.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleSendPing}
            disabled={isSendingPing}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-xs text-white flex items-center space-x-1.5 shadow-lg shadow-purple-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <Send size={14} className={isSendingPing ? 'animate-spin' : ''} />
            <span>{isSendingPing ? 'Broadcasting...' : 'Broadcast LoRa Ping'}</span>
          </button>
        </div>
      </div>

      {pingStatus && (
        <div className="p-3 rounded-xl bg-purple-950/80 border border-purple-500/60 text-purple-200 text-xs font-bold flex items-center space-x-2 animate-pulse">
          <CheckCircle2 size={16} className="text-purple-400" />
          <span>{pingStatus}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Online Mesh Nodes</span>
            <Radio size={16} className="text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">{nodes.length} Nodes</div>
          <p className="text-[10px] text-emerald-400">100% active mesh quorum</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Operating Band</span>
            <Cpu size={16} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">865–867 MHz</div>
          <p className="text-[10px] text-slate-400">India ISM License-Free</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>DTN Queued Bundles</span>
            <HardDrive size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {nodes.reduce((acc, n) => acc + n.queuedPackets, 0)} Packets
          </div>
          <p className="text-[10px] text-amber-400/80">Store-and-forward pending</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Packet Delivery Ratio</span>
            <Activity size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">99.2%</div>
          <p className="text-[10px] text-emerald-400/80">Zero dropped SOS alerts</p>
        </div>
      </div>

      {/* Main Grid: Node Topology Cards + Live Packet Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Node Topology Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Network size={16} className="text-purple-400" />
              <span>Highland Mesh Node Topology</span>
            </h2>
            <span className="text-[11px] text-slate-400">Click node to inspect telemetry</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {nodes.map((node) => (
              <div
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 ${
                  selectedNode.id === node.id
                    ? 'bg-purple-950/40 border-purple-500 shadow-xl'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-mono text-xs font-bold text-purple-300">{node.id}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-cyan-400 font-bold">
                    {node.frequency}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-white">{node.name}</h3>
                  <p className="text-[11px] text-slate-400">{node.type}</p>
                </div>

                <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800/80 text-[11px] space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Location:</span>
                    <span className="text-slate-200 truncate max-w-[150px]">{node.location}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Signal Strength:</span>
                    <span className="text-emerald-300 font-mono font-bold">{node.rssi}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Battery / Power:</span>
                    <span className="text-white font-mono font-bold">
                      {node.battery}% {node.isSolar ? '☀️ Solar' : '⚡ DC Grid'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                  <span>Hops: {node.hopsFromRoot}</span>
                  <span>DTN Queue: {node.queuedPackets} pkts</span>
                  <span>Ping: {node.lastPing}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Live Packet Stream */}
        <div className="lg:col-span-1 space-y-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-1.5">
              <Activity size={15} className="text-cyan-400" />
              <span className="font-bold text-xs text-white uppercase tracking-wider">Live DTN Packets</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono font-bold animate-pulse">
              STREAMING
            </span>
          </div>

          <div className="space-y-2 max-h-[560px] overflow-y-auto">
            {packets.map((pkt) => (
              <div 
                key={pkt.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs font-mono"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 text-[11px]">{pkt.id}</span>
                  <span className="text-[10px] text-slate-500">{pkt.time}</span>
                </div>

                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span className="truncate max-w-[140px]">{pkt.source.split(' ')[0]}</span>
                  <span className="text-purple-400 font-bold">➔ {pkt.hops} HOP</span>
                </div>

                <div className={`px-2 py-1 rounded text-[10px] font-semibold break-all ${
                  pkt.type === 'HAZARD_ALERT'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : pkt.type === 'ECHO_REQ_ACK'
                    ? 'bg-purple-950 text-purple-300 border border-purple-800'
                    : 'bg-slate-900 text-slate-300 border border-slate-800'
                }`}>
                  {pkt.payload}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-800 text-center">
            <button
              onClick={() => navigate('/live-map')}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-bold text-xs cursor-pointer transition-colors"
            >
              Overlay Mesh Nodes on Live Map ➔
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
