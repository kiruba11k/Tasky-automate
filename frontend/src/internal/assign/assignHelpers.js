import {
  La as findCustomStandard,
  Cn as STANDARD_TASK_TYPES,
  ss as standardMinutes,
  Lw as difficultyFor,
} from '@/internal/min';

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** Resolve the project's custom standard that matches a draft/cart item (if any). */
export function matchCustomStandard(project, item) {
  return item.typeId === 'custom'
    ? (findCustomStandard(project, item.customStandardId) ?? findCustomStandard(project, item.customName))
    : STANDARD_TASK_TYPES.some((n) => n.id === item.typeId)
      ? undefined
      : findCustomStandard(project, item.typeId);
}

/** Standard minutes for a draft/cart item on its project, or null. */
export function standardFor(projects, item) {
  if (!(item.qty > 0)) return null;
  const project = projects.find((r) => r.id === item.projectId);
  if (item.typeId === 'custom') {
    const custom = matchCustomStandard(project, item);
    return custom ? standardMinutes(project, 'custom', item.qty, undefined, custom.id) : null;
  }
  return standardMinutes(project, item.typeId, item.qty, item.variant);
}

/** Difficulty level ('none' when there is no standard). */
export const difficultyLevel = (target, standard) =>
  standard == null ? 'none' : difficultyFor(target, standard).level;

let cartKeyCounter = 0;
/** Unique key for an item in today's list. */
export const nextCartKey = () => `c${++cartKeyCounter}`;
