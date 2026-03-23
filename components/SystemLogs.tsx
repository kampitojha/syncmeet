import React, { useEffect, useRef } from 'react';
import { Terminal, Trash2, Zap, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';

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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getTypeStyles = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return { text: 'text-[var(--brutal-green)]', icon: <Zap size={14} strokeWidth={3} />, bg: 'bg-[var(--brutal-green)] text-white' };
      case 'warn': return { text: 'text-[var(--brutal-orange)]', icon: <AlertTriangle size={14} strokeWidth={3} />, bg: 'bg-[var(--brutal-orange)] text-white' };
      case 'error': return { text: 'text-[var(--brutal-red)]', icon: <ShieldCheck size={14} strokeWidth={3} />, bg: 'bg-[var(--brutal-red)] text-white' };
      default: return { text: 'text-[var(--brutal-blue)]', icon: <Activity size={14} strokeWidth={3} />, bg: 'bg-[var(--brutal-blue)] text-white' };
    }
  };

  return (
    <div className="flex flex-col bg-[#f8f8f8] font-mono text-[11px] text-black brutal-grid-dot relative h-full">
      {/* CONSOLE_SCROLL_PORT */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar" ref={scrollRef}>
        {logs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-30 space-y-6">
                <div className="p-8 bg-white border-8 border-black shadow-[15px_15px_0px_rgba(0,0,0,0.1)] -rotate-3">
                    <Terminal size={64} strokeWidth={3} className="text-black" />
                </div>
                <span className="uppercase tracking-[.3em] font-black text-[10px] text-center px-10 leading-relaxed italic">WAITING_FOR_DATA_STREAM_v4</span>
            </div>
        )}
        {logs.map((log) => {
          const styles = getTypeStyles(log.type);
          return (
            <div key={log.id} className="group relative flex gap-4 p-4 border-4 border-black bg-white shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
              <div className="flex flex-col items-center gap-1 opacity-30 select-none">
                 <span className="text-[8px] font-black tracking-tighter">[{log.timestamp}]</span>
                 <div className="w-1 h-full bg-black/10" />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                 <div className="flex items-center gap-3">
                    <div className={`p-1.5 border-2 border-black shadow-[2px_2px_0px_#000] ${styles.bg}`}>
                       {styles.icon}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${styles.text}`}>
                       {log.type.toUpperCase()}
                    </span>
                 </div>
                 <span className="text-[12px] font-black break-all leading-[1.1] uppercase italic">
                   {log.message}
                 </span>
              </div>
              {/* Decorative Corner */}
              <div className="absolute top-0 right-0 w-4 h-4 bg-black/5 rounded-bl-lg" />
            </div>
          );
        })}
      </div>

      {/* CONSOLE_ACTIONS */}
      <div className="p-6 bg-white border-t-[6px] border-black shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <button 
          onClick={onClear}
          className="brutal-btn p-5 bg-[var(--brutal-red)] text-white w-full flex items-center justify-center gap-4 font-black uppercase tracking-[0.2em] text-xs shadow-[8px_8px_0px_#000] hover:bg-black transition-colors"
        >
          <Trash2 size={24} strokeWidth={3} /> PURGE_SYSTEM_CONSOLE
        </button>
      </div>
    </div>
  );
};

export default SystemLogs;
