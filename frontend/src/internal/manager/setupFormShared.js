import { We as formatMinutes } from '@/internal/min';


/** Outreach rate fields. (bundle: LP) */
export const RATE_FIELDS = [
  // Prospect mapping is typed per 10 prospects (stored per prospect, so the maths elsewhere does not change).
  { key: 'prospect', label: 'Prospect mapping', hint: 'minutes per 10 prospects', per: 10 },
  {
    key: 'l1',
    label: '1st level message',
    hint: 'minutes per personalised message (semi = ⅔, templated = ½)',
  },
  { key: 'l2', label: '2nd level message', hint: 'minutes per message' },
];

/** Small numeric input class. (bundle: _o) */
export const NUMBER_INPUT_CLASS =
  'focus-ring rounded-lg border-2 border-line bg-surface px-2 py-1 font-extrabold tabular-nums text-ink outline-none placeholder:font-normal placeholder:text-faint focus:border-accent';

/** Text / select input class. (bundle: vb) */
export const FIELD_INPUT_CLASS =
  'focus-ring min-w-0 max-w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink sm:min-w-[220px]';

/** Settings section wrapper class. (bundle: GU) */
export const SECTION_CLASS = 'mt-5 rounded-2xl border border-line bg-surface-2 p-4';

let rowCounter = 0;
/** Generates a unique local row id. (bundle: XU) */
export const nextRowId = () => `row-${++rowCounter}`;

/** Parses a user-typed number (comma or dot decimals). (bundle: br) */
export const parseNumber = (value) => Number(String(value).trim().replace(',', '.'));

/** "N per hour" label for a minutes-per-unit rate. (bundle: FP) */
export const perHourLabel = (minutes) =>
  minutes > 0 ? `${Math.round((60 / minutes) * 10) / 10} per hour` : '';

/** Duration label for a rate in hours. (bundle: BP) */
export const durationLabel = (hours) => (hours > 0 ? formatMinutes(Math.round(hours * 60)) : '');

/** People groups on the people settings. (bundle: qR) */
export const ROLE_GROUPS = [
  ['pm', 'Project managers'],
  ['resource', 'Resources'],
  ['manager', 'Manager'],
  ['founder', 'Founders'],
];
