import React, { useState } from 'react';
import { Plus, BarChart3, Trash2, CheckCircle2 } from 'lucide-react';
import { Poll } from '../types';

interface PollsProps {
  polls: Poll[];
  onVote: (pollId: string, optionId: string) => void;
  onCreate: (question: string, options: string[]) => void;
  onClear: () => void;
}

const Polls: React.FC<PollsProps> = ({ polls, onVote, onCreate, onClear }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const handleAddOption = () => setOptions([...options, '']);
  const handleRemoveOption = (index: number) => setOptions(options.filter((_, i) => i !== index));
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreate = () => {
    if (question && options.filter(o => o.trim()).length >= 2) {
      onCreate(question, options.filter(o => o.trim()));
      setQuestion('');
      setOptions(['', '']);
      setShowCreate(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f8f8] font-mono text-black brutal-grid-dot relative">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 custom-scrollbar pb-10">
        {polls.length === 0 && !showCreate && (
          <div className="h-full flex flex-col items-center justify-center opacity-40 space-y-4 md:space-y-6">
            <div className="p-4 md:p-6 bg-white border-4 md:border-8 border-black shadow-[8px_8px_0px_rgba(0,0,0,0.1)] md:shadow-[15px_15px_0px_rgba(0,0,0,0.1)] -rotate-6">
                <BarChart3 className="w-10 h-10 md:w-16 md:h-16 text-[var(--brutal-yellow)]" strokeWidth={3} />
            </div>
            <span className="uppercase tracking-[0.2em] md:tracking-[0.3em] font-black text-[8px] md:text-[10px] text-center px-6 md:px-10 leading-relaxed italic">NO_POLLS_INTEL. INITIATE_PROTOCOL_BELOW_</span>
          </div>
        )}

        {polls.map((poll) => (
          <div key={poll.id} className="brutal-card bg-white p-4 md:p-6 space-y-4 md:space-y-6 border-[4px] md:border-[6px] border-black shadow-[8px_8px_0px_#000] md:shadow-[12px_12px_0px_#000] animate-slide-up">
            <div className="bg-[var(--brutal-pink)] text-white border-4 border-black -m-4 md:-m-6 mb-4 md:mb-8 p-4 md:p-5 shadow-[5px_5px_0px_#000] md:shadow-[8px_8px_0px_#000] md:rotate-1">
              <div className="flex justify-between items-start">
                  <h4 className="font-black text-sm md:text-lg uppercase leading-none tracking-tighter italic mr-4">{poll.question}</h4>
                  <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-white shrink-0" strokeWidth={3} />
              </div>
              <div className="flex items-center gap-2 md:gap-3 mt-3 md:mt-4 pt-3 md:pt-4 border-t-2 border-white/20">
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">{poll.totalVotes} RESPONSES</span>
              </div>
            </div>

            <div className="space-y-3 md:space-y-4 pt-1 md:pt-2">
              {poll.options.map((option) => {
                const percentage = poll.totalVotes > 0 ? (option.votes / poll.totalVotes) * 100 : 0;
                return (
                  <button
                    key={option.id}
                    onClick={() => onVote(poll.id, option.id)}
                    className="w-full relative group flex flex-col p-3 md:p-4 border-[3px] md:border-4 border-black transition-all overflow-hidden bg-white active:translate-x-1 active:translate-y-1 active:shadow-none"
                  >
                    <div className="absolute inset-y-0 left-0 bg-[var(--brutal-green)] transition-all duration-700 origin-left border-r-2 md:border-r-4 border-black" style={{ width: `${percentage}%` }}>
                        {/* Checkered Pattern Overlay */}
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%, transparent 50%, #000 50%, #000 75%, transparent 75%, transparent)', backgroundSize: '16px 16px' }} />
                    </div>
                    <div className="relative flex justify-between items-center z-10 w-full gap-2">
                      <span className="text-[10px] md:text-[12px] font-black uppercase truncate italic">{option.text}</span>
                      <div className="bg-black text-white px-2 md:px-3 py-0.5 md:py-1 text-[9px] md:text-[11px] font-black tabular-nums border-2 border-white shadow-[2px_2px_0px_#000] shrink-0">
                         {Math.round(percentage)}%
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {showCreate && (
          <div className="brutal-card bg-white p-6 md:p-8 space-y-6 md:space-y-8 border-[4px] md:border-[6px] border-black animate-slide-up shadow-[10px_10px_0px_#000] md:shadow-[15px_15px_0px_#000]">
            <div className="bg-[var(--brutal-orange)] text-white p-3 md:p-4 border-4 border-black -m-6 md:-m-8 mb-4 md:mb-4 font-black uppercase tracking-widest text-[10px] md:text-sm italic shadow-[5px_5px_0px_#000] md:shadow-[8px_8px_0px_#000]">INIT_DATA_GATHERING</div>
            
            <div className="space-y-1.5 md:space-y-2 pt-2 md:pt-4">
                <label className="text-[8px] md:text-[10px] font-black uppercase ml-1">PRIMARY_QUERY</label>
                <input 
                type="text" 
                placeholder="PROMPT..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="brutal-input w-full p-3 md:p-4 font-black text-xs md:text-sm uppercase italic border-[3px] md:border-4"
                />
            </div>
            
            <div className="space-y-3 md:space-y-4">
              <label className="text-[8px] md:text-[10px] font-black uppercase ml-1">RESPONSE_MODES</label>
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2 md:gap-3">
                  <input 
                    type="text" 
                    placeholder={`SLOT_${i+1}`}
                    value={opt}
                    onChange={(e) => handleOptionChange(i, e.target.value)}
                    className="flex-1 brutal-input p-3 md:p-4 text-[10px] md:text-xs font-black uppercase border-[3px] md:border-4"
                  />
                  {options.length > 2 && (
                    <button onClick={() => handleRemoveOption(i)} className="brutal-btn p-2 md:p-3 bg-[var(--brutal-red)] text-white w-10 md:w-14 flex items-center justify-center shrink-0">
                      <Trash2 className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
                    </button>
                  )}
                </div>
              ))}
              <button 
                onClick={handleAddOption}
                className="w-full py-3 md:py-4 border-2 md:border-4 border-dashed border-black font-black uppercase text-[8px] md:text-[10px] hover:bg-[var(--brutal-yellow)] transition-all bg-[#f8f8f8]"
              >
                + ADD_SLOT
              </button>
            </div>
            
            <div className="flex gap-2 md:gap-4 pt-2 md:pt-4">
              <button onClick={() => setShowCreate(false)} className="flex-1 brutal-btn p-3 md:p-4 bg-white font-black uppercase text-[10px] md:text-xs">ABORT</button>
              <button onClick={handleCreate} className="flex-1 brutal-btn-violet p-3 md:p-4 font-black uppercase text-[10px] md:text-xs shadow-[5px_5px_0px_#000] md:shadow-[8px_8px_0px_#000]">TRANSMIT</button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 bg-white border-t-[4px] md:border-t-[6px] border-black shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <div className="flex gap-2 md:gap-4">
          <button 
            onClick={() => setShowCreate(true)}
            className="flex-1 brutal-btn-primary p-4 md:p-5 flex items-center justify-center gap-2 md:gap-3 font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-[10px] md:text-xs shadow-[5px_5px_0px_#000] md:shadow-[8px_8px_0px_#000]"
          >
            <Plus className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} /> NEW_POLL
          </button>
          <button 
             onClick={onClear}
             className="brutal-btn p-4 md:p-5 bg-[var(--brutal-red)] text-white flex items-center justify-center w-14 md:w-20 shadow-[5px_5px_0px_#000] md:shadow-[8px_8px_0px_#000]"
             title="PURGE_POLLS"
          >
             <Trash2 className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Polls;
