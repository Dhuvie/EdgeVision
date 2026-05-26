'use client';
import React from 'react';

export default function NeuralMap({ detections, imageRef }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {detections.map((det, i) => (
        <div key={i} className="absolute border-2 border-blue-500" 
             style={{ left: det.bbox.x, top: det.bbox.y, width: det.bbox.width, height: det.bbox.height }}>
          <div className="bg-black/70 text-white text-xs px-1 absolute -top-5">{det.label} ({(det.confidence*100).toFixed(0)}%)</div>
        </div>
      ))}
    </div>
  );
}
