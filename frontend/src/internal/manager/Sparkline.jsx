import React from 'react';

/** Tiny SVG trend line. (bundle: vle) */
export function Sparkline({ values, label, color }) {
  const present = values.filter((x) => x != null);
  if (present.length < 2) {
    return <span className="text-xs text-muted">Not enough data</span>;
  }
  const min = Math.min(...present);
  const max = Math.max(...present);
  const range = max - min || 1;
  const px = (i) => 3 + (i * 82) / Math.max(1, values.length - 1);
  const py = (v) => 23 - ((v - min) / range) * 20;
  let path = '';
  let connected = false;
  let last = -1;
  values.forEach((v, i) => {
    if (v == null) {
      connected = false;
      return;
    }
    path += `${connected ? 'L' : 'M'}${px(i).toFixed(1)},${py(v).toFixed(1)}`;
    connected = true;
    last = i;
  });
  return (
    <svg
      width={88}
      height={26}
      viewBox="0 0 88 26"
      role="img"
      aria-label={label}
      className="block overflow-visible"
    >
      <title>{label}</title>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {last >= 0 && <circle cx={px(last)} cy={py(values[last])} r={3} fill={color} />}
    </svg>
  );
}

export default Sparkline;
