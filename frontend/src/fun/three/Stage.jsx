import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';

/** Drives a "demand" canvas at a fixed, modest frame rate: smooth enough for cartoons, light on batteries and CPUs. */
const coarse = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

function Ticker({ fps }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => { const t = setInterval(invalidate, 1000 / fps); return () => clearInterval(t); }, [invalidate, fps]);
  return null;
}

/**
 * A transparent WebGL canvas that only renders while it is on screen (and only once in calm mode),
 * so a page full of characters costs nothing when they are scrolled away.
 */
export default function Stage({ children, calm = false, fps = 30, ortho = false, zoom = 40, camera, className = '', style }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={style}>
      <Canvas
        orthographic={ortho}
        dpr={[1, coarse() ? 1.25 : 1.5]}
        frameloop={visible || calm ? 'demand' : 'never'}
        camera={camera || (ortho ? { zoom, position: [0, 0, 20], near: 0.1, far: 100 } : { fov: 28, position: [0, 1.3, 6.9], near: 0.1, far: 50 })}
        gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
        onCreated={({ camera: cam }) => { if (!ortho) cam.lookAt(0, 1.3, 0); }}
      >
        <ambientLight intensity={1.15} />
        <directionalLight position={[3, 5, 4]} intensity={1.6} />
        <directionalLight position={[-4, 2, -2]} intensity={0.35} color="#9cc7ff" />
        {!calm && visible && <Ticker fps={coarse() ? Math.min(fps, 24) : fps} />}
        {children}
      </Canvas>
    </div>
  );
}
