import React, { useEffect, useRef, useState } from 'react';
import { Terminal, Activity, ShieldCheck, Zap } from 'lucide-react';

export interface LogEntry {
    id: string;
    timestamp: string;
    message: string;
    type: 'info' | 'warn' | 'error' | 'success';
}

interface SystemLogsProps {
    logs: LogEntry[];
    onClear: () => void;
}

const SystemLogs: React.FC<SystemLogsProps> = ({ logs, onClear }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [logs]);

  return (
    <div className="h-full bg-black flex flex-col border-l-4 border-black overflow-hidden font-mono shadow-[-10px_0px_20px_rgba(0,0,0,0.5)]">
      <div className="bg-[#ffdf00] p-4 flex items-center justify-between border-b-4 border-black group">
        <div className="flex items-center gap-3">
          <Terminal size={20} strokeWidth={3} className="text-black group-hover:rotate-12 transition-transform" />
          <span className="font-black text-xs md:text-sm uppercase italic -skew-x-6 tracking-widest text-black">TECHNICAL_PROTOCOL_LOGS</span>
        </div>
        <button 
          onClick={onClear} 
          className="text-[10px] md:text-xs font-bold uppercase hover:bg-black hover:text-[#ffdf00] px-2 py-0.5 border-2 border-black transition-colors"
        >
          PURGE_
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 custom-scrollbar" ref={containerRef}>
        <div className="flex items-center gap-2 text-[10px] font-bold text-green-500/50 mb-6 border-b border-green-500/20 pb-2">
           <ShieldCheck size={14} /> SYS_INTEGRITY: AES_P2P_ACTIVE_
        </div>

        {logs.map((log) => (
          <div key={log.id} className={`flex gap-3 text-[10px] md:text-xs group animate-slide-in`}>
            <span className="opacity-30 flex-shrink-0">[{log.timestamp}]</span>
            <div className={`
                flex-1 border-l-2 pl-3 py-1 transition-all group-hover:pl-5
                ${log.type === 'error' ? 'border-red-500 text-red-400' : ''}
                ${log.type === 'warn' ? 'border-yellow-500 text-yellow-300' : ''}
                ${log.type === 'success' ? 'border-green-500 text-green-400' : ''}
                ${log.type === 'info' ? 'border-[#ffdf00]/30 text-[#ffdf00]' : ''}
            `}>
              <span className="uppercase font-bold tracking-tighter">[{log.type.toUpperCase()}]</span>
              <p className="font-medium mt-1 leading-relaxed break-all opacity-90">{log.message}</p>
            </div>
          </div>
        ))}

        {logs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-10 text-center px-10 border-2 border-dashed border-[#ffdf00]/20 mx-4">
               <Activity size={48} className="mb-4" />
               <span className="italic font-black text-sm">AWAITING_PROTO_ACTIVITY_LOGS...</span>
            </div>
        )}
      </div>

      <div className="bg-[#ffdf00]/5 p-3 flex items-center gap-3 border-t border-[#ffdf00]/10">
         <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
         <span className="text-[10px] font-bold text-[#ffdf00]/50 tracking-widest">ENCRYPTED_LINK_ACTIVE</span>
         <Zap size={12} className="text-[#ffdf00]/20 ml-auto" />
      </div>
    </div>
  );
};

export default SystemLogs;
