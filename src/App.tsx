import * as htmlToImage from 'html-to-image';
import { AnimatePresence, motion } from 'motion/react';
import React, { MouseEvent as ReactMouseEvent, useState, useRef } from 'react';
import {
  BringToFront,
  Circle,
  Copy,
  Download,
  Eraser,
  LayoutTemplate,
  MousePointer2,
  Pen,
  Ruler,
  Scissors,
  SendToBack,
  Square,
  Trash,
  Trash2,
  Triangle,
  Type,
  Undo2,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
} from 'lucide-react';

type ShapeCategory = 'triangle' | 'circle' | 'quadrilateral' | 'tools';
type ToolMode = 'select' | 'draw' | 'text';

type ShapeType =
  | 'triangle-equilateral'
  | 'triangle-right'
  | 'triangle-isosceles'
  | 'triangle-scalene'
  | 'circle'
  | 'circle-half'
  | 'square'
  | 'rectangle'
  | 'parallelogram'
  | 'trapezoid'
  | 'rhombus'
  | 'kite'
  | 'text'
  | 'custom-polygon'
  | 'ruler'
  | 'protractor';

interface CanvasShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  color: string;
  customPoints?: string;
  textString?: string;
  fontSize?: number;
}

interface Stroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

const TRIANGLE_POINTS = {
  'triangle-equilateral': [[60, 0], [120, 120], [0, 120]],
  'triangle-right': [[0, 0], [0, 120], [120, 120]],
  'triangle-isosceles': [[60, 0], [96, 120], [24, 120]],
  'triangle-scalene': [[84, 0], [120, 120], [0, 120]],
};

