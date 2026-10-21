import { UserPlus, Send, Repeat, MessageSquare, Forward, CheckCheck, Pencil, BellRing, CalendarDays } from 'lucide-react';
import { be as firstName } from '@/internal/min';
import { formatTimeOrDateTime, durationBetween } from './taskFormat';

export const HISTORY_ACTIONS = {
  assigned: { title: 'Assigned', tone: 'grey', icon: UserPlus },
  submitted: { title: 'Sent for approval', tone: 'lavender', icon: Send },
  resubmitted: { title: 'Resubmitted for approval', tone: 'peach', icon: Repeat },
  feedback: { title: 'Feedback', tone: 'butter', icon: MessageSquare },
  forwarded: { title: 'Forwarded', tone: 'sky', icon: Forward },
  approved: { title: 'Approved', tone: 'mint', icon: CheckCheck },
  edited: { title: 'Edited', tone: 'grey', icon: Pencil },
  reminded: { title: 'Reminder sent', tone: 'grey', icon: BellRing },
  rescheduled: { title: 'Moved to another day', tone: 'lavender', icon: CalendarDays },
};

export const HISTORY_TONE_CLASSES = {
  grey: 'bg-grey text-grey-ink',
  lavender: 'bg-lavender text-lavender-ink',
  peach: 'bg-peach text-peach-ink',
  butter: 'bg-butter text-butter-ink',
  sky: 'bg-sky text-sky-ink',
  mint: 'bg-mint text-mint-ink',
};

export function historyActor(entry) {
  if (entry.action === 'feedback') return `from ${firstName(entry.by)}`;
  const to = entry.to && entry.action !== 'approved' && entry.action !== 'edited' ? ` to ${firstName(entry.to)}` : '';
  return `by ${firstName(entry.by)}${to}`;
}

/** Task history entries sorted oldest first. */
export const sortedHistory = (task) => [...(task.history ?? [])].sort((a, b) => a.at.localeCompare(b.at));

export function historySummary(task) {
  const history = sortedHistory(task);
  const assigned = history.find((h) => h.action === 'assigned');
  const feedbackRounds = history.filter((h) => h.action === 'feedback').length;
  const parts = [];
  if (task.approvedAt && assigned) parts.push(`Assigned to approved in ${durationBetween(assigned.at, task.approvedAt)}`);
  else if (task.status === 'in_review' && task.submittedAt)
    parts.push(`Waiting for approval since ${formatTimeOrDateTime(task.submittedAt)}`);
  if (feedbackRounds) parts.push(`${feedbackRounds} feedback round${feedbackRounds === 1 ? '' : 's'}`);
  return parts.join(' · ');
}
