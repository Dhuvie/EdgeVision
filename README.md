# VisionForge

Advanced AI-powered image analysis and digital image processing platform. VisionForge combines Google Gemini's multimodal intelligence with a client-side DIP engine to deliver real-time scene understanding, automated enhancement suggestions, and cinematic color grading — all in the browser.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Usage](#usage)
- [DIP Engine Reference](#dip-engine-reference)
- [Scene Evaluation Metrics](#scene-evaluation-metrics)
- [Configuration](#configuration)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

VisionForge is a browser-based image editor that performs deep semantic analysis of uploaded images using Google Gemini 2.5 Flash. The AI identifies objects, evaluates composition quality, diagnoses technical photography flaws, and generates both surgical enhancement operations and cinematic color grading presets — all returned as structured, actionable data.

A custom-built client-side Digital Image Processing (DIP) engine then applies these operations in real time on an HTML Canvas, providing instant visual feedback without any server-side image processing.

---

## Key Features

### AI-Driven Scene Understanding
- Object detection with bounding boxes and confidence scores
- Detailed literal scene description and artistic narrative
- Atmospheric mood analysis and symbolism interpretation
- Technical photography flaw diagnostics (noise, blur, haze, clipping, dynamic range)

### Automated Enhancement Pipeline
- AI-generated DIP operations with parameter-level precision
- One-click application of individual suggestions or the full master plan
- Content-aware parameter ranges tuned to avoid over-processing

### Cinematic Color Grading
- 10 AI-curated artistic color grading presets per image
- Each preset is a composable stack of DIP operations
- Expert Pick designation for the recommended master grade

### Client-Side DIP Engine
- 25+ image processing operations implemented in pure JavaScript
- Pixel-level manipulation via Canvas ImageData API
- Spatial filters: Gaussian, Median, Mean, Weighted, Min/Max, Box Blur
- Edge operators: Sobel, Laplacian, Emboss, Unsharp Mask
- Color transforms: Hue rotation, Temperature, RGB Balance, Vibrance
- Tone mapping: Exposure, Gamma, Highlights/Shadows, Clarity
- Effects: Sepia, Grayscale, Invert, Posterize, Solarize, Threshold, Vignette
- Noise simulation: Salt and Pepper noise injection

### Scene Evaluation Metrics
- Quantitative accuracy measurement from AI detection confidence scores
- End-to-end latency instrumentation with performance classification
- Scene completeness scoring across all analysis output dimensions
- Floating metrics dashboard overlay on the preview canvas

### Professional Editing Workflow
- Unlimited undo/redo with full operation history
- Drag-and-drop operation pipeline reordering
- Live RGB histogram overlay
- Before/after comparison slider with adjustable split position
- Zoom (0.5x - 8x) and pan navigation
- Multi-format export: JPEG, PNG, WebP with quality control
- Image input via file picker, drag-and-drop, or clipboard paste

---

## Architecture

```
Browser (Client)
  |
  |-- Next.js App (React 19)
  |     |-- PreviewPanel .............. Image canvas, zoom/pan, histogram, detection overlay, metrics panel
  |     |-- ControlsPanel ............. Tabbed UI: Vision, AI Edit, Color, Manual
  |     |-- EditorLayout .............. State management, undo/redo history, DIP pipeline orchestration
  |     |-- EvaluationPanel ........... Scene understanding metrics dashboard
  |     |-- EnhancementTools .......... Manual slider controls for all DIP parameters
  |     `-- DIP Engine ................ Pure JS pixel-level image processing (Canvas API)
  |
  |-- Server Actions (Next.js)
  |     `-- Genkit Flow ............... analyzeAndSuggestImageEnhancementsFlow
  |
  `-- Google Gemini 2.5 Flash ........ Multimodal LLM for scene analysis, object detection, grading
```

All image processing happens client-side. The only server round-trip is the Genkit flow that sends the image to Gemini for analysis and receives structured JSON back.

---

## Tech Stack

| Layer            | Technology                                    |
|------------------|-----------------------------------------------|
| Framework        | Next.js 15 (App Router, Turbopack)            |
| UI Library       | React 19                                      |
| AI Integration   | Genkit with `@genkit-ai/google-genai`         |
| LLM              | Google Gemini 2.5 Flash                       |
| Schema           | Zod (input/output validation for AI flows)    |
| Components       | Radix UI primitives with shadcn/ui wrappers   |
| Styling          | Tailwind CSS 3.4                              |
| Typography       | Space Grotesk (headings), Inter (body)        |
| Language         | TypeScript 5                                  |
| Image Processing | Custom DIP engine (Canvas 2D API)             |
| Package Manager  | npm                                           |

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- A Google AI API key ([Get one here](https://aistudio.google.com/apikey))

### Installation

```bash
git clone https://github.com/<your-username>/VisionForge.git
cd VisionForge
npm install
```

### Environment Setup

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_google_ai_api_key_here
```

### Running the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:9002`.

### Available Scripts

| Command           | Description                                    |
|--------------------|-----------------------------------------------|
| `npm run dev`      | Start the Next.js dev server with Turbopack   |
| `npm run build`    | Create a production build                     |
| `npm run start`    | Run the production server                     |
| `npm run lint`     | Run ESLint                                    |
| `npm run typecheck`| Run TypeScript type checking                  |
| `npm run genkit:dev` | Start the Genkit development UI              |

---

## Project Structure

```
VisionForge/
  src/
    ai/
      genkit.ts ............................. Genkit instance configuration (model, plugins)
      dev.ts ................................ Genkit development server entry point
      flows/
        analyze-and-suggest-image-enhancements-flow.ts
                                             AI analysis flow with Zod schemas
    app/
      layout.tsx ............................ Root layout, fonts, metadata
      page.tsx .............................. Entry point, renders EditorLayout
      globals.css ........................... Global styles and CSS custom properties
    components/
      VisionForge/
        AppHeader.tsx ....................... Top navigation bar
        EditorLayout.tsx .................... Main editor state, undo/redo, pipeline orchestration
        PreviewPanel.tsx .................... Image canvas, overlays, comparison, export
        ControlsPanel.tsx ................... Right sidebar with tabbed analysis/edit panels
        EnhancementTools.tsx ................ Manual adjustment sliders
        EvaluationPanel.tsx ................. Scene evaluation metrics dashboard
      ui/ .................................. Radix/shadcn component library
    hooks/
      useImageHistogram.ts .................. RGB histogram computation hook
      use-toast.ts .......................... Toast notification hook
    lib/
      dip-engine.ts ......................... Client-side image processing engine (562 lines)
      scene-evaluation.ts ................... Accuracy, latency, and completeness metrics
      utils.ts .............................. Utility functions (cn)
  docs/
    blueprint.md ............................ Original design specification
```

---

## Usage

### Basic Workflow

1. **Upload an image** using the file picker, drag-and-drop, or paste from clipboard (Ctrl+V).
2. **Wait for AI analysis** to complete. The progress indicator shows which stage is active.
3. **Review the analysis** in the Vision tab: scene description, mood, symbolism.
4. **Apply enhancements** from the AI Edit tab individually or use "Execute Master Plan" to apply all.
5. **Try color presets** in the Color tab. The Expert Pick is the AI's recommended grade.
6. **Fine-tune manually** using sliders in the Manual tab. Sliders auto-sync with applied operations.
7. **Check metrics** by clicking the Metrics button in the top toolbar for latency and accuracy data.
8. **Export** the result in JPEG, PNG, or WebP format with adjustable quality.

### Neural Map

Toggle the Neural Map overlay to visualize detected objects with labeled bounding boxes and confidence percentages directly on the image.

### Comparison Mode

Enable Compare mode (or press Space) to see a side-by-side before/after with a draggable split slider.

### Operation Pipeline

All applied operations appear as reorderable chips in the footer. Drag to reorder, click X to remove. Each change is recorded in the undo/redo history.

---

## DIP Engine Reference

The client-side DIP engine supports the following operations. Each operation accepts a parameters object.

### Tone and Exposure

| Operation           | Parameters                          | Range               |
|---------------------|-------------------------------------|----------------------|
| Brightness          | `alpha`, `beta`                     | beta: -100 to 100   |
| Contrast            | `alpha`                             | 0.5 to 2.0          |
| Gamma               | `gamma`                             | 0.1 to 3.0          |
| Exposure            | `ev`                                | -2.0 to 2.0         |
| Highlights/Shadows  | `strength`                          | -1.0 to 1.0         |

### Color

| Operation           | Parameters                          | Range               |
|---------------------|-------------------------------------|----------------------|
| Saturation          | `factor`                            | 0 to 2.0            |
| Vibrance            | `factor`                            | -1.0 to 1.0         |
| Temperature         | `kelvin_change`                     | -100 to 100         |
| Hue                 | `degrees`                           | -180 to 180          |
| RGB Balance         | `r`, `g`, `b`                       | -50 to 50 each      |

### Detail and Structure

| Operation           | Parameters                          |
|---------------------|-------------------------------------|
| Sharpness           | `amount` (0 to 2.0)                |
| Clarity             | `amount` (0 to 2.0)                |
| Unsharp Mask        | `amount` (default 1.0)             |
| Vignette            | `intensity` (0 to 1.0)             |

### Spatial Filters

| Operation           | Description                         |
|---------------------|-------------------------------------|
| Gaussian Filter     | Weighted 3x3 smooth                |
| Mean Filter         | Uniform 3x3 average                |
| Median Filter       | Non-linear noise reduction          |
| Box Blur            | Uniform 3x3 average                |
| Weighted Filter     | Center-weighted smooth              |
| Min Filter          | Morphological erosion               |
| Max Filter          | Morphological dilation              |

### Edge Detection

| Operation           | Description                         |
|---------------------|-------------------------------------|
| Sobel               | Gradient magnitude (Gx, Gy)        |
| Laplacian           | Second-order derivative             |
| Emboss              | Directional relief effect           |

### Effects

| Operation           | Parameters                          |
|---------------------|-------------------------------------|
| Grayscale           | (none)                              |
| Sepia               | (none)                              |
| Invert              | (none)                              |
| Posterize           | `levels` (default 5)               |
| Solarize            | `threshold` (0-255)                |
| Threshold           | `threshold` (0-255)                |
| Salt Noise          | `intensity` (0-50%)                |
| Pepper Noise        | `intensity` (0-50%)                |

---

## Scene Evaluation Metrics

After each AI analysis, VisionForge computes the following quantitative metrics:

### Latency

| Metric            | Description                                              |
|-------------------|----------------------------------------------------------|
| Total Latency     | Wall-clock time for the complete AI round-trip (ms)      |
| Category          | Classification: Fast (<5s), Normal (5-15s), Slow (>15s) |

### Detection Accuracy

| Metric              | Description                                            |
|----------------------|--------------------------------------------------------|
| Object Count         | Total number of detected objects                      |
| Avg Confidence       | Mean confidence score across all detections           |
| Min/Max Confidence   | Confidence score range                                |
| High Confidence      | Count of detections with confidence >= 0.8            |

### Scene Completeness

A composite 0-100 score based on the presence and quality of all expected output fields:
- Summary (>10 chars)
- Interpretation (>10 chars)
- Mood Analysis (>10 chars)
- Symbolism (>10 chars)
- Photography Issues (>= 5)
- DIP Suggestions (>= 1)
- Color Presets (>= 1)
- Object Detections (>= 1)
- Expert Pick Preset
- 10 Color Presets

---

## Configuration

### Environment Variables

| Variable         | Required | Description                      |
|------------------|----------|----------------------------------|
| `GEMINI_API_KEY` | Yes      | Google AI API key for Gemini     |

### AI Model

The model is configured in `src/ai/genkit.ts`. Default: `googleai/gemini-2.5-flash`.

### Dev Server Port

Default port is `9002`, configured in the `dev` script in `package.json`.

---

## Keyboard Shortcuts

| Shortcut       | Action                       |
|----------------|------------------------------|
| Ctrl+Z         | Undo                         |
| Ctrl+Y         | Redo                         |
| Ctrl+Shift+Z   | Redo                         |
| Ctrl+O         | Open file picker             |
| Space          | Toggle before/after compare  |
| Scroll wheel   | Zoom in/out                  |
| Double-click   | Reset zoom                   |
| Click+Drag     | Pan (when zoomed in)         |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please ensure all changes pass `npm run typecheck` and `npm run lint` before submitting.

---

## License

This project is provided as-is for educational and personal use. See the repository for licensing details.
