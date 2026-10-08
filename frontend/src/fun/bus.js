/** Tiny event bus: the data layer reports what happened, the fun layer decides how to celebrate it. */
export const emitFun = (detail) => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('tasky:fun', { detail }));
};
