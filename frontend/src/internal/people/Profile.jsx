import React, { useRef, useState } from 'react';
import { Camera, Moon, Sun, Trash } from 'lucide-react';
import {
  Se as useStore,
  Qe as PEOPLE,
  xn as isAssigner,
  Ye as toast,
  oe as cn,
  Ge as inputClass,
  be as personName,
  nt as displayName,
  Uw as formatTimestamp,
  rt as Card,
  dt as CardTitle,
  vt as Avatar,
  qe as Badge,
  Te as Button,
  ok as AssignVsStandard,
  FR as TaskLog,
} from '@/internal/min';
import { BADGE_EMOJIS, ACCENT_OPTIONS, readProfilePhoto } from './profileData';
import { MyProgress } from './MyProgress';
import { LeaveSection } from './LeaveSection';

/** Profile page (route "/profile"). (Ale) */
export function Profile() {
  const { me, tasks, profiles, setProfile } = useStore();
  const person = PEOPLE.find((p) => p.id === me);
  const profile = profiles[me] ?? {};
  const [name, setName] = useState(profile.name ?? person.name);
  const fileRef = useRef(null);
  const assigner = isAssigner(person.role) && !person.tracked; // a manager who also does tasks sees their tasks like everyone else
  const myTasks = tasks
    .filter((t) => t.assigneeId === me)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const myReviews = tasks
    .flatMap((t) => t.reviews.filter((r) => r.by === me).map((r) => ({ t, r })))
    .sort((a, b) => b.r.at.localeCompare(a.r.at));
  const assignedByMe = tasks.filter((t) => t.assignedById === me);

  const onPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setProfile(me, { photo: await readProfilePhoto(file) });
      toast({ title: 'Profile picture updated', tone: 'success' });
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Upload failed',
        tone: 'info',
        emoji: '⚠️',
      });
    }
  };

  const onNameSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      return toast({ title: 'Name cannot be empty', tone: 'info', emoji: '⚠️' });
    }
    setProfile(me, { name: name.trim() });
    toast({ title: 'Name updated', tone: 'success' });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>
      <LeaveSection personId={me} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardTitle>You</CardTitle>
          <div className="flex flex-wrap items-center gap-5">
            <Avatar id={me} size="xl" />
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPhotoChange}
              />
              <Button tone="soft" onClick={() => fileRef.current?.click()}>
                <Camera size={14} /> {profile.photo ? 'Change photo' : 'Upload photo'}
              </Button>
              {profile.photo && (
                <Button
                  tone="ghost"
                  className="border border-line"
                  onClick={() => setProfile(me, { photo: undefined })}
                >
                  <Trash size={14} /> Remove photo
                </Button>
              )}
            </div>
          </div>
          <p className="mb-1.5 mt-5 text-xs font-bold uppercase text-muted">Badge</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              className={cn(
                'focus-ring h-9 rounded-xl border px-2 text-xs',
                profile.emoji ? 'border-line' : 'border-accent bg-accent-soft',
              )}
              onClick={() => setProfile(me, { emoji: undefined })}
            >
              None
            </button>
            {BADGE_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                aria-label={`Badge ${emoji}`}
                className={cn(
                  'focus-ring h-9 w-9 rounded-xl border text-lg',
                  profile.emoji === emoji ? 'border-accent bg-accent-soft' : 'border-line',
                )}
                onClick={() => setProfile(me, { emoji })}
              >
                {emoji}
              </button>
            ))}
          </div>
          <form className="mt-5" onSubmit={onNameSubmit}>
            <label className="text-xs font-bold uppercase text-muted">Display name</label>
            <div className="mt-1.5 flex gap-2">
              <input
                className={inputClass}
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
              />
              <Button type="submit">Save</Button>
            </div>
            <p className="mt-1.5 text-xs text-muted">{person.title}</p>
          </form>
        </Card>
        <Card>
          <CardTitle>Theme</CardTitle>
          <p className="mb-1.5 text-xs font-bold uppercase text-muted">Mode</p>
          <div className="flex gap-2">
            <Button
              tone={profile.dark ? 'ghost' : 'primary'}
              className="border border-line"
              onClick={() => setProfile(me, { dark: false, theme: 'pro' })}
            >
              <Sun size={14} /> Light
            </Button>
            <Button
              tone={profile.dark ? 'primary' : 'ghost'}
              className="border border-line"
              onClick={() => setProfile(me, { dark: true, theme: 'dark' })}
            >
              <Moon size={14} /> Dark
            </Button>
          </div>
          <p className="mb-1.5 mt-5 text-xs font-bold uppercase text-muted">Accent colour</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ACCENT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() =>
                  setProfile(me, { accent: opt.id, theme: profile.dark ? 'dark' : 'pro' })
                }
                className={cn(
                  'focus-ring flex items-center gap-2 rounded-xl border p-2 text-sm',
                  (profile.accent ?? 'brand') === opt.id
                    ? 'border-accent bg-accent-soft font-semibold'
                    : 'border-line',
                )}
              >
                <span className="h-5 w-5 rounded-full" style={{ background: opt.swatch }} />{' '}
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            Saved for {personName(me)} only. Everyone can pick their own.
          </p>
        </Card>
      </div>
      {assigner ? (
        <Card>
          <CardTitle>My activity</CardTitle>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-surface-2 p-3">
              <p className="text-2xl font-bold">{myReviews.length}</p>
              <p className="text-xs text-muted">Reviews completed</p>
            </div>
            <div className="rounded-2xl bg-surface-2 p-3">
              <p className="text-2xl font-bold">{assignedByMe.length}</p>
              <p className="text-xs text-muted">Tasks assigned</p>
            </div>
          </div>
          {assignedByMe.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
                How I assign vs standard time (all tasks)
              </p>
              <AssignVsStandard from="0000-01-01" to="9999-12-31" assignedBy={me} />
            </div>
          )}
        </Card>
      ) : (
        <MyProgress me={me} />
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardTitle>My task log</CardTitle>
          <TaskLog tasks={myTasks} who="assignee" />
        </Card>
        <Card>
          <CardTitle>My review log</CardTitle>
          {myReviews.length === 0 ? (
            <p className="text-sm text-muted">You haven't reviewed anything yet.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-line overflow-y-auto">
              {myReviews.map(({ t, r }, i) => (
                <li key={t.id + i} className="flex items-center gap-3 py-2 text-sm">
                  <Avatar id={t.assigneeId} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="first-letter:uppercase">{t.title}</span>
                    <span className="block text-xs text-muted">
                      {displayName(t.assigneeId)} · {formatTimestamp(r.at)}
                    </span>
                  </span>
                  <Badge tone={r.verdict === 'approved' ? 'mint' : 'butter'}>
                    {r.verdict === 'approved' ? 'Approved' : 'Feedback'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

export default Profile;
