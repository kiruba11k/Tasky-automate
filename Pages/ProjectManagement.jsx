
import React, { useState, useEffect, useCallback } from 'react';
import { Project } from '@/entities/Project';
import { Team } from '@/entities/Team';
import { DailyTask } from '@/entities/DailyTask';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderKanban, Users, Plus, BarChart3, ChevronRight, Search, Filter, Trash2, Edit } from "lucide-react";
import ProjectForm from '../components/projects/ProjectForm';
import TeamMemberForm from '../components/team/TeamMemberForm';
import ProjectDashboard from '../components/projects/ProjectDashboard';
import Analytics from './Analytics';
import DeleteConfirmationDialog from '../components/shared/DeleteConfirmationDialog';

export default function ProjectManagement() {
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal States
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  
  // View State
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTab, setActiveTab] = useState('projects');
  
  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load data with individual try-catch to prevent one failure from breaking everything
      let user = null;
      let allProjects = [];
      let allTeams = [];
      let allTasks = [];
      let allUsers = [];

      try {
        user = await User.me();
      } catch (error) {
        console.error('Error loading user:', error);
      }

      try {
        allProjects = await Project.list('-created_date');
      } catch (error) {
        console.error('Error loading projects:', error);
      }

      try {
        allTeams = await Team.list();
      } catch (error) {
        console.error('Error loading teams:', error);
      }

      try {
        allTasks = await DailyTask.list('-date');
      } catch (error) {
        console.error('Error loading tasks:', error);
      }

      try {
        allUsers = await User.list();
      } catch (error) {
        console.error('Error loading users:', error);
      }

      setCurrentUser(user);
      setProjects(Array.isArray(allProjects) ? allProjects : []);
      setTeams(Array.isArray(allTeams) ? allTeams : []);
      setTasks(Array.isArray(allTasks) ? allTasks : []);
      setUsers(Array.isArray(allUsers) ? allUsers : []);
    } catch (error) {
      console.error('Error loading data:', error);
      // Ensure all states are arrays to prevent crashes
      setProjects([]);
      setTeams([]);
      setTasks([]);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEntitySaved = () => {
    loadData();
    setShowProjectForm(false);
    setShowMemberForm(false);
    setEditingProject(null);
    setEditingMember(null);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'project') {
        await Project.delete(deleteTarget.id);
      } else if (deleteTarget.type === 'member') {
        await User.delete(deleteTarget.id);
      }
      setDeleteTarget(null);
      await loadData();
    } catch (error) {
      console.error(`Error deleting ${deleteTarget.type}:`, error);
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (type, id, name) => {
    setDeleteTarget({ type, id, name });
  };
  
  const openEditForm = (type, item) => {
    if (type === 'project') {
      setEditingProject(item);
      setShowProjectForm(true);
    } else if (type === 'member') {
      setEditingMember(item);
      setShowMemberForm(true);
    }
  };

  const getProjectStats = (project) => {
    if (!Array.isArray(tasks) || !project?.id) {
      return { totalTasks: 0, completionRate: 0 };
    }
    
    const projectTasks = tasks.filter(task => task.project_id === project.id);
    const completed = projectTasks.filter(task => task.task_status === 'Completed').length;
    return {
      totalTasks: projectTasks.length,
      completionRate: projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0,
    };
  };

  const filteredProjects = Array.isArray(projects) ? projects.filter(p => {
    // Ensure p and p.name exist before proceeding
    if (!p || !p.name) return false; 
    const nameMatch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    // Use optional chaining for p.status as it might be null or undefined
    const statusMatch = statusFilter === 'all' || (p.status || '').toLowerCase() === statusFilter.toLowerCase();
    return nameMatch && statusMatch;
  }) : [];
  
  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'team_leader';

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-10 bg-slate-700 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-slate-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedProject) {
    return (
      <ProjectDashboard 
        project={selectedProject}
        onBack={() => setSelectedProject(null)}
        teams={teams}
        tasks={tasks}
        users={users}
        currentUser={currentUser}
        onUpdate={loadData}
      />
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Project Hub</h1>
            <p className="text-slate-400">Oversee all projects, manage teams, and track progress.</p>
          </div>
          {canManage && (
            <div className="flex gap-3">
              <Button onClick={() => setShowMemberForm(true)}>
                <Users className="w-4 h-4 mr-2" />
                Add Member
              </Button>
              <Button onClick={() => setShowProjectForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <Card className="glass-effect-enhanced">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input 
                placeholder="Search projects..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="bg-slate-700 border-slate-600"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600 text-white">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Planning">Planning</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                onClick={() => { setSearchTerm(''); setStatusFilter('all'); }} 
                className="border-slate-600 hover:bg-slate-700"
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const stats = getProjectStats(project);
            return (
              <Card key={project.id} className="glass-effect-enhanced group">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    {/* Safely render project name with fallback */}
                    <CardTitle className="text-white mb-2">{project?.name || 'Untitled Project'}</CardTitle>
                    {/* Safely render project status with fallback */}
                    <Badge variant="outline" className="border-blue-400 text-blue-300">
                      {project?.status || 'Unknown Status'}
                    </Badge>
                  </div>
                  {/* Safely render project description with fallback */}
                  <p className="text-slate-400 text-sm line-clamp-2">{project?.description || 'No description provided.'}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span>Progress</span>
                      <span>{stats.completionRate}%</span>
                    </div>
                    <Progress value={stats.completionRate} className="h-2"/>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-slate-700/50">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedProject(project)}>
                      <ChevronRight className="w-5 h-5"/>
                    </Button>
                    {canManage && (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditForm('project', project)}>
                          <Edit className="w-4 h-4 text-slate-400 hover:text-white"/>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog('project', project.id, project.name)}>
                          <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400"/>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {filteredProjects.length === 0 && (
          <div className="text-center py-16 glass-effect-enhanced rounded-lg">
            <FolderKanban className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Projects Found</h3>
            <p className="text-slate-400 mb-6">
              {searchTerm || statusFilter !== 'all' ? 
                'No projects match your current filters.' : 
                'Get started by creating your first project.'
              }
            </p>
            {canManage && (
              <Button onClick={() => setShowProjectForm(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Create First Project
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Modals and Dialogs */}
      <ProjectForm 
        open={showProjectForm} 
        onOpenChange={setShowProjectForm} 
        project={editingProject} 
        teams={teams} 
        users={users} 
        onSaved={handleEntitySaved} 
      />
      <TeamMemberForm 
        open={showMemberForm} 
        onOpenChange={setShowMemberForm} 
        member={editingMember} 
        projects={projects} 
        teams={teams} 
        onSaved={handleEntitySaved} 
      />
      <DeleteConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirmed}
        isDeleting={isDeleting}
        itemName={deleteTarget?.name}
        itemType={deleteTarget?.type}
      />
    </div>
  );
}
