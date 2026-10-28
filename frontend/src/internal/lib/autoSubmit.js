// A day sent with a done number typed on an assigned row (Daily update) sends the tasks behind that row for approval by itself,
// with the numbers from the row, so the person does not fill the same thing in again on each task. Pure helpers, no store.
const PENDING = ["todo", "in_progress", "changes"];

/** Who reviews a task the person sends in: the project's manager, else whoever assigned it. Never the person themself. */
export function reviewerFor(task, project, me) {
  const pm = project?.pmId;
  if (pm && pm !== me) return pm;
  return task.assignedById && task.assignedById !== me ? task.assignedById : null;
}

/**
 * [{ taskId, doneQty, minutes, reviewerId }] for the assigned rows of a day that have a done number typed: the number is shared
 * over the row's open tasks in order (up to each task's target, anything over goes to the last one), and the row's time taken is
 * split in proportion to what each task got.
 */
export function planSubmissions({ rows, tasks, projects, me }) {
  const out = [];
  for (const row of rows) {
    if (!(row.typedDone > 0)) continue;
    const mine = (row.taskIds ?? []).map((id) => tasks.find((t) => t.id === id)).filter((t) => t && t.assigneeId === me);
    const open = mine.filter((t) => PENDING.includes(t.status) && t.qty > 0);
    if (!open.length) continue;
    // the typed number is the row's whole figure: what tasks already sent in or approved account for is not sent again
    const already = mine.filter((t) => !PENDING.includes(t.status)).reduce((sum, t) => sum + (t.doneQty ?? 0), 0);
    const toSend = row.typedDone - already;
    if (!(toSend > 0)) continue;
    // the row's time covers everything typed, so the tasks still to send get their part of it
    const totalMin = (row.actualMin > 0 ? row.actualMin : open.reduce((sum, t) => sum + (t.targetMinutes ?? 0), 0)) * (toSend / row.typedDone);
    let left = toSend;
    open.forEach((t, i) => {
      if (left <= 0) return;
      const last = i === open.length - 1;
      const give = last ? left : Math.min(left, t.qty);
      left -= give;
      const reviewerId = reviewerFor(t, projects.find((p) => p.id === t.projectId), me);
      if (!reviewerId) return;
      out.push({ taskId: t.id, doneQty: give, minutes: Math.max(1, Math.round((totalMin * give) / toSend)), reviewerId });
    });
  }
  return out;
}
