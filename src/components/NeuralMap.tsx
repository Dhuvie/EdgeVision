'use client';
export default function NeuralMap({ detections }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {detections.map((d, i) => (
        <React.Fragment key={i}>
          <div className="absolute border-2 border-lime-400" style={{left: d.bbox.x, top: d.bbox.y, width: d.bbox.width, height: d.bbox.height}} />
          <div className="absolute bg-black/80 text-white text-xs px-2 py-0.5" style={{left: d.bbox.x, top: d.bbox.y - 20}}>{d.label} {(d.confidence*100).toFixed(0)}%</div>
        </React.Fragment>
      ))}
    </div>
  );
}
