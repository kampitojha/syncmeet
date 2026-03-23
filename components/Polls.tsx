import React, { useState } from 'react';
import { Plus, CheckCircle2, BarChart3, Trash2, Send } from 'lucide-react';
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
    <div className="flex flex-col h-full bg-transparent font-sans text-white/90">
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {polls.length === 0 && !showCreate && (
          <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-4">
            <BarChart3 size={48} className="text-cyan-400" />
            <span className="uppercase tracking-[0.2em] font-bold">No active polls in session.</span>
          </div>
        )}

        {polls.map((poll) => (
          <div key={poll.id} className="glass-card p-6 rounded-3xl border border-white/10 shadow-xl space-y-4 animate-fade-in group">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-extrabold text-lg leading-tight uppercase tracking-tight">{poll.question}</h4>
                <p className="text-[10px] text-white/30 uppercase mt-1">Creator: {poll.creatorName} • {poll.totalVotes} Votes</p>
              </div>
            </div>

            <div className="space-y-3">
              {poll.options.map((option) => {
                const percentage = poll.totalVotes > 0 ? (option.votes / poll.totalVotes) * 100 : 0;
                return (
                  <button
                    key={option.id}
                    onClick={() => onVote(poll.id, option.id)}
                    className="w-full relative group/option flex flex-col p-4 rounded-xl border border-white/5 hover:border-cyan-400/30 transition-all overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-cyan-400/5 transition-transform duration-1000 origin-left" style={{ transform: `scaleX(${percentage / 100})` }} />
                    <div className="relative flex justify-between items-center z-10 w-full">
                      <span className="text-sm font-bold truncate">{option.text}</span>
                      <span className="text-[10px] font-black tabular-nums opacity-60">{Math.round(percentage)}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {showCreate && (
          <div className="glass-card-bright p-6 rounded-[2.5rem] border border-cyan-400/20 shadow-2xl space-y-6 animate-slide-up">
            <div className="flex items-center gap-3">
              <Plus className="text-cyan-400" size={20} />
              <h4 className="font-black uppercase tracking-widest text-xs">CREATE_NEW_POLL</h4>
            </div>
            <input 
              type="text" 
              placeholder="Question_"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full bg-white/5 border border-white/20 p-5 rounded-2xl outline-none focus:border-cyan-400/50 transition-all font-bold text-sm"
            />
            <div className="space-y-3">
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder={`Option ${i+1}`}
                    value={opt}
                    onChange={(e) => handleOptionChange(i, e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:border-cyan-400/30 text-xs font-bold"
                  />
                  {options.length > 2 && (
                    <button onClick={() => handleRemoveOption(i)} className="p-4 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-opacity">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button 
                onClick={handleAddOption}
                className="w-full py-3 rounded-xl border-2 border-dashed border-white/10 text-white/30 hover:text-white hover:border-white/20 transition-all uppercase text-[10px] font-black"
              >
                + ADD_OPTION
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-4 rounded-2xl bg-white/5 text-white/40 font-bold uppercase text-[10px] tracking-widest">CANCEL</button>
              <button onClick={handleCreate} className="flex-1 py-4 rounded-2xl bg-cyan-400 text-black font-black uppercase text-[10px] tracking-widest shadow-lg shadow-cyan-400/20">CONFIRM_LINK</button>
            </div>
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="flex gap-3">
          <button 
            onClick={() => setShowCreate(true)}
            className="flex-1 h-14 bg-cyan-400 text-black rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] shadow-xl shadow-cyan-400/20 transition-all"
          >
            <Plus size={18} /> CREATE_POLL_PROTO
          </button>
          <button 
             onClick={onClear}
             className="h-14 w-14 glass-card rounded-2xl border border-white/5 text-white/30 hover:text-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-center"
          >
             <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Polls;
