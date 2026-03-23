"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Upload, Loader2, Columns, Target, ZoomIn, ZoomOut, BarChart3, Download, X, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AnalyzeAndSuggestImageEnhancementsOutput } from '@/ai/flows/analyze-and-suggest-image-enhancements-flow';
import { useImageHistogram } from '@/hooks/useImageHistogram';
import { EvaluationPanel } from './EvaluationPanel';
import type { SceneEvaluationMetrics } from '@/lib/scene-evaluation';

interface PreviewPanelProps {
  originalImage: string | null;
  processedImage: string | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isAnalyzing: boolean;
  analysis: AnalyzeAndSuggestImageEnhancementsOutput | null;
  isDragging: boolean;
  analysisStep: string;
  isComparing: boolean;
  setIsComparing: (val: boolean) => void;
  onExport: (format: string, quality: number) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  evaluationMetrics: SceneEvaluationMetrics | null;
  showMetrics: boolean;
  setShowMetrics: (val: boolean) => void;
}

// --- Histogram Canvas Component ---
const HistogramOverlay: React.FC<{ imageDataUrl: string | null }> = ({ imageDataUrl }) => {
  const histogram = useImageHistogram(imageDataUrl);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 256;
    const H = 100;
    canvas.width = W;
    canvas.height = H;
    ctx.clearRect(0, 0, W, H);

    // Find global max for normalization
    const allMax = Math.max(
      ...histogram.r.slice(1, 254),
      ...histogram.g.slice(1, 254),
      ...histogram.b.slice(1, 254),
      1
    );

    const drawChannel = (data: number[], color: string) => {
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let i = 0; i < 256; i++) {
        const val = Math.min(data[i] / allMax, 1) * H;
        ctx.lineTo(i, H - val);
      }
      ctx.lineTo(255, H);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };

    ctx.globalCompositeOperation = 'screen';
    drawChannel(histogram.r, 'rgba(255, 60, 60, 0.6)');
    drawChannel(histogram.g, 'rgba(60, 255, 60, 0.6)');
    drawChannel(histogram.b, 'rgba(60, 100, 255, 0.6)');
  }, [histogram]);

  return (
    <div className="absolute bottom-20 left-6 z-40 bg-black/70 backdrop-blur-md rounded-xl border border-white/10 p-2 shadow-2xl">
      <canvas
        ref={canvasRef}
        className="block rounded-lg"
        style={{ width: 220, height: 86 }}
      />
      <div className="flex justify-between px-1 mt-1">
        <span className="text-[8px] text-white/40 font-mono">0</span>
        <span className="text-[8px] text-white/40 font-mono uppercase tracking-widest">RGB Histogram</span>
        <span className="text-[8px] text-white/40 font-mono">255</span>
      </div>
    </div>
  );
};

