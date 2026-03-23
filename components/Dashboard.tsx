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
      <div className="p-4 md:p-6 space-y-6 md:space-y-8 flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between border-b-4 md:border-b-6 border-black pb-4 md:pb-6">
           <div className="flex items-center gap-3 md:gap-4">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-black text-white border-2 md:border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_var(--brutal-cyan)] md:shadow-[6px_6px_0px_var(--brutal-cyan)]"> 
                <Gauge className="w-6 h-6 md:w-8 md:h-8 text-[var(--brutal-cyan)]" strokeWidth={3} /> 
              </div>
              <div className="flex flex-col">
                <h4 className="font-black text-lg md:text-xl uppercase tracking-tighter italic leading-none">TELEMETRY_v4</h4>
                <span className="text-[8px] md:text-[9px] font-black uppercase opacity-30 mt-1 truncate max-w-[100px] md:max-w-none">UPLINK_PROTO</span>
              </div>
           </div>
           <div className={`p-2.5 md:p-4 border-2 md:border-4 border-black shadow-[5px_5px_0px_#000] md:shadow-[8px_8px_0px_#000] text-[9px] md:text-[11px] font-black uppercase tracking-widest italic md:-rotate-2 ${getQualityColor()}`}>
              QS: {stats.quality.toUpperCase()}
           </div>
        </div>

        {/* PRIMARY_TEL_GRID */}
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-4 md:gap-6">
           {[
             { label: 'THROUGHPUT', value: `${stats.bitrate} Mbps`, icon: <Zap className="w-5 h-5 md:w-6 md:h-6" />, color: 'bg-[var(--brutal-yellow)] text-black' },
             { label: 'LATENCY', value: `${stats.latency} ms`, icon: <Activity className="w-5 h-5 md:w-6 md:h-6" />, color: 'bg-[var(--brutal-violet)] text-white' },
             { label: 'NODES', value: stats.connections.toString(), icon: <ShieldCheck className="w-5 h-5 md:w-6 md:h-6" />, color: 'bg-[var(--brutal-green)] text-white' },
             { label: 'PACKET_LOSS', value: `${stats.packetLoss}%`, icon: <Radio className="w-5 h-5 md:w-6 md:h-6" />, color: 'bg-[var(--brutal-red)] text-white' }
           ].map((item, i) => (
             <div key={i} className="brutal-card bg-white p-4 md:p-6 border-[4px] md:border-[5px] border-black shadow-[6px_6px_0px_#000] md:shadow-[10px_10px_0px_#000] flex flex-col justify-between h-32 md:h-40 group hover:-translate-y-1 md:hover:-translate-y-2 hover:bg-[#fcfcfc] transition-all">
                <div className={`p-2 md:p-3 border-2 md:border-4 border-black w-fit ${item.color} shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000]`}> {React.cloneElement(item.icon as any, { strokeWidth: 3 })} </div>
                <div className="mt-2 md:mt-4">
                   <p className="text-[8px] md:text-[10px] font-black uppercase text-black/40 tracking-widest mb-0.5 md:mb-1 italic truncate">{item.label}</p>
                   <p className="text-xl md:text-2xl font-black tabular-nums tracking-tighter">{item.value}</p>
                </div>
                {/* Decorative Pattern on Cards - Hidden on small mobile */}
                <div className="absolute top-2 right-2 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity hidden sm:block">
                    <BarChart3 className="w-8 h-8 md:w-12 md:h-12" strokeWidth={3} />
                </div>
             </div>
           ))}
        </div>

        {/* RESOURCE_ENGINE_CONSOLE */}
        <div className="brutal-card bg-white p-5 md:p-8 border-[4px] md:border-[6px] border-black shadow-[8px_8px_0px_#000] md:shadow-[15px_15px_0px_#000] space-y-6 md:space-y-8 animate-slide-up">
           <div className="flex items-center justify-between border-b-2 md:border-b-4 border-black pb-3 md:pb-4">
              <div className="flex items-center gap-3 md:gap-4">
                <Radio className="w-5 h-5 md:w-6 md:h-6 text-[var(--brutal-pink)] animate-pulse" strokeWidth={3} />
                <h5 className="font-black uppercase tracking-[.1em] md:tracking-[.2em] text-[10px] md:text-xs italic"> RESOURCE_PROT </h5>
              </div>
              <div className="flex gap-1.5 md:gap-2">
                 <div className="w-3 h-3 md:w-4 md:h-4 bg-black border-2 border-white rotate-45" />
                 <div className="w-3 h-3 md:w-4 md:h-4 bg-black border-2 border-white rotate-45" />
              </div>
           </div>

           <div className="space-y-6 md:space-y-8 pt-2 md:pt-4">
              {[
                { label: 'TRANSCODE_LOAD', percentage: 28, color: 'bg-[var(--brutal-violet)]' },
                { label: 'BUFFER_STACK', percentage: 46, color: 'bg-[var(--brutal-pink)]' },
                { label: 'ICE_TUNNEL_v6', percentage: 100, color: 'bg-[var(--brutal-green)]' }
              ].map((bar, i) => (
                <div key={i} className="space-y-3 md:space-y-4">
                   <div className="flex justify-between items-end px-1">
                      <div className="flex flex-col">
                        <span className="text-[8px] md:text-[10px] font-black text-black/40 uppercase tracking-widest italic leading-none">{bar.label}</span>
                        <span className="text-[6px] md:text-[7px] font-bold opacity-30 mt-1 uppercase tracking-tighter truncate max-w-[120px]">PROTO_CORE_IDX</span>
                      </div>
                      <div className="bg-black text-white px-1.5 md:px-2 py-0.5 md:py-1 text-[8px] md:text-[10px] font-black italic border-2 border-white shadow-[2px_2px_0px_#000] md:shadow-[3px_3px_0px_#000]">
                        {bar.percentage}%
                      </div>
                   </div>
                   <div className="h-4 md:h-6 w-full bg-[#f0f0f0] border-2 md:border-4 border-black p-0.5 md:p-1 shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000]">
                      <div className={`h-full border-r-2 md:border-r-4 border-black transition-all duration-1000 ${bar.color} relative overflow-hidden`} style={{ width: `${bar.percentage}%` }}>
                         {/* Pattern overlay for bars */}
                         <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.5) 8px, rgba(0,0,0,0.5) 16px)' }} />
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* DASH_FOOTER_STRIP */}
      <div className="p-3 md:p-4 bg-black border-t-4 md:border-t-6 border-black flex items-center justify-between">
         <div className="flex items-center gap-3 md:gap-4">
            <span className="text-[8px] md:text-[10px] font-black text-white tracking-[.2em] md:tracking-[.4em] uppercase italic opacity-40">STABLE</span>
            <div className="flex gap-1 md:gap-1.5">
               {[...Array(3)].map((_, i) => <div key={i} className="w-1 md:w-1.5 h-1 md:h-1.5 bg-[var(--brutal-green)] shadow-[0_0_8px_var(--brutal-green)]" />)}
            </div>
         </div>
         <span className="text-[7px] md:text-[9px] font-black text-[var(--brutal-yellow)] uppercase tracking-[.1em] md:tracking-[.2em] italic truncate">V.4.0.ALPHA // 2024</span>
      </div>
    </div>
  );
};

export default Dashboard;
