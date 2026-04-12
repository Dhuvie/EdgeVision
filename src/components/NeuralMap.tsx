'use client';
import React from 'react';

export default function NeuralMap({ detections = [] }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {detections.map((det, i) => (
        <div key={i} className="absolute border-2 border-lime-400" 
             style={{left: det.bbox?.x || 0, top: det.bbox?.y || 0, width: det.bbox?.width || 100, height: det.bbox?.height || 100}}>
          <div className="bg-black/70 text-white text-xs px-1 absolute -top-5">{det.label}</div>
        </div>
      ))}
    </div>
  );
}
