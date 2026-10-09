import React, { useState } from 'react';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Filter, Plus, Edit, Trash2, User as UserIcon, Phone, Mail, Calendar } from "lucide-react";
import { format } from 'date-fns';

const marketingDesignations = [
  "ABM Specialist", "Data Scientist", "Marketing Analyst", "Marketing Intern", 
  "Content Creator", "Social Media Manager", "SEO Specialist", "PPC Specialist", 
  "Email Marketing Specialist", "Growth Hacker", "Product Marketing Manager", "Brand Manager"
];

export default function TeamMembersCRUD({ users = [], projects = [], currentUser, onDataChange, onLogActivity }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'team_member',
    designation: '',
    status: 'Active',
    contact: '',
    project_ids: [],
    skills: '',
    hire_date: ''
  });

  const filteredUsers = users.filter(user => {
    const nameMatch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const statusMatch = statusFilter === 'all' || user.status === statusFilter;
    const roleMatch = roleFilter === 'all' || (roleFilter === 'founder' ? user.founder : user.role === roleFilter);
    return nameMatch && statusMatch && roleMatch;
  });

  const handleCreateEdit = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        role: user.founder ? 'founder' : (user.role || 'team_member'),
        designation: user.designation || '',
        status: user.status || 'Active',
        contact: user.contact || '',
        project_ids: user.project_ids || [],
        skills: user.skills || '',
        hire_date: user.hire_date || ''
      });
    } else {
      setEditingUser(null);
      setFormData({
        full_name: '',
        email: '',
        role: 'team_member',
        designation: '',
        status: 'Active',
        contact: '',
        project_ids: [],
        skills: '',
        hire_date: ''
      });
    }
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      let result;
      const isFounder = formData.role === 'founder';
      const body = { ...formData, role: isFounder ? 'admin' : formData.role };
      if (isFounder) body.founder = true;
      else if (currentUser?.role === 'admin') body.founder = false;
      if (editingUser) {
        result = await User.update(editingUser.id, body);
        await onLogActivity('Update', 'Team Member', editingUser.id, formData.full_name, {
          before: editingUser,
          after: formData
        });
      } else {
        result = await User.create(body);
        await onLogActivity('Create', 'Team Member', result.id, formData.full_name);
      }
      
      setShowForm(false);
      onDataChange();
    } catch (error) {
      console.error('Error saving user:', error);
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (user) => {
    if (window.confirm(`Are you sure you want to delete ${user.full_name}?`)) {
      try {
        await User.delete(user.id);
        await onLogActivity('Delete', 'Team Member', user.id, user.full_name);
        onDataChange();
      } catch (error) {
        console.error('Error deleting user:', error);
        window.alert(error.message);
      }
    }
  };

  const getProjectNames = (projectIds) => {
    return projectIds?.map(id => {
      const project = projects.find(p => p.id === id);
      return project?.name || 'Unknown Project';
    }) || [];
  };

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'team_leader';

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Team Members</h2>
          <p className="text-slate-400">Manage team members and their assignments</p>
        </div>
        {canManage && (
          <Button onClick={() => handleCreateEdit()} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Member
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
                placeholder="Search members..." 
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
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="bg-slate-700 border-slate-600">
                <SelectValue placeholder="Filter by Role" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600 text-white">
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="founder">Founder</SelectItem>
                <SelectItem value="team_leader">Team Leader</SelectItem>
                <SelectItem value="team_member">Team Member</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); setRoleFilter('all'); }} 
              className="border-slate-600 hover:bg-slate-700"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="glass-effect-enhanced group">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-sm">{user.full_name}</CardTitle>
                    <p className="text-slate-400 text-xs">{user.designation}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge className={`${
                    user.status === 'Active' ? 'bg-green-500/20 text-green-300 border-green-500/40' : 
                    'bg-red-500/20 text-red-300 border-red-500/40'
                  } border text-xs`}>
                    {user.status}
                  </Badge>
                  <Badge className={`${
                    (user.role === 'admin' || user.founder) ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
                    user.role === 'team_leader' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                    'bg-slate-500/20 text-slate-300 border-slate-500/40'
                  } border text-xs`}>
                    {user.founder ? 'founder' : user.role.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.contact && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Phone className="w-4 h-4" />
                  {user.contact}
                </div>
              )}
              {user.email && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </div>
              )}
              {user.hire_date && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Calendar className="w-4 h-4" />
                  Joined {format(new Date(user.hire_date), 'MMM yyyy')}
                </div>
              )}
              
              {/* Assigned Projects */}
              {user.project_ids && user.project_ids.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Assigned Projects:</p>
                  <div className="flex flex-wrap gap-1">
                    {getProjectNames(user.project_ids).map((projectName, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {projectName}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {user.skills && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Skills:</p>
                  <p className="text-xs text-slate-400 line-clamp-2">{user.skills}</p>
                </div>
              )}

              {canManage && (
                <div className="flex gap-2 pt-2 border-t border-slate-700/50">
                  <Button variant="ghost" size="sm" onClick={() => handleCreateEdit(user)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(user)} className="text-red-400 hover:text-red-300">
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
            <DialogTitle>{editingUser ? 'Edit Team Member' : 'Add New Team Member'}</DialogTitle>
          </DialogHeader>
          {!editingUser && (
            <p className="text-sm text-slate-400">Adding someone lets them sign in with just this email.</p>
          )}
          {formError && <p role="alert" className="text-sm text-red-400">{formError}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  required
                  className="bg-slate-700"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  className="bg-slate-700"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                  <SelectTrigger className="bg-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 text-white">
                    <SelectItem value="team_member">Team Member</SelectItem>
                    <SelectItem value="team_leader">Team Leader</SelectItem>
                    {currentUser?.role === 'admin' && <SelectItem value="admin">Admin</SelectItem>}
                    {currentUser?.role === 'admin' && <SelectItem value="founder">Founder (admin, plain professional view)</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger className="bg-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 text-white">
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                value={formData.designation}
                onChange={(e) => setFormData({...formData, designation: e.target.value})}
                list="designations"
                className="bg-slate-700"
              />
              <datalist id="designations">
                {marketingDesignations.map(designation => (
                  <option key={designation} value={designation} />
                ))}
              </datalist>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact">Contact</Label>
                <Input
                  id="contact"
                  value={formData.contact}
                  onChange={(e) => setFormData({...formData, contact: e.target.value})}
                  placeholder="Phone or email"
                  className="bg-slate-700"
                />
              </div>
              <div>
                <Label htmlFor="hire_date">Hire Date</Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
                  className="bg-slate-700"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="skills">Skills (comma-separated)</Label>
              <Textarea
                id="skills"
                value={formData.skills}
                onChange={(e) => setFormData({...formData, skills: e.target.value})}
                placeholder="e.g., Social Media, Content Creation, Analytics"
                className="bg-slate-700"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (editingUser ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}