/** Round to one decimal place. (bundle: DP) */
export const roundTenth = (value) => Math.round(value * 10) / 10;

/** Sum a list of per-person period rows into team totals. (bundle: RP) */
export function sumPeriodRows(rows) {
  const timed = rows.reduce((sum, row) => sum + row.timed, 0);
  const onTimeCount = rows.reduce((sum, row) => sum + row.onTimeCount, 0);
  return {
    tasks: rows.reduce((sum, row) => sum + row.tasks, 0),
    onTime: timed ? Math.round((onTimeCount / timed) * 100) : null,
    hours: roundTenth(rows.reduce((sum, row) => sum + row.hours, 0)),
    extra: roundTenth(rows.reduce((sum, row) => sum + row.extra, 0)),
  };
}
