import React, { Suspense, lazy } from 'react';
import { hasWebGL } from './three/species';

const PartyStage = lazy(() => import('./three/PartyStage'));

/** The secret cast party (Konami code, or tap your corner buddy 7 times). */
export default function CastParty({ on, onClose }) {
  if (!on) return null;
  return (
    <div className="cast-party" onClick={onClose} role="dialog" aria-label="Secret cast party">
      <div className="cast-party-title">SECRET CAST PARTY!</div>
      <div className="absolute inset-0 pointer-events-none">{hasWebGL() && <Suspense fallback={null}><PartyStage /></Suspense>}</div>
      <div className="cast-party-hint">Tap anywhere to stop the music</div>
    </div>
  );
}
