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
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-10">
        {polls.length === 0 && !showCreate && (
          <div className="h-full flex flex-col items-center justify-center opacity-40 space-y-6">
            <div className="p-6 bg-white border-8 border-black shadow-[15px_15px_0px_rgba(0,0,0,0.1)] -rotate-6">
                <BarChart3 size={64} strokeWidth={3} className="text-[var(--brutal-yellow)]" />
            </div>
            <span className="uppercase tracking-[0.3em] font-black text-[10px] text-center px-10 leading-relaxed italic">NO_POLLS_INTEL_GATHERED. INITIATE_PROTOCOL_BELOW_</span>
          </div>
        )}

        {polls.map((poll) => (
          <div key={poll.id} className="brutal-card bg-white p-6 space-y-6 border-[6px] border-black shadow-[12px_12px_0px_#000] animate-slide-up">
            <div className="bg-[var(--brutal-pink)] text-white border-4 border-black -m-6 mb-8 p-5 shadow-[8px_8px_0px_#000] rotate-1">
              <div className="flex justify-between items-start">
                  <h4 className="font-black text-lg uppercase leading-none tracking-tighter italic mr-4">{poll.question}</h4>
                  <CheckCircle2 size={24} strokeWidth={3} className="text-white shrink-0" />
              </div>
              <div className="flex items-center gap-3 mt-4 pt-4 border-t-2 border-white/20">
                <span className="text-[10px] font-black uppercase tracking-widest">{poll.totalVotes} RESPONSES_REGISTERED</span>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              {poll.options.map((option) => {
                const percentage = poll.totalVotes > 0 ? (option.votes / poll.totalVotes) * 100 : 0;
                return (
                  <button
                    key={option.id}
                    onClick={() => onVote(poll.id, option.id)}
                    className="w-full relative group flex flex-col p-4 border-4 border-black transition-all overflow-hidden bg-white hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                  >
                    <div className="absolute inset-0 bg-[var(--brutal-green)] transition-all duration-700 origin-left border-r-4 border-black" style={{ width: `${percentage}%` }}>
                        {/* Checkered Pattern Overlay */}
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%, transparent 50%, #000 50%, #000 75%, transparent 75%, transparent)', backgroundSize: '20px 20px' }} />
                    </div>
                    <div className="relative flex justify-between items-center z-10 w-full">
                      <span className="text-[12px] font-black uppercase truncate italic">{option.text}</span>
                      <div className="bg-black text-white px-3 py-1 text-[11px] font-black tabular-nums border-2 border-white shadow-[3px_3px_0px_#000]">
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
          <div className="brutal-card bg-white p-8 space-y-8 border-[6px] border-black animate-slide-up shadow-[15px_15px_0px_#000]">
            <div className="bg-[var(--brutal-orange)] text-white p-4 border-4 border-black -m-8 mb-4 font-black uppercase tracking-widest text-sm italic shadow-[8px_8px_0px_#000]">INITIATE_DATA_GATHERING</div>
            
            <div className="space-y-2 pt-4">
                <label className="text-[10px] font-black uppercase ml-1">PRIMARY_QUERY</label>
                <input 
                type="text" 
                placeholder="ENTER_QUESTION..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="brutal-input w-full p-4 font-black text-sm uppercase italic border-4"
                />
            </div>
            
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase ml-1">RESPONSE_MODES</label>
              {options.map((opt, i) => (
                <div key={i} className="flex gap-3">
                  <input 
                    type="text" 
                    placeholder={`DATA_SLOT_${i+1}`}
                    value={opt}
                    onChange={(e) => handleOptionChange(i, e.target.value)}
                    className="flex-1 brutal-input p-4 text-xs font-black uppercase border-4"
                  />
                  {options.length > 2 && (
                    <button onClick={() => handleRemoveOption(i)} className="brutal-btn p-3 bg-[var(--brutal-red)] text-white w-14 flex items-center justify-center">
                      <Trash2 size={24} strokeWidth={3} />
                    </button>
                  )}
                </div>
              ))}
              <button 
                onClick={handleAddOption}
                className="w-full py-4 border-4 border-dashed border-black font-black uppercase text-[10px] hover:bg-[var(--brutal-yellow)] transition-all bg-[#f8f8f8]"
              >
                + ADD_SLOT_IDENTIFIER
              </button>
            </div>
            
            <div className="flex gap-4 pt-4">
              <button onClick={() => setShowCreate(false)} className="flex-1 brutal-btn p-4 bg-white font-black uppercase text-xs">ABORT</button>
              <button onClick={handleCreate} className="flex-1 brutal-btn-violet p-4 font-black uppercase text-xs shadow-[8px_8px_0px_#000]">TRANSMIT</button>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-white border-t-[6px] border-black shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <div className="flex gap-4">
          <button 
            onClick={() => setShowCreate(true)}
            className="flex-1 brutal-btn-primary p-5 flex items-center justify-center gap-3 font-black uppercase tracking-[0.2em] text-xs shadow-[8px_8px_0px_#000]"
          >
            <Plus size={24} strokeWidth={3} /> NEW_POLL_v4
          </button>
          <button 
             onClick={onClear}
             className="brutal-btn p-5 bg-[var(--brutal-red)] text-white flex items-center justify-center w-20 shadow-[8px_8px_0px_#000]"
             title="PURGE_POLLS"
          >
             <Trash2 size={24} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Polls;
