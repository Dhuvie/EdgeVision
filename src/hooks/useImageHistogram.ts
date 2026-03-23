"use client";

import { useState, useEffect, useRef } from 'react';

export interface HistogramData {
  r: number[];
  g: number[];
  b: number[];
  lum: number[];
}

const EMPTY_CHANNEL = () => new Array(256).fill(0);

export function useImageHistogram(imageDataUrl: string | null): HistogramData {
  const [histogram, setHistogram] = useState<HistogramData>({
    r: EMPTY_CHANNEL(),
    g: EMPTY_CHANNEL(),
    b: EMPTY_CHANNEL(),
    lum: EMPTY_CHANNEL(),
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (!imageDataUrl || typeof window === 'undefined') {
        setHistogram({
          r: EMPTY_CHANNEL(),
          g: EMPTY_CHANNEL(),
          b: EMPTY_CHANNEL(),
          lum: EMPTY_CHANNEL(),
        });
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Downsample for performance
        const maxSize = 512;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        const r = EMPTY_CHANNEL();
        const g = EMPTY_CHANNEL();
        const b = EMPTY_CHANNEL();
        const lum = EMPTY_CHANNEL();

        for (let i = 0; i < data.length; i += 4) {
          r[data[i]]++;
          g[data[i + 1]]++;
          b[data[i + 2]]++;
          const l = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          lum[l]++;
        }

        setHistogram({ r, g, b, lum });
      };
      img.src = imageDataUrl;
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [imageDataUrl]);

  return histogram;
}
