/** Default colour of the header row of a person's task table. */
export const DEFAULT_SHEET_COLOR = '#7B1A48';

/** The header colour a viewer chose for a table (`kind` is "day" or "week"): their own per-table colour, then their one colour, then the default. */
export const sheetColorOf = (profile, kind) => profile?.sheetColors?.[kind] ?? profile?.sheetColor ?? DEFAULT_SHEET_COLOR;

/** The "Targets" cell of a table row: numbers read "<qty> <name> (desc)", milestones and text rows show their target text. */
export function sheetTargetText(row, name) {
  const kind = row.kind ?? 'number';
  return kind === 'number'
    ? `${row.qty ? `${row.qty} ` : ''}${name}${row.desc && !row.desc.toLowerCase().includes(name.toLowerCase()) ? ` (${row.desc})` : ''}`
    : row.targetText || name;
}

/** The "Targets achieved" cell: what was typed, the milestone's status (empty while "Not started"), or "<done> of <qty> <name>". `done` is the row's achieved count. */
export function sheetAchievedText(row, name, done) {
  const kind = row.kind ?? 'number';
  return kind === 'text'
    ? row.actualText
    : kind === 'milestone'
      ? row.status && row.status !== 'Not started'
        ? row.status
        : ''
      : done
        ? `${done}${row.qty ? ` of ${row.qty}` : ''} ${name}`
        : '';
}
