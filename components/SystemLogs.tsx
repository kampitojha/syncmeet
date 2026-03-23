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
      case 'success': return { text: 'text-green-400', icon: <Zap size={10} className="text-green-400" />, bg: 'bg-green-400/10' };
      case 'warn': return { text: 'text-yellow-400', icon: <AlertTriangle size={10} className="text-yellow-400" />, bg: 'bg-yellow-400/10' };
      case 'error': return { text: 'text-red-500', icon: <ShieldCheck size={10} className="text-red-500" />, bg: 'bg-red-500/10' };
      default: return { text: 'text-cyan-400', icon: <Activity size={10} className="text-cyan-400" />, bg: 'bg-cyan-400/10' };
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent font-mono text-[10px] md:text-xs">
      <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar" ref={scrollRef}>
        {logs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-4">
                <Terminal size={48} className="text-cyan-400" />
                <span className="uppercase tracking-[0.3em] font-bold">Waiting for protocol stream...</span>
            </div>
        )}
        {logs.map((log) => {
          const styles = getTypeStyles(log.type);
          return (
            <div key={log.id} className="flex gap-4 group hover:bg-white/5 p-2 rounded-xl transition-colors">
              <span className="text-white/20 whitespace-nowrap opacity-50 font-medium">[{log.timestamp}]</span>
              <div className="flex items-start gap-3">
                 <div className={`mt-1.5 p-1 rounded-sm ${styles.bg}`}>
                    {styles.icon}
                 </div>
                 <span className={`${styles.text} break-all leading-relaxed uppercase font-bold tracking-tight opacity-90 group-hover:opacity-100 transition-opacity`}>
                   {log.message}
                 </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-6">
        <button 
          onClick={onClear}
          className="w-full h-14 glass-card rounded-2xl border border-white/5 text-white/40 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[10px]"
        >
          <Trash2 size={16} /> PURGE_SESSION_LOGS
        </button>
      </div>
    </div>
  );
};

export default SystemLogs;
