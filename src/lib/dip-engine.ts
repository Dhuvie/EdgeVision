export type DIPParams = Record<string, any>;

export interface DIPOperation {
  title: string;
  parameters: DIPParams;
}

export class DIPEngine {
  constructor() {}

  private async loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async process(imageSrc: string, operations: DIPOperation[]): Promise<string> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return imageSrc;
    }

    try {
      const img = await this.loadImage(imageSrc);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Could not get canvas context');

      ctx.drawImage(img, 0, 0);

      for (const op of operations) {
        this.applyOperation(canvas, ctx, op);
      }

      return canvas.toDataURL('image/jpeg', 0.95);
    } catch (error) {
      console.error("DIPEngine Process Error:", error);
      return imageSrc;
    }
  }

  private applyOperation(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, op: DIPOperation) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    switch (op.title.toLowerCase()) {
      case 'brightness':
        this.adjustBrightness(data, op.parameters.alpha ?? 1.0, op.parameters.beta ?? 0);
        break;
      case 'contrast':
        this.adjustContrast(data, op.parameters.alpha ?? 1.0);
        break;
      case 'gamma':
        this.adjustGamma(data, op.parameters.gamma ?? 1.0);
        break;
      case 'saturation':
        this.adjustSaturation(data, op.parameters.factor ?? 1.0);
        break;
      case 'vibrance':
        this.adjustVibrance(data, op.parameters.factor ?? 0);
        break;
      case 'exposure':
        this.adjustExposure(data, op.parameters.ev ?? 0);
        break;
      case 'temperature':
        this.adjustTemperature(data, op.parameters.kelvin_change ?? 0);
        break;
      case 'hue':
        this.adjustHue(data, op.parameters.degrees ?? 0);
        break;
      case 'rgb balance':
        this.adjustRGBBalance(data, op.parameters.r ?? 0, op.parameters.g ?? 0, op.parameters.b ?? 0);
        break;
      case 'clarity':
        this.applyClarity(ctx, imageData, op.parameters.amount ?? 0);
        return;
      case 'sharpness':
        this.applySharpness(ctx, imageData, op.parameters.amount ?? 0);
        return;
      case 'unsharp mask':
        this.applyUnsharpMask(ctx, imageData, op.parameters.amount ?? 1.0);
        return;
      case 'highlights / shadows':
        this.adjustHighlightsShadows(data, op.parameters.strength ?? 0);
        break;
      case 'vignette':
        this.applyVignette(ctx, imageData, op.parameters.intensity ?? 0.5);
        return;
      case 'gaussian filter':
        this.applyConvolution(ctx, imageData, [1, 2, 1, 2, 4, 2, 1, 2, 1], 16);
        return;
      case 'mean filter':
        this.applyConvolution(ctx, imageData, [1, 1, 1, 1, 1, 1, 1, 1, 1], 9);
        return;
      case 'box blur':
        this.applyConvolution(ctx, imageData, [1, 1, 1, 1, 1, 1, 1, 1, 1], 9);
        return;
      case 'median filter':
        this.applyMedianFilter(ctx, imageData, 1);
        return;
      case 'weighted filter':
        this.applyConvolution(ctx, imageData, [1, 2, 1, 2, 8, 2, 1, 2, 1], 20);
        return;
      case 'min filter':
        this.applyMinMax(ctx, imageData, 'min');
        return;
      case 'max filter':
        this.applyMinMax(ctx, imageData, 'max');
        return;
      case 'salt noise':
        this.addNoise(data, 'salt', op.parameters.intensity ?? 0);
        break;
      case 'pepper noise':
        this.addNoise(data, 'pepper', op.parameters.intensity ?? 0);
        break;
      case 'edge detection':
      case 'sobel':
        this.applySobel(ctx, imageData);
        return;
      case 'laplacian':
        this.applyConvolution(ctx, imageData, [0, -1, 0, -1, 4, -1, 0, -1, 0], 1);
        return;
      case 'emboss':
        this.applyConvolution(ctx, imageData, [-2, -1, 0, -1, 1, 1, 0, 1, 2], 1);
        return;
      case 'invert':
        this.applyInvert(data);
        break;
      case 'sepia':
        this.applySepia(data);
        break;
      case 'grayscale':
        this.applyGrayscale(data);
        break;
      case 'posterize':
        this.applyPosterize(data, op.parameters.levels ?? 4);
        break;
      case 'solarize':
        this.applySolarize(data, op.parameters.threshold ?? 128);
        break;
      case 'threshold':
        this.applyThreshold(data, op.parameters.threshold ?? 128);
        break;
    }

    ctx.putImageData(imageData, 0, 0);
  }

  private clamp(val: number): number {
    return Math.min(255, Math.max(0, val));
  }

  private adjustBrightness(data: Uint8ClampedArray, alpha: number, beta: number) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = this.clamp(alpha * data[i] + beta);
      data[i + 1] = this.clamp(alpha * data[i + 1] + beta);
      data[i + 2] = this.clamp(alpha * data[i + 2] + beta);
    }
  }

  private adjustContrast(data: Uint8ClampedArray, factor: number) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = this.clamp((data[i] - 128) * factor + 128);
      data[i + 1] = this.clamp((data[i + 1] - 128) * factor + 128);
      data[i + 2] = this.clamp((data[i + 2] - 128) * factor + 128);
    }
  }

  private adjustGamma(data: Uint8ClampedArray, gamma: number) {
    const invGamma = 1.0 / (gamma || 1);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = this.clamp(255 * Math.pow(data[i] / 255, invGamma));
      data[i + 1] = this.clamp(255 * Math.pow(data[i + 1] / 255, invGamma));
      data[i + 2] = this.clamp(255 * Math.pow(data[i + 2] / 255, invGamma));
    }
  }

  private adjustSaturation(data: Uint8ClampedArray, factor: number) {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
      data[i] = this.clamp(gray + factor * (r - gray));
      data[i + 1] = this.clamp(gray + factor * (g - gray));
      data[i + 2] = this.clamp(gray + factor * (b - gray));
    }
  }

  private adjustVibrance(data: Uint8ClampedArray, factor: number) {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const max = Math.max(r, g, b);
      const avg = (r + g + b) / 3;
      const amt = ((Math.abs(max - avg) * 2 / 255) * factor);
      data[i] = this.clamp(r + (r - avg) * amt);
      data[i + 1] = this.clamp(g + (g - avg) * amt);
      data[i + 2] = this.clamp(b + (b - avg) * amt);
    }
  }

  private adjustHue(data: Uint8ClampedArray, degrees: number) {
    const angle = degrees * (Math.PI / 180);
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    
    const matrix = [
        cosA + (1.0 - cosA) / 3.0, 1/3.0 * (1.0 - cosA) - Math.sqrt(1/3.0) * sinA, 1/3.0 * (1.0 - cosA) + Math.sqrt(1/3.0) * sinA,
        1/3.0 * (1.0 - cosA) + Math.sqrt(1/3.0) * sinA, cosA + 1/3.0 * (1.0 - cosA), 1/3.0 * (1.0 - cosA) - Math.sqrt(1/3.0) * sinA,
        1/3.0 * (1.0 - cosA) - Math.sqrt(1/3.0) * sinA, 1/3.0 * (1.0 - cosA) + Math.sqrt(1/3.0) * sinA, cosA + 1/3.0 * (1.0 - cosA)
    ];

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      data[i] = this.clamp(r * matrix[0] + g * matrix[1] + b * matrix[2]);
      data[i+1] = this.clamp(r * matrix[3] + g * matrix[4] + b * matrix[5]);
      data[i+2] = this.clamp(r * matrix[6] + g * matrix[7] + b * matrix[8]);
    }
  }

  private adjustRGBBalance(data: Uint8ClampedArray, r: number, g: number, b: number) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = this.clamp(data[i] + r);
      data[i+1] = this.clamp(data[i+1] + g);
      data[i+2] = this.clamp(data[i+2] + b);
    }
  }

  private applyClarity(ctx: CanvasRenderingContext2D, imageData: ImageData, amount: number) {
    const blurred = this.getBlurredData(ctx, imageData, 2);
    const src = imageData.data;
    const dst = new Uint8ClampedArray(src.length);
    
    for (let i = 0; i < src.length; i += 4) {
      for (let j = 0; j < 3; j++) {
        const diff = src[i+j] - blurred[i+j];
        dst[i+j] = this.clamp(src[i+j] + diff * amount);
      }
      dst[i+3] = src[i+3];
    }
    ctx.putImageData(new ImageData(dst, imageData.width, imageData.height), 0, 0);
  }

  private applySharpness(ctx: CanvasRenderingContext2D, imageData: ImageData, amount: number) {
    const kernel = [
      0, -amount, 0, 
      -amount, 1 + 4 * amount, -amount, 
      0, -amount, 0
    ];
    this.applyConvolution(ctx, imageData, kernel, 1);
  }

  private applyUnsharpMask(ctx: CanvasRenderingContext2D, imageData: ImageData, amount: number) {
    const blurred = this.getBlurredData(ctx, imageData, 1);
    const src = imageData.data;
    const dst = new Uint8ClampedArray(src.length);
    
    for (let i = 0; i < src.length; i += 4) {
      for (let j = 0; j < 3; j++) {
        const diff = src[i+j] - blurred[i+j];
        dst[i+j] = this.clamp(src[i+j] + diff * amount);
      }
      dst[i+3] = src[i+3];
    }
    ctx.putImageData(new ImageData(dst, imageData.width, imageData.height), 0, 0);
  }

  private getBlurredData(ctx: CanvasRenderingContext2D, imageData: ImageData, radius: number): Uint8ClampedArray {
    const sw = imageData.width;
    const sh = imageData.height;
    const src = imageData.data;
    const dst = new Uint8ClampedArray(src.length);
    
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        let r = 0, g = 0, b = 0, count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < sh && nx >= 0 && nx < sw) {
              const idx = (ny * sw + nx) * 4;
              r += src[idx];
              g += src[idx+1];
              b += src[idx+2];
              count++;
            }
          }
        }
        const didx = (y * sw + x) * 4;
        dst[didx] = r / (count || 1);
        dst[didx+1] = g / (count || 1);
        dst[didx+2] = b / (count || 1);
        dst[didx+3] = 255;
      }
    }
    return dst;
  }

  private applyMedianFilter(ctx: CanvasRenderingContext2D, imageData: ImageData, radius: number) {
    const sw = imageData.width;
    const sh = imageData.height;
    const src = imageData.data;
    const output = ctx.createImageData(sw, sh);
    const dst = output.data;

    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const rVals = [];
        const gVals = [];
        const bVals = [];

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < sh && nx >= 0 && nx < sw) {
              const idx = (ny * sw + nx) * 4;
              rVals.push(src[idx]);
              gVals.push(src[idx+1]);
              bVals.push(src[idx+2]);
            }
          }
        }

        rVals.sort((a, b) => a - b);
        gVals.sort((a, b) => a - b);
        bVals.sort((a, b) => a - b);

        const mid = Math.floor(rVals.length / 2);
        const didx = (y * sw + x) * 4;
        dst[didx] = rVals[mid];
        dst[didx+1] = gVals[mid];
        dst[didx+2] = bVals[mid];
        dst[didx+3] = 255;
      }
    }
    ctx.putImageData(output, 0, 0);
  }

  private adjustExposure(data: Uint8ClampedArray, ev: number) {
    const factor = Math.pow(2, ev);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = this.clamp(data[i] * factor);
      data[i + 1] = this.clamp(data[i + 1] * factor);
      data[i + 2] = this.clamp(data[i + 2] * factor);
    }
  }

  private adjustTemperature(data: Uint8ClampedArray, kelvin_change: number) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = this.clamp(data[i] + kelvin_change);
      data[i + 2] = this.clamp(data[i + 2] - kelvin_change);
    }
  }

  private adjustHighlightsShadows(data: Uint8ClampedArray, strength: number) {
    // Subtle curve to prevent white-washing.
    // Strength < 0 compresses highlights, > 0 lifts shadows slightly.
    const internalStrength = strength * 0.3; 
    for (let i = 0; i < data.length; i += 4) {
      const l = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      const factor = l > 128 
        ? (1 + internalStrength * (l - 128) / 128) 
        : (1 + (internalStrength * 0.4) * (128 - l) / 128);
      
      data[i] = this.clamp(data[i] * factor);
      data[i + 1] = this.clamp(data[i + 1] * factor);
      data[i + 2] = this.clamp(data[i + 2] * factor);
    }
  }

  private applyMinMax(ctx: CanvasRenderingContext2D, imageData: ImageData, type: 'min' | 'max') {
    const sw = imageData.width;
    const sh = imageData.height;
    const src = imageData.data;
    const output = ctx.createImageData(sw, sh);
    const dst = output.data;

    for (let y = 1; y < sh - 1; y++) {
      for (let x = 1; x < sw - 1; x++) {
        let extremeR = type === 'min' ? 255 : 0;
        let extremeG = type === 'min' ? 255 : 0;
        let extremeB = type === 'min' ? 255 : 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            const idx = (ny * sw + nx) * 4;
            if (type === 'min') {
              extremeR = Math.min(extremeR, src[idx]);
              extremeG = Math.min(extremeG, src[idx+1]);
              extremeB = Math.min(extremeB, src[idx+2]);
            } else {
              extremeR = Math.max(extremeR, src[idx]);
              extremeG = Math.max(extremeG, src[idx+1]);
              extremeB = Math.max(extremeB, src[idx+2]);
            }
          }
        }
        const didx = (y * sw + x) * 4;
        dst[didx] = extremeR;
        dst[didx+1] = extremeG;
        dst[didx+2] = extremeB;
        dst[didx+3] = 255;
      }
    }
    ctx.putImageData(output, 0, 0);
  }

  private addNoise(data: Uint8ClampedArray, type: 'salt' | 'pepper', intensity: number) {
    const probability = intensity / 100;
    for (let i = 0; i < data.length; i += 4) {
      if (Math.random() < probability) {
        const val = type === 'salt' ? 255 : 0;
        data[i] = data[i+1] = data[i+2] = val;
      }
    }
  }

  private applySobel(ctx: CanvasRenderingContext2D, imageData: ImageData) {
    const sw = imageData.width;
    const sh = imageData.height;
    const src = imageData.data;
    const output = ctx.createImageData(sw, sh);
    const dst = output.data;
    
    const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < sh - 1; y++) {
      for (let x = 1; x < sw - 1; x++) {
        let rx = 0, ry = 0;
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const idx = ((y + i) * sw + (x + j)) * 4;
            const lum = (src[idx] + src[idx+1] + src[idx+2]) / 3;
            rx += lum * gx[(i+1)*3 + (j+1)];
            ry += lum * gy[(i+1)*3 + (j+1)];
          }
        }
        const mag = this.clamp(Math.sqrt(rx*rx + ry*ry));
        const didx = (y * sw + x) * 4;
        dst[didx] = dst[didx+1] = dst[didx+2] = mag;
        dst[didx+3] = 255;
      }
    }
    ctx.putImageData(output, 0, 0);
  }

  private applyInvert(data: Uint8ClampedArray) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];
      data[i+1] = 255 - data[i+1];
      data[i+2] = 255 - data[i+2];
    }
  }

  private applySepia(data: Uint8ClampedArray) {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      data[i] = this.clamp((r * 0.393) + (g * 0.769) + (b * 0.189));
      data[i+1] = this.clamp((r * 0.349) + (g * 0.686) + (b * 0.168));
      data[i+2] = this.clamp((r * 0.272) + (g * 0.534) + (b * 0.131));
    }
  }

  private applyGrayscale(data: Uint8ClampedArray) {
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i+1] + data[i+2]) / 3;
      data[i] = data[i+1] = data[i+2] = avg;
    }
  }

  private applyPosterize(data: Uint8ClampedArray, levels: number) {
    const step = 255 / (levels - 1);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.round(data[i] / step) * step;
      data[i+1] = Math.round(data[i+1] / step) * step;
      data[i+2] = Math.round(data[i+2] / step) * step;
    }
  }

  private applySolarize(data: Uint8ClampedArray, threshold: number) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = data[i] > threshold ? 255 - data[i] : data[i];
      data[i+1] = data[i+1] > threshold ? 255 - data[i+1] : data[i+1];
      data[i+2] = data[i+2] > threshold ? 255 - data[i+2] : data[i+2];
    }
  }

  private applyThreshold(data: Uint8ClampedArray, threshold: number) {
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const val = avg > threshold ? 255 : 0;
      data[i] = data[i + 1] = data[i + 2] = val;
    }
  }

  private applyConvolution(ctx: CanvasRenderingContext2D, imageData: ImageData, kernel: number[], divisor: number) {
    const side = Math.round(Math.sqrt(kernel.length));
    const halfSide = Math.floor(side / 2);
    const src = imageData.data;
    const sw = imageData.width;
    const sh = imageData.height;
    const output = ctx.createImageData(sw, sh);
    const dst = output.data;

    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        let r = 0, g = 0, b = 0;
        for (let cy = 0; cy < side; cy++) {
          for (let cx = 0; cx < side; cx++) {
            const scy = Math.min(sh - 1, Math.max(0, y + cy - halfSide));
            const scx = Math.min(sw - 1, Math.max(0, x + cx - halfSide));
            const srcOffset = (scy * sw + scx) * 4;
            const wt = kernel[cy * side + cx];
            r += src[srcOffset] * wt;
            g += src[srcOffset + 1] * wt;
            b += src[srcOffset + 2] * wt;
          }
        }
        const dstOffset = (y * sw + x) * 4;
        dst[dstOffset] = this.clamp(r / (divisor || 1));
        dst[dstOffset + 1] = this.clamp(g / (divisor || 1));
        dst[dstOffset + 2] = this.clamp(b / (divisor || 1));
        dst[dstOffset + 3] = 255;
      }
    }
    ctx.putImageData(output, 0, 0);
  }

  private applyVignette(ctx: CanvasRenderingContext2D, imageData: ImageData, intensity: number) {
    const w = imageData.width;
    const h = imageData.height;
    const data = imageData.data;
    const centerX = w / 2;
    const centerY = h / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
        const factor = 1 - Math.pow(dist, 2) * intensity;
        const idx = (y * w + x) * 4;
        data[idx] = this.clamp(data[idx] * factor);
        data[idx + 1] = this.clamp(data[idx + 1] * factor);
        data[idx + 2] = this.clamp(data[idx + 2] * factor);
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }
}

export const dipEngine = new DIPEngine();
