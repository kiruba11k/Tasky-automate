import { Emoji } from '@/icons/Emoji';

/**
 * A "3D" emoji: the cartoon emoji drawn several times, stacked in depth, so it has real thickness and tumbles gently in space.
 * Pure CSS (no WebGL), so it is cheap enough to use many times in a chat. Styles live in base.css (.e3d).
 */
export function Emoji3D({ e, size = '1.6rem', spin = true, className = '' }) {
  const layers = [6, 5, 4, 3, 2, 1];
  return (
    <span className={`e3d ${spin ? 'e3d-spin' : ''} ${className}`} style={{ fontSize: size, width: size, height: size }} aria-hidden="true">
      <span className="e3d-body">
        {layers.map((z) => (
          <span key={z} className="e3d-layer" style={{ transform: `translateZ(${-z * 1.4}px)` }}><Emoji e={e} size={size} /></span>
        ))}
        <span className="e3d-front"><Emoji e={e} size={size} /></span>
      </span>
    </span>
  );
}

export default Emoji3D;
