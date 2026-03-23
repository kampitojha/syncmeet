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
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 custom-scrollbar" ref={scrollRef}>
        {logs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-30 space-y-4 md:space-y-6">
                <div className="p-6 md:p-8 bg-white border-4 md:border-8 border-black shadow-[8px_8px_0px_rgba(0,0,0,0.1)] md:shadow-[15px_15px_0px_rgba(0,0,0,0.1)] -rotate-3">
                    <Terminal className="w-10 h-10 md:w-16 md:h-16 text-black" strokeWidth={3} />
                </div>
                <span className="uppercase tracking-[.2em] md:tracking-[.3em] font-black text-[8px] md:text-[10px] text-center px-6 md:px-10 leading-relaxed italic">WAITING_FOR_DATA_v4</span>
            </div>
        )}
        {logs.map((log) => {
          const styles = getTypeStyles(log.type);
          return (
            <div key={log.id} className="group relative flex gap-3 md:gap-4 p-3 md:p-4 border-[3px] md:border-4 border-black bg-white shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all">
              <div className="flex flex-col items-center gap-1 opacity-30 select-none shrink-0">
                 <span className="text-[7px] md:text-[8px] font-black tracking-tighter">[{log.timestamp}]</span>
                 <div className="w-0.5 md:w-1 h-full bg-black/10" />
              </div>
              <div className="flex flex-col gap-1.5 md:gap-2 flex-1 min-w-0">
                 <div className="flex items-center gap-2 md:gap-3">
                    <div className={`p-1 md:p-1.5 border-2 border-black shadow-[1.5px_1.5px_0px_#000] md:shadow-[2px_2px_0px_#000] ${styles.bg}`}>
                       {React.cloneElement(styles.icon as any, { size: 12, strokeWidth: 3 })}
                    </div>
                    <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest ${styles.text} truncate`}>
                       {log.type.toUpperCase()}
                    </span>
                 </div>
                 <span className="text-[10px] md:text-[12px] font-black break-all leading-[1.1] uppercase italic">
                   {log.message}
                 </span>
              </div>
              {/* Decorative Corner - Hidden on mobile */}
              <div className="absolute top-0 right-0 w-3 h-3 md:w-4 md:h-4 bg-black/5 rounded-bl-lg hidden xs:block" />
            </div>
          );
        })}
      </div>

      {/* CONSOLE_ACTIONS */}
      <div className="p-4 md:p-6 bg-white border-t-[4px] md:border-t-[6px] border-black shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <button 
          onClick={onClear}
          className="brutal-btn p-4 md:p-5 bg-[var(--brutal-red)] text-white w-full flex items-center justify-center gap-2 md:gap-4 font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-[10px] md:text-xs shadow-[5px_5px_0px_#000] md:shadow-[8px_8px_0px_#000] hover:bg-black transition-colors"
        >
          <Trash2 className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} /> PURGE_SYSTEM_CONSOLE
        </button>
      </div>
    </div>
  );
};

export default SystemLogs;
