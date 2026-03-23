import React, { useRef, useEffect, useState } from 'react';
import { signaling } from '../services/signaling';
import { DrawLinePayload, SignalPayload } from '../types';
import { Eraser, Trash2, PenTool } from 'lucide-react';

interface WhiteboardProps {
  roomId: string;
}

const Whiteboard: React.FC<WhiteboardProps> = ({ roomId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(4);
  const [prevPos, setPrevPos] = useState<{ x: number, y: number } | null>(null);

  // Resize handling
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
            ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
        }
      }
    };

    window.addEventListener('resize', resize);
    resize();

    return () => window.removeEventListener('resize', resize);
  }, []);

  // Drawing Logic
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
    ctx.lineCap = 'square';
    ctx.stroke();

    if (emit) {
        const normalizedPrev = { x: prevPos.x / canvas.width, y: prevPos.y / canvas.height };
        const normalizedCurr = { x: currPos.x / canvas.width, y: currPos.y / canvas.height };
        
        signaling.sendDrawLine(roomId, {
            prev: normalizedPrev,
            curr: normalizedCurr,
            color: style.color,
            width: style.width
        });
    }

    setPrevPos(currPos);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if ('touches' in e) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
    } else {
        x = (e as React.MouseEvent).clientX - rect.left;
        y = (e as React.MouseEvent).clientY - rect.top;
    }

    setIsDrawing(true);
    setPrevPos({ x, y });
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
    } else {
        x = (e as React.MouseEvent).clientX - rect.left;
        y = (e as React.MouseEvent).clientY - rect.top;
    }

    drawLine({ x, y }, { color, width: lineWidth }, true);
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

  // Remote Events
  useEffect(() => {
    const handleDraw = (payload: SignalPayload) => {
        if (payload.roomId !== roomId) return;
        const { prev, curr, color: remoteColor, width } = payload.payload as DrawLinePayload;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const x1 = prev.x * canvas.width;
        const y1 = prev.y * canvas.height;
        const x2 = curr.x * canvas.width;
        const y2 = curr.y * canvas.height;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = remoteColor;
        ctx.lineWidth = width;
        ctx.lineCap = 'square';
        ctx.stroke();
    };

    const handleClear = (payload: SignalPayload) => {
        if (payload.roomId !== roomId) return;
        clearBoard(false);
    };

    signaling.on('draw-line', handleDraw);
    signaling.on('clear-board', handleClear);
    return () => {
        signaling.off('draw-line', handleDraw);
        signaling.off('clear-board', handleClear);
    };
  }, [roomId]);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden relative group font-bold">
        
        {/* Toolbar */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[#ffdf00] p-4 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-10 transition-transform hover:scale-105">
            <input 
                type="color" 
                value={color} 
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 cursor-pointer bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            />
            <div className="w-1.5 h-10 bg-black mx-1" />
            
            {[2, 6, 12, 24].map(w => (
                <button 
                    key={w}
                    onClick={() => { setLineWidth(w); if (color === '#ffffff') setColor('#000000'); }}
                    className={`w-10 h-10 flex items-center justify-center border-4 border-black transition-all active:translate-x-0.5 active:translate-y-0.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none ${lineWidth === w && color !== '#ffffff' ? 'bg-black text-[#ffdf00]' : 'bg-white text-black hover:bg-black hover:text-white'}`}
                >
                    <div className="bg-current" style={{ width: Math.min(w, 16), height: Math.min(w, 16) }} />
                </button>
            ))}
            
            <button 
                onClick={() => { setColor('#ffffff'); setLineWidth(40); }} 
                className={`p-2 border-4 border-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none ${color === '#ffffff' ? 'bg-black text-[#ffdf00]' : 'bg-white text-black hover:bg-black hover:text-white'}`}
                title="Eraser"
            >
                <Eraser size={24} strokeWidth={3} />
            </button>
            
             <button 
                onClick={() => clearBoard(true)}
                className="p-2 border-4 border-black bg-red-400 text-black hover:bg-black hover:text-red-400 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none"
                title="Clear All"
            >
                <Trash2 size={24} strokeWidth={3} />
            </button>
        </div>

        <div className="flex-1 relative cursor-crosshair bg-white">
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-full block touch-none"
            />
             {/* Hint when empty */}
             <div className="absolute bottom-6 right-6 text-xs text-black font-black uppercase italic border-2 border-black bg-[#ffdf00] px-3 py-1 pointer-events-none select-none">
                PROTOCOL_WHITEBOARD_v3
            </div>
        </div>
    </div>
  );
};

export default Whiteboard;