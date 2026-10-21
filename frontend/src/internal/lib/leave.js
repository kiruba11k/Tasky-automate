/** `jj` - the leave entry (`{date, kind: 'full'|'half'|'holiday', note}`) a person has on a day, if any. */
export const leaveOn = (profiles, personId, date) => profiles[personId]?.leaves?.find((l) => l.date === date);

/** "On leave" / "Half day leave" / "Holiday" for a leave entry (undefined when there is none). */
export const leaveLabel = (leave) => (leave ? (leave.kind === 'half' ? 'Half day leave' : leave.kind === 'holiday' ? 'Holiday' : 'On leave') : undefined);

/** Short badge text: "Leave" / "Half day" / "Holiday". */
export const leaveShort = (leave) => (leave ? (leave.kind === 'half' ? 'Half day' : leave.kind === 'holiday' ? 'Holiday' : 'Leave') : undefined);
