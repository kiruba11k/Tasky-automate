
import React, { useState, useEffect, useCallback } from 'react';
import { DailyTask } from '@/entities/DailyTask';
import { User } from '@/entities/User';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger }
  from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter, Calendar, Users, BarChart3 } from 'lucide-react';
import DailyTaskForm from '../components/tasks/DailyTaskForm';
import DailyTaskCard from '../components/tasks/DailyTaskCard';
import PerformanceSummary from '../components/dashboard/PerformanceSummary';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export default function DailyTasks() {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');
  const [dateRange, setDateRange] = useState('week'); // today, week, month, all
  const [priorityFilter, setPriorityFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const applyFilters = useCallback(() => {
    let filtered = [...tasks];

    // Text search
    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.task.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.expected_outcome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.task_status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      let startDate;

      switch (dateRange) {
        case 'today':
          startDate = startOfDay(now);
          break;
        case 'week':
          startDate = startOfDay(subDays(now, 7));
          break;
        case 'month':
          startDate = startOfDay(subDays(now, 30));
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        filtered = filtered.filter(task => new Date(task.date) >= startDate);
      }
    }

    // Member filter (only for team leaders)
    // This filter is applied only if the current user is a team leader AND a specific member is selected
    if (currentUser?.role === 'team_leader' && memberFilter !== 'all') {
      filtered = filtered.filter(task => task.user_id === memberFilter);
    }

    // For team members, only show their own tasks unless they're team leaders
    // This overrides any memberFilter if the user is not a team_leader
    if (currentUser && currentUser.role !== 'team_leader') {
      filtered = filtered.filter(task => task.user_id === currentUser.id);
    }

    setFilteredTasks(filtered);
  }, [tasks, searchTerm, statusFilter, memberFilter, dateRange, priorityFilter, currentUser]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Fetch current user first to ensure it's available for subsequent logic
      const user = await User.me();
      setCurrentUser(user);

      // Fetch tasks and all users (excluding the current user from team members list)
      const allTasks = await DailyTask.list('-date');
      const allUsers = await User.list();

      setTasks(allTasks || []);
      setTeamMembers((allUsers || []).filter(u => u.id !== user.id));
    } catch (error) {
      console.error('Error loading data:', error);
      setTasks([]);
      setTeamMembers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskSaved = () => {
    loadData();
    setShowTaskForm(false);
    setEditingTask(null);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const getUserName = (userId) => {
    if (userId === currentUser?.id) return 'You';
    const user = teamMembers.find(u => u.id === userId);
    return user ? user.full_name : 'Unknown User';
  };

  const getTaskCounts = () => {
    const pending = filteredTasks.filter(t => t.task_status === 'Pending').length;
    const inProgress = filteredTasks.filter(t => t.task_status === 'In Progress').length;
    const completed = filteredTasks.filter(t => t.task_status === 'Completed').length;
    const blocked = filteredTasks.filter(t => t.task_status === 'Blocked').length;

    return { pending, inProgress, completed, blocked };
  };

  const taskCounts = getTaskCounts();

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-10 bg-slate-700 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-700 rounded-lg"></div>
              ))}
            </div>
            <div className="h-96 bg-slate-700 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Project & Task Dashboard</h1>
            <p className="text-slate-400">Comprehensive overview of project tasks and team performance</p>
          </div>

          <Button
            onClick={() => setShowTaskForm(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            {currentUser?.role === 'team_leader' ? 'Add/Assign Task' : 'Add Task'}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700/40 p-1 rounded-xl mb-6">
            <TabsTrigger value="tasks" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-slate-300">
              <Calendar className="w-4 h-4 mr-2" />
              Project Tasks ({filteredTasks.length})
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-slate-300">
              <BarChart3 className="w-4 h-4 mr-2" />
              Performance Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-6">
            {/* Filters */}
            <Card className="glass-effect-enhanced">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filters & Search
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  <div className="xl:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search tasks..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600 text-white">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600 text-white">
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600 text-white">
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Last 7 days</SelectItem>
                      <SelectItem value="month">Last 30 days</SelectItem>
                      <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                  </Select>

                  {currentUser?.role === 'team_leader' && (
                    <Select value={memberFilter} onValueChange={setMemberFilter}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Team Member" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600 text-white">
                        <SelectItem value="all">All Members</SelectItem>
                        <SelectItem value={currentUser?.id}>My Tasks</SelectItem>
                        {teamMembers.map(member => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Task Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="glass-effect-enhanced border-slate-500/30">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-white">{taskCounts.pending}</div>
                  <p className="text-sm text-slate-400">Pending</p>
                </CardContent>
              </Card>
              <Card className="glass-effect-enhanced border-blue-500/30">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-white">{taskCounts.inProgress}</div>
                  <p className="text-sm text-slate-400">In Progress</p>
                </CardContent>
              </Card>
              <Card className="glass-effect-enhanced border-green-500/30">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-white">{taskCounts.completed}</div>
                  <p className="text-sm text-slate-400">Completed</p>
                </CardContent>
              </Card>
              <Card className="glass-effect-enhanced border-red-500/30">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-white">{taskCounts.blocked}</div>
                  <p className="text-sm text-slate-400">Blocked</p>
                </CardContent>
              </Card>
            </div>

            {/* Task List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTasks.map(task => (
                <DailyTaskCard
                  key={task.id}
                  task={task}
                  userName={currentUser?.role === 'team_leader' ? getUserName(task.user_id) : null}
                  onEdit={handleEditTask}
                  canEdit={currentUser?.role === 'team_leader' || task.user_id === currentUser?.id}
                />
              ))}

              {filteredTasks.length === 0 && (
                <div className="col-span-full text-center py-16 glass-effect-enhanced rounded-lg">
                  <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Tasks Found</h3>
                  <p className="text-slate-400 mb-6">No tasks match your current filters.</p>
                  <Button
                    onClick={() => setShowTaskForm(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Task
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceSummary dailyTasks={tasks} teamMembers={teamMembers} />
          </TabsContent>
        </Tabs>

        {/* Task Form Dialog */}
        <DailyTaskForm
          open={showTaskForm}
          onOpenChange={setShowTaskForm}
          task={editingTask}
          onTaskSaved={handleTaskSaved}
          mode={editingTask ? "edit" : "create"}
          teamMembers={teamMembers}
        />
      </div>
    </div>
  );
}
