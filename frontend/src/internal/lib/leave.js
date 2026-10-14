/** `jj` - the leave entry (`{date, kind: 'full'|'half', note}`) a person has on a day, if any. */
export const leaveOn = (profiles, personId, date) => profiles[personId]?.leaves?.find((l) => l.date === date);

/** "On leave" / "Half day leave" for a leave entry (undefined when there is none). */
export const leaveLabel = (leave) => (leave ? (leave.kind === 'half' ? 'Half day leave' : 'On leave') : undefined);
