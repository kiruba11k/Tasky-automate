
import React, { useState, useMemo, useEffect } from 'react';
import { Project } from '@/entities/Project';
import { DailyTask } from '@/entities/DailyTask';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, CartesianGrid, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { Calendar, TrendingUp, Clock, Download, BarChart3 } from 'lucide-react';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';

const COLORS = {
  blue: '#3b82f6',
  green: '#10b981', 
  yellow: '#f59e0b',
  red: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  cyan: '#06b6d4',
  slate: '#64748b'
};

const TICK = { fill: '#94a3b8', fontSize: 12 };
const TIP = { contentStyle: { backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }, labelStyle: { color: '#e2e8f0' }, cursor: { fill: 'rgba(148,163,184,.08)' } };
const LEG = { wrapperStyle: { fontSize: 12, color: '#cbd5e1', paddingTop: 8 } };
const Chart = ({ title, hint, className = '', empty, children }) => (
  <Card className={`glass-effect-enhanced ${className}`}>
    <CardHeader className="pb-2">
      <CardTitle className="text-lg font-semibold text-white">{title}</CardTitle>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </CardHeader>
    <CardContent className="h-72 pt-2">
      {empty ? <div className="h-full grid place-items-center text-sm text-slate-500">No data for this selection yet.</div> : <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>}
    </CardContent>
  </Card>
);
const Kpi = ({ label, value, sub, icon: Icon, tone, valueClass = 'text-white' }) => (
  <Card className={`glass-effect-enhanced ${tone}`}>
    <CardContent className="p-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-300">{label}</p>
        <div className={`mt-1 text-3xl font-bold tracking-tight ${valueClass}`}>{value}</div>
        <p className="mt-1 text-xs text-slate-400">{sub}</p>
      </div>
      <Icon className="h-5 w-5 shrink-0 text-slate-300" />
    </CardContent>
  </Card>
);

