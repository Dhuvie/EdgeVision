"use client";

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DIPOperation } from '@/lib/dip-engine';
import { 
  Sun, Contrast, Moon, Droplets, MoveUp, Wind, Maximize, 
  MinusCircle, Layers, Thermometer, Zap, Sparkles, Filter, Activity,
  Palette, Box, Wand2, Eye, ScanLine, AlertTriangle, Ghost, 
  Binary, Hammer, Scissors
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

export interface EnhancementToolsRef {
  reset: () => void;
  setValues: (values: Partial<typeof INITIAL_PARAMS>) => void;
}

const INITIAL_PARAMS = {
  brightness: 0,
  contrast: 1.0,
  gamma: 1.0,
  saturation: 1.0,
  vignette: 0,
  vibrance: 0,
  exposure: 0,
  temperature: 0,
  highlights: 0,
  sharpness: 0,
  hue: 0,
  clarity: 0,
  r_balance: 0,
  g_balance: 0,
  b_balance: 0,
  salt_noise: 0,
  pepper_noise: 0,
  threshold: 128
};

// Derive slider values from the active operations list
function deriveParamsFromOps(ops: DIPOperation[]): typeof INITIAL_PARAMS {
  const derived = { ...INITIAL_PARAMS };
  ops.forEach(op => {
    const t = op.title.toLowerCase();
    const p = op.parameters;
    if (t.includes('brightness')) derived.brightness = p.beta ?? 0;
    if (t.includes('contrast') && !t.includes('auto')) derived.contrast = p.alpha ?? 1.0;
    if (t.includes('gamma')) derived.gamma = p.gamma ?? 1.0;
    if (t.includes('saturation')) derived.saturation = p.factor ?? 1.0;
    if (t.includes('vibrance')) derived.vibrance = p.factor ?? 0;
    if (t.includes('exposure')) derived.exposure = p.ev ?? 0;
    if (t.includes('temperature')) derived.temperature = p.kelvin_change ?? 0;
    if (t.includes('hue')) derived.hue = p.degrees ?? 0;
    if (t.includes('clarity')) derived.clarity = p.amount ?? 0;
    if (t.includes('sharpness')) derived.sharpness = p.amount ?? 0;
    if (t.includes('vignette')) derived.vignette = (p.intensity ?? 0) * 100;
    if (t.includes('highlights / shadows')) derived.highlights = p.strength ?? 0;
    if (t === 'rgb balance') {
      if (p.r !== undefined) derived.r_balance = p.r;
      if (p.g !== undefined) derived.g_balance = p.g;
      if (p.b !== undefined) derived.b_balance = p.b;
    }
    if (t === 'salt noise') derived.salt_noise = p.intensity ?? 0;
    if (t === 'pepper noise') derived.pepper_noise = p.intensity ?? 0;
    if (t === 'threshold' || t === 'solarize') derived.threshold = p.threshold ?? 128;
  });
  return derived;
}

interface EnhancementToolsProps {
  onApplyDIP: (ops: DIPOperation[], replace?: boolean) => void;
  activeOps: DIPOperation[];
}

export const EnhancementTools = forwardRef<EnhancementToolsRef, EnhancementToolsProps>(({ onApplyDIP, activeOps }, ref) => {
  const [params, setParams] = useState(INITIAL_PARAMS);
  const isInternalChange = useRef(false);

  // Auto-sync sliders when activeOps change from external sources
  // (AI suggestions, presets, undo/redo, pipeline edits)
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    setParams(deriveParamsFromOps(activeOps));
  }, [activeOps]);

  useImperativeHandle(ref, () => ({
    reset: () => setParams(INITIAL_PARAMS),
    setValues: (newValues) => setParams(prev => ({ ...prev, ...newValues }))
  }));

  const handleApplyAdjust = (type: string, value: number) => {
    let dip: DIPOperation;
    switch (type) {
      case 'brightness':
        dip = { title: 'Brightness', parameters: { alpha: 1.0, beta: value } };
        break;
      case 'contrast':
        dip = { title: 'Contrast', parameters: { alpha: value } };
        break;
      case 'gamma':
        dip = { title: 'Gamma', parameters: { gamma: value } };
        break;
      case 'saturation':
        dip = { title: 'Saturation', parameters: { factor: value } };
        break;
      case 'vibrance':
        dip = { title: 'Vibrance', parameters: { factor: value } };
        break;
      case 'exposure':
        dip = { title: 'Exposure', parameters: { ev: value } };
        break;
      case 'temperature':
        dip = { title: 'Temperature', parameters: { kelvin_change: value } };
        break;
      case 'hue':
        dip = { title: 'Hue', parameters: { degrees: value } };
        break;
      case 'clarity':
        dip = { title: 'Clarity', parameters: { amount: value } };
        break;
      case 'sharpness':
        dip = { title: 'Sharpness', parameters: { amount: value } };
        break;
      case 'r_balance':
        dip = { title: 'RGB Balance', parameters: { r: value, g: params.g_balance, b: params.b_balance } };
        break;
      case 'g_balance':
        dip = { title: 'RGB Balance', parameters: { r: params.r_balance, g: value, b: params.b_balance } };
        break;
      case 'b_balance':
        dip = { title: 'RGB Balance', parameters: { r: params.r_balance, g: params.g_balance, b: value } };
        break;
      case 'highlights':
        dip = { title: 'Highlights / Shadows', parameters: { strength: value } };
        break;
      case 'vignette':
        dip = { title: 'Vignette', parameters: { intensity: value / 100 } };
        break;
      case 'salt_noise':
        dip = { title: 'Salt Noise', parameters: { intensity: value } };
        break;
      case 'pepper_noise':
        dip = { title: 'Pepper Noise', parameters: { intensity: value } };
        break;
      case 'threshold':
        const lastThresholdIdx = [...activeOps].reverse().findIndex(op => op.title.toLowerCase() === 'threshold' || op.title.toLowerCase() === 'solarize');
        if (lastThresholdIdx !== -1) {
            const actualIdx = activeOps.length - 1 - lastThresholdIdx;
            const targetOp = activeOps[actualIdx];
            isInternalChange.current = true;
            onApplyDIP([{ title: targetOp.title, parameters: { ...targetOp.parameters, threshold: value } }], false);
        }
        return;
      default:
        return;
    }
    isInternalChange.current = true;
    onApplyDIP([dip], false);
  };

  const getOpCount = (title: string) => {
    return activeOps.filter(op => op.title.toLowerCase() === title.toLowerCase()).length;
  };

  const renderSlider = (id: string, label: string, icon: any, min: number, max: number, step: number, suffix: string = '') => (
    <div key={id} className="space-y-3">
        <div className="flex justify-between items-center">
        <Label className="flex items-center gap-2 text-xs text-muted-foreground uppercase font-bold tracking-tighter">
            {React.createElement(icon, { className: "w-3.5 h-3.5" })}
            {label}
        </Label>
        <span className="text-[10px] font-mono text-primary font-bold">
            {Number((params as any)[id]).toFixed(step < 1 ? 2 : 0)}{suffix}
        </span>
        </div>
        <Slider 
        value={[(params as any)[id]]} 
        min={min} max={max} step={step} 
        onValueChange={v => setParams({ ...params, [id]: v[0] })}
        onValueCommit={v => handleApplyAdjust(id, v[0])}
        />
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      <Accordion type="multiple" defaultValue={["light", "color", "flaws", "detail", "effects"]} className="space-y-4">
        <AccordionItem value="light" className="border-none">
          <AccordionTrigger className="hover:no-underline py-2 group">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
              <Sun className="w-3.5 h-3.5" />
              Illumination & Tone
            </h3>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-6">
            {renderSlider('exposure', 'Exposure', Zap, -2, 2, 0.05, 'ev')}
            {renderSlider('brightness', 'Brightness', Sun, -100, 100, 1)}
            {renderSlider('contrast', 'Contrast', Contrast, 0.5, 2.0, 0.05, 'x')}
            {renderSlider('gamma', 'Gamma', Moon, 0.1, 3.0, 0.05)}
            {renderSlider('highlights', 'Highlights', Activity, -1.0, 1.0, 0.05)}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="color" className="border-none">
          <AccordionTrigger className="hover:no-underline py-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent flex items-center gap-2">
              <Palette className="w-3.5 h-3.5" />
              Chromatic Mapping
            </h3>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-6">
            {renderSlider('temperature', 'Temp', Thermometer, -100, 100, 2)}
            {renderSlider('hue', 'Hue Shift', Palette, -180, 180, 1, '°')}
            {renderSlider('saturation', 'Saturation', Droplets, 0, 2.0, 0.05, 'x')}
            {renderSlider('vibrance', 'Vibrance', Sparkles, -1.0, 1.0, 0.05)}
            <div className="space-y-4 pt-2">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">RGB Balance</p>
                {renderSlider('r_balance', 'Red', Box, -50, 50, 1)}
                {renderSlider('g_balance', 'Green', Box, -50, 50, 1)}
                {renderSlider('b_balance', 'Blue', Box, -50, 50, 1)}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="flaws" className="border-none">
          <AccordionTrigger className="hover:no-underline py-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-destructive flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              Flaw Introducer
            </h3>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-6">
            {renderSlider('salt_noise', 'Salt Noise', Ghost, 0, 50, 0.1, '%')}
            {renderSlider('pepper_noise', 'Pepper Noise', Ghost, 0, 50, 0.1, '%')}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="detail" className="border-none">
          <AccordionTrigger className="hover:no-underline py-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
              <Maximize className="w-3.5 h-3.5" />
              Structural Fidelity
            </h3>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-6">
            {renderSlider('sharpness', 'Sharpness', ScanLine, 0, 2.0, 0.05)}
            {renderSlider('clarity', 'Clarity', Activity, 0, 2.0, 0.05)}
            {renderSlider('vignette', 'Vignette', Layers, 0, 100, 1, '%')}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="effects" className="border-none">
          <AccordionTrigger className="hover:no-underline py-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4ade80] flex items-center gap-2">
              <Filter className="w-3.5 h-3.5" />
              DIP Components
            </h3>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-6">
            <div className="pb-4">
              {renderSlider('threshold', 'Global Threshold', ScanLine, 0, 255, 1)}
            </div>
            <div className="grid grid-cols-2 gap-2">
                {[
                    { title: 'Median Filter', icon: Filter, params: {} },
                    { title: 'Mean Filter', icon: Wind, params: {} },
                    { title: 'Gaussian Filter', icon: MoveUp, params: {} },
                    { title: 'Box Blur', icon: Layers, params: {} },
                    { title: 'Weighted Filter', icon: Wand2, params: {} },
                    { title: 'Min Filter', icon: Hammer, params: {} },
                    { title: 'Max Filter', icon: Maximize, params: {} },
                    { title: 'Unsharp Mask', icon: Sparkles, params: { amount: 1.0 } },
                    { title: 'Edge Detection', icon: ScanLine, params: {} },
                    { title: 'Laplacian', icon: Activity, params: {} },
                    { title: 'Emboss', icon: Scissors, params: {} },
                    { title: 'Grayscale', icon: Eye, params: {} },
                    { title: 'Sepia', icon: Palette, params: {} },
                    { title: 'Invert', icon: MinusCircle, params: {} },
                    { title: 'Posterize', icon: Box, params: { levels: 5 } },
                    { title: 'Solarize', icon: Zap, params: { threshold: params.threshold } },
                    { title: 'Threshold', icon: Binary, params: { threshold: params.threshold } },
                ].map((fx) => {
                    const count = getOpCount(fx.title);
                    return (
                        <Button 
                          key={fx.title} 
                          variant="secondary" 
                          className="justify-start gap-2 h-10 text-[10px] bg-secondary/30 hover:bg-secondary/50 border border-transparent hover:border-[#4ade80]/30 transition-all font-bold uppercase tracking-tighter relative" 
                          onClick={() => onApplyDIP([{ title: fx.title, parameters: fx.params }], false)}
                        >
                        <fx.icon className="w-3.5 h-3.5 text-accent" />
                        <span className="truncate">{fx.title}</span>
                        {count > 0 && (
                          <Badge className="absolute -top-2 -right-1 h-4 min-w-4 px-1 flex items-center justify-center bg-primary text-[8px] border-none">
                            {count}
                          </Badge>
                        )}
                        </Button>
                    );
                })}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
});

EnhancementTools.displayName = "EnhancementTools";
