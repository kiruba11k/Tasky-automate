import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Project } from '@/entities/Project';
import { Task } from '@/entities/Task';
import { ProjectResource } from '@/entities/ProjectResource';
import { ActivityLog } from '@/entities/ActivityLog';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Plus, Users, FolderKanban, CheckSquare, FileText, Activity } from "lucide-react";

// Import CRUD components
import TeamMembersCRUD from '../components/management/TeamMembersCRUD';
import ProjectsCRUD from '../components/management/ProjectsCRUD';
import TasksCRUD from '../components/management/TasksCRUD';
import ResourcesCRUD from '../components/management/ResourcesCRUD';
import ActivityHistory from '../components/management/ActivityHistory';

export default function Management() {
  const [activeTab, setActiveTab] = useState('team-members');
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Data states
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [resources, setResources] = useState([]);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [
        currentUserData,
        usersData,
        projectsData,
        tasksData,
        resourcesData,
        activitiesData
      ] = await Promise.all([
        User.me(),
        User.list('-created_date'),
        Project.list('-created_date'),
        Task.list('-created_date'),
        ProjectResource.list('-created_date'),
        ActivityLog.list('-created_date', 50) // Last 50 activities
      ]);

      setCurrentUser(currentUserData);
      setUsers(usersData || []);
      setProjects(projectsData || []);
      setTasks(tasksData || []);
      setResources(resourcesData || []);
      setActivities(activitiesData || []);
    } catch (error) {
      console.error('Error loading management data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logActivity = async (actionType, entityType, entityId, entityName, changes = {}) => {
    try {
      await ActivityLog.create({
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        performed_by: currentUser?.id,
        performed_by_name: currentUser?.full_name,
        performed_by_role: currentUser?.role,
        changes: changes,
        timestamp: new Date().toISOString()
      });
      
      // Reload activities to show the new log
      const newActivities = await ActivityLog.list('-created_date', 50);
      setActivities(newActivities || []);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const handleDataChange = () => {
    loadData(); // Refresh all data when changes occur
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-10 bg-slate-700 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-700 rounded-lg"></div>
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
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Management Dashboard</h1>
          <p className="text-slate-400">Comprehensive project and team management</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="glass-effect-enhanced border-blue-500/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Team Members</CardTitle>
              <Users className="h-5 w-5 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{users.length}</div>
              <p className="text-xs text-slate-400">
                {users.filter(u => u.status === 'Active').length} active
              </p>
            </CardContent>
          </Card>

          <Card className="glass-effect-enhanced border-green-500/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Projects</CardTitle>
              <FolderKanban className="h-5 w-5 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{projects.length}</div>
              <p className="text-xs text-slate-400">
                {projects.filter(p => p.status === 'Active').length} active
              </p>
            </CardContent>
          </Card>

          <Card className="glass-effect-enhanced border-yellow-500/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Tasks</CardTitle>
              <CheckSquare className="h-5 w-5 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{tasks.length}</div>
              <p className="text-xs text-slate-400">
                {tasks.filter(t => t.status === 'Completed').length} completed
              </p>
            </CardContent>
          </Card>

          <Card className="glass-effect-enhanced border-purple-500/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Resources</CardTitle>
              <FileText className="h-5 w-5 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{resources.length}</div>
              <p className="text-xs text-slate-400">Across all projects</p>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700/40 p-1 rounded-xl mb-6">
            <TabsTrigger value="team-members" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-slate-300">
              <Users className="w-4 h-4 mr-2" />
              Team Members
            </TabsTrigger>
            <TabsTrigger value="projects" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-slate-300">
              <FolderKanban className="w-4 h-4 mr-2" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-slate-300">
              <CheckSquare className="w-4 h-4 mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="resources" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-slate-300">
              <FileText className="w-4 h-4 mr-2" />
              Resources
            </TabsTrigger>
            {currentUser?.role === 'admin' && (
              <TabsTrigger value="activity" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-slate-300">
                <Activity className="w-4 h-4 mr-2" />
                Activity History
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="team-members" className="space-y-6">
            <TeamMembersCRUD 
              users={users}
              projects={projects}
              currentUser={currentUser}
              onDataChange={handleDataChange}
              onLogActivity={logActivity}
            />
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            <ProjectsCRUD
              projects={projects}
              users={users}
              tasks={tasks}
              currentUser={currentUser}
              onDataChange={handleDataChange}
              onLogActivity={logActivity}
            />
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <TasksCRUD
              tasks={tasks}
              projects={projects}
              users={users}
              currentUser={currentUser}
              onDataChange={handleDataChange}
              onLogActivity={logActivity}
            />
          </TabsContent>

          <TabsContent value="resources" className="space-y-6">
            <ResourcesCRUD
              resources={resources}
              projects={projects}
              currentUser={currentUser}
              onDataChange={handleDataChange}
              onLogActivity={logActivity}
            />
          </TabsContent>

          {currentUser?.role === 'admin' && (
            <TabsContent value="activity" className="space-y-6">
              <ActivityHistory
                activities={activities}
                currentUser={currentUser}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}