function AnalyticsView({ projects = [], tasks = [], users = [] }) {
  const [selectedProject, setSelectedProject] = useState('all');
  const [timeRange, setTimeRange] = useState('month'); // week, month, quarter
  const [viewType, setViewType] = useState('overview'); // overview, projects, members

  // Filter tasks based on selected project and time range
  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    
    // Filter by project
    if (selectedProject !== 'all') {
      filtered = filtered.filter(task => task.project_id === selectedProject);
    }
    
    // Filter by time range
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case 'week':
        startDate = startOfWeek(now);
        break;
      case 'month':
        startDate = startOfMonth(now);
        break;
      case 'quarter':
        startDate = startOfMonth(subDays(now, 90));
        break;
      default:
        startDate = null;
    }
    
    if (startDate) {
      filtered = filtered.filter(task => new Date(task.date) >= startDate);
    }
    
    return filtered;
  }, [tasks, selectedProject, timeRange]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    const totalTasks = filteredTasks.length;
    const completedTasks = filteredTasks.filter(t => t.task_status === 'Completed').length;
    const inProgressTasks = filteredTasks.filter(t => t.task_status === 'In Progress').length;
    const blockedTasks = filteredTasks.filter(t => t.task_status === 'Blocked').length;
    
    const totalExpectedTime = filteredTasks.reduce((sum, task) => sum + (task.expected_time || 0), 0);
    const totalActualTime = filteredTasks.reduce((sum, task) => sum + (task.actual_time_taken || 0), 0);
    const timeVariance = totalActualTime - totalExpectedTime;
    const efficiencyRate = totalExpectedTime > 0 && totalActualTime > 0 ? ((totalExpectedTime / totalActualTime) * 100) : 0;
    
    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      blockedTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      totalExpectedTime,
      totalActualTime,
      timeVariance,
      efficiencyRate: Math.round(efficiencyRate)
    };
  }, [filteredTasks]);

  // Task Status Distribution
  const taskStatusData = useMemo(() => [
    { name: 'Completed', value: metrics.completedTasks, fill: COLORS.green },
    { name: 'In Progress', value: metrics.inProgressTasks, fill: COLORS.blue },
    { name: 'Pending', value: filteredTasks.filter(t => t.task_status === 'Pending').length, fill: COLORS.yellow },
    { name: 'Blocked', value: metrics.blockedTasks, fill: COLORS.red }
  ], [filteredTasks, metrics]);

  // Daily Task Completion Trend
  const dailyTrendData = useMemo(() => {
    const dailyStats = {};
    
    filteredTasks.forEach(task => {
      const date = task.date;
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date: format(new Date(date), 'MMM dd'),
          total: 0,
          completed: 0,
          inProgress: 0,
          pending: 0,
          blocked: 0,
          expectedTime: 0,
          actualTime: 0
        };
      }
      
      dailyStats[date].total += 1;
      const k = { 'completed': 'completed', 'in progress': 'inProgress', 'pending': 'pending', 'blocked': 'blocked' }[String(task.task_status || '').toLowerCase()];
      if (k) dailyStats[date][k] += 1;
      dailyStats[date].expectedTime += task.expected_time || 0;
      dailyStats[date].actualTime += task.actual_time_taken || 0;
    });

    return Object.entries(dailyStats).sort(([a], [b]) => (a < b ? -1 : 1)).map(([, v]) => v);
  }, [filteredTasks]);

  // Project Performance Data
  const projectPerformanceData = useMemo(() => {
    const projectStats = {};
    
    projects.forEach(project => {
      const projectTasks = filteredTasks.filter(task => task.project_id === project.id);
      const completed = projectTasks.filter(task => task.task_status === 'Completed').length;
      const total = projectTasks.length;
      
      if (total > 0) {
        projectStats[project.id] = {
          name: project.name.length > 15 ? project.name.substring(0, 15) + '...' : project.name,
          fullName: project.name,
          total,
          completed,
          completionRate: Math.round((completed / total) * 100),
          expectedTime: projectTasks.reduce((sum, task) => sum + (task.expected_time || 0), 0),
          actualTime: projectTasks.reduce((sum, task) => sum + (task.actual_time_taken || 0), 0)
        };
      }
    });

    return Object.values(projectStats);
  }, [projects, filteredTasks]);

  // Member Performance Data
  const memberPerformanceData = useMemo(() => {
    const memberStats = {};
    
    users.forEach(user => {
      const userTasks = filteredTasks.filter(task => task.user_id === user.id);
      const completed = userTasks.filter(task => task.task_status === 'Completed').length;
      const total = userTasks.length;
      
      if (total > 0) {
        memberStats[user.id] = {
          name: user.full_name,
          designation: user.designation || 'Not Set',
          total,
          completed,
          completionRate: Math.round((completed / total) * 100),
          expectedTime: userTasks.reduce((sum, task) => sum + (task.expected_time || 0), 0),
          actualTime: userTasks.reduce((sum, task) => sum + (task.actual_time_taken || 0), 0),
          efficiency: 0
        };
        
        // Calculate efficiency (expected/actual * 100)
        if (memberStats[user.id].actualTime > 0) {
          memberStats[user.id].efficiency = Math.round(
            (memberStats[user.id].expectedTime / memberStats[user.id].actualTime) * 100
          );
        }
      }
    });

    return Object.values(memberStats);
  }, [users, filteredTasks]);

  // Time Variance Chart Data
  const timeVarianceData = useMemo(() => {
    return dailyTrendData.map(day => ({
      ...day,
      variance: day.actualTime - day.expectedTime,
      efficiency: day.expectedTime > 0 && day.actualTime > 0 ? Math.round((day.expectedTime / day.actualTime) * 100) : 100
    }));
  }, [dailyTrendData]);

  const exportData = () => {
    const csvContent = [
      ['Date', 'Project', 'Member', 'Task', 'Status', 'Expected Time', 'Actual Time', 'Efficiency'],
      ...filteredTasks.map(task => [
        task.date,
        projects.find(p => p.id === task.project_id)?.name || 'Unknown',
        users.find(u => u.id === task.user_id)?.full_name || 'Unknown',
        task.task,
        task.task_status,
        task.expected_time || 0,
        task.actual_time_taken || 0,
        task.expected_time && task.actual_time_taken ? 
          Math.round((task.expected_time / task.actual_time_taken) * 100) : 0
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `analytics_${timeRange}_${Date.now()}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const sel = 'bg-slate-800/80 border-slate-600 text-white';
  const pieData = taskStatusData.filter((d) => d.value > 0);
  const noTasks = filteredTasks.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Analytics</h1>
          <p className="text-slate-400 mt-1">Planned versus actual work across projects and people.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className={`w-full sm:w-48 ${sel}`}><SelectValue placeholder="Select Project" /></SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600 text-white">
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className={`w-[calc(50%-0.375rem)] sm:w-40 ${sel}`}><SelectValue placeholder="Time Range" /></SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600 text-white">
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">Last 3 Months</SelectItem>
            </SelectContent>
          </Select>
          <Select value={viewType} onValueChange={setViewType}>
            <SelectTrigger className={`w-[calc(50%-0.375rem)] sm:w-36 ${sel}`}><SelectValue placeholder="View" /></SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600 text-white">
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="projects">Projects</SelectItem>
              <SelectItem value="members">Members</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportData} variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-700 w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" />Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi label="Completion rate" value={`${metrics.completionRate}%`} sub={`${metrics.completedTasks} of ${metrics.totalTasks} tasks`} icon={TrendingUp} tone="border-blue-500/30" />
        <Kpi label="Efficiency rate" value={`${metrics.efficiencyRate}%`} sub="Expected vs actual time" icon={Clock} tone="border-green-500/30" />
        <Kpi label="Time variance" value={`${metrics.timeVariance >= 0 ? '+' : ''}${metrics.timeVariance.toFixed(1)}h`} sub="Over (+) or under (-) the estimate" icon={Calendar} tone="border-yellow-500/30" valueClass={metrics.timeVariance > 0 ? 'text-red-300' : 'text-green-300'} />
        <Kpi label="Blocked tasks" value={metrics.blockedTasks} sub="Need attention" icon={BarChart3} tone="border-purple-500/30" />
      </div>

      {viewType === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Chart title="Task status" hint="Share of tasks by status" empty={noTasks}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="46%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value" nameKey="name" stroke="none">
                {pieData.map((e) => <Cell key={e.name} fill={e.fill} />)}
              </Pie>
              <Tooltip {...TIP} />
              <Legend {...LEG} />
            </PieChart>
          </Chart>
          <Chart title="Daily completion trend" hint="Tasks planned versus completed each day" empty={!dailyTrendData.length}>
            <LineChart data={dailyTrendData} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={TICK} tickLine={false} axisLine={{ stroke: '#475569' }} />
              <YAxis tick={TICK} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip {...TIP} />
              <Legend {...LEG} />
              <Line type="monotone" dataKey="total" stroke={COLORS.blue} strokeWidth={2} dot={false} name="Total" />
              <Line type="monotone" dataKey="completed" stroke={COLORS.green} strokeWidth={2} dot={false} name="Completed" />
            </LineChart>
          </Chart>
          <Chart title="Time: expected vs actual" hint="Hours per day" className="xl:col-span-2" empty={!timeVarianceData.length}>
            <AreaChart data={timeVarianceData} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={TICK} tickLine={false} axisLine={{ stroke: '#475569' }} />
              <YAxis tick={TICK} tickLine={false} axisLine={false} unit="h" />
              <Tooltip {...TIP} />
              <Legend {...LEG} />
              <Area type="monotone" dataKey="expectedTime" stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.25} name="Expected" />
              <Area type="monotone" dataKey="actualTime" stroke={COLORS.red} fill={COLORS.red} fillOpacity={0.25} name="Actual" />
            </AreaChart>
          </Chart>
        </div>
      )}

      {viewType === 'projects' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Chart title="Project completion" hint="Percent of tasks completed" empty={!projectPerformanceData.length}>
            <BarChart data={projectPerformanceData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={TICK} tickLine={false} axisLine={false} unit="%" />
              <YAxis dataKey="name" type="category" tick={TICK} tickLine={false} axisLine={false} width={110} />
              <Tooltip {...TIP} />
              <Bar dataKey="completionRate" fill={COLORS.green} name="Completion %" radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </Chart>
          <Chart title="Tasks per project" hint="Completed versus total" empty={!projectPerformanceData.length}>
            <BarChart data={projectPerformanceData} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={TICK} tickLine={false} axisLine={{ stroke: '#475569' }} interval={0} />
              <YAxis tick={TICK} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip {...TIP} />
              <Legend {...LEG} />
              <Bar dataKey="completed" fill={COLORS.green} name="Completed" radius={[4, 4, 0, 0]} />
              <Bar dataKey="total" fill={COLORS.blue} name="Total" radius={[4, 4, 0, 0]} />
            </BarChart>
          </Chart>
        </div>
      )}

      {viewType === 'members' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Chart title="Member completion" hint="Percent of tasks completed" empty={!memberPerformanceData.length}>
            <BarChart data={memberPerformanceData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={TICK} tickLine={false} axisLine={false} unit="%" />
              <YAxis dataKey="name" type="category" tick={TICK} tickLine={false} axisLine={false} width={110} />
              <Tooltip {...TIP} />
              <Bar dataKey="completionRate" fill={COLORS.purple} name="Completion %" radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </Chart>
          <Chart title="Member time efficiency" hint="Expected time as a percent of actual time" empty={!memberPerformanceData.length}>
            <BarChart data={memberPerformanceData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 150]} tick={TICK} tickLine={false} axisLine={false} unit="%" />
              <YAxis dataKey="name" type="category" tick={TICK} tickLine={false} axisLine={false} width={110} />
              <Tooltip {...TIP} />
              <Bar dataKey="efficiency" fill={COLORS.cyan} name="Efficiency %" radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </Chart>
        </div>
      )}
    </div>
  );
}

/** Analytics page: loads the data, then hands it to the charts. */
export default function Analytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    Promise.all([Project.list(), DailyTask.list('-date'), User.list()])
      .then(([projects, tasks, users]) => { if (live) setData({ projects, tasks, users }); })
      .catch((e) => { if (live) setError(e.message || 'Could not load analytics'); });
    return () => { live = false; };
  }, []);
  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {error ? <p role="alert" className="text-red-400">{error}</p>
          : !data ? <p className="text-slate-400" role="status">Loading analytics…</p>
          : <AnalyticsView {...data} />}
      </div>
    </div>
  );
}
