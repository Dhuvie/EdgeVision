'use client';
export default function NeuralMap({ detections = [] }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {detections.map((d, i) => (
        <div key={i} className="absolute border-2 border-lime-400" style={{left: d.x || 0, top: d.y || 0}} />
      ))}
    </div>
  );
}
