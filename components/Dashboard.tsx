import React from 'react';
import { Activity, Zap, ShieldCheck, Gauge, BarChart3 } from 'lucide-react';

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
      case 'Excellent': return 'bg-[#00ff9d] border-2 border-black';
      case 'Good': return 'bg-[#5eb5ff] border-2 border-black';
      case 'Fair': return 'bg-[#ffdf1e] border-2 border-black';
      default: return 'bg-[#ff5e5e] text-white border-2 border-black';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f0f0f0] font-mono text-black">
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-black text-white border-2 border-black"> <Gauge size={18} strokeWidth={3} /> </div>
              <h4 className="font-black text-xs uppercase tracking-widest italic">TELEMETRY_v4.5</h4>
           </div>
           <div className={`p-2 px-4 shadow-[4px_4px_0px_black] text-[8px] font-black uppercase tracking-widest transition-all ${getQualityColor()}`}>
              QS: {stats.quality.toUpperCase()}
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           {[
             { label: 'THROUGHPUT', value: `${stats.bitrate} Mbps`, icon: <Zap size={16} />, color: 'bg-[#ffdf1e]' },
             { label: 'LATENCY', value: `${stats.latency} ms`, icon: <Activity size={16} />, color: 'bg-[#a855f7] text-white' },
             { label: 'MESH_NODES', value: stats.connections.toString(), icon: <ShieldCheck size={16} />, color: 'bg-[#00ff9d]' },
             { label: 'PACKET_LOSS', value: `${stats.packetLoss}%`, icon: <BarChart3 size={16} />, color: 'bg-[#ff5e5e] text-white' }
           ].map((item, i) => (
             <div key={i} className="brutal-card bg-white p-4 border-4 border-black shadow-[4px_4px_0px_black] space-y-3 relative overflow-hidden">
                <div className={`p-2 border-2 border-black w-fit ${item.color} shadow-[2px_2px_0px_black]`}> {React.cloneElement(item.icon, { strokeWidth: 3 })} </div>
                <div>
                   <p className="text-[8px] font-black uppercase text-black/40 tracking-widest mb-1 italic">{item.label}</p>
                   <p className="text-xl font-black tabular-nums tracking-tighter">{item.value}</p>
                </div>
             </div>
           ))}
        </div>

        <div className="brutal-card bg-white p-4 border-4 border-black shadow-[6px_6px_0px_black] space-y-4">
           <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <h5 className="font-black uppercase tracking-widest text-[10px]"> RESOURCE_MONITOR </h5>
              <div className="w-2 h-2 bg-[#ffdf1e] border-2 border-black animate-pulse" />
           </div>

           <div className="space-y-4">
              {[
                { label: 'ENCODER_LOAD', percentage: 24, color: 'bg-black' },
                { label: 'BUFFER_UTIL', percentage: 42, color: 'bg-[#5eb5ff]' },
                { label: 'ICE_TUNNEL', percentage: 100, color: '#ffdf1e' }
              ].map((bar, i) => (
                <div key={i} className="space-y-1">
                   <div className="flex justify-between items-center px-1">
                      <span className="text-[8px] font-black text-black/40 uppercase tracking-widest italic">{bar.label}</span>
                      <span className="text-[8px] font-black italic">{bar.percentage}%</span>
                   </div>
                   <div className="h-3 w-full bg-[#e0e0e0] border-2 border-black p-[1px]">
                      <div className={`h-full border-r-2 border-black transition-all duration-1000 ${bar.label === 'ICE_TUNNEL' ? 'bg-[#ffdf1e]' : bar.color}`} style={{ width: `${bar.percentage}%` }} />
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      <div className="p-3 bg-black border-t-2 border-black flex items-center gap-3">
         <span className="text-[8px] font-black text-white tracking-widest uppercase italic">ENCRYPTED_PROTO_v103.ALPHA</span>
      </div>
    </div>
  );
};

export default Dashboard;
