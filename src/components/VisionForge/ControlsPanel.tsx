"use client";

import React, { useRef, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Info, Sliders, Zap, RotateCcw, Sparkles, Wand2, Eye, Palette, Trophy, AlertCircle, Undo2, Redo2, GripVertical, X, Layers } from 'lucide-react';
import { AnalyzeAndSuggestImageEnhancementsOutput } from '@/ai/flows/analyze-and-suggest-image-enhancements-flow';
import { DIPOperation } from '@/lib/dip-engine';
import { EnhancementTools, EnhancementToolsRef } from './EnhancementTools';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface ControlsPanelProps {
  analysis: AnalyzeAndSuggestImageEnhancementsOutput | null;
  isAnalyzing: boolean;
  onApplyDIP: (ops: DIPOperation[], replace?: boolean) => void;
  onReset: () => void;
  hasImage: boolean;
  activeOps: DIPOperation[];
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRemoveOp: (index: number) => void;
  onReorderOps: (fromIndex: number, toIndex: number) => void;
}

// --- Operation Pipeline Chip ---
const PipelineChip: React.FC<{
  op: DIPOperation;
  index: number;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent, idx: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, idx: number) => void;
  isDragTarget: boolean;
}> = ({ op, index, onRemove, onDragStart, onDragOver, onDrop, isDragTarget }) => {
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tight bg-secondary/40 border transition-all group cursor-grab active:cursor-grabbing ${
        isDragTarget ? 'border-primary bg-primary/10 shadow-lg' : 'border-border/30 hover:border-primary/30'
      }`}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
    >
      <GripVertical className="w-3 h-3 text-muted-foreground/40 shrink-0" />
      <span className="truncate text-foreground/80">{op.title}</span>
      <button
        className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  analysis,
  isAnalyzing,
  onApplyDIP,
  onReset,
  hasImage,
  activeOps,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onRemoveOp,
  onReorderOps,
}) => {
  const toolsRef = useRef<EnhancementToolsRef>(null);
  const [activePresetName, setActivePresetName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("vision");
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  const handleFullReset = () => {
    toolsRef.current?.reset();
    setActivePresetName(null);
    onReset();
  };

  const mapOpsToManualParams = (ops: DIPOperation[]) => {
    const paramsToUpdate: any = {};
    ops.forEach(op => {
      const titleLower = op.title.toLowerCase();
      const p = op.parameters;
      
      if (titleLower.includes('brightness')) paramsToUpdate.brightness = p.beta ?? 0;
      if (titleLower.includes('contrast')) paramsToUpdate.contrast = p.alpha ?? 1.0;
      if (titleLower.includes('gamma')) paramsToUpdate.gamma = p.gamma ?? 1.0;
      if (titleLower.includes('saturation')) paramsToUpdate.saturation = p.factor ?? 1.0;
      if (titleLower.includes('vibrance')) paramsToUpdate.vibrance = p.factor ?? 0;
      if (titleLower.includes('exposure')) paramsToUpdate.exposure = p.ev ?? 0;
      if (titleLower.includes('temperature')) paramsToUpdate.temperature = p.kelvin_change ?? 0;
      if (titleLower.includes('hue')) paramsToUpdate.hue = p.degrees ?? 0;
      if (titleLower.includes('clarity')) paramsToUpdate.clarity = p.amount ?? 0;
      if (titleLower.includes('sharpness')) paramsToUpdate.sharpness = p.amount ?? 0;
      if (titleLower.includes('vignette')) paramsToUpdate.vignette = (p.intensity ?? 0) * 100;
      if (titleLower.includes('highlights / shadows')) paramsToUpdate.highlights = p.strength ?? 0;
      if (titleLower.includes('rgb balance')) {
          if (p.r !== undefined) paramsToUpdate.r_balance = p.r;
          if (p.g !== undefined) paramsToUpdate.g_balance = p.g;
          if (p.b !== undefined) paramsToUpdate.b_balance = p.b;
      }
    });
    return paramsToUpdate;
  };

  const handleApplyAISuggestion = (suggestion: any) => {
    const params = mapOpsToManualParams([suggestion]);
    toolsRef.current?.setValues(params);
    onApplyDIP([{ title: suggestion.title, parameters: suggestion.parameters }], false);
  };

  const handleApplyPreset = (preset: any) => {
    const params = mapOpsToManualParams(preset.operations);
    toolsRef.current?.reset();
    toolsRef.current?.setValues(params);
    setActivePresetName(preset.name);
    onApplyDIP(preset.operations, true);
  };

  const handleApplyAllSuggestions = () => {
    if (!analysis) return;
    
    const suggestionsMap = new Map();
    analysis.dip_suggestions.forEach(s => suggestionsMap.set(s.title.toLowerCase(), s));
    
    let allOps: DIPOperation[] = Array.from(suggestionsMap.values()).map(s => ({
      title: s.title,
      parameters: s.parameters
    }));

    const expertPick = analysis.color_presets.find(p => p.is_expert_pick);
    if (expertPick) {
      allOps = [...allOps, ...expertPick.operations];
      setActivePresetName(expertPick.name);
    }

    const params = mapOpsToManualParams(allOps);
    toolsRef.current?.reset();
    toolsRef.current?.setValues(params);
    onApplyDIP(allOps, true);
  };

  // --- Drag & Drop Reorder ---
  const handlePipelineDragStart = (e: React.DragEvent, idx: number) => {
    dragIndexRef.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePipelineDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handlePipelineDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    const fromIdx = dragIndexRef.current;
    if (fromIdx !== null && fromIdx !== toIdx) {
      onReorderOps(fromIdx, toIdx);
    }
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  if (!hasImage) {
    return (
      <aside className="w-[420px] border-l bg-card flex items-center justify-center p-8 text-center">
        <div className="space-y-4">
          <Info className="w-12 h-12 text-muted-foreground mx-auto opacity-20" />
          <p className="text-muted-foreground text-sm">Upload an image to initiate advanced VisionForge analysis.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[420px] border-l bg-card flex flex-col shrink-0">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="px-4 pt-4 shrink-0">
          <TabsList className="w-full bg-secondary/50 p-1 rounded-xl">
            <TabsTrigger value="vision" className="flex-1 gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all text-[10px] uppercase font-bold tracking-wider">
              <Eye className="w-3.5 h-3.5" />
              Vision
            </TabsTrigger>
            <TabsTrigger value="ai-editor" className="flex-1 gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all text-[10px] uppercase font-bold tracking-wider">
              <Wand2 className="w-3.5 h-3.5" />
              AI Edit
            </TabsTrigger>
            <TabsTrigger value="color" className="flex-1 gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all text-[10px] uppercase font-bold tracking-wider">
              <Palette className="w-3.5 h-3.5" />
              Color
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-1 gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all text-[10px] uppercase font-bold tracking-wider">
              <Sliders className="w-3.5 h-3.5" />
              Manual
            </TabsTrigger>
            </TabsList>
        </div>

        <ScrollArea className="flex-1 px-4 py-6">
          <TabsContent value="vision" className="mt-0 space-y-8 outline-none">
            {!analysis && isAnalyzing ? (
              <div className="space-y-8 pt-6">
                <div className="space-y-3">
                  <div className="h-3 w-1/3 bg-secondary animate-pulse rounded" />
                  <div className="h-20 w-full bg-secondary animate-pulse rounded-lg" />
                </div>
                <div className="space-y-3">
                  <div className="h-3 w-1/4 bg-secondary animate-pulse rounded" />
                  <div className="h-32 w-full bg-secondary animate-pulse rounded-lg" />
                </div>
              </div>
            ) : analysis ? (
              <div className="space-y-10 pb-10">
                <section className="space-y-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Literal Observation</h3>
                  <p className="text-sm leading-relaxed text-foreground font-medium italic border-l-2 border-primary/30 pl-4 py-1">
                    &ldquo;{analysis.summary}&rdquo;
                  </p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Artistic Narrative</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap font-medium">
                    {analysis.interpretation}
                  </p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Atmospheric Mood</h3>
                  <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 text-sm leading-relaxed text-foreground/80 italic">
                    {analysis.mood_analysis}
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Symbolism</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {analysis.symbolism}
                  </p>
                </section>
              </div>
            ) : (
              <div className="text-center py-20 opacity-30">
                <Brain className="w-12 h-12 mx-auto mb-4" />
                <p className="text-sm">Processing Neural Analysis...</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai-editor" className="mt-0 space-y-6 outline-none">
            {analysis ? (
              <div className="space-y-10">
                <section className="space-y-6">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-destructive">Technical Photography Issues</h3>
                  </div>
                  <div className="space-y-4">
                    {analysis.photography_issues.map((issue, idx) => (
                      <div key={idx} className="space-y-1.5 pl-4 border-l-2 border-destructive/20">
                        <h4 className="text-xs font-bold text-foreground/90 uppercase tracking-tight">
                          {issue.title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {issue.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <Separator className="bg-border/40" />

                <section className="space-y-4 pb-10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Neural Enhancement Plan</h3>
                    <Button 
                      variant="link" 
                      className="text-accent p-0 h-auto text-[10px] uppercase font-bold tracking-widest hover:text-accent/80 transition-colors"
                      onClick={handleApplyAllSuggestions}
                    >
                      Execute Master Plan
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {analysis.dip_suggestions.map((suggestion, idx) => (
                      <Card key={idx} className="p-4 bg-secondary/10 border-border/40 space-y-3 group hover:border-primary/40 transition-all duration-300">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold flex items-center gap-2 text-foreground">
                              {suggestion.title}
                              <Sparkles className="w-3 h-3 text-accent" />
                            </h4>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {suggestion.reason}
                            </p>
                          </div>
                          <Button 
                            size="icon" 
                            variant="secondary" 
                            className="shrink-0 h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/10"
                            onClick={() => handleApplyAISuggestion(suggestion)}
                          >
                            <Zap className="w-3.5 h-3.5 fill-current" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <div className="text-center py-20 opacity-50 text-sm">Awaiting AI suggestions...</div>
            )}
          </TabsContent>

          <TabsContent value="color" className="mt-0 space-y-6 outline-none">
            {analysis?.color_presets ? (
              <div className="space-y-8">
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Artistic Color Grading</h3>
                    <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-widest">
                      AI Curated Looks
                    </Badge>
                  </div>
                  <div className="grid gap-3">
                    {analysis.color_presets.map((preset, idx) => (
                      <Card 
                        key={idx} 
                        className={`p-4 bg-secondary/10 border-border/40 space-y-3 group cursor-pointer transition-all duration-300 relative overflow-hidden ${activePresetName === preset.name ? 'ring-2 ring-accent border-accent/50 bg-accent/10' : 'hover:border-accent/40'}`}
                        onClick={() => handleApplyPreset(preset)}
                      >
                        {preset.is_expert_pick && (
                          <div className="absolute top-0 right-0 bg-accent text-accent-foreground px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-bl-lg flex items-center gap-1">
                            <Trophy className="w-2.5 h-2.5" />
                            Expert Pick
                          </div>
                        )}
                        <div className="space-y-1">
                          <h4 className={`text-xs font-bold flex items-center gap-2 ${preset.is_expert_pick ? 'text-accent' : 'text-foreground'}`}>
                            {preset.name}
                          </h4>
                          <p className="text-[11px] text-muted-foreground leading-relaxed pr-4">
                            {preset.description}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <div className="text-center py-20 opacity-50 text-sm">Waiting for Color Grading expert...</div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="mt-0 outline-none">
            <EnhancementTools ref={toolsRef} onApplyDIP={onApplyDIP} activeOps={activeOps} />
          </TabsContent>
        </ScrollArea>

        {/* Pipeline & Controls Footer */}
        <div className="border-t bg-secondary/10 shrink-0">
          {/* Active pipeline */}
          {activeOps.length > 0 && (
            <div className="px-4 pt-3 pb-2 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
                  <Layers className="w-3 h-3" />
                  Pipeline
                </h4>
                <span className="text-[9px] font-mono text-primary font-bold">{activeOps.length} ops</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto custom-scrollbar pr-1">
                {activeOps.map((op, idx) => (
                  <PipelineChip
                    key={`${op.title}-${idx}`}
                    op={op}
                    index={idx}
                    onRemove={() => onRemoveOp(idx)}
                    onDragStart={handlePipelineDragStart}
                    onDragOver={(e) => {
                      handlePipelineDragOver(e);
                      setDragOverIndex(idx);
                    }}
                    onDrop={handlePipelineDrop}
                    isDragTarget={dragOverIndex === idx}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="p-4 pt-2 flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 h-10 w-10 rounded-xl border-border/50 text-muted-foreground hover:bg-secondary/50 disabled:opacity-30"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 h-10 w-10 rounded-xl border-border/50 text-muted-foreground hover:bg-secondary/50 disabled:opacity-30"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="flex-1 gap-2 text-muted-foreground border-border/50 hover:bg-secondary/50 rounded-xl" onClick={handleFullReset}>
              <RotateCcw className="w-4 h-4" />
              Reset All
            </Button>
          </div>
        </div>
      </Tabs>
    </aside>
  );
};
