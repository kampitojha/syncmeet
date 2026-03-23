import React, { useRef, useEffect, useState } from 'react';
import { signaling } from '../services/signaling';
import { DrawLinePayload, SignalPayload } from '../types';
import { Eraser, Trash2, Download } from 'lucide-react';

interface WhiteboardProps {
  roomId: string;
}

const Whiteboard: React.FC<WhiteboardProps> = ({ roomId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(4);
  const [prevPos, setPrevPos] = useState<{ x: number, y: number } | null>(null);

  const [cursorPos, setCursorPos] = useState<{ x: number, y: number } | null>(null);

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
            ctx.fillStyle = "#ffffff";
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

  const updateCursor = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    setCursorPos({ x, y });
    return { x, y };
  };

  const startDrawing = (e: any) => {
    const pos = updateCursor(e);
    if (pos) {
        setIsDrawing(true);
        setPrevPos(pos);
    }
  };

  const draw = (e: any) => {
    const pos = updateCursor(e);
    if (!isDrawing || !pos) return;
    drawLine(pos, { color, width: lineWidth }, true);
  };

  const stopDrawing = () => { 
    setIsDrawing(false); 
    setPrevPos(null); 
  };

  const clearBoard = (emit: boolean = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = "#ffffff";
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
    <div className="flex flex-col h-full bg-white overflow-hidden relative group font-mono text-black">
        {/* Toolbar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 brutal-card bg-white p-2 border-4 border-black z-[70] shadow-[6px_6px_0px_black]">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-8 brutal-card border-2 cursor-pointer bg-white" />
            <div className="w-[2px] h-8 bg-black mx-1" />
            
            {[2, 6, 12, 24].map(w => (
                <button 
                  key={w} 
                  onClick={() => { setLineWidth(w); if (color === '#ffffff') setColor('#000000'); }} 
                  className={`w-8 h-8 brutal-card border-2 flex items-center justify-center transition-all ${lineWidth === w && color !== '#ffffff' ? 'bg-[#ffdf1e]' : 'bg-white hover:bg-[#e0e0e0]'}`}
                >
                    <div className="bg-black rounded-full" style={{ width: Math.min(w/2, 14), height: Math.min(w/2, 14) }} />
                </button>
            ))}
            
            <div className="w-[2px] h-8 bg-black mx-1" />
            
            <button 
              onClick={() => { setColor('#ffffff'); setLineWidth(40); }} 
              className={`p-2 brutal-card border-2 transition-all ${color === '#ffffff' ? 'bg-[#ffdf1e]' : 'bg-white hover:bg-[#e0e0e0]'}`} 
              title="Eraser"
            > 
              <Eraser size={20} strokeWidth={3} /> 
            </button>
            
            <button 
              onClick={() => clearBoard(true)} 
              className="p-2 brutal-card border-2 bg-white hover:bg-[#ff5e5e] hover:text-white transition-all"
            > 
              <Trash2 size={20} strokeWidth={3} /> 
            </button>
            
            <div className="w-[2px] h-8 bg-black mx-1" />
            
            <button 
              onClick={exportBoard} 
              className="brutal-btn-primary p-2" 
              title="Export"
            > 
              <Download size={20} strokeWidth={3} /> 
            </button>
        </div>

        <div 
            className="flex-1 relative overflow-hidden" 
            onMouseMove={updateCursor} 
            onMouseLeave={() => setCursorPos(null)}
            style={{ cursor: 'none' }}
        >
            <canvas 
                ref={canvasRef} 
                onMouseDown={startDrawing} 
                onMouseMove={draw} 
                onMouseUp={stopDrawing} 
                onMouseLeave={stopDrawing} 
                onTouchStart={startDrawing} 
                onTouchMove={draw} 
                onTouchEnd={stopDrawing} 
                className="w-full h-full block touch-none cursor-none bg-white" 
            />
            
            {/* Visual Virtual Cursor */}
            {cursorPos && (
                <div 
                    className="absolute pointer-events-none z-[65] border-2 border-black"
                    style={{ 
                        left: cursorPos.x, 
                        top: cursorPos.y, 
                        width: Math.max(lineWidth, 8), 
                        height: Math.max(lineWidth, 8),
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: color === '#ffffff' ? 'rgba(0,0,0,0.1)' : color
                    }}
                />
            )}

             <div className="absolute bottom-4 right-4 bg-black text-white p-2 font-black uppercase text-[8px] tracking-widest shadow-[4px_4px_0px_#ffdf1e]"> MESH_WHITEBOARD_v4 </div>
        </div>
    </div>
  );
};

export default Whiteboard;