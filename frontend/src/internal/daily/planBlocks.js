import { Mn as toMinutes, pu as projectColor } from '@/internal/min';
import { LUNCH_BLOCK } from './planHelpers';

/** The working day, in minutes from midnight: 10:00 to 19:00. */
export const WORK_START = 600;
export const WORK_END = 1140;

/** Prefix of a project id that is really free text ("Other work": hiring, training...). */
export const OTHER_PREFIX = 'other:';
/** Value of the "Custom (type a name)..." choice in the block project picker. */
export const CUSTOM_PROJECT = '__custom';

/** Lunch lengths offered in the lunch row (minutes). */
export const LUNCH_LENGTHS = [30, 45, 60, 75, 90];

/** Spring used for the timeline blocks and the Plan / Extra pill. */
export const SPRING = { type: 'spring', stiffness: 520, damping: 38, mass: 0.8 };

/** Minutes from midnight -> "HH:MM". */
export const toClock = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** The lunch a person set on their profile (1pm to 2pm until they change it). */
export const profileLunch = (profiles, personId) => profiles[personId]?.lunch ?? LUNCH_BLOCK;

/** Name to show for a block's project id: custom block title, free-text "other:" work, or the project name. */
export const blockLabel = (projectId, custom, projects) =>
  custom
    ? custom.title
    : projectId.startsWith(OTHER_PREFIX)
      ? projectId.slice(OTHER_PREFIX.length)
      : (projects.find((p) => p.id === projectId)?.name ?? 'Project');

/** Timeline colour of a block (grey for other / custom work). */
export const blockColor = (projectId, custom, projects) =>
  projectId.startsWith(OTHER_PREFIX) || custom ? '#64748B' : projectColor(projects, projectId);

/**
 * The plan's blocks as one entry per piece of work: a block that lunch split in two (ids "a" and "a~2") is joined back, with
 * its planned and actual minutes added up.
 */
export function groupBlocks(blocks) {
  const groups = new Map();
  [...blocks]
    .sort((a, b) => a.start.localeCompare(b.start))
    .forEach((block) => {
      const id = block.id.split('~')[0];
      const minutes = Math.max(0, toMinutes(block.end) - toMinutes(block.start));
      const group = groups.get(id);
      if (group) {
        group.minutes += minutes;
        if (block.actualMinutes != null) group.actual = (group.actual ?? 0) + block.actualMinutes;
      } else {
        groups.set(id, { id, projectId: block.projectId, minutes, actual: block.actualMinutes, custom: block.custom, auto: block.auto });
      }
    });
  return [...groups.values()];
}

/** Lay the pieces of work one after another from 10:00, flowing around lunch (a piece that crosses it is split in two). */
export function flowBlocks(groups, lunch) {
  const lunchStart = toMinutes(lunch.start);
  const lunchEnd = toMinutes(lunch.end);
  const blocks = [];
  let cursor = WORK_START;
  groups.forEach((group) => {
    let left = group.minutes;
    const pieces = [];
    while (left > 0) {
      if (cursor >= lunchStart && cursor < lunchEnd) cursor = lunchEnd;
      const end = cursor < lunchStart && cursor + left > lunchStart ? lunchStart : cursor + left;
      pieces.push({ s: cursor, e: end });
      left -= end - cursor;
      cursor = end;
    }
    pieces.forEach((piece, index) => {
      const actual = group.actual != null ? Math.round((group.actual * (piece.e - piece.s)) / group.minutes) : undefined;
      blocks.push({
        id: index ? `${group.id}~${index + 1}` : group.id,
        start: toClock(piece.s),
        end: toClock(piece.e),
        projectId: group.projectId,
        taskIds: [],
        custom: group.custom,
        actualMinutes: actual,
        ...(group.auto ? { auto: true } : {}),
      });
    });
  });
  return blocks;
}

/** Compare two block lists by what matters (id, times, actual). */
export const blocksKey = (blocks) => blocks.map((b) => `${b.id}|${b.start}|${b.end}|${b.actualMinutes ?? ''}`).join(',');
