import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Project } from '@/entities/Project';
import { User } from '@/entities/User';
import { WeeklyAssignment } from '@/entities/WeeklyAssignment';
import { WeeklyTask } from '@/entities/WeeklyTask';
import { useAuth } from '@/auth/AuthContext';
import { useNotifications } from '@/notifications/NotificationProvider';
import { mondayOf, shiftWeek, weekLabel } from '@/lib/week';
import AllocationGrid from '@/components/weekly/AllocationGrid';
import ApprovalsPanel from '@/components/weekly/ApprovalsPanel';
import MyWeek from '@/components/weekly/MyWeek';

const WEEKLY_EVENTS = /^weekly_/;

export default function WeeklyTasks() {
  const { user: me } = useAuth();
  const { latest } = useNotifications();
  const [params, setParams] = useSearchParams();
  const isLeader = me.role === 'admin' || me.role === 'team_leader';
  const requested = params.get('week');
  const week = /^\d{4}-\d{2}-\d{2}$/.test(requested || '') ? mondayOf(new Date(`${requested}T12:00:00`)) : mondayOf();
  const tab = isLeader ? params.get('tab') || 'allocate' : 'mine';

  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submitted, setSubmitted] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const [u, p, t, a, s] = await Promise.all([
        User.list(),
        Project.list('-created_date'),
        WeeklyTask.filter({ week_start: week }, 'sort_order'),
        WeeklyAssignment.filter({ week_start: week }),
        isLeader ? WeeklyAssignment.filter({ status: 'Submitted' }, '-submitted_at') : Promise.resolve([]),
      ]);
      setUsers(u); setProjects(p); setTasks(t); setAssignments(a); setSubmitted(s);
      setAllTasks(isLeader && s.length ? await WeeklyTask.list('-week_start', 500) : t);
      setError('');
      setTick((n) => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [week, isLeader]);

  useEffect(() => { load(); }, [load]);
  // A leader's change (or a member's submission) arrives as a live notification: refresh without a page reload.
  useEffect(() => { if (latest && WEEKLY_EVENTS.test(latest.type)) load(); }, [latest?.id]);

  const go = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  const userById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);
  const projectById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects]);
  const taskById = useMemo(() => Object.fromEntries([...tasks, ...allTasks].map((t) => [t.id, t])), [tasks, allTasks]);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Weekly Tasks</h1>
            <p className="text-slate-400">{isLeader ? 'Plan the week, allocate to people, approve completed work.' : 'Your allocations for the week. Submit finished work for approval.'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Previous week" onClick={() => go({ week: shiftWeek(week, -1) })} className="bg-transparent border-slate-600 text-slate-200"><ChevronLeft className="w-4 h-4" /></Button>
            <div className="min-w-[13rem] text-center text-white font-medium" aria-live="polite">{weekLabel(week)}</div>
            <Button variant="outline" size="icon" aria-label="Next week" onClick={() => go({ week: shiftWeek(week, 1) })} className="bg-transparent border-slate-600 text-slate-200"><ChevronRight className="w-4 h-4" /></Button>
            <Button variant="ghost" onClick={() => go({ week: null })} className="text-slate-300" disabled={week === mondayOf()}>This week</Button>
          </div>
        </div>

        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
        ) : isLeader ? (
          <Tabs value={tab} onValueChange={(v) => go({ tab: v })}>
            <TabsList className="bg-slate-800/70">
              <TabsTrigger value="allocate">Allocate</TabsTrigger>
              <TabsTrigger value="approvals">Approvals{submitted.length > 0 && <Badge className="ml-2 bg-amber-500 text-black">{submitted.length}</Badge>}</TabsTrigger>
              <TabsTrigger value="mine">My week</TabsTrigger>
            </TabsList>
            <TabsContent value="allocate" className="mt-4">
              <AllocationGrid week={week} users={users} projects={projects} tasks={tasks} assignments={assignments} onSaved={load} />
            </TabsContent>
            <TabsContent value="approvals" className="mt-4">
              <ApprovalsPanel submitted={submitted} taskById={taskById} userById={userById} projectById={projectById} me={me} onChanged={load} />
            </TabsContent>
            <TabsContent value="mine" className="mt-4">
              <MyWeek me={me} tasks={tasks} assignments={assignments} projectById={projectById} refreshKey={tick} onChanged={load} />
            </TabsContent>
          </Tabs>
        ) : (
          <MyWeek me={me} tasks={tasks} assignments={assignments} projectById={projectById} refreshKey={tick} onChanged={load} />
        )}
      </div>
    </div>
  );
}
