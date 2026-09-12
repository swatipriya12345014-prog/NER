import React from 'react';

/**
 * TacticalLoader — Ultra-lightweight, zero-dependency loading fallback
 * Designed specifically for high-contrast visibility and fast execution
 * during dynamic route chunk streaming across low-bandwidth mountain corridors.
 */
export default function TacticalLoader({ message = "STREAMING OPERATIONAL WORKSPACE..." }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full p-8 text-center select-none">
      <div className="relative flex items-center justify-center w-16 h-16 mb-4">
        {/* Radar ping ring */}
        <div className="absolute inset-0 rounded-full border border-emerald-500/40 animate-ping" />
        {/* Outer rotating tactical ring */}
        <div className="w-14 h-14 rounded-full border-2 border-slate-700 border-t-emerald-500 border-r-cyan-400 animate-spin" />
        {/* Inner core dot */}
        <div className="absolute w-3 h-3 bg-emerald-400 rounded-full shadow-[0_0_12px_#34d399]" />
      </div>

      <div className="text-[11px] font-mono tracking-widest font-bold text-slate-300 uppercase">
        {message}
      </div>

      <div className="flex items-center gap-1.5 mt-2.5 text-[9px] font-mono text-slate-500">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>LIFELINE PROTOCOL • ENCRYPTED PAYLOAD TRANSIT</span>
      </div>
    </div>
  );
}
