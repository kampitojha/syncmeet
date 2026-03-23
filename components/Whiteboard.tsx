import React, { useRef, useEffect, useState } from 'react';
import { signaling } from '../services/signaling';
import { DrawLinePayload, SignalPayload } from '../types';
import { Eraser, Trash2, PenTool, Download, Palette, Type } from 'lucide-react';

interface WhiteboardProps {
  roomId: string;
}

const Whiteboard: React.FC<WhiteboardProps> = ({ roomId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#00f2ff');
  const [lineWidth, setLineWidth] = useState(4);
  const [prevPos, setPrevPos] = useState<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCtx?.drawImage(canvas, 0, 0);

        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = "#0a0a0a";
            ctx.fillRect(0,0, canvas.width, canvas.height);
            ctx.drawImage(tempCanvas, 0, 0);
        }
      }
    };

    window.addEventListener('resize', resize);
    resize();
    return () => window.removeEventListener('resize', resize);
  }, []);

  const drawLine = (currPos: {x: number, y: number}, style: { color: string, width: number }, emit: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas || !prevPos) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(prevPos.x, prevPos.y);
    ctx.lineTo(currPos.x, currPos.y);
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    if (emit) {
        signaling.sendDrawLine(roomId, {
            prev: { x: prevPos.x / canvas.width, y: prevPos.y / canvas.height },
            curr: { x: currPos.x / canvas.width, y: currPos.y / canvas.height },
            color: style.color,
            width: style.width
        });
    }
    setPrevPos(currPos);
  };

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    setIsDrawing(true);
    setPrevPos({ x, y });
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    drawLine({ x, y }, { color, width: lineWidth }, true);
  };

  const stopDrawing = () => { setIsDrawing(false); setPrevPos(null); };

  const clearBoard = (emit: boolean = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (emit) signaling.sendClearBoard(roomId);
  };

  const exportBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `whiteboard-${new Date().getTime()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  useEffect(() => {
    const handleDraw = (payload: SignalPayload) => {
        if (payload.roomId !== roomId) return;
        const { prev, curr, color: remoteColor, width } = payload.payload;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.beginPath();
        ctx.moveTo(prev.x * canvas.width, prev.y * canvas.height);
        ctx.lineTo(curr.x * canvas.width, curr.y * canvas.height);
        ctx.strokeStyle = remoteColor;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.stroke();
    };
    const handleClear = (payload: SignalPayload) => { if (payload.roomId !== roomId) return; clearBoard(false); };
    signaling.on('draw-line', handleDraw);
    signaling.on('clear-board', handleClear);
    return () => { signaling.off('draw-line', handleDraw); signaling.off('clear-board', handleClear); };
  }, [roomId]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] overflow-hidden relative group font-sans">
        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-4 glass-card-bright p-3 px-6 rounded-[2rem] border border-white/10 z-[70] shadow-2xl transition-all hover:border-cyan-400/30">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-8 cursor-pointer bg-transparent border-none rounded-full overflow-hidden" />
            <div className="w-[1px] h-8 bg-white/10 mx-1" />
            {[2, 6, 12, 24].map(w => (
                <button key={w} onClick={() => { setLineWidth(w); if (color === '#0a0a0a') setColor('#00f2ff'); }} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${lineWidth === w && color !== '#0a0a0a' ? 'bg-cyan-400 text-black' : 'hover:bg-white/10 text-white/40'}`}>
                    <div className="bg-current rounded-full" style={{ width: Math.min(w, 14), height: Math.min(w, 14) }} />
                </button>
            ))}
            <div className="w-[1px] h-8 bg-white/10 mx-1" />
            <button onClick={() => { setColor('#0a0a0a'); setLineWidth(40); }} className={`p-2 rounded-xl transition-all ${color === '#0a0a0a' ? 'bg-cyan-400 text-black' : 'text-white/40 hover:bg-white/10 hover:text-white'}`} title="Eraser"> <Eraser size={20} strokeWidth={2.5} /> </button>
            <button onClick={() => clearBoard(true)} className="p-2 rounded-xl text-white/40 hover:bg-red-500 hover:text-white transition-all"> <Trash2 size={20} strokeWidth={2.5} /> </button>
            <div className="w-[1px] h-8 bg-white/10 mx-1" />
            <button onClick={exportBoard} className="p-2 rounded-xl bg-cyan-400 text-black hover:bg-white transition-all shadow-lg shadow-cyan-400/20" title="Export Board"> <Download size={20} strokeWidth={2.5} /> </button>
        </div>
        <div className="flex-1 relative cursor-crosshair">
            <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} className="w-full h-full block touch-none" />
             <div className="absolute bottom-8 right-10 glass-card p-2 px-5 rounded-2xl border border-white/5 text-[9px] font-black uppercase tracking-[0.3em] italic text-white/20 pointer-events-none"> MESH_DRAW_ENGINE_v4 </div>
        </div>
    </div>
  );
};

export default Whiteboard;