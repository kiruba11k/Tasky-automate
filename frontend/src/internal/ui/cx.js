/** Joins truthy class names with a space (original: `oe`). */
export const cx = (...classes) => classes.filter(Boolean).join(' ');

export default cx;
