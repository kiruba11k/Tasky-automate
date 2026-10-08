import React, { Suspense, lazy } from 'react';
import { CheckSquare } from 'lucide-react';
import Mascot from '@/fun/Mascot';
import { hasWebGL } from '@/fun/three/species';

const Buddy3D = lazy(() => import('@/fun/three/Buddy3D'));
const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-700/60 bg-slate-900/80 p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-tr from-accent-green via-accent-blue to-accent-purple rounded-xl flex items-center justify-center">
            <CheckSquare className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">TaskFlow</h1>
        </div>
        <div className="flex justify-center -mt-2 mb-2">
          {hasWebGL()
            ? <Suspense fallback={<div style={{ height: 150 }} />}><Buddy3D species="mouse" pose="wave" size={120} calm={calm()} /></Suspense>
            : <Mascot mood="wave" size={92} className="tasky-bob" />}
        </div>
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-slate-400 mt-1 mb-6">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
