/**
 * @fileOverview Quantitative evaluation metrics for scene understanding.
 * Computes accuracy confidence scores from AI output and records latency.
 */

import type { AnalyzeAndSuggestImageEnhancementsOutput } from '@/ai/flows/analyze-and-suggest-image-enhancements-flow';

// --- Types ---

export type LatencyCategory = 'fast' | 'normal' | 'slow';

export interface DetectionMetrics {
  count: number;
  avgConfidence: number;
  minConfidence: number;
  maxConfidence: number;
  highConfidenceCount: number; // confidence ≥ 0.8
}

export interface CoverageMetrics {
  issuesIdentified: number;
  dipSuggestionsCount: number;
  colorPresetsGenerated: number;
}

export interface SceneEvaluationMetrics {
  // Latency
  totalLatencyMs: number;
  latencyCategory: LatencyCategory;

  // Detection accuracy
  detection: DetectionMetrics;

  // Scene completeness (0-100)
  sceneCompletenessScore: number;
  completenessBreakdown: { field: string; filled: boolean }[];

  // Analysis coverage
  coverage: CoverageMetrics;
}

// --- Helpers ---

function classifyLatency(ms: number): LatencyCategory {
  if (ms < 5000) return 'fast';
  if (ms <= 15000) return 'normal';
  return 'slow';
}

function computeDetectionMetrics(
  detections: AnalyzeAndSuggestImageEnhancementsOutput['detections']
): DetectionMetrics {
  if (!detections || detections.length === 0) {
    return { count: 0, avgConfidence: 0, minConfidence: 0, maxConfidence: 0, highConfidenceCount: 0 };
  }

  const confidences = detections.map(d => d.confidence);
  const sum = confidences.reduce((a, b) => a + b, 0);

  return {
    count: detections.length,
    avgConfidence: sum / confidences.length,
    minConfidence: Math.min(...confidences),
    maxConfidence: Math.max(...confidences),
    highConfidenceCount: confidences.filter(c => c >= 0.8).length,
  };
}

function computeCompletenessScore(
  result: AnalyzeAndSuggestImageEnhancementsOutput
): { score: number; breakdown: { field: string; filled: boolean }[] } {
  const checks: { field: string; filled: boolean }[] = [
    { field: 'Summary', filled: (result.summary ?? '').trim().length > 10 },
    { field: 'Interpretation', filled: (result.interpretation ?? '').trim().length > 10 },
    { field: 'Mood Analysis', filled: (result.mood_analysis ?? '').trim().length > 10 },
    { field: 'Symbolism', filled: (result.symbolism ?? '').trim().length > 10 },
    { field: 'Photography Issues (≥5)', filled: (result.photography_issues ?? []).length >= 5 },
    { field: 'DIP Suggestions', filled: (result.dip_suggestions ?? []).length > 0 },
    { field: 'Color Presets', filled: (result.color_presets ?? []).length > 0 },
    { field: 'Object Detections', filled: (result.detections ?? []).length > 0 },
    { field: 'Expert Pick Preset', filled: (result.color_presets ?? []).some(p => p.is_expert_pick) },
    { field: '10 Color Presets', filled: (result.color_presets ?? []).length >= 10 },
  ];

  const filledCount = checks.filter(c => c.filled).length;
  const score = Math.round((filledCount / checks.length) * 100);

  return { score, breakdown: checks };
}

// --- Main ---

export function computeSceneEvaluationMetrics(
  result: AnalyzeAndSuggestImageEnhancementsOutput,
  totalLatencyMs: number
): SceneEvaluationMetrics {
  const detection = computeDetectionMetrics(result.detections);
  const { score, breakdown } = computeCompletenessScore(result);

  return {
    totalLatencyMs: Math.round(totalLatencyMs),
    latencyCategory: classifyLatency(totalLatencyMs),
    detection,
    sceneCompletenessScore: score,
    completenessBreakdown: breakdown,
    coverage: {
      issuesIdentified: (result.photography_issues ?? []).length,
      dipSuggestionsCount: (result.dip_suggestions ?? []).length,
      colorPresetsGenerated: (result.color_presets ?? []).length,
    },
  };
}
