"use client";

import React from 'react';
import { 
  Timer, Target, CheckCircle2, XCircle, BarChart3, 
  Zap, AlertCircle, Palette, Sparkles, Activity 
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { SceneEvaluationMetrics } from '@/lib/scene-evaluation';

interface EvaluationPanelProps {
  metrics: SceneEvaluationMetrics;
}

// --- Latency Badge ---
const LatencyBadge: React.FC<{ category: string; ms: number }> = ({ category, ms }) => {
  const config: Record<string, { color: string; bg: string; border: string; label: string }> = {
    fast:   { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Fast' },
    normal: { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   label: 'Normal' },
    slow:   { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30',     label: 'Slow' },
  };
  const c = config[category] ?? config.normal;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${c.bg} border ${c.border}`}>
      <div className={`w-2 h-2 rounded-full ${c.color.replace('text-', 'bg-')} animate-pulse`} />
      <span className={`text-xs font-bold uppercase tracking-wider ${c.color}`}>{c.label}</span>
      <span className="text-[10px] font-mono text-muted-foreground">{(ms / 1000).toFixed(1)}s</span>
    </div>
  );
};

// --- Stat Card ---
const StatCard: React.FC<{ icon: any; label: string; value: string | number; accent?: string }> = ({ icon: Icon, label, value, accent = 'text-primary' }) => (
  <Card className="p-3.5 bg-secondary/10 border-border/30 space-y-1.5 hover:border-primary/20 transition-all">
    <div className="flex items-center gap-2">
      <Icon className={`w-3.5 h-3.5 ${accent}`} />
      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
    </div>
    <p className={`text-lg font-black font-mono ${accent}`}>{value}</p>
  </Card>
);

// --- Confidence Bar ---
const ConfidenceBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-[11px] font-mono font-bold text-foreground">{(value * 100).toFixed(1)}%</span>
    </div>
    <div className="h-2 bg-secondary/30 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
        style={{ width: `${Math.min(value * 100, 100)}%` }}
      />
    </div>
  </div>
);

export const EvaluationPanel: React.FC<EvaluationPanelProps> = ({ metrics }) => {
  const { totalLatencyMs, latencyCategory, detection, sceneCompletenessScore, completenessBreakdown, coverage } = metrics;

  return (
    <div className="space-y-8 pb-10">
      {/* --- Latency --- */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
          <Timer className="w-3.5 h-3.5" />
          Analysis Latency
        </h3>
        <div className="flex items-center gap-4">
          <LatencyBadge category={latencyCategory} ms={totalLatencyMs} />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0s</span>
            <span className="font-mono font-bold text-foreground">{(totalLatencyMs / 1000).toFixed(2)}s</span>
            <span>30s</span>
          </div>
          <Progress value={Math.min((totalLatencyMs / 30000) * 100, 100)} className="h-2" />
        </div>
      </section>

      <Separator className="bg-border/30" />

      {/* --- Detection Accuracy --- */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent flex items-center gap-2">
          <Target className="w-3.5 h-3.5" />
          Detection Accuracy
        </h3>
        {detection.count > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={BarChart3} label="Objects" value={detection.count} accent="text-accent" />
              <StatCard icon={Zap} label="High Conf." value={detection.highConfidenceCount} accent="text-emerald-400" />
            </div>
            <ConfidenceBar label="Average Confidence" value={detection.avgConfidence} color="bg-primary" />
            <ConfidenceBar label="Min Confidence" value={detection.minConfidence} color="bg-amber-500" />
            <ConfidenceBar label="Max Confidence" value={detection.maxConfidence} color="bg-emerald-500" />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/60 italic pl-4 border-l-2 border-border/30">No objects detected in this scene.</p>
        )}
      </section>

      <Separator className="bg-border/30" />

      {/* --- Scene Completeness --- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" />
            Scene Completeness
          </h3>
          <span className={`text-xl font-black font-mono ${
            sceneCompletenessScore >= 80 ? 'text-emerald-400' :
            sceneCompletenessScore >= 50 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {sceneCompletenessScore}%
          </span>
        </div>
        <Progress 
          value={sceneCompletenessScore} 
          className="h-3" 
        />
        <div className="space-y-2 pt-1">
          {completenessBreakdown.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2.5 text-[11px]">
              {item.filled ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-red-400/60 shrink-0" />
              )}
              <span className={item.filled ? 'text-foreground/80' : 'text-muted-foreground/50 line-through'}>
                {item.field}
              </span>
            </div>
          ))}
        </div>
      </section>

      <Separator className="bg-border/30" />

      {/* --- Analysis Coverage --- */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4ade80] flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          Analysis Coverage
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={AlertCircle} label="Issues" value={coverage.issuesIdentified} accent="text-destructive" />
          <StatCard icon={Zap} label="Suggestions" value={coverage.dipSuggestionsCount} accent="text-primary" />
          <StatCard icon={Palette} label="Presets" value={coverage.colorPresetsGenerated} accent="text-accent" />
        </div>
      </section>
    </div>
  );
};
