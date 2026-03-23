import React, { useState } from 'react';
import { Plus, BarChart3, Trash2 } from 'lucide-react';
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
    <div className="flex flex-col h-full bg-[#f0f0f0] font-mono text-black">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {polls.length === 0 && !showCreate && (
          <div className="h-full flex flex-col items-center justify-center opacity-40 space-y-4">
            <BarChart3 size={48} strokeWidth={3} />
            <span className="uppercase tracking-widest font-black text-xs text-center px-6">NO active polls. Start one below.</span>
          </div>
        )}

        {polls.map((poll) => (
          <div key={poll.id} className="brutal-card bg-white p-4 space-y-4 border-4 border-black shadow-[6px_6px_0px_black]">
            <div className="bg-[#ffdf1e] border-b-4 border-black -m-4 mb-4 p-3 shadow-none">
              <h4 className="font-black text-sm uppercase leading-tight tracking-tight">{poll.question}</h4>
              <p className="text-[9px] font-black uppercase mt-1 opacity-60">{poll.totalVotes} Votes Registered</p>
            </div>

            <div className="space-y-2">
              {poll.options.map((option) => {
                const percentage = poll.totalVotes > 0 ? (option.votes / poll.totalVotes) * 100 : 0;
                return (
                  <button
                    key={option.id}
                    onClick={() => onVote(poll.id, option.id)}
                    className="w-full relative group flex flex-col p-3 border-2 border-black hover:bg-[#e0e0e0] transition-all overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-[#00ff9d] transition-all duration-500 origin-left" style={{ width: `${percentage}%` }} />
                    <div className="relative flex justify-between items-center z-10 w-full">
                      <span className="text-[11px] font-black uppercase truncate">{option.text}</span>
                      <span className="text-[10px] font-black tabular-nums">{Math.round(percentage)}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {showCreate && (
          <div className="brutal-card bg-white p-4 space-y-4 border-4 border-black animate-slide-up shadow-[8px_8px_0px_black]">
            <div className="bg-black text-white p-2 text-center -m-4 mb-4 font-black uppercase tracking-widest text-[10px]">CREATE_NEW_POLL</div>
            
            <input 
              type="text" 
              placeholder="QUESTION..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="brutal-input w-full p-3 font-black text-xs uppercase"
            />
            
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder={`OPTION ${i+1}`}
                    value={opt}
                    onChange={(e) => handleOptionChange(i, e.target.value)}
                    className="flex-1 brutal-input p-2.5 text-xs font-black uppercase"
                  />
                  {options.length > 2 && (
                    <button onClick={() => handleRemoveOption(i)} className="brutal-btn p-2 bg-[#ff5e5e] text-white">
                      <Trash2 size={14} strokeWidth={3} />
                    </button>
                  )}
                </div>
              ))}
              <button 
                onClick={handleAddOption}
                className="w-full py-2 border-2 border-dashed border-black font-black uppercase text-[9px] hover:bg-[#e0e0e0] transition-all"
              >
                + ADD_OPTION
              </button>
            </div>
            
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 brutal-btn p-3 bg-white font-black uppercase text-[10px]">CANCEL</button>
              <button onClick={handleCreate} className="flex-1 brutal-btn-primary p-3 font-black uppercase text-[10px]">CONFIRM</button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t-4 border-black">
        <div className="flex gap-2">
          <button 
            onClick={() => setShowCreate(true)}
            className="flex-1 brutal-btn-primary p-4 flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px]"
          >
            <Plus size={18} strokeWidth={3} /> NEW_POLL
          </button>
          <button 
             onClick={onClear}
             className="brutal-btn p-4 bg-[#ff5e5e] text-white flex items-center justify-center"
          >
             <Trash2 size={18} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Polls;
