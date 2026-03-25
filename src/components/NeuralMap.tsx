'use client';
export default function NeuralMap({ detections }) {
  return (
    <div className="absolute inset-0">
      {detections.map((d, i) => (
        <div key={i} className="absolute border-2 border-lime-400" style={{left: d.x, top: d.y}} />
      ))}
    </div>
  );
}
