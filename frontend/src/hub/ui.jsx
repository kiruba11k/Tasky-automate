import React from 'react';
import { format } from 'date-fns';

export const today = () => format(new Date(), 'yyyy-MM-dd');
export const btn = 'rounded-lg border-2 border-slate-900 px-3 py-1.5 text-sm font-bold shadow-[2px_2px_0_rgba(0,0,0,.45)] disabled:opacity-50';
export const primary = `${btn} bg-emerald-400 text-ink hover:bg-emerald-300`;
export const subtle = `${btn} bg-slate-800 text-slate-100 hover:bg-slate-700`;
export const field = 'w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500';

/** A titled card used across the hub. */
export function Panel({ title, hint, right, children, className = '' }) {
  return (
    <section className={`glass-effect-enhanced rounded-2xl p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0"><h3 className="text-xl font-extrabold text-white">{title}</h3>{hint && <p className="text-xs text-slate-400">{hint}</p>}</div>
        {right}
      </div>
      {children}
    </section>
  );
}

export const Err = ({ text }) => (text ? <p role="alert" className="text-sm text-red-400 mt-2">{text}</p> : null);