function interp(pA: number[], pB: number[], t: number) {
  return [pA[0] + (pB[0] - pA[0]) * t, pA[1] + (pB[1] - pA[1]) * t];
}
function ptsToString(pts: number[][]) {
  return pts.map((p) => `${p[0]},${p[1]}`).join(' ');
}
function getSvgPathFromPoints(points: { x: number; y: number }[]) {
  if (!points || points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

const COLORS = [
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#22c55e', // green-500
  '#eab308', // yellow-500
  '#a855f7', // purple-500
  '#ec4899', // pink-500
  '#f97316', // orange-500
  '#64748b', // slate-500
  '#000000', // black
];

export default function App() {
  const [shapes, setShapes] = useState<CanvasShape[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<ShapeCategory | null>(null);

  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [drawColor, setDrawColor] = useState<string>('#3b82f6');
  const [drawWidth, setDrawWidth] = useState<number>(4);

  // Undo history
  const [history, setHistory] = useState<{shapes: CanvasShape[], strokes: Stroke[]}[]>([]);

  const canvasRef = useRef<HTMLDivElement>(null);

  const saveToHistory = (newShapes: CanvasShape[], newStrokes: Stroke[]) => {
    setHistory((prev) => [...prev.slice(-10), { shapes: newShapes, strokes: newStrokes }]);
  };

  const undo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setShapes(previous.shapes);
    setStrokes(previous.strokes);
    setHistory(history.slice(0, -1));
    setSelectedId(null);
  };

  const selectedShape = shapes.find((s) => s.id === selectedId);

  const addShape = (type: ShapeType) => {
    saveToHistory(shapes, strokes);
    const newShape: CanvasShape = {
      id: crypto.randomUUID(),
      type,
      x: window.innerWidth / 2 - 50,
      y: window.innerHeight / 2 - 50,
      scale: 1,
      rotation: 0,
      opacity: 0.8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
    setShapes([...shapes, newShape]);
    setSelectedId(newShape.id);
    setActiveCategory(null); // Close menu after adding
  };

  const updateShape = (id: string, updates: Partial<CanvasShape>, bypassHistory = false) => {
    if (!bypassHistory) saveToHistory(shapes, strokes);
    setShapes((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const cloneShape = () => {
    if (!selectedShape) return;
    saveToHistory(shapes, strokes);
    const newShape = {
      ...selectedShape,
      id: crypto.randomUUID(),
      x: selectedShape.x + 40,
      y: selectedShape.y + 40,
    };
    setShapes([...shapes, newShape]);
    setSelectedId(newShape.id);
  };

  const deleteShape = () => {
    if (!selectedShape) return;
    saveToHistory(shapes, strokes);
    setShapes(shapes.filter((s) => s.id !== selectedShape.id));
    setSelectedId(null);
  };

  const bringToFront = () => {
    if (!selectedShape) return;
    saveToHistory(shapes, strokes);
    const otherShapes = shapes.filter(s => s.id !== selectedShape.id);
    setShapes([...otherShapes, selectedShape]);
  };

  const sendToBack = () => {
    if (!selectedShape) return;
    saveToHistory(shapes, strokes);
    const otherShapes = shapes.filter(s => s.id !== selectedShape.id);
    setShapes([selectedShape, ...otherShapes]);
  };

  const bringForward = () => {
    if (!selectedShape) return;
    const idx = shapes.findIndex(s => s.id === selectedShape.id);
    if (idx < shapes.length - 1) {
      saveToHistory(shapes, strokes);
      const newShapes = [...shapes];
      [newShapes[idx], newShapes[idx + 1]] = [newShapes[idx + 1], newShapes[idx]];
      setShapes(newShapes);
    }
  };

  const sendBackward = () => {
    if (!selectedShape) return;
    const idx = shapes.findIndex(s => s.id === selectedShape.id);
    if (idx > 0) {
      saveToHistory(shapes, strokes);
      const newShapes = [...shapes];
      [newShapes[idx], newShapes[idx - 1]] = [newShapes[idx - 1], newShapes[idx]];
      setShapes(newShapes);
    }
  };

  const handlePointerDownCanvas = (e: React.PointerEvent) => {
    if (toolMode === 'select') {
      if ((e.target as HTMLElement).id === 'canvas-bg' || (e.target as HTMLElement).id === 'drawing-layer') {
        setSelectedId(null);
        setActiveCategory(null);
      }
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (toolMode === 'text') {
      saveToHistory(shapes, strokes);
      const newShape: CanvasShape = {
        id: crypto.randomUUID(),
        type: 'text',
        x,
        y: y - 20, // offset slightly
        scale: 1,
        rotation: 0,
        opacity: 1,
        color: '#000000',
        textString: 'Label Baru',
        fontSize: 32,
      };
      setShapes([...shapes, newShape]);
      setSelectedId(newShape.id);
      setToolMode('select');
      return;
    }

    if (toolMode === 'draw') {
      setCurrentStroke({ id: crypto.randomUUID(), points: [{ x, y }], color: drawColor, width: drawWidth });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMoveCanvas = (e: React.PointerEvent) => {
    if (toolMode === 'draw' && currentStroke) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setCurrentStroke({ ...currentStroke, points: [...currentStroke.points, { x, y }] });
    }
  };

  const handlePointerUpCanvas = (e: React.PointerEvent) => {
    if (toolMode === 'draw' && currentStroke) {
      saveToHistory(shapes, strokes);
      setStrokes([...strokes, currentStroke]);
      setCurrentStroke(null);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  const splitTriangle = () => {
    if (!selectedShape) return;
    const pts = TRIANGLE_POINTS[selectedShape.type as keyof typeof TRIANGLE_POINTS];
    if (!pts) return;

    saveToHistory(shapes, strokes);
    const [p0, p1, p2] = pts;
    const t = 1 / 3;

    const c1 = [p0, interp(p0, p1, t), interp(p0, p2, t)];
    const c2 = [p1, interp(p1, p0, t), interp(p1, p2, t)];
    const c3 = [p2, interp(p2, p0, t), interp(p2, p1, t)];
    const center = [
      interp(p0, p1, t),
      interp(p1, p0, t),
      interp(p1, p2, t),
      interp(p2, p1, t),
      interp(p2, p0, t),
      interp(p0, p2, t),
    ];

    const colors = ['#ef4444', '#22c55e', '#a855f7'];

    const createPiece = (points: number[][], color: string): CanvasShape => ({
      id: crypto.randomUUID(),
      type: 'custom-polygon',
      x: selectedShape.x + (Math.random() * 10 - 5), // slight stagger to show they are detached
      y: selectedShape.y + (Math.random() * 10 - 5),
      scale: selectedShape.scale,
      rotation: selectedShape.rotation,
      opacity: selectedShape.opacity,
      color,
      customPoints: ptsToString(points),
    });

    const newShapes = [
      createPiece(c1, colors[0]),
      createPiece(c2, colors[1]),
      createPiece(c3, colors[2]),
      createPiece(center, selectedShape.color),
    ];

    setShapes([...shapes.filter((s) => s.id !== selectedShape.id), ...newShapes]);
    setSelectedId(null);
  };

  const clearCanvas = () => {
    saveToHistory(shapes, strokes);
    setShapes([]);
    setStrokes([]);
    setSelectedId(null);
  };

  const downloadCanvas = async () => {
    if (!canvasRef.current) return;
    // deselect before capture
    setSelectedId(null);
    setActiveCategory(null);
    setToolMode('select');

    setTimeout(async () => {
      try {
        if (!canvasRef.current) return;
        const dataUrl = await htmlToImage.toPng(canvasRef.current, {
          backgroundColor: '#fcfdfd',
          pixelRatio: 2,
        });
        const link = document.createElement('a');
        link.download = 'MedBang_Export.png';
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Failed to export canvas', err);
      }
    }, 100);
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="fixed z-20 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <LayoutTemplate size={18} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 hidden md:block">
            MedBang
          </h1>
        </div>

        {/* Toolbar */}
        <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 flex-wrap justify-center items-center gap-1 min-w-max mx-2">
          <ToolBtn icon={<MousePointer2 size={18} />} active={toolMode === 'select'} onClick={() => setToolMode('select')} label="Pilih" />
          <ToolBtn icon={<Type size={18} />} active={toolMode === 'text'} onClick={() => setToolMode('text')} label="Tambah Teks" />
          
          <div className="flex items-center bg-white rounded-lg shadow-sm pl-1 pr-2 py-1 mx-1 border border-slate-100">
            <ToolBtn icon={<Pen size={18} />} active={toolMode === 'draw'} onClick={() => setToolMode('draw')} label="Coret-coret" />
            <span className="mx-1 mt-1 opacity-20">|</span>
            <input 
              type="color" 
              value={drawColor} 
              onChange={e => {setToolMode('draw'); setDrawColor(e.target.value);}} 
              className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
              title="Warna Coretan"
            />
            <input 
              type="range" 
              min="1" max="15" 
              value={drawWidth} 
              onChange={e => {setToolMode('draw'); setDrawWidth(parseInt(e.target.value));}} 
              className="w-16 h-2 ml-2 accent-blue-500"
              title="Tebal Coretan"
            />
          </div>

          <div className="w-px bg-slate-200 mx-1 h-6"></div>
          
          <button 
            onClick={undo} 
            disabled={history.length === 0} 
            title="Batalkan (Undo)" 
            className="p-2 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-500 rounded-lg transition-colors"
          >
            <Undo2 size={18} />
          </button>
          
          <button onClick={clearCanvas} title="Hapus Semua" className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <Trash size={18} />
          </button>

          <button onClick={downloadCanvas} title="Download Gambar" className="p-2 ml-1 text-white bg-blue-600 hover:bg-blue-700 shadow-sm rounded-lg transition-colors flex items-center gap-2 px-3">
            <Download size={16} />
            <span className="text-xs font-semibold hidden lg:block">Download</span>
          </button>
        </div>

        <div className="text-sm font-medium text-slate-500 hidden xl:block">
          Media Pembelajaran Kesebangunan
        </div>
      </header>

      {/* Main Workspace */}
      <div className="relative mt-16 flex h-[calc(100vh-4rem)] flex-1 overflow-hidden">
        {/* Left Sidebar - Categories */}
        <div className="absolute left-4 top-4 z-20 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
          <div className="mb-2 border-b border-slate-100 pb-2 text-center text-xs font-semibold text-slate-400">
            PILIH BANGUN
          </div>
          
          <CategoryBtn
            icon={<Triangle size={20} />}
            isActive={activeCategory === 'triangle'}
            onClick={() => setActiveCategory(activeCategory === 'triangle' ? null : 'triangle')}
            label="Segitiga"
          />
          <CategoryBtn
            icon={<Circle size={20} />}
            isActive={activeCategory === 'circle'}
            onClick={() => setActiveCategory(activeCategory === 'circle' ? null : 'circle')}
            label="Lingkaran"
          />
          <CategoryBtn
            icon={<Square size={20} />}
            isActive={activeCategory === 'quadrilateral'}
            onClick={() => setActiveCategory(activeCategory === 'quadrilateral' ? null : 'quadrilateral')}
            label="Segi Empat"
          />
          <CategoryBtn
            icon={<Ruler size={20} />}
            isActive={activeCategory === 'tools'}
            onClick={() => setActiveCategory(activeCategory === 'tools' ? null : 'tools')}
            label="Alat Ukur"
          />
        </div>

        {/* Secondary Popups for Sub-shapes */}
        <AnimatePresence>
          {activeCategory && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="absolute left-24 top-4 z-20 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg max-w-xs"
            >
              <div className="w-full text-xs font-semibold text-slate-400 mb-1">
                JENIS {activeCategory === 'triangle' ? 'SEGITIGA' : activeCategory === 'circle' ? 'LINGKARAN' : activeCategory === 'quadrilateral' ? 'SEGI EMPAT' : 'ALAT UKUR'}
              </div>
              {activeCategory === 'triangle' && (
                <>
                  <ShapeBtn type="triangle-equilateral" onClick={() => addShape('triangle-equilateral')} label="Sama Sisi" />
                  <ShapeBtn type="triangle-right" onClick={() => addShape('triangle-right')} label="Siku-siku" />
                  <ShapeBtn type="triangle-isosceles" onClick={() => addShape('triangle-isosceles')} label="Sama Kaki" />
                  <ShapeBtn type="triangle-scalene" onClick={() => addShape('triangle-scalene')} label="Sembarang" />
                </>
              )}
              {activeCategory === 'circle' && (
                <>
                  <ShapeBtn type="circle" onClick={() => addShape('circle')} label="Lingkaran Penuh" />
                  <ShapeBtn type="circle-half" onClick={() => addShape('circle-half')} label="Setengah" />
                </>
              )}
              {activeCategory === 'quadrilateral' && (
                <>
                  <ShapeBtn type="square" onClick={() => addShape('square')} label="Persegi" />
                  <ShapeBtn type="rectangle" onClick={() => addShape('rectangle')} label="Persegi Panjang" />
                  <ShapeBtn type="parallelogram" onClick={() => addShape('parallelogram')} label="Jajar Genjang" />
                  <ShapeBtn type="trapezoid" onClick={() => addShape('trapezoid')} label="Trapesium" />
                  <ShapeBtn type="rhombus" onClick={() => addShape('rhombus')} label="Belah Ketupat" />
                  <ShapeBtn type="kite" onClick={() => addShape('kite')} label="Layang-layang" />
                </>
              )}
              {activeCategory === 'tools' && (
                <>
                  <ShapeBtn type="ruler" onClick={() => addShape('ruler')} label="Penggaris" />
                  <ShapeBtn type="protractor" onClick={() => addShape('protractor')} label="Busur" />
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Sidebar - Properties Panel */}
        <AnimatePresence>
          {selectedShape && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute right-4 top-4 z-20 w-64 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-sm font-semibold tracking-wide text-slate-600">
                  {selectedShape.type === 'text' ? 'Edit Label' : 'Edit Bangun'}
                </span>
                <MousePointer2 size={16} className="text-blue-500" />
              </div>

              {/* Text Edit (if text) */}
              {selectedShape.type === 'text' && (
                <div className="flex flex-col gap-1">
                  <div className="text-xs font-medium text-slate-500">Teks Label</div>
                  <input
                    type="text"
                    value={selectedShape.textString || ''}
                    onChange={(e) => updateShape(selectedShape.id, { textString: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-lg p-2 text-sm font-hand"
                  />
                </div>
              )}

              {/* Opacity */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-medium text-slate-500">
                  <span>Opasitas (Transparansi)</span>
                  <span>{Math.round(selectedShape.opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={selectedShape.opacity}
                  onChange={(e) => updateShape(selectedShape.id, { opacity: parseFloat(e.target.value) })}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-600"
                />
              </div>

              {/* Size / Scale */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-medium text-slate-500">
                  <span>Skala Relatif</span>
                  <span className="font-mono bg-blue-50 text-blue-700 px-1 rounded">{Math.round(selectedShape.scale * 10)} cm</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4"
                  step="0.1"
                  value={selectedShape.scale}
                  onChange={(e) => updateShape(selectedShape.id, { scale: parseFloat(e.target.value) })}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-600"
                />
              </div>

              {/* Rotation */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-medium text-slate-500">
                  <span>Rotasi (Putar)</span>
                  <span>{selectedShape.rotation}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={selectedShape.rotation}
                  onChange={(e) => updateShape(selectedShape.id, { rotation: parseInt(e.target.value) })}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-600"
                />
              </div>

               {/* Colors */}
               <div className="flex flex-col gap-1">
                <div className="text-xs font-medium text-slate-500">Warna</div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => updateShape(selectedShape.id, { color })}
                      className={`h-6 w-6 rounded-full border-2 ${
                        selectedShape.color === color
                          ? 'border-blue-600 scale-110 shadow-sm'
                          : 'border-transparent hover:scale-110'
                      } transition-all`}
                      style={{ backgroundColor: color }}
                      aria-label={`Pilih warna ${color}`}
                    />
                  ))}
                </div>
              </div>

              {/* Potong Sudut for Triangles */}
              {selectedShape.type.startsWith('triangle-') && selectedShape.type !== 'triangle-split' && (
                <div className="flex flex-col gap-1 pt-2 border-t border-slate-100">
                  <button
                    onClick={splitTriangle}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-100 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-200 transition-colors"
                  >
                    <Scissors size={16} />
                    Potong 3 Sudut (180°)
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-1">
                    Buktikan jumlah sudut segitiga 180 derajat
                  </p>
                </div>
              )}

              {/* Layer Actions */}
              <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 mt-1">
                <div className="text-xs font-medium text-slate-500">Urutan (Layering)</div>
                <div className="grid grid-cols-4 gap-1">
                  <button
                    onClick={bringToFront}
                    className="flex flex-col items-center justify-center gap-1 rounded-lg bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                    title="Paling Depan"
                  >
                    <ChevronsUp size={16} />
                    <span className="text-[9px] font-medium leading-none">Terdepan</span>
                  </button>
                  <button
                    onClick={bringForward}
                    className="flex flex-col items-center justify-center gap-1 rounded-lg bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                    title="Maju 1 Layer"
                  >
                    <ChevronUp size={16} />
                    <span className="text-[9px] font-medium leading-none">Maju</span>
                  </button>
                  <button
                    onClick={sendBackward}
                    className="flex flex-col items-center justify-center gap-1 rounded-lg bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                    title="Mundur 1 Layer"
                  >
                    <ChevronDown size={16} />
                    <span className="text-[9px] font-medium leading-none">Mundur</span>
                  </button>
                  <button
                    onClick={sendToBack}
                    className="flex flex-col items-center justify-center gap-1 rounded-lg bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                    title="Paling Belakang"
                  >
                    <ChevronsDown size={16} />
                    <span className="text-[9px] font-medium leading-none">Terbelakang</span>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={cloneShape}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <Copy size={16} />
                  Clone
                </button>
                <button
                  onClick={deleteShape}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={16} />
                  Hapus
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Canvas Area */}
        <div
          ref={canvasRef}
          id="canvas-bg"
          className="relative z-0 m-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)] bg-[#fcfdfd] rounded-2xl border-[12px] border-amber-800/20 shadow-[inset_0_0_40px_rgba(0,0,0,0.05)] overflow-hidden touch-none"
          onPointerDown={handlePointerDownCanvas}
          onPointerMove={handlePointerMoveCanvas}
          onPointerUp={handlePointerUpCanvas}
        >
          {/* Drawing Layer */}
          <svg className="absolute inset-0 pointer-events-none w-full h-full z-[1000]" id="drawing-layer">
            {strokes.map((s) => (
              <path
                key={s.id}
                d={getSvgPathFromPoints(s.points)}
                stroke={s.color}
                strokeWidth={s.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-80"
              />
            ))}
            {currentStroke && (
              <path
                d={getSvgPathFromPoints(currentStroke.points)}
                stroke={currentStroke.color}
                strokeWidth={currentStroke.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-80"
              />
            )}
          </svg>

          {shapes.map((shape, index) => (
            <ShapeRenderer
              key={shape.id}
              shape={shape}
              layerIndex={index}
              isSelected={shape.id === selectedId}
              isInteractive={toolMode === 'select'}
              onSelect={() => {
                if (toolMode === 'select') {
                  setSelectedId(shape.id);
                  setActiveCategory(null);
                }
              }}
              onPositionChange={(x, y) => updateShape(shape.id, { x, y })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Sub-components

function ToolBtn({ icon, active, onClick, label }: { icon: React.ReactNode; active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-2 rounded-lg transition-all ${
        active ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
      }`}
    >
      {icon}
    </button>
  );
}

function CategoryBtn({ icon, isActive, onClick, label }: { icon: React.ReactNode; isActive: boolean; onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex h-12 w-12 items-center justify-center rounded-xl transition-all ${
        isActive
          ? 'bg-blue-100 text-blue-600 shadow-inner'
          : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800'
      }`}
      title={label}
    >
      {icon}
      {/* Tooltip */}
      <span className="absolute left-14 hidden -translate-y-1/2 top-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:block group-hover:opacity-100 z-50">
        {label}
      </span>
    </button>
  );
}

function ShapeBtn({ type, onClick, label }: { type: ShapeType; onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-lg p-2 hover:bg-slate-100 transition-colors w-20"
    >
      <div className="h-10 w-10 text-slate-600 flex items-center justify-center">
        <ShapePreview type={type} />
      </div>
      <span className="text-[10px] text-center leading-tight font-medium text-slate-600">{label}</span>
    </button>
  );
}

// Previews for the menu
function ShapePreview({ type }: { type: ShapeType }) {
  const baseClasses = "fill-transparent stroke-current stroke-2";
  switch (type) {
    case 'triangle-equilateral':
      return <svg viewBox="0 0 100 100" className={baseClasses}><polygon points="50,10 90,90 10,90" /></svg>;
    case 'triangle-right':
      return <svg viewBox="0 0 100 100" className={baseClasses}><polygon points="20,10 20,90 80,90" /></svg>;
    case 'triangle-isosceles':
      return <svg viewBox="0 0 100 100" className={baseClasses}><polygon points="50,10 70,90 30,90" /></svg>;
    case 'triangle-scalene':
      return <svg viewBox="0 0 100 100" className={baseClasses}><polygon points="60,10 90,90 10,90" /></svg>;
    case 'square':
      return <svg viewBox="0 0 100 100" className={baseClasses}><rect x="15" y="15" width="70" height="70" /></svg>;
    case 'rectangle':
      return <svg viewBox="0 0 100 100" className={baseClasses}><rect x="10" y="30" width="80" height="40" /></svg>;
    case 'parallelogram':
      return <svg viewBox="0 0 100 100" className={baseClasses}><polygon points="30,30 90,30 70,70 10,70" /></svg>;
    case 'trapezoid':
      return <svg viewBox="0 0 100 100" className={baseClasses}><polygon points="30,30 70,30 90,70 10,70" /></svg>;
    case 'rhombus':
      return <svg viewBox="0 0 100 100" className={baseClasses}><polygon points="50,10 90,50 50,90 10,50" /></svg>;
    case 'kite':
      return <svg viewBox="0 0 100 100" className={baseClasses}><polygon points="50,10 80,40 50,90 20,40" /></svg>;
    case 'circle':
      return <svg viewBox="0 0 100 100" className={baseClasses}><circle cx="50" cy="50" r="35" /></svg>;
    case 'circle-half':
      return <svg viewBox="0 0 100 100" className={baseClasses}><path d="M 15 50 A 35 35 0 0 1 85 50 Z" /></svg>;
    case 'ruler':
      return <svg viewBox="0 0 100 100" className={baseClasses}><rect x="10" y="35" width="80" height="30" rx="3" /><path d="M 20 35 v 10 M 30 35 v 5 M 40 35 v 10 M 50 35 v 5 M 60 35 v 10 M 70 35 v 5 M 80 35 v 10" /></svg>;
    case 'protractor':
      return <svg viewBox="0 0 100 100" className={baseClasses}><path d="M 10 70 A 40 40 0 0 1 90 70 Z" /><path d="M 30 70 A 20 20 0 0 1 70 70" /></svg>;
    default:
      return null;
  }
}

// Renders the actual shape on the canvas with Drag support
function ShapeRenderer({
  shape,
  isSelected,
  isInteractive,
  onSelect,
  onPositionChange,
  layerIndex,
}: {
  shape: CanvasShape;
  isSelected: boolean;
  isInteractive: boolean;
  onSelect: () => void;
  onPositionChange: (x: number, y: number) => void;
  layerIndex: number;
}) {
  return (
    <motion.div
      drag={isInteractive}
      dragMomentum={false}
      style={{
        position: 'absolute',
        top: shape.y,
        left: shape.x,
        scale: shape.scale,
        rotate: shape.rotation,
        opacity: shape.opacity,
        cursor: isInteractive ? (isSelected ? 'grab' : 'pointer') : 'crosshair',
        filter: isSelected ? `drop-shadow(0px 0px 8px ${shape.color}80)` : 'none',
        zIndex: layerIndex + 10,
      }}
      initial={false}
      onDrag={(e, info) => {
        if (!isInteractive) return;
        onPositionChange(shape.x + info.delta.x, shape.y + info.delta.y);
      }}
      onPointerDown={(e) => {
        if (!isInteractive) return;
        e.stopPropagation();
        onSelect();
      }}
      whileTap={isInteractive ? { cursor: 'grabbing' } : {}}
    >
      <div className="relative pointer-events-none w-full h-full">
        {shape.type === 'text' ? (
          <div
            className="font-hand"
            style={{
              color: shape.color,
              fontSize: `${shape.fontSize || 32}px`,
              whiteSpace: 'nowrap',
              lineHeight: 1,
            }}
          >
            {shape.textString}
          </div>
        ) : (
          <ActualShapeSvg type={shape.type} color={shape.color} customPoints={shape.customPoints} />
        )}
        {/* Selection Box */}
        {isSelected && isInteractive && (
          <div className="absolute -inset-2 border-2 border-dashed border-blue-500 rounded-sm pointer-events-none" />
        )}
      </div>
    </motion.div>
  );
}

// Generates the SVG path for the actual items
function ActualShapeSvg({ type, color, customPoints }: { type: ShapeType; color: string; customPoints?: string }) {
  if (type === 'ruler') return <RulerSvg color={color} />;
  if (type === 'protractor') return <ProtractorSvg color={color} />;

  const SIZE = 120; // Base size for drawing
  
  const getPath = () => {
    if (type === 'custom-polygon' && customPoints) {
      return <polygon points={customPoints} />;
    }
    switch (type) {
      case 'triangle-equilateral':
        return <polygon points={`${SIZE/2},0 ${SIZE},${SIZE} 0,${SIZE}`} />;
      case 'triangle-right':
        return <polygon points={`0,0 0,${SIZE} ${SIZE},${SIZE}`} />;
      case 'triangle-isosceles':
        return <polygon points={`${SIZE/2},0 ${SIZE*0.8},${SIZE} ${SIZE*0.2},${SIZE}`} />;
      case 'triangle-scalene':
        return <polygon points={`${SIZE*0.7},0 ${SIZE},${SIZE} 0,${SIZE}`} />;
      case 'square':
        return <rect x="0" y="0" width={SIZE} height={SIZE} />;
      case 'rectangle':
        return <rect x="0" y={SIZE*0.2} width={SIZE} height={SIZE*0.6} />;
      case 'parallelogram':
        return <polygon points={`${SIZE*0.2},${SIZE*0.2} ${SIZE},${SIZE*0.2} ${SIZE*0.8},${SIZE*0.8} 0,${SIZE*0.8}`} />;
      case 'trapezoid':
        return <polygon points={`${SIZE*0.2},${SIZE*0.2} ${SIZE*0.8},${SIZE*0.2} ${SIZE},${SIZE*0.8} 0,${SIZE*0.8}`} />;
      case 'rhombus':
        return <polygon points={`${SIZE/2},0 ${SIZE},${SIZE/2} ${SIZE/2},${SIZE} 0,${SIZE/2}`} />;
      case 'kite':
        return <polygon points={`${SIZE/2},0 ${SIZE*0.8},${SIZE*0.3} ${SIZE/2},${SIZE} ${SIZE*0.2},${SIZE*0.3}`} />;
      case 'circle':
        return <circle cx={SIZE/2} cy={SIZE/2} r={SIZE/2} />;
      case 'circle-half':
        return <path d={`M 0 ${SIZE/2} A ${SIZE/2} ${SIZE/2} 0 0 1 ${SIZE} ${SIZE/2} Z`} />;
      default:
        return <rect x="0" y="0" width={SIZE} height={SIZE} />;
    }
  };

  return (
    <svg width={SIZE} height={SIZE} style={{ fill: color, display: 'block' }}>
      {getPath()}
    </svg>
  );
}

function RulerSvg({ color }: { color: string }) {
  const PIXELS_PER_CM = 40;
  const LENGTH_CM = 15;
  const width = PIXELS_PER_CM * LENGTH_CM;
  const ticks = [];
  
  for (let i = 0; i <= LENGTH_CM * 10; i++) {
      const x = i * (PIXELS_PER_CM / 10);
      let h = 10;
      if (i % 10 === 0) h = 25;
      else if (i % 5 === 0) h = 15;

      ticks.push(<line key={i} x1={x} y1="0" x2={x} y2={h} stroke="#1e293b" strokeWidth={i % 10 === 0 ? "2" : "1"} />);
      if (i % 10 === 0 && i !== 0 && i !== LENGTH_CM * 10) {
          ticks.push(<text key={`t-${i}`} x={x} y="44" fontSize="14" textAnchor="middle" fill="#1e293b" className="font-sans font-semibold">{i / 10}</text>);
      }
  }
  return (
    <svg width={width + 40} height="60" viewBox={`-20 -5 ${width + 40} 70`} className="drop-shadow-sm">
      <rect x="-20" y="0" width={width + 40} height="60" fill={color} fillOpacity="0.4" stroke={color} strokeWidth="2" rx="4" />
      <g transform="translate(0, 0)">
        {ticks}
      </g>
    </svg>
  );
}

function ProtractorSvg({ color }: { color: string }) {
  const R = 180; // Radius
  const ticks = [];
  
  for(let i = 0; i <= 180; i += 1) {
      const rad = (i * Math.PI) / 180;
      let r1 = R - 10;
      let strokeWidth = "1";
      if (i % 10 === 0) {
        r1 = R - 25;
        strokeWidth = "2";
      } else if (i % 5 === 0) {
        r1 = R - 18;
        strokeWidth = "1.5";
      }
      
      const r2 = R;
      const x1 = R + r1 * Math.cos(rad);
      const y1 = R - r1 * Math.sin(rad);
      const x2 = R + r2 * Math.cos(rad);
      const y2 = R - r2 * Math.sin(rad);
      ticks.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1e293b" strokeWidth={strokeWidth} />);
      
      if (i % 10 === 0) {
        // Inner radius for labels
        const tx = R + (R - 40) * Math.cos(rad);
        const ty = R - (R - 40) * Math.sin(rad);
        const rotationAngle = 90 - i;
        
        ticks.push(
          <text 
            key={`t1-${i}`} 
            x={tx} 
            y={ty+4} 
            fontSize="12" 
            textAnchor="middle" 
            fill="#1e293b" 
            className="font-sans font-semibold" 
            transform={`rotate(${rotationAngle}, ${tx}, ${ty})`}
          >
            {i}
          </text>
        );

        // Also add the opposite angle reading (0-180 left to right) inside
        if (i !== 90) {
          const txInner = R + (R - 60) * Math.cos(rad);
          const tyInner = R - (R - 60) * Math.sin(rad);
          ticks.push(
            <text 
              key={`t2-${i}`} 
              x={txInner} 
              y={tyInner+3} 
              fontSize="10" 
              textAnchor="middle" 
              fill="#64748b" 
              className="font-sans font-medium" 
              transform={`rotate(${rotationAngle}, ${txInner}, ${tyInner})`}
            >
              {180 - i}
            </text>
          );
        }
      }
  }
  
  return (
    <svg width={R*2 + 60} height={R + 60} viewBox={`-30 -30 ${R*2 + 60} ${R + 60}`} className="drop-shadow-sm">
      {/* Main body */}
      <path d={`M -20 ${R} A ${R+20} ${R+20} 0 0 1 ${R*2 + 20} ${R} Z`} fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2" />
      
      {/* Baseline */}
      <line x1="-20" y1={R} x2={R*2 + 20} y2={R} stroke="#1e293b" strokeWidth="2" />
      
      {/* Center crosshair */}
      <circle cx={R} cy={R} r="4" fill="#1e293b" />
      <line x1={R-15} y1={R} x2={R+15} y2={R} stroke="#1e293b" strokeWidth="1.5" />
      <line x1={R} y1={R-15} x2={R} y2={R} stroke="#1e293b" strokeWidth="1.5" />
      <circle cx={R} cy={R} r="15" fill="none" stroke="#1e293b" strokeWidth="1.5" />

      {/* Arc line */}
      <path d={`M 0 ${R} A ${R} ${R} 0 0 1 ${R*2} ${R}`} fill="none" stroke="#1e293b" strokeWidth="2" />
      
      {ticks}
    </svg>
  );
}

