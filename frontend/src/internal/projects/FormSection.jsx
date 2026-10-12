import React from 'react';
import { oe as clsx, GU as SECTION_CLASS } from '@/internal/min';

/** Titled, bordered section used inside the project form. */
export function FormSection({ icon, title, hint, children, className }) {
  return (
    <section className={clsx(SECTION_CLASS, className)}>
      <p className="flex items-center gap-2 text-sm font-bold">
        {icon} {title}
      </p>
      {hint && <p className="mb-3 mt-0.5 text-xs text-muted">{hint}</p>}
      {children}
    </section>
  );
}

export default FormSection;
