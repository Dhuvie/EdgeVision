"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppHeader } from './AppHeader';
import { PreviewPanel } from './PreviewPanel';
import { ControlsPanel } from './ControlsPanel';
import { analyzeAndSuggestImageEnhancements, AnalyzeAndSuggestImageEnhancementsOutput } from '@/ai/flows/analyze-and-suggest-image-enhancements-flow';
import { useToast } from '@/hooks/use-toast';
import { dipEngine, DIPOperation } from '@/lib/dip-engine';
import { computeSceneEvaluationMetrics, SceneEvaluationMetrics } from '@/lib/scene-evaluation';
import { EvaluationPanel } from './EvaluationPanel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart3, X } from 'lucide-react';

const STACKABLE_FILTERS = [
  'median filter', 
  'mean filter', 
  'gaussian filter', 
  'weighted filter', 
  'min filter', 
  'max filter',
  'edge detection',
  'laplacian',
  'emboss',
  'box blur',
  'unsharp mask',
  'invert',
  'sepia',
  'grayscale',
  'posterize',
  'solarize',
  'threshold'
];

const ANALYSIS_STEPS = [
  "Initializing neural engine…",
  "Scanning visual composition…",
  "Analyzing color distribution…",
  "Detecting objects & subjects…",
  "Evaluating technical quality…",
  "Generating enhancement plan…",
  "Crafting cinematic color grades…",
  "Finalizing artistic analysis…",
];

