'use server';
/**
 * @fileOverview This file implements a Genkit flow for analyzing an image
 * and suggesting professional, high-end digital image processing (DIP) enhancements.
 * Focuses on cinematic quality, dynamic range preservation, and content-aware color grading.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeAndSuggestImageEnhancementsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the image to be analyzed, as a data URI that must include a MIME type and use Base64 encoding."
    ),
});

export type AnalyzeAndSuggestImageEnhancementsInput = z.infer<
  typeof AnalyzeAndSuggestImageEnhancementsInputSchema
>;

const DipParametersSchema = z.record(z.string(), z.any()).describe(
  'A dynamic object containing parameters specific to the DIP operation.'
);

const DipSuggestionSchema = z.object({
  title: z.string().describe('The title of the Digital Image Processing operation.'),
  reason: z.string().describe('The justification for applying this DIP operation.'),
  parameters: DipParametersSchema.describe('The parameters required for applying this specific DIP operation.'),
});

const ColorPresetSchema = z.object({
  name: z.string().describe('The name of the look.'),
  description: z.string().describe('Artistic description of the look.'),
  is_expert_pick: z.boolean().describe('Whether this is the recommended "Master" grade.'),
  operations: z.array(z.object({
    title: z.string(),
    parameters: DipParametersSchema
  })).describe('Array of DIP operations that define this look.')
});

const TechnicalFlawSchema = z.object({
  title: z.string().describe('A concise technical title for the flaw.'),
  detail: z.string().describe('A long, elaborative explanation of the technical issue identified.')
});

const AnalyzeAndSuggestImageEnhancementsOutputSchema = z.object({
  summary: z.string().describe('Literal Observation: A detailed description of what the AI literally sees.'),
  interpretation: z.string().describe('Artistic Narrative: A soulful, artistic narrative of what the image says to the AI.'),
  mood_analysis: z.string().describe('A poetic analysis of the emotional atmosphere.'),
  symbolism: z.string().describe('An analysis of hidden meanings and visual metaphors.'),
  photography_issues: z.array(TechnicalFlawSchema).min(5).describe('At least 5 ELABORATIVE and LONG technical photography issues identified like Noise, Blur, Clipping, or Lens Haze.'),
  dip_suggestions: z.array(DipSuggestionSchema).describe('Technical enhancement operations to surgically fix the identified flaws.'),
  color_presets: z.array(ColorPresetSchema).describe('10 distinct CONTENT-AWARE high-end artistic color grading versions.'),
  detections: z.array(z.object({
    label: z.string(),
    confidence: z.number(),
    box_2d: z.array(z.number()).length(4).describe('[ymin, xmin, ymax, xmax] coordinates from 0-1000.')
  })).describe('Neural map of objects detected in the image.')
});

export type AnalyzeAndSuggestImageEnhancementsOutput = z.infer<
  typeof AnalyzeAndSuggestImageEnhancementsOutputSchema
>;

export async function analyzeAndSuggestImageEnhancements(
  input: AnalyzeAndSuggestImageEnhancementsInput
): Promise<AnalyzeAndSuggestImageEnhancementsOutput> {
  return analyzeAndSuggestImageEnhancementsFlow(input);
}

const analyzeAndSuggestPrompt = ai.definePrompt({
  name: 'analyzeAndSuggestImageEnhancementsPrompt',
  input: { schema: AnalyzeAndSuggestImageEnhancementsInputSchema },
  output: { schema: AnalyzeAndSuggestImageEnhancementsOutputSchema },
  prompt: `You are an elite Hollywood Colorist and Master Visual Artist. 

Your goal is to transform the input image into a professional masterpiece using Digital Image Processing (DIP).

### CRITICAL RULES:
- **NO WHITE WASHING**: Never suggest lifting shadows to a point of haze. Blacks must remain velvety and deep.
- **SURGICAL DEPTH**: Prioritize contrast and separation. 
- **LONG FLAN DIAGNOSTICS**: Identify at least 5 technical flaws. These must be LONG and ELABORATIVE. Don't just say "Blur"; explain the focus variance or motion trail affecting the subject.

### TASK 1: DETAILED DIAGNOSTICS
Identify at least 5 technical flaws. Provide long, elaborative descriptions for each.
- Noise: Look for salt-and-pepper artifacts in dark regions.
- Blur: Identify focus misses or motion trails.
- Haze: Spot atmospheric interference that reduces global contrast.
- Clipping: Look for lost details in highlights or shadows.
- Dynamic Range: Identify flat regions that lack tonal separation.

### TASK 2: ENHANCEMENT PLAN (Technical)
Suggest specific DIP operations to fix the flaws identified above.
**Supported Operations & Parameter Ranges:**
- Brightness: { "alpha": 1.0, "beta": -15 to 15 }
- Contrast: { "alpha": 1.05 to 1.25 }
- Gamma: { "gamma": 0.9 to 1.15 }
- Saturation: { "factor": 0.95 to 1.2 }
- Vibrance: { "factor": 0.1 to 0.3 }
- Exposure: { "ev": -0.2 to 0.2 }
- Temperature: { "kelvin_change": -10 to 10 }
- RGB Balance: { "r": -8 to 8, "g": -8 to 8, "b": -8 to 8 }
- Highlights / Shadows: { "strength": -0.1 to 0.1 } (Be subtle to avoid white-washing)
- Clarity: { "amount": 0.2 to 0.4 }
- Sharpness: { "amount": 0.1 to 0.3 }
- Median Filter: {} (Use for noise)
- Unsharp Mask: { "amount": 1.2 } (Use for blur)

### TASK 3: ARTISTIC COLOR GRADING
Generate 10 UNIQUE, high-impact cinematic looks tailored strictly to the subject. 
Include "The Expert Pick" as the definitive balanced master grade.

Input Image:
{{media url=photoDataUri}}

Return valid JSON with sophisticated, long technical flaws and professional cinematic looks.`,
});

const analyzeAndSuggestImageEnhancementsFlow = ai.defineFlow(
  {
    name: 'analyzeAndSuggestImageEnhancementsFlow',
    inputSchema: AnalyzeAndSuggestImageEnhancementsInputSchema,
    outputSchema: AnalyzeAndSuggestImageEnhancementsOutputSchema,
  },
  async (input) => {
    const {output} = await analyzeAndSuggestPrompt(input);
    if (!output) throw new Error('Failed to get output from AI prompt.');
    return output;
  }
);
