'use client';
export default function NeuralMap({ detections }) {
  return (
    <div className='absolute inset-0'>
      {detections.map((d,i) => (
        <div key={i} className='absolute border-2 border-cyan-400' 
             style={{left: d.bbox.x+'%', top: d.bbox.y+'%', width: d.bbox.width+'%', height: d.bbox.height+'%'}}>
          <div className='bg-black px-2 text-xs absolute -top-5'>{d.label} {Math.round(d.confidence*100)}%</div>
        </div>
      ))}
    </div>
  );
}