export const EditorLayout: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeAndSuggestImageEnhancementsOutput | null>(null);
  const [analysisStep, setAnalysisStep] = useState<string>("");
  const [evaluationMetrics, setEvaluationMetrics] = useState<SceneEvaluationMetrics | null>(null);
  const { toast } = useToast();

  // --- Undo/Redo History ---
  const [opsHistory, setOpsHistory] = useState<DIPOperation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const activeOps = opsHistory[historyIndex] ?? [];

  const pushHistory = useCallback((newOps: DIPOperation[]) => {
    setOpsHistory(prev => {
      const truncated = prev.slice(0, historyIndex + 1);
      return [...truncated, newOps];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const undo = useCallback(() => {
    setHistoryIndex(prev => Math.max(0, prev - 1));
  }, []);

  const redo = useCallback(() => {
    setHistoryIndex(prev => Math.min(opsHistory.length - 1, prev + 1));
  }, [opsHistory.length]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < opsHistory.length - 1;

  // --- Drag & Drop ---
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImageFromFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target?.result as string;
      setImage(dataUri);
      setProcessedImage(dataUri);
      setAnalysis(null);
      setOpsHistory([[]]);
      setHistoryIndex(0);
      runPipeline(dataUri);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadImageFromFile(file);
      e.target.value = '';
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      loadImageFromFile(file);
    }
  }, [loadImageFromFile]);

  // --- Paste from clipboard ---
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            loadImageFromFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [loadImageFromFile]);

  // --- Compare toggle (for keyboard shortcut) ---
  const [isComparing, setIsComparing] = useState(false);
  const toggleCompare = useCallback(() => setIsComparing(prev => !prev), []);

  // --- Export ---
  const handleExport = useCallback((format: string, quality: number) => {
    if (!processedImage) return;
    
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);

      let mimeType: string;
      let ext: string;
      switch (format) {
        case 'png':
          mimeType = 'image/png';
          ext = 'png';
          break;
        case 'webp':
          mimeType = 'image/webp';
          ext = 'webp';
          break;
        default:
          mimeType = 'image/jpeg';
          ext = 'jpg';
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `visionforge-${Date.now()}.${ext}`;
          link.href = url;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        },
        mimeType,
        format === 'png' ? undefined : quality / 100
      );
    };
    img.src = processedImage;
  }, [processedImage]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (ctrl && e.key === 'o') {
        e.preventDefault();
        fileInputRef.current?.click();
      } else if (e.key === ' ' && image) {
        e.preventDefault();
        toggleCompare();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, toggleCompare, image]);

  // --- Metrics panel toggle ---
  const [showMetrics, setShowMetrics] = useState(false);

  // --- AI Analysis Pipeline ---
  const runPipeline = async (dataUri: string) => {
    setIsAnalyzing(true);
    setAnalysisStep(ANALYSIS_STEPS[0]);

    // Simulate step progression
    let stepIdx = 0;
    const stepInterval = setInterval(() => {
      stepIdx++;
      if (stepIdx < ANALYSIS_STEPS.length) {
        setAnalysisStep(ANALYSIS_STEPS[stepIdx]);
      }
    }, 5000);

    try {
      const t0 = performance.now();
      const result = await analyzeAndSuggestImageEnhancements({
        photoDataUri: dataUri
      });
      const latencyMs = performance.now() - t0;
      setAnalysis(result);
      setEvaluationMetrics(computeSceneEvaluationMetrics(result, latencyMs));
    } catch (error) {
      console.error(error);
      toast({
        title: "Neural Analysis Error",
        description: "VisionForge link interrupted. Please retry.",
        variant: "destructive"
      });
    } finally {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
      setAnalysisStep("");
    }
  };

  // --- DIP Processing ---
  useEffect(() => {
    const processImage = async () => {
      if (!image) return;
      
      setIsProcessing(true);
      try {
        if (activeOps.length === 0) {
          setProcessedImage(image);
        } else {
          const result = await dipEngine.process(image, activeOps);
          setProcessedImage(result);
        }
      } catch (error) {
        console.error("DIP Engine Error:", error);
      } finally {
        setIsProcessing(false);
      }
    };

    const debounceTimer = setTimeout(processImage, 100);
    return () => clearTimeout(debounceTimer);
  }, [activeOps, image]);

  // --- Apply DIP operations (with history) ---
  const applyDIP = useCallback((newOps: DIPOperation[], replace: boolean = false) => {
    const currentOps = opsHistory[historyIndex] ?? [];
    let nextOps: DIPOperation[];

    if (replace) {
      nextOps = newOps;
    } else {
      const updated = [...currentOps];
      newOps.forEach(newOp => {
        const titleLower = newOp.title.toLowerCase();
        if (STACKABLE_FILTERS.includes(titleLower)) {
          updated.push(newOp);
        } else {
          const existingIdx = updated.findIndex(op => op.title.toLowerCase() === titleLower);
          if (existingIdx > -1) {
            updated[existingIdx] = newOp;
          } else {
            updated.push(newOp);
          }
        }
      });
      nextOps = updated;
    }
    pushHistory(nextOps);
  }, [historyIndex, opsHistory, pushHistory]);

  const resetImage = useCallback(() => {
    pushHistory([]);
  }, [pushHistory]);

  // --- Operation pipeline management ---
  const removeOp = useCallback((index: number) => {
    const currentOps = opsHistory[historyIndex] ?? [];
    const newOps = currentOps.filter((_, i) => i !== index);
    pushHistory(newOps);
  }, [historyIndex, opsHistory, pushHistory]);

  const reorderOps = useCallback((fromIndex: number, toIndex: number) => {
    const currentOps = [...(opsHistory[historyIndex] ?? [])];
    const [moved] = currentOps.splice(fromIndex, 1);
    currentOps.splice(toIndex, 0, moved);
    pushHistory(currentOps);
  }, [historyIndex, opsHistory, pushHistory]);

  return (
    <div
      className="flex flex-col h-screen overflow-hidden bg-background"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <AppHeader />
      <main className="flex-1 flex overflow-hidden">
        <PreviewPanel 
          originalImage={image} 
          processedImage={processedImage}
          onUpload={handleFileUpload}
          isAnalyzing={isAnalyzing || isProcessing}
          analysis={analysis}
          isDragging={isDragging}
          analysisStep={analysisStep}
          isComparing={isComparing}
          setIsComparing={setIsComparing}
          onExport={handleExport}
          fileInputRef={fileInputRef}
          evaluationMetrics={evaluationMetrics}
          showMetrics={showMetrics}
          setShowMetrics={setShowMetrics}
        />
        <ControlsPanel 
          analysis={analysis} 
          isAnalyzing={isAnalyzing}
          onApplyDIP={applyDIP}
          onReset={resetImage}
          hasImage={!!image}
          activeOps={activeOps}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          onRemoveOp={removeOp}
          onReorderOps={reorderOps}
        />
      </main>
      {/* Hidden file input for keyboard shortcut Ctrl+O */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileUpload}
      />
    </div>
  );
};
