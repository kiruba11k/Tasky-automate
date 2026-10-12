/** "HH:MM" for a Date. (bundle: iL) */
export const formatClock = (date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
