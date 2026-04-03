'use client';
export default function NeuralMap({ detections = [] }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {detections.map((d, i) => (
        <div key={i} className="absolute border-2 border-lime-400" 
             style={{left: d.bbox?.x || 0, top: d.bbox?.y || 0, width: d.bbox?.width || 100, height: d.bbox?.height || 100}}>
          <div className="bg-black/70 text-white text-xs px-1 absolute -top-5">{d.label} {(d.confidence*100).toFixed(0)}%</div>
        </div>
      ))}
    </div>
  );
}
