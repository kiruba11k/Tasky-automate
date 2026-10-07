
import React, { useState, useEffect } from "react";
import { Task } from "@/entities/Task";
import { TeamMember } from "@/entities/TeamMember";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckSquare, Filter, Edit3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import EditTaskForm from "../components/tasks/EditTaskForm"; // Import EditTaskForm
// Note: AddTaskForm would be a new component if "Create Task" button functionality is implemented with a dialog.
// For now, assuming Create Task leads to a new page or a similar dialog not yet requested.

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // const [activeFilter, setActiveFilter] = useState("all"); // This state seems unused. Can be removed.
  const [showEditTaskForm, setShowEditTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true); // Set loading true at start
    try {
      const [taskList, members] = await Promise.all([
        Task.list("-created_date"),
        TeamMember.list()
      ]);
      setTasks(taskList);
      setTeamMembers(members);
    } catch (error) {
      console.error("Error loading tasks:", error);
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

  const getTasksByStatus = (status) => {
    if (status === "all") return tasks;
    return tasks.filter(task => task.status === status);
  };

  const getMemberName = (memberId) => {
    const member = teamMembers.find(m => m.id === memberId);
    return member ? member.name : "Unassigned";
  };

  const priorityColors = {
    "Low": "bg-blue-500/20 text-blue-300 border-blue-500/40",
    "Medium": "bg-yellow-500/20 text-yellow-300 border-yellow-500/40", 
    "High": "bg-orange-500/20 text-orange-300 border-orange-500/40",
    "Critical": "bg-red-500/20 text-red-300 border-red-500/40"
  };

  const statusColors = {
    "Backlog": "bg-slate-500/20 text-slate-300 border-slate-500/40",
    "In Progress": "bg-blue-500/20 text-blue-300 border-blue-500/40",
    "Review": "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
    "Completed": "bg-green-500/20 text-green-300 border-green-500/40"
  };

  const TaskCard = ({ task, onEdit }) => ( // Added onEdit prop
    <Card className="glass-effect-enhanced hover:border-blue-500/50 transition-all duration-300 group relative">
       <button 
        onClick={() => onEdit(task)} // Call onEdit with the task
        className="absolute top-3 right-3 p-1.5 bg-slate-700/50 hover:bg-slate-600/70 rounded-md text-slate-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
        aria-label={`Edit ${task.title}`}
      >
        <Edit3 className="w-4 h-4" />
      </button>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-8">
            <CardTitle className="text-white text-base font-semibold mb-1.5 group-hover:text-blue-300 transition-colors">{task.title}</CardTitle>
            <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">{task.description}</p>
          </div>
          <Badge className={`${priorityColors[task.priority]} border ml-2 px-2 py-0.5 text-xs flex-shrink-0`}>
            {task.priority}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <Badge className={`${statusColors[task.status]} border px-2 py-0.5 text-xs`}>
            {task.status}
          </Badge>
          <span className="text-slate-400 text-xs">{getMemberName(task.assigned_to)}</span>
        </div>
        
        {task.required_skills && task.required_skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.required_skills.map((skill, index) => (
              <Badge key={index} variant="outline" className="text-xs border-slate-600 text-slate-400 px-1.5 py-0.5">
                {skill.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        )}
        
        {task.due_date && (
          <div className="text-xs text-slate-500">
            Due: {format(new Date(task.due_date), "MMM d, yyyy")}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="flex justify-between items-center">
              <div className="h-10 bg-slate-700 rounded w-1/3"></div>
              <div className="h-10 bg-slate-700 rounded w-32"></div>
            </div>
            <div className="h-10 bg-slate-700 rounded-lg w-full"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-56 glass-effect-enhanced rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">Task Management</h1>
            <p className="text-slate-400">Organize, track, and manage your marketing tasks efficiently.</p>
          </div>
          <Button 
            // onClick={() => setShowAddTaskForm(true)} // TODO: Implement AddTaskForm dialog
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/30 glow-effect">
            <Plus className="w-4 h-4 mr-2" />
            Create Task
          </Button>
        </div>

        {/* Task Boards */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700/40 p-1 rounded-xl">
            {["all", "Backlog", "In Progress", "Review", "Completed"].map(statusValue => (
               <TabsTrigger 
                key={statusValue} 
                value={statusValue} 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md text-slate-300 hover:text-white px-4 py-1.5 text-sm rounded-lg transition-all"
              >
                {statusValue === "all" ? "All Tasks" : statusValue} ({getTasksByStatus(statusValue).length})
              </TabsTrigger>
            ))}
          </TabsList>

          {["all", "Backlog", "In Progress", "Review", "Completed"].map(status => (
            <TabsContent key={status} value={status} className="mt-6">
              {getTasksByStatus(status).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {getTasksByStatus(status).map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onEdit={handleEditTask} // Pass handleEditTask to TaskCard
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 glass-effect-enhanced rounded-lg">
                  <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-700/50">
                    <CheckSquare className="w-10 h-10 text-slate-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    No {status === "all" ? "Tasks" : status} Tasks
                  </h3>
                  <p className="text-slate-400 mb-6 max-w-md mx-auto">
                    {status === "all" 
                      ? "Start organizing your marketing workflow by creating tasks."
                      : `There are no tasks in ${status} status at the moment.`
                    }
                  </p>
                  {status === "all" && (
                    <Button 
                      // onClick={() => setShowAddTaskForm(true)} // TODO: Implement AddTaskForm dialog
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/30 glow-effect">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Task
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
        {editingTask && (
          <EditTaskForm
            open={showEditTaskForm}
            onOpenChange={setShowEditTaskForm}
            task={editingTask}
            onTaskUpdated={handleTaskUpdated}
            teamMembers={teamMembers}
          />
        )}
      </div>
    </div>
  );
}
