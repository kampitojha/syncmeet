import React, { useEffect, useRef } from 'react';
import { Terminal, Trash2, ShieldCheck, Activity, Zap, AlertTriangle } from 'lucide-react';

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
      case 'success': return { text: 'text-[#00ff9d]', icon: <Zap size={10} strokeWidth={3} />, bg: 'bg-[#00ff9d]/20' };
      case 'warn': return { text: 'text-yellow-500', icon: <AlertTriangle size={10} strokeWidth={3} />, bg: 'bg-yellow-500/20' };
      case 'error': return { text: 'text-[#ff5e5e]', icon: <ShieldCheck size={10} strokeWidth={3} />, bg: 'bg-[#ff5e5e]/20' };
      default: return { text: 'text-[#5eb5ff]', icon: <Activity size={10} strokeWidth={3} />, bg: 'bg-[#5eb5ff]/20' };
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f0f0f0] font-mono text-[10px] md:text-xs text-black">
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar" ref={scrollRef}>
        {logs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-40 space-y-4">
                <Terminal size={48} strokeWidth={3} />
                <span className="uppercase tracking-widest font-black text-xs">Waiting for stream...</span>
            </div>
        )}
        {logs.map((log) => {
          const styles = getTypeStyles(log.type);
          return (
            <div key={log.id} className="flex gap-2 p-2 border-b-2 border-black/5 hover:bg-white transition-all">
              <span className="text-black/30 font-black">[{log.timestamp}]</span>
              <div className="flex items-start gap-2">
                 <div className={`mt-0.5 p-1 border border-black shadow-[1px_1px_0px_black] ${styles.bg}`}>
                    {styles.icon}
                 </div>
                 <span className={`${styles.text} break-all leading-tight uppercase font-black tracking-tight`}>
                   {log.message}
                 </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-white border-t-4 border-black">
        <button 
          onClick={onClear}
          className="brutal-btn p-4 bg-[#ff5e5e] text-white w-full flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px]"
        >
          <Trash2 size={16} strokeWidth={3} /> PURGE_LOGS
        </button>
      </div>
    </div>
  );
};

export default SystemLogs;
