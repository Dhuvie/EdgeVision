'use client';
export default function NeuralMap({ detections }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {detections.map((det, i) => (
        <div 
          key={i}
          className="absolute border-2 border-lime-400 bg-transparent"
          style={{
            left: det.bbox.x + '%',
            top: det.bbox.y + '%',
            width: det.bbox.width + '%',
            height: det.bbox.height + '%'
          }}
        >
          <div className="absolute -top-6 left-0 bg-black/80 text-white text-xs px-2 py-0.5">
            {det.label} ({Math.round(det.confidence * 100)}%)
          </div>
        </div>
      ))}
    </div>
  );
}
