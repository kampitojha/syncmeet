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
  const [color, setColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(3);
  const [prevPos, setPrevPos] = useState<{ x: number, y: number } | null>(null);

  // Resize handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        // Create temp canvas to save content during resize
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCtx?.drawImage(canvas, 0, 0);

        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        
        // Restore
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
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
    ctx.lineCap = 'round';
    ctx.stroke();

    if (emit) {
        // Normalize coordinates to 0-1 range for resolution independence
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
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
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

        // Denormalize
        const x1 = prev.x * canvas.width;
        const y1 = prev.y * canvas.height;
        const x2 = curr.x * canvas.width;
        const y2 = curr.y * canvas.height;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = remoteColor;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
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
    <div className="flex flex-col h-full bg-gray-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative group">
        
        {/* Toolbar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-gray-800/90 backdrop-blur p-2 rounded-xl border border-white/10 shadow-xl z-10 transition-opacity opacity-0 group-hover:opacity-100">
            <input 
                type="color" 
                value={color} 
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
            />
            <div className="w-px h-6 bg-gray-600 mx-1" />
            
            {[2, 5, 10].map(w => (
                <button 
                    key={w}
                    onClick={() => { setLineWidth(w); setColor(color === '#030712' ? '#ffffff' : color); }}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg ${lineWidth === w && color !== '#030712' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-white/10'}`}
                >
                    <div className="bg-current rounded-full" style={{ width: w, height: w }} />
                </button>
            ))}
            
            <button 
                onClick={() => { setColor('#030712'); setLineWidth(20); }} // Eraser mode (paint bg color)
                className={`p-2 rounded-lg ${color === '#030712' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-white/10'}`}
                title="Eraser"
            >
                <Eraser size={18} />
            </button>
            
             <button 
                onClick={() => clearBoard(true)}
                className="p-2 rounded-lg text-red-400 hover:bg-red-500/10"
                title="Clear All"
            >
                <Trash2 size={18} />
            </button>
        </div>

        <div className="flex-1 relative cursor-crosshair bg-[#030712]">
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
             <div className="absolute bottom-4 right-4 text-xs text-gray-600 pointer-events-none select-none">
                Collaborative Whiteboard
            </div>
        </div>
    </div>
  );
};

export default Whiteboard;