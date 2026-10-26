import { oe as cx } from '@/internal/min';
import { ProgressMeter } from './ProgressMeter';
import { progressTone, PROGRESS_CHIP_CLASSES } from './progressTones';

/** List of metrics rendered as labelled progress bars. */
export function ProgressBars({ items, compact, expected, planned }) {
  return (
    <ul className="space-y-3" aria-label="Progress against targets">
      {items.map((item) => {
        const pct = item.target ? Math.round((item.value / item.target) * 100) : null;
        const tone = planned ? 'grey' : progressTone(pct);
        return (
          <li
            key={item.id}
            data-metric={item.label}
            title={
              item.auto
                ? `${item.auto} counted automatically from submitted tasks and end-of-day updates`
                : undefined
            }
            className={cx(
              'grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-1.5',
              !compact && 'sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_7.5rem_4.25rem]',
            )}
          >
            <span className="truncate text-sm font-semibold">{item.label}</span>
            <ProgressMeter
              pct={pct ?? 0}
              tone={tone}
              expected={planned ? undefined : expected}
              className={cx('col-span-3 row-start-2', !compact && 'sm:col-span-1 sm:col-start-2 sm:row-start-1')}
            />
            <span className="text-right text-sm tabular-nums">
              {item.status || item.text ? (
                <span className="text-muted" title={item.note || undefined}>
                  {item.status ?? (item.note ? <span className="inline-block max-w-[10rem] truncate align-bottom">{item.note}</span> : 'Text')}
                </span>
              ) : planned ? (
                <span className="text-muted">
                  target <b className="text-ink">{item.target ?? 0}</b>
                </span>
              ) : (
                <>
                  <b className="text-base text-ink">{item.value}</b>
                  {item.target ? <span className="text-muted"> / {item.target}</span> : null}
                </>
              )}
            </span>
            <span
              className={cx(
                'justify-self-end whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
                PROGRESS_CHIP_CLASSES[tone],
              )}
            >
              {planned ? 'Planned' : item.text ? 'Text' : item.status ? (item.status === 'Completed' ? 'Done' : item.status) : pct == null ? 'No target' : `${pct}%`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default ProgressBars;
