import { formatHours } from './HoursStats';

export function HoursLine({ t, sent }) {
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted" data-testid="hours-line">
      <span>
        Planned <b className="text-ink tabular-nums">{formatHours(t.plannedMin)}</b>
      </span>
      <span>
        Actual{' '}
        <b className="text-ink tabular-nums">
          {sent || t.actualMin ? formatHours(t.actualMin) : <span className="font-normal text-muted">pending</span>}
        </b>
      </span>
      <span>
        Extra hours <b className="text-ink tabular-nums">{formatHours(t.extraMin)}</b>
      </span>
    </p>
  );
}

export default HoursLine;
