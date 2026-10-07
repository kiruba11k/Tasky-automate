
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Project } from "@/entities/Project";
import { User } from "@/entities/User";
import { Loader2, Users, X, Plus } from 'lucide-react';

const designations = [
  "ABM Specialist",
  "Data Scientist", 
  "Marketing Analyst",
  "Marketing Intern",
  "Content Creator",
  "Social Media Manager",
  "SEO Specialist",
  "PPC Specialist",
  "Email Marketing Specialist",
  "Growth Hacker",
  "Product Marketing Manager",
  "Brand Manager"
];

export default function TeamMemberAssignment({ open, onOpenChange, projects = [], teams = [], users = [], onMemberAssigned }) {
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [designation, setDesignation] = useState('');
  const [skills, setSkills] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const resetForm = () => {
    setSelectedUser('');
    setSelectedProjects([]);
    setDesignation('');
    setSkills('');
    setSearchTerm('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setIsSubmitting(true);
    
    try {
      // Update user with designation, skills, and project assignments
      const userToUpdate = users.find(u => u.id === selectedUser);
      const updatedProjectIds = [...new Set([...(userToUpdate.project_ids || []), ...selectedProjects])];
      
      await User.update(selectedUser, {
        designation,
        skills,
        project_ids: updatedProjectIds
      });

      // Update each selected project to include this user
      for (const projectId of selectedProjects) {
        const project = projects.find(p => p.id === projectId);
        if (project) {
          const updatedMembers = [...new Set([...(project.assigned_members || []), selectedUser])];
          await Project.update(projectId, {
            assigned_members: updatedMembers
          });
        }
      }

      onMemberAssigned();
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error assigning member:", error);
    }
    
    setIsSubmitting(false);
  };

  const addProject = (projectId) => {
    if (!selectedProjects.includes(projectId)) {
      setSelectedProjects([...selectedProjects, projectId]);
    }
  };

  const removeProject = (projectId) => {
    setSelectedProjects(selectedProjects.filter(id => id !== projectId));
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.full_name : 'Unknown User';
  };

  const getAvailableProjects = () => {
    return projects.filter(project => 
      !selectedProjects.includes(project.id) &&
      (project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       project.description?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const selectedUserData = users.find(u => u.id === selectedUser);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" />
            Assign Team Member to Projects
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* User Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Select Team Member</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Choose team member" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600 text-white">
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id} className="hover:bg-slate-600">
                      <div className="flex flex-col">
                        <span>{user.full_name}</span>
                        <span className="text-xs text-slate-400">{user.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-300">Designation</Label>
              <Select value={designation} onValueChange={setDesignation}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600 text-white">
                  {designations.map(designation => (
                    <SelectItem key={designation} value={designation} className="hover:bg-slate-600">
                      {designation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Skills */}
          <div>
            <Label className="text-slate-300">Skills (Optional)</Label>
            <Textarea
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="Enter skills separated by commas (e.g., Analytics, Data Visualization, SQL, Python)"
              rows={3}
            />
          </div>

          {/* Current User Info */}
          {selectedUserData && (
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
              <h4 className="text-white font-medium mb-2">Current Assignment Info</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Current Designation:</span>
                  <span className="text-white ml-2">{selectedUserData.designation || 'Not set'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Current Projects:</span>
                  <span className="text-white ml-2">{selectedUserData.project_ids?.length || 0}</span>
                </div>
              </div>
              {selectedUserData.skills && (
                <div className="mt-2">
                  <span className="text-slate-400 text-sm">Current Skills:</span>
                  <span className="text-white ml-2 text-sm">{selectedUserData.skills}</span>
                </div>
              )}
            </div>
          )}

          {/* Project Assignment */}
          <div>
            <Label className="text-slate-300 text-lg font-medium">Assign to Projects</Label>
            
            {/* Selected Projects */}
            {selectedProjects.length > 0 && (
              <div className="mt-3">
                <p className="text-slate-400 text-sm mb-2">Selected Projects:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedProjects.map(projectId => (
                    <Badge key={projectId} className="bg-blue-600/30 text-blue-200 border border-blue-500/50">
                      {getProjectName(projectId)}
                      <button
                        type="button"
                        onClick={() => removeProject(projectId)}
                        className="ml-2 text-blue-300 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Project Search */}
            <div className="mt-4">
              <Input
                placeholder="Search available projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white mb-3"
              />
              
              <div className="max-h-48 overflow-y-auto space-y-2">
                {getAvailableProjects().map(project => (
                  <div key={project.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded border border-slate-600/50 hover:border-blue-500/50 transition-colors">
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{project.name}</h4>
                      <p className="text-slate-400 text-sm line-clamp-1">{project.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-xs px-2 py-0.5 ${
                          project.status === 'Active' ? 'bg-green-500/20 text-green-300' :
                          project.status === 'Planning' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-slate-500/20 text-slate-300'
                        }`}>
                          {project.status}
                        </Badge>
                        <Badge className={`text-xs px-2 py-0.5 ${
                          project.priority === 'Critical' ? 'bg-red-500/20 text-red-300' :
                          project.priority === 'High' ? 'bg-orange-500/20 text-orange-300' :
                          project.priority === 'Medium' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-slate-500/20 text-slate-300'
                        }`}>
                          {project.priority}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => addProject(project.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white ml-4"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                ))}
                
                {getAvailableProjects().length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    {searchTerm ? "No projects found matching your search" : "All projects have been assigned"}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-700">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              className="border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !selectedUser || selectedProjects.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                `Assign to ${selectedProjects.length} Project${selectedProjects.length !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
