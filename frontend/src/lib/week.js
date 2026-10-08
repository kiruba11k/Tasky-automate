import { addDays, format, parseISO, startOfWeek } from 'date-fns';

export const toISO = (d) => format(d, 'yyyy-MM-dd');
export const mondayOf = (d = new Date()) => toISO(startOfWeek(d, { weekStartsOn: 1 }));
export const shiftWeek = (weekStart, weeks) => toISO(addDays(parseISO(weekStart), weeks * 7));
export const weekDates = (weekStart) => Array.from({ length: 7 }, (_, i) => toISO(addDays(parseISO(weekStart), i)));
export const dayLabel = (iso) => format(parseISO(iso), 'EEE d');
export const weekLabel = (weekStart) => `${format(parseISO(weekStart), 'MMM d')} – ${format(addDays(parseISO(weekStart), 6), 'MMM d, yyyy')}`;

export const shiftDate = (iso, days) => toISO(addDays(parseISO(iso), days));
export const sheetDateRange = (weekStart) => `${format(parseISO(weekStart), 'dd/MM/yy')} - ${format(addDays(parseISO(weekStart), 4), 'dd/MM/yy')}`;
