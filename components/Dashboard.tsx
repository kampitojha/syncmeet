import React from 'react';
import { Activity, Zap, ShieldCheck, Gauge, BarChart3, Radio } from 'lucide-react';

interface DashboardProps {
  stats: {
    bitrate: number;
    latency: number;
    packetLoss: number;
    connections: number;
    quality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  };
}

const Dashboard: React.FC<DashboardProps> = ({ stats }) => {
  const getQualityColor = () => {
    switch (stats.quality) {
      case 'Excellent': return 'bg-[var(--brutal-green)] text-white';
      case 'Good': return 'bg-[var(--brutal-blue)] text-white';
      case 'Fair': return 'bg-[var(--brutal-yellow)] text-black';
      default: return 'bg-[var(--brutal-red)] text-white';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f8f8] font-mono text-black brutal-grid-dot">
      {/* DASH_HEADER_HUD */}
      <div className="p-6 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between border-b-6 border-black pb-6">
           <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-black text-white border-4 border-black flex items-center justify-center shadow-[6px_6px_0px_var(--brutal-cyan)]"> 
                <Gauge size={32} strokeWidth={3} className="text-[var(--brutal-cyan)]" /> 
              </div>
              <div className="flex flex-col">
                <h4 className="font-black text-xl uppercase tracking-tighter italic leading-none">TELEMETRY_v4</h4>
                <span className="text-[9px] font-black uppercase opacity-30 mt-1">UPLINK_PROTOCOL_ACTIVE</span>
              </div>
           </div>
           <div className={`p-4 border-4 border-black shadow-[8px_8px_0px_#000] text-[11px] font-black uppercase tracking-widest italic -rotate-2 ${getQualityColor()}`}>
              QS: {stats.quality.toUpperCase()}
           </div>
        </div>

        {/* PRIMARY_TEL_GRID */}
        <div className="grid grid-cols-2 gap-6">
           {[
             { label: 'THROUGHPUT', value: `${stats.bitrate} Mbps`, icon: <Zap size={24} />, color: 'bg-[var(--brutal-yellow)] text-black', shadow: 'var(--brutal-yellow)' },
             { label: 'LATENCY', value: `${stats.latency} ms`, icon: <Activity size={24} />, color: 'bg-[var(--brutal-violet)] text-white', shadow: 'var(--brutal-violet)' },
             { label: 'NODES', value: stats.connections.toString(), icon: <ShieldCheck size={24} />, color: 'bg-[var(--brutal-green)] text-white', shadow: 'var(--brutal-green)' },
             { label: 'PACKET_LOSS', value: `${stats.packetLoss}%`, icon: <Radio size={24} />, color: 'bg-[var(--brutal-red)] text-white', shadow: 'var(--brutal-red)' }
           ].map((item, i) => (
             <div key={i} className="brutal-card bg-white p-6 border-[5px] border-black shadow-[10px_10px_0px_#000] flex flex-col justify-between h-40 group hover:-translate-y-2 hover:bg-[#fcfcfc]">
                <div className={`p-3 border-4 border-black w-fit ${item.color} shadow-[4px_4px_0px_#000]`}> {React.cloneElement(item.icon as any, { strokeWidth: 3 })} </div>
                <div className="mt-4">
                   <p className="text-[10px] font-black uppercase text-black/40 tracking-widest mb-1 italic">{item.label}</p>
                   <p className="text-2xl font-black tabular-nums tracking-tighter">{item.value}</p>
                </div>
                {/* Decorative Pattern on Cards */}
                <div className="absolute top-2 right-2 opacity-5 pointer-events-none group-hover:opacity-20 transition-opacity">
                    <BarChart3 size={48} strokeWidth={3} />
                </div>
             </div>
           ))}
        </div>

        {/* RESOURCE_ENGINE_CONSOLE */}
        <div className="brutal-card bg-white p-8 border-[6px] border-black shadow-[15px_15px_0px_#000] space-y-8 animate-slide-up">
           <div className="flex items-center justify-between border-b-4 border-black pb-4">
              <div className="flex items-center gap-4">
                <Radio size={24} strokeWidth={3} className="text-[var(--brutal-pink)] animate-pulse" />
                <h5 className="font-black uppercase tracking-[.2em] text-xs italic"> RESOURCE_UTILI_PROT </h5>
              </div>
              <div className="flex gap-2">
                 <div className="w-4 h-4 bg-black border-2 border-white rotate-45" />
                 <div className="w-4 h-4 bg-black border-2 border-white rotate-45" />
              </div>
           </div>

           <div className="space-y-8 pt-4">
              {[
                { label: 'TRANSCODE_LOAD', percentage: 28, color: 'bg-[var(--brutal-violet)]' },
                { label: 'BUFFER_STACK', percentage: 46, color: 'bg-[var(--brutal-pink)]' },
                { label: 'ICE_TUNNEL_v6', percentage: 100, color: 'bg-[var(--brutal-green)]' }
              ].map((bar, i) => (
                <div key={i} className="space-y-4">
                   <div className="flex justify-between items-end px-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-black/40 uppercase tracking-widest italic leading-none">{bar.label}</span>
                        <span className="text-[7px] font-bold opacity-30 mt-1 uppercase tracking-tighter">PROTO_CORE_LOAD_IDX</span>
                      </div>
                      <div className="bg-black text-white px-2 py-1 text-[10px] font-black italic border-2 border-white shadow-[3px_3px_0px_#000]">
                        {bar.percentage}%
                      </div>
                   </div>
                   <div className="h-6 w-full bg-[#f0f0f0] border-4 border-black p-1 shadow-[4px_4px_0px_#000]">
                      <div className={`h-full border-r-4 border-black transition-all duration-1000 ${bar.color} relative overflow-hidden`} style={{ width: `${bar.percentage}%` }}>
                         {/* Pattern overlay for bars */}
                         <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.5) 10px, rgba(0,0,0,0.5) 20px)' }} />
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* DASH_FOOTER_STRIP */}
      <div className="p-4 bg-black border-t-6 border-black flex items-center justify-between">
         <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-white tracking-[.4em] uppercase italic opacity-40">UPLINK_STABLE</span>
            <div className="flex gap-1">
               {[...Array(3)].map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-[var(--brutal-green)] shadow-[0_0_8px_var(--brutal-green)]" />)}
            </div>
         </div>
         <span className="text-[9px] font-black text-[var(--brutal-yellow)] uppercase tracking-[.2em] italic">V.4.0.ALPHA // 2024</span>
      </div>
    </div>
  );
};

export default Dashboard;
