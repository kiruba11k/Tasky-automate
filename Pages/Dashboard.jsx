
import React, { useState, useEffect } from "react";
import { TeamMember } from "@/entities/TeamMember";
import { Task } from "@/entities/Task";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckSquare, Clock, TrendingUp, AlertCircle, BarChart3, PieChart as PieIcon, Activity, ChevronDown, ChevronUp, ChevronsUpDown, Edit3 } from "lucide-react"; // Renamed PieChart to PieIcon to avoid conflict
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Legend, Bar, PieChart, Pie, Cell } from 'recharts'; // PieChart from recharts is used here
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion"; // Import framer-motion
import EditTaskForm from "../components/tasks/EditTaskForm";


// Updated Graph Colors for a more cohesive look
const GRAPH_PALETTE = {
  blue: '#3b82f6',    // Blue-500
  purple: '#8b5cf6',  // Violet-500
  green: '#10b981',   // Emerald-500
  pink: '#ec4899',    // Pink-500
  amber: '#f59e0b',   // Amber-500
  slate: '#64748b',   // Slate-500
  cyan: '#06b6d4',    // Cyan-500
  red: '#ef4444'      // Red-500 (for critical)
};

export default function Dashboard() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditTaskForm, setShowEditTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true); 
    try {
      const [membersData, taskList, allTeamMembers] = await Promise.all([ // Fetch allTeamMembers for EditTaskForm
        TeamMember.list(),
        Task.list("-created_date"),
        TeamMember.list() // Assuming EditTaskForm needs all members
      ]);
      setTeamMembers(membersData); // This state is used for Team Workload section
      setTasks(taskList);
      // setAllTeamMembers(allTeamMembers); // Store for passing to EditTaskForm if different from `teamMembers`
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTaskUpdated = () => {
    loadData(); // Refresh tasks
  };
  
  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowEditTaskForm(true);
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await Task.update(taskId, { status: newStatus });
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const getTasksByStatus = (status) => tasks.filter(task => task.status === status).length;
  const getHighPriorityTasks = () => tasks.filter(task => task.priority === "High" || task.priority === "Critical").length;
  const getAverageWorkload = () => {
    if (teamMembers.length === 0) return 0;
    return Math.round(teamMembers.reduce((sum, member) => sum + (member.current_workload || 0), 0) / teamMembers.length);
  };

  const getRecentTasks = (count = 7) => { // Increased count for more items
    return [...tasks]
      .sort((a, b) => {
        const dateA = new Date(a.updated_date || a.created_date);
        const dateB = new Date(b.updated_date || b.created_date);
        return dateB - dateA;
      })
      .slice(0, count);
  };

  // Task Status Distribution Data & Colors
  const taskStatusData = [
    { name: 'Backlog', value: getTasksByStatus('Backlog'), fill: GRAPH_PALETTE.slate },
    { name: 'In Progress', value: getTasksByStatus('In Progress'), fill: GRAPH_PALETTE.blue },
    { name: 'Review', value: getTasksByStatus('Review'), fill: GRAPH_PALETTE.purple },
    { name: 'Completed', value: getTasksByStatus('Completed'), fill: GRAPH_PALETTE.green },
  ];
  
  // Task Priority Overview Data & Colors
  const taskPriorityData = [
    { name: 'Low', value: tasks.filter(t => t.priority === "Low").length, fill: GRAPH_PALETTE.cyan },
    { name: 'Medium', value: tasks.filter(t => t.priority === "Medium").length, fill: GRAPH_PALETTE.blue },
    { name: 'High', value: tasks.filter(t => t.priority === "High").length, fill: GRAPH_PALETTE.amber },
    { name: 'Critical', value: tasks.filter(t => t.priority === "Critical").length, fill: GRAPH_PALETTE.red },
  ];
  
  const priorityColors = {
    "Low": "bg-cyan-700/30 text-cyan-300 border-cyan-600/50",
    "Medium": "bg-blue-700/30 text-blue-300 border-blue-600/50", 
    "High": "bg-amber-700/30 text-amber-300 border-amber-600/50",
    "Critical": "bg-red-700/30 text-red-300 border-red-600/50"
  };

  const statusColors = {
    "Backlog": "bg-slate-700/40 text-slate-300 border-slate-600/50",
    "In Progress": "bg-blue-700/30 text-blue-300 border-blue-600/50",
    "Review": "bg-purple-700/30 text-purple-300 border-purple-600/50",
    "Completed": "bg-green-700/30 text-green-300 border-green-600/50"
  };
  
  const availableStatuses = ["Backlog", "In Progress", "Review", "Completed"];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-effect-enhanced p-3 rounded-md shadow-lg">
          <p className="label text-sm font-semibold text-white">{`${label} : ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };
  
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1, // Staggered animation
        duration: 0.4,
        ease: "easeOut"
      }
    })
  };


  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-10 bg-slate-700 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-36 glass-effect-enhanced rounded-lg"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-80 glass-effect-enhanced rounded-lg"></div>
              <div className="h-80 glass-effect-enhanced rounded-lg"></div>
            </div>
             <div className="h-96 glass-effect-enhanced rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Marketing Dashboard</h1>
          <p className="text-slate-400 text-lg">Welcome back! Here's your team's performance snapshot.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.custom variants={cardVariants} initial="hidden" animate="visible" custom={0}>
            <Card className="glass-effect-enhanced border-emerald-500/40 hover:border-emerald-400 hover:shadow-emerald-500/20 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Team Members</CardTitle>
                <Users className="h-5 w-5 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{teamMembers.length}</div>
                <p className="text-xs text-slate-400 mt-1">Active members</p>
              </CardContent>
            </Card>
          </motion.custom>

          <motion.custom variants={cardVariants} initial="hidden" animate="visible" custom={1}>
            <Card className="glass-effect-enhanced border-emerald-500/40 hover:border-emerald-400 hover:shadow-emerald-500/20 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Active Tasks</CardTitle>
                <Activity className="h-5 w-5 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{getTasksByStatus("In Progress")}</div>
                <p className="text-xs text-slate-400 mt-1">Currently in progress</p>
              </CardContent>
            </Card>
          </motion.custom>

          <motion.custom variants={cardVariants} initial="hidden" animate="visible" custom={2}>
            <Card className="glass-effect-enhanced border-emerald-500/40 hover:border-emerald-400 hover:shadow-emerald-500/20 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Avg Workload</CardTitle>
                <TrendingUp className="h-5 w-5 text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{getAverageWorkload()}%</div>
                <p className="text-xs text-slate-400 mt-1">Team capacity utilization</p>
              </CardContent>
            </Card>
          </motion.custom>

         <motion.custom variants={cardVariants} initial="hidden" animate="visible" custom={3}>
            <Card className="glass-effect-enhanced border-red-500/40 hover:border-red-400 hover:shadow-red-500/20 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">High Priority</CardTitle>
                <AlertCircle className="h-5 w-5 text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{getHighPriorityTasks()}</div>
                <p className="text-xs text-slate-400 mt-1">Critical & High priority tasks</p>
              </CardContent>
            </Card>
          </motion.custom>
        </div>
        
        {/* Main Content Area: Recent Activity on Left, Stacked Cards on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Column: Recent Activity */}
          <motion.custom variants={cardVariants} initial="hidden" animate="visible" custom={4} className="lg:col-span-3">
            <Card className="glass-effect-enhanced h-full">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-cyan-400"/>
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[calc(3*14rem)] overflow-y-auto pr-2 styled-scrollbar"> {/* Adjust max-h if needed */}
                <div className="space-y-3">
                  {getRecentTasks(15).map((task) => ( // Increased count for more items
                    <div key={task.id} className="flex items-start sm:items-center justify-between p-3 bg-slate-800/60 rounded-lg border border-slate-700/60 hover:border-blue-500/60 transition-all group">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white text-sm group-hover:text-blue-300 transition-colors truncate">{task.title}</h4>
                        <p className="text-slate-400 text-xs mt-0.5 line-clamp-1">{task.description}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2 flex-shrink-0 mt-2 sm:mt-0">
                        <Badge className={`${priorityColors[task.priority]} border text-xs px-2 py-0.5`}>
                          {task.priority}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className={`text-xs px-2 py-0.5 h-auto ${statusColors[task.status]} border hover:bg-slate-700 hover:text-white`}>
                              {task.status}
                              <ChevronsUpDown className="ml-1.5 h-3 w-3 opacity-70" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-slate-800 border-slate-600 text-white">
                            {availableStatuses.filter(s => s !== task.status).map(newStatus => (
                              <DropdownMenuItem 
                                key={newStatus}
                                onClick={() => updateTaskStatus(task.id, newStatus)}
                                className="hover:bg-slate-700 focus:bg-slate-700 focus:text-white text-slate-300"
                              >
                                Move to {newStatus}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-7 h-7 text-slate-400 hover:text-white hover:bg-slate-700"
                            onClick={() => handleEditTask(task)}
                            aria-label={`Edit ${task.title}`}
                         >
                           <Edit3 className="w-3.5 h-3.5" />
                         </Button>
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No tasks created yet. Start by adding new tasks!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.custom>

          {/* Right Column: Stacked Cards */}
          <div className="lg:col-span-2 space-y-8">
            <motion.custom variants={cardVariants} initial="hidden" animate="visible" custom={5}>
              <Card className="glass-effect-enhanced">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <PieIcon className="w-5 h-5 text-purple-400"/>
                    Task Status Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={taskStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="85%" labelLine={false} label={({ name, percent, value }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}>
                        {taskStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} className="focus:outline-none hover:opacity-80 transition-opacity"/>
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: '12px', paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.custom>

            <motion.custom variants={cardVariants} initial="hidden" animate="visible" custom={6}>
              <Card className="glass-effect-enhanced">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-pink-400"/>
                    Task Priority Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                   <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={taskPriorityData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} width={80}/>
                      <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}}/>
                      <Bar dataKey="value" barSize={20} radius={[0, 5, 5, 0]} legendType="none">
                        {taskPriorityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} className="focus:outline-none hover:opacity-80 transition-opacity"/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.custom>

            <motion.custom variants={cardVariants} initial="hidden" animate="visible" custom={7}>
              <Card className="glass-effect-enhanced"> {/* Removed h-full, let content define height */}
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-400"/>
                    Team Workload
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-96 overflow-y-auto pr-2 styled-scrollbar">
                  <div className="space-y-5">
                    {teamMembers.slice(0, 7).map((member) => (
                      <div key={member.id} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <div className={`w-2.5 h-2.5 rounded-full ${
                                (member.current_workload || 0) >= 80 ? 'bg-red-400' : 
                                (member.current_workload || 0) >= 60 ? 'bg-yellow-400' : 'bg-green-400'
                              } shadow-md`}></div>
                            <h4 className="font-medium text-white text-sm">{member.name}</h4>
                          </div>
                          <p className={`text-sm font-semibold ${
                            (member.current_workload || 0) >= 80 ? 'text-red-300' : 
                            (member.current_workload || 0) >= 60 ? 'text-yellow-300' : 'text-green-300'
                          }`}>
                            {member.current_workload || 0}%
                          </p>
                        </div>
                        <Progress 
                          value={member.current_workload || 0} 
                          className="h-2 [&>*]:bg-gradient-to-r [&>*]:from-blue-500 [&>*]:to-purple-500"
                          indicatorClassName={
                            (member.current_workload || 0) >= 80 ? '[&>*]:!from-red-500 [&>*]:!to-pink-500' : 
                            (member.current_workload || 0) >= 60 ? '[&>*]:!from-yellow-500 [&>*]:!to-orange-500' : ''
                          }
                        />
                        <p className="text-xs text-slate-400">{member.role}</p>
                      </div>
                    ))}
                    {teamMembers.length === 0 && (
                      <div className="text-center py-12 text-slate-400">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No team members added yet. Add members to see workload.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.custom>
          </div>
        </div>
      </div>
       {editingTask && (
        <EditTaskForm
          open={showEditTaskForm}
          onOpenChange={setShowEditTaskForm}
          task={editingTask}
          onTaskUpdated={handleTaskUpdated}
          teamMembers={teamMembers} // Pass all team members
        />
      )}
      <style jsx global>{`
        .styled-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .styled-scrollbar::-webkit-scrollbar-track {
          background: rgba(51, 65, 85, 0.3); /* slate-700 with opacity */
          border-radius: 10px;
        }
        .styled-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.5); /* slate-500 with opacity */
          border-radius: 10px;
        }
        .styled-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.8); /* slate-500 */
        }
      `}</style>
    </div>
  );
}