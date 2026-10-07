import React, { useState } from 'react';
import { Task } from '@/entities/Task';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Filter, Plus, Edit, Trash2, CheckSquare, Calendar as CalendarIcon, User } from "lucide-react";
import { format } from 'date-fns';

export default function TasksCRUD({ tasks = [], projects = [], users = [], currentUser, onDataChange, onLogActivity }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    assigned_to: '',
    status: 'Pending',
    priority: 'Medium',
    due_date: null,
    estimated_hours: 1,
    notes: ''
  });

  const filteredTasks = tasks.filter(task => {
    const titleMatch = task.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const statusMatch = statusFilter === 'all' || task.status === statusFilter;
    const projectMatch = projectFilter === 'all' || task.project_id === projectFilter;
    return titleMatch && statusMatch && projectMatch;
  });

  const handleCreateEdit = (task = null) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title || '',
        description: task.description || '',
        project_id: task.project_id || '',
        assigned_to: task.assigned_to || '',
        status: task.status || 'Pending',
        priority: task.priority || 'Medium',
        due_date: task.due_date ? new Date(task.due_date) : null,
        estimated_hours: task.estimated_hours || 1,
        notes: task.notes || ''
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        project_id: '',
        assigned_to: '',
        status: 'Pending',
        priority: 'Medium',
        due_date: null,
        estimated_hours: 1,
        notes: ''
      });
    }
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const dataToSave = {
        ...formData,
        due_date: formData.due_date ? format(formData.due_date, 'yyyy-MM-dd') : null
      };
      
      let result;
      if (editingTask) {
        result = await Task.update(editingTask.id, dataToSave);
        await onLogActivity('Update', 'Task', editingTask.id, formData.title, {
          before: editingTask,
          after: dataToSave
        });
      } else {
        result = await Task.create(dataToSave);
        await onLogActivity('Create', 'Task', result.id, formData.title);
      }
      
      setShowForm(false);
      onDataChange();
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (task) => {
    if (window.confirm(`Are you sure you want to delete task "${task.title}"?`)) {
      try {
        await Task.delete(task.id);
        await onLogActivity('Delete', 'Task', task.id, task.title);
        onDataChange();
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const getProjectName = (projectId) => {
    return projects.find(p => p.id === projectId)?.name || 'Unknown Project';
  };

  const getAssignedMemberName = (userId) => {
    return users.find(u => u.id === userId)?.full_name || 'Unassigned';
  };

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'team_leader';

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Tasks</h2>
          <p className="text-slate-400">Manage project tasks and assignments</p>
        </div>
        {canManage && (
          <Button onClick={() => handleCreateEdit()} className="bg-yellow-600 hover:bg-yellow-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="glass-effect-enhanced">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search tasks..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-10 bg-slate-700 border-slate-600"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-slate-700 border-slate-600">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600 text-white">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="bg-slate-700 border-slate-600">
                <SelectValue placeholder="Filter by Project" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600 text-white">
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); setProjectFilter('all'); }} 
              className="border-slate-600 hover:bg-slate-700"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTasks.map((task) => (
          <Card key={task.id} className="glass-effect-enhanced group">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-white text-base mb-2">{task.title}</CardTitle>
                  <p className="text-slate-400 text-sm line-clamp-2">{task.description}</p>
                </div>
                <div className="flex gap-2">
                  <Badge className={`${
                    task.status === 'Completed' ? 'bg-green-500/20 text-green-300 border-green-500/40' :
                    task.status === 'In Progress' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                    'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                  } border text-xs`}>
                    {task.status}
                  </Badge>
                  <Badge className={`${
                    task.priority === 'Critical' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                    task.priority === 'High' ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' :
                    task.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' :
                    'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  } border text-xs`}>
                    {task.priority}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <CheckSquare className="w-4 h-4" />
                <span>Project: {getProjectName(task.project_id)}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <User className="w-4 h-4" />
                <span>Assigned: {getAssignedMemberName(task.assigned_to)}</span>
              </div>
              
              {task.due_date && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <CalendarIcon className="w-4 h-4" />
                  <span>Due: {format(new Date(task.due_date), 'MMM dd, yyyy')}</span>
                </div>
              )}
              
              {task.estimated_hours && (
                <div className="text-sm text-slate-400">
                  <span>Est. {task.estimated_hours}h</span>
                </div>
              )}

              {canManage && (
                <div className="flex gap-2 pt-2 border-t border-slate-700/50">
                  <Button variant="ghost" size="sm" onClick={() => handleCreateEdit(task)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(task)} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
                className="bg-slate-700"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="bg-slate-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="project_id">Project</Label>
                <Select value={formData.project_id} onValueChange={(value) => setFormData({...formData, project_id: value})}>
                  <SelectTrigger className="bg-slate-700">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 text-white">
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="assigned_to">Assigned To</Label>
                <Select value={formData.assigned_to} onValueChange={(value) => setFormData({...formData, assigned_to: value})}>
                  <SelectTrigger className="bg-slate-700">
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 text-white">
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger className="bg-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 text-white">
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                  <SelectTrigger className="bg-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 text-white">
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start bg-slate-700 border-slate-600">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.due_date ? format(formData.due_date, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-slate-700 border-slate-600">
                    <Calendar
                      mode="single"
                      selected={formData.due_date}
                      onSelect={(date) => setFormData({...formData, due_date: date})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="estimated_hours">Estimated Hours</Label>
                <Input
                  id="estimated_hours"
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData({...formData, estimated_hours: parseFloat(e.target.value)})}
                  className="bg-slate-700"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="bg-slate-700"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (editingTask ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}