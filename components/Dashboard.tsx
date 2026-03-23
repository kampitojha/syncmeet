import React from 'react';
import { Signal, Activity, Zap, ShieldCheck, Info, Gauge, Cpu, BarChart3 } from 'lucide-react';

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
      case 'Excellent': return 'text-green-400 border-green-400/20 bg-green-400/5';
      case 'Good': return 'text-cyan-400 border-cyan-400/20 bg-cyan-400/5';
      case 'Fair': return 'text-yellow-400 border-yellow-400/20 bg-yellow-400/5';
      default: return 'text-red-500 border-red-500/20 bg-red-500/5';
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent font-sans text-white">
      <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10"> <Gauge size={20} className="text-cyan-400" /> </div>
              <h4 className="font-extrabold text-lg uppercase tracking-widest text-white/90 italic">TELEMETRY_ENGINE_v4.5</h4>
           </div>
           <div className={`p-3 px-6 rounded-2xl border ${getQualityColor()} text-[9px] font-black uppercase tracking-[0.2em] shadow-xl transition-all`}>
              SIGNAL_STATUS: {stats.quality.toUpperCase()}
           </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
           {[
             { label: 'BITRATE_THROUGHPUT', value: `${stats.bitrate} Mbps`, icon: <Zap size={18} />, color: 'text-cyan-400' },
             { label: 'NETWORK_LATENCY', value: `${stats.latency} ms`, icon: <Activity size={18} />, color: 'text-purple-400' },
             { label: 'MESH_NODES_ACTIVE', value: stats.connections.toString(), icon: <ShieldCheck size={18} />, color: 'text-emerald-400' },
             { label: 'PACKET_DATA_LOSS', value: `${stats.packetLoss}%`, icon: <Info size={18} />, color: 'text-red-400' }
           ].map((item, i) => (
             <div key={i} className="glass-card p-6 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-4 hover:border-white/10 transition-all group overflow-hidden relative">
               <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                   {React.cloneElement(item.icon, { size: 100 })}
               </div>
               <div className={`p-4 bg-white/5 rounded-2xl w-fit ${item.color} shadow-inner`}> {item.icon} </div>
               <div>
                  <p className="text-[9px] font-black uppercase text-white/30 tracking-[0.1em] mb-1 italic">{item.label}</p>
                  <p className="text-2xl font-black tabular-nums tracking-tighter text-white/90">{item.value}</p>
               </div>
             </div>
           ))}
        </div>

        <div className="glass-card-bright p-8 rounded-[3rem] border border-white/10 shadow-2xl space-y-6">
           <div className="flex items-center justify-between mb-2">
              <h5 className="font-black uppercase tracking-widest text-xs flex items-center gap-3"> <BarChart3 size={16} className="text-cyan-400" /> SYSTEM_RESOURCE_MONITOR </h5>
              <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-[9px] font-bold text-white/20 uppercase">SECURE_TUNNEL_ACTIVE</span>
              </div>
           </div>

           <div className="space-y-6">
              {[
                { label: 'CPU_ENCODER_LOAD', percentage: 24, color: 'bg-cyan-400' },
                { label: 'MEMORY_BUFFER_UTIL', percentage: 42, color: 'bg-purple-600' },
                { label: 'STUN_ICE_NEGOTIATION', percentage: 100, color: 'bg-emerald-500' }
              ].map((bar, i) => (
                <div key={i} className="space-y-2">
                   <div className="flex justify-between items-center px-1">
                      <span className="text-[9px] font-black text-white/40 uppercase tracking-widest italic">{bar.label}</span>
                      <span className="text-[9px] font-black text-white italic">{bar.percentage}%</span>
                   </div>
                   <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden p-[2px] border border-white/5">
                      <div className={`h-full ${bar.color} rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(34,211,238,0.2)]`} style={{ width: `${bar.percentage}%` }} />
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      <div className="glass-card p-6 border-t border-white/5 flex items-center gap-4 bg-white/5 backdrop-blur-3xl">
         <div className="bg-white/10 p-2 rounded-xl"> <Cpu size={14} className="text-cyan-400" /> </div>
         <span className="text-[9px] font-bold text-white/20 tracking-[0.4em] uppercase italic">ENCRYPTED_PROTO_MESH_v.103.ALPHA</span>
      </div>
    </div>
  );
};

export default Dashboard;
