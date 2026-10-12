import { useMemo } from 'react';
import { Se as useStore, Tr as PROJECT_COLORS } from '@/internal/min';
import { useChartColors } from './chartTheme';

/** Colour palette used for projects on dark surfaces. (bundle: hle) */
export const DARK_PROJECT_COLORS = ['#4F7BE8', '#E0524F', '#1E9E6E', '#8B6BE0', '#B47D0C', '#1594B4'];

/** Relative luminance (0-1) of an "rgb(r, g, b)" string. (bundle: ple) */
export const luminance = (rgb) => {
  const [r, g, b] = (rgb.match(/[\d.]+/g) ?? ['255', '255', '255']).map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

/** True when the surface colour is dark. (bundle: mle) */
export const isDarkSurface = (colors) => luminance(colors.surface) < 0.4;

/** Returns a function mapping a project id to a chart colour. (bundle: gle) */
export function useProjectColor() {
  const colors = useChartColors();
  const projects = useStore((s) => s.projects);
  return useMemo(() => {
    const palette = isDarkSurface(colors) ? DARK_PROJECT_COLORS : PROJECT_COLORS;
    return (projectId) => {
      const index = projects.findIndex((p) => p.id === projectId);
      return index < 0 ? colors.grey : palette[index % palette.length];
    };
  }, [colors, projects]);
}