// --- Export Dialog ---
const ExportDialog: React.FC<{
  onExport: (format: string, quality: number) => void;
  onClose: () => void;
}> = ({ onExport, onClose }) => {
  const [format, setFormat] = useState('jpeg');
  const [quality, setQuality] = useState(92);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border/60 rounded-2xl p-6 w-[320px] shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Export Image</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Format</label>
          <div className="flex gap-2">
            {(['jpeg', 'png', 'webp'] as const).map(f => (
              <button
                key={f}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                  format === f
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                    : 'bg-secondary/30 text-muted-foreground border-border/40 hover:bg-secondary/50'
                }`}
                onClick={() => setFormat(f)}
              >
                {f === 'jpeg' ? 'JPEG' : f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {format !== 'png' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Quality</label>
              <span className="text-[11px] font-mono text-primary font-bold">{quality}%</span>
            </div>
            <Slider
              value={[quality]}
              onValueChange={v => setQuality(v[0])}
              min={10}
              max={100}
              step={1}
            />
            <div className="flex justify-between text-[9px] text-muted-foreground/50">
              <span>Small file</span>
              <span>Best quality</span>
            </div>
          </div>
        )}

        <Button
          className="w-full gap-2 rounded-xl h-11 font-bold shadow-lg shadow-primary/10"
          onClick={() => {
            onExport(format, quality);
            onClose();
          }}
        >
          <Download className="w-4 h-4" />
          Download {format.toUpperCase()}
        </Button>
      </div>
    </div>
  );
};

// --- Main Component ---
export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  originalImage,
  processedImage,
  onUpload,
  isAnalyzing,
  analysis,
  isDragging,
  analysisStep,
  isComparing,
  setIsComparing,
  onExport,
  fileInputRef,
  evaluationMetrics,
  showMetrics,
  setShowMetrics,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [compareValue, setCompareValue] = useState(50);
  const [showDetections, setShowDetections] = useState(false);
  const [showHistogram, setShowHistogram] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // --- Zoom & Pan ---
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const lastPanPos = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(prev => {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const next = prev * delta;
      return Math.min(8, Math.max(0.5, next));
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || zoom <= 1) return;
    isPanningRef.current = true;
    lastPanPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).style.cursor = 'grabbing';
  }, [zoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - lastPanPos.current.x;
    const dy = e.clientY - lastPanPos.current.y;
    lastPanPos.current = { x: e.clientX, y: e.clientY };
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    isPanningRef.current = false;
    (e.target as HTMLElement).style.cursor = zoom > 1 ? 'grab' : 'default';
  }, [zoom]);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Reset zoom when image changes
  useEffect(() => {
    resetZoom();
  }, [originalImage, resetZoom]);

  // Draw Processed Image
  useEffect(() => {
    if (!canvasRef.current || !processedImage) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = processedImage;
  }, [processedImage]);

  // Draw Original Image and handle Overlays
  useEffect(() => {
    if (!originalCanvasRef.current || !originalImage) return;
    const canvas = originalCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      if (overlayCanvasRef.current) {
        const oCanvas = overlayCanvasRef.current;
        oCanvas.width = img.width;
        oCanvas.height = img.height;
        drawDetections(oCanvas, img.width, img.height);
      }
    };
    img.src = originalImage;
  }, [originalImage, analysis, showDetections]);

  const drawDetections = (canvas: HTMLCanvasElement, width: number, height: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, width, height);
    if (!analysis?.detections || !showDetections) return;

    analysis.detections.forEach((det) => {
      const [ymin, xmin, ymax, xmax] = det.box_2d;
      const x = (xmin / 1000) * width;
      const y = (ymin / 1000) * height;
      const w = ((xmax - xmin) / 1000) * width;
      const h = ((ymax - ymin) / 1000) * height;

      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = Math.max(2, width / 400);
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = 'rgba(99, 102, 241, 0.9)';
      const fontSize = Math.max(12, width / 60);
      ctx.font = `bold ${fontSize}px Inter`;
      const text = `${det.label} (${Math.round(det.confidence * 100)}%)`;
      const textWidth = ctx.measureText(text).width;
      ctx.fillRect(x, y - fontSize - 4, textWidth + 10, fontSize + 4);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, x + 5, y - 5);
    });
  };

  const handleNewImageClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className="flex-1 bg-[#0d0c0f] relative flex flex-col items-center justify-center p-8 overflow-hidden"
      ref={containerRef}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm border-2 border-dashed border-primary/50 rounded-none transition-all">
          <div className="text-center space-y-4 animate-pulse">
            <div className="w-20 h-20 rounded-3xl bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto shadow-[0_0_60px_rgba(99,102,241,0.3)]">
              <Upload className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-headline text-primary">Drop Image Here</h3>
              <p className="text-sm text-muted-foreground mt-1">Release to start analysis</p>
            </div>
          </div>
        </div>
      )}

      {/* Export Dialog */}
      {showExportDialog && processedImage && (
        <ExportDialog onExport={onExport} onClose={() => setShowExportDialog(false)} />
      )}

      {!processedImage ? (
        <div className="flex flex-col items-center text-center max-w-sm gap-8">
          <div className="w-24 h-24 rounded-3xl bg-primary/5 border border-primary/20 flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.1)]">
            <Upload className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-headline tracking-tight">Ignite VisionForge</h2>
            <p className="text-muted-foreground text-sm leading-relaxed px-4">
              Upload high-resolution imagery to activate deep semantic analysis and neural enhancement.
            </p>
            <p className="text-muted-foreground/50 text-xs">
              Drag & drop, paste from clipboard, or click below
            </p>
          </div>
          <button onClick={handleNewImageClick} className="bg-primary text-white rounded-2xl px-10 h-14 text-base font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
            Select Masterpiece
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={onUpload} 
          />
        </div>
      ) : (
        <>
          {/* Top toolbar */}
          <div className="absolute top-6 left-6 z-30 flex gap-3 flex-wrap">
            <Button 
              variant={isComparing ? "default" : "secondary"} 
              size="sm" 
              onClick={() => setIsComparing(!isComparing)} 
              className={`gap-2 backdrop-blur-md rounded-xl h-9 border-border/40 shadow-xl ${isComparing ? 'bg-primary text-white' : 'bg-card/70 hover:bg-card/90'}`}
            >
              <Columns className="w-4 h-4" />
              {isComparing ? "Exit Preview" : "Compare"}
            </Button>
            
            {analysis && (
              <Button 
                variant={showDetections ? "default" : "secondary"} 
                size="sm" 
                onClick={() => setShowDetections(!showDetections)} 
                className={`gap-2 backdrop-blur-md rounded-xl h-9 border-border/40 shadow-xl ${showDetections ? 'bg-accent text-accent-foreground' : 'bg-card/70 hover:bg-card/90'}`}
              >
                <Target className="w-4 h-4" />
                {showDetections ? "Hide Detection" : "Neural Map"}
              </Button>
            )}

            <Button
              variant={showHistogram ? "default" : "secondary"}
              size="sm"
              onClick={() => setShowHistogram(!showHistogram)}
              className={`gap-2 backdrop-blur-md rounded-xl h-9 border-border/40 shadow-xl ${showHistogram ? 'bg-[#4ade80] text-black' : 'bg-card/70 hover:bg-card/90'}`}
            >
              <BarChart3 className="w-4 h-4" />
              Histogram
            </Button>

            {isAnalyzing && (
              <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-xl bg-primary/20 text-primary text-[11px] font-bold tracking-widest uppercase border border-primary/30 shadow-lg shadow-primary/10">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="animate-pulse">{analysisStep || "AI Computing"}</span>
              </div>
            )}

            {evaluationMetrics && (
              <Button
                variant={showMetrics ? "default" : "secondary"}
                size="sm"
                onClick={() => setShowMetrics(!showMetrics)}
                className={`gap-2 backdrop-blur-md rounded-xl h-9 border-border/40 shadow-xl ${showMetrics ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-card/70 hover:bg-card/90'}`}
              >
                <BarChart3 className="w-4 h-4" />
                Metrics
              </Button>
            )}
          </div>

          {/* Zoom controls */}
          <div className="absolute top-6 right-6 z-30 flex gap-2 items-center">
            <div className="flex items-center gap-1 bg-card/70 backdrop-blur-md rounded-xl border border-border/40 shadow-xl px-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setZoom(prev => Math.max(0.5, prev * 0.8))}>
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              <button
                className="text-[10px] font-mono font-bold text-muted-foreground px-1 hover:text-primary transition-colors min-w-[40px] text-center"
                onClick={resetZoom}
                title="Reset zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setZoom(prev => Math.min(8, prev * 1.25))}>
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Histogram overlay */}
          {showHistogram && <HistogramOverlay imageDataUrl={processedImage} />}

          {/* Floating Metrics Panel */}
          {showMetrics && evaluationMetrics && (
            <div className="absolute top-16 left-6 bottom-24 z-40 w-[340px] bg-card/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/30 shrink-0">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Scene Evaluation
                </h3>
                <button
                  onClick={() => setShowMetrics(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-secondary/50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ScrollArea className="flex-1 px-5 py-4">
                <EvaluationPanel metrics={evaluationMetrics} />
              </ScrollArea>
            </div>
          )}

          {/* Image display with zoom & pan */}
          <div
            className="relative max-w-full max-h-full shadow-[0_20px_80px_rgba(0,0,0,0.8)] rounded-2xl border border-white/5 overflow-hidden group bg-black"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={resetZoom}
            style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
          >
            <div
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transformOrigin: 'center center',
                transition: isPanningRef.current ? 'none' : 'transform 0.15s ease-out',
              }}
            >
              {/* Base canvas showing the original image */}
              <canvas 
                ref={originalCanvasRef} 
                className="max-w-full max-h-[75vh] block object-contain"
              />
              
              {/* Clipped overlay showing the processed image */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{ 
                  clipPath: isComparing ? `inset(0 ${100 - compareValue}% 0 0)` : 'none',
                }}
              >
                <canvas 
                  ref={canvasRef} 
                  className="w-full h-full block object-contain"
                />
              </div>

              {/* Neural map overlay */}
              <canvas 
                ref={overlayCanvasRef} 
                className="absolute inset-0 w-full h-full pointer-events-none z-20"
              />
            </div>

            {/* Comparison handle */}
            {isComparing && (
              <div 
                className="absolute inset-y-0 z-30 pointer-events-none"
                style={{ left: `${compareValue}%` }}
              >
                <div className="h-full w-0.5 bg-white/40 shadow-[0_0_15px_rgba(255,255,255,0.3)] relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl text-white flex items-center justify-center shadow-2xl border border-white/20 scale-100 group-hover:scale-110 transition-transform">
                    <Columns className="w-5 h-5" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Compare slider */}
          {isComparing && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-72 p-5 bg-card/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl z-30">
              <div className="space-y-4">
                <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 px-1">
                  <span className="text-primary">Enhanced</span>
                  <span>Source</span>
                </div>
                <Slider 
                  value={[compareValue]} 
                  onValueChange={(v) => setCompareValue(v[0])} 
                  max={100} 
                  step={0.1}
                  className="cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Bottom toolbar */}
          <div className="absolute bottom-6 right-6 flex gap-3 z-30">
            <Button 
              size="sm" 
              variant="outline" 
              className="bg-card/70 backdrop-blur-md rounded-xl h-10 px-6 border-border/40 hover:bg-card/90 gap-2"
              onClick={handleNewImageClick}
            >
              <ImageIcon className="w-4 h-4" />
              New Image
            </Button>
            
            <Button 
              size="sm" 
              className="rounded-xl h-10 px-6 font-bold shadow-lg shadow-primary/10 gap-2" 
              onClick={() => setShowExportDialog(true)}
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </>
      )}
    </div>
  );
};