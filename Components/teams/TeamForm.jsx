import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Team } from "@/entities/Team";
import { User } from "@/entities/User";
import { Loader2, X, Plus } from 'lucide-react';

export default function TeamForm({ open, onOpenChange, team, onTeamSaved }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    department: "",
    team_leaders: [],
    team_members: [],
    is_active: true
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name || "",
        description: team.description || "",
        department: team.department || "",
        team_leaders: team.team_leaders || [],
        team_members: team.team_members || [],
        is_active: team.is_active !== undefined ? team.is_active : true
      });
    }
  }, [team]);

  const loadUsers = async () => {
    try {
      const users = await User.list();
      setAllUsers(users);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (team) {
        await Team.update(team.id, formData);
      } else {
        await Team.create(formData);
      }
      
      onTeamSaved();
    } catch (error) {
      console.error("Error saving team:", error);
    }
    
    setIsSubmitting(false);
  };

  const addMember = (userId, isLeader = false) => {
    const field = isLeader ? 'team_leaders' : 'team_members';
    if (!formData[field].includes(userId)) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], userId]
      }));
    }
  };

  const removeMember = (userId, isLeader = false) => {
    const field = isLeader ? 'team_leaders' : 'team_members';
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter(id => id !== userId)
    }));
  };

  const getUserName = (userId) => {
    const user = allUsers.find(u => u.id === userId);
    return user ? user.full_name : 'Unknown User';
  };

  const getAvailableUsers = () => {
    const assigned = [...formData.team_leaders, ...formData.team_members];
    return allUsers.filter(user => 
      !assigned.includes(user.id) &&
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {team ? "Edit Team" : "Create New Team"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Team Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>

            <div>
              <Label className="text-slate-300">Department</Label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-300">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white"
              rows={3}
            />
          </div>

          {/* Team Leaders */}
          <div>
            <Label className="text-slate-300 text-lg font-medium">Team Leaders</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.team_leaders.map(leaderId => (
                <Badge key={leaderId} className="bg-purple-600/30 text-purple-200 border border-purple-500/50">
                  {getUserName(leaderId)}
                  <button
                    type="button"
                    onClick={() => removeMember(leaderId, true)}
                    className="ml-2 text-purple-300 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Team Members */}
          <div>
            <Label className="text-slate-300 text-lg font-medium">Team Members</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.team_members.map(memberId => (
                <Badge key={memberId} className="bg-blue-600/30 text-blue-200 border border-blue-500/50">
                  {getUserName(memberId)}
                  <button
                    type="button"
                    onClick={() => removeMember(memberId, false)}
                    className="ml-2 text-blue-300 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Add Members */}
          <div>
            <Label className="text-slate-300">Add Team Members</Label>
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white mb-3"
            />
            
            <div className="max-h-48 overflow-y-auto space-y-2">
              {getAvailableUsers().map(user => (
                <div key={user.id} className="flex items-center justify-between p-2 bg-slate-700/50 rounded border border-slate-600/50">
                  <span className="text-white">{user.full_name}</span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addMember(user.id, false)}
                      className="border-blue-500 text-blue-300 hover:bg-blue-600 hover:text-white"
                    >
                      Add as Member
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addMember(user.id, true)}
                      className="border-purple-500 text-purple-300 hover:bg-purple-600 hover:text-white"
                    >
                      Add as Leader
                    </Button>
                  </div>
                </div>
              ))}
              
              {getAvailableUsers().length === 0 && (
                <div className="text-center py-4 text-slate-400">
                  {searchTerm ? "No users found matching your search" : "All users have been assigned"}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {team ? "Updating..." : "Creating..."}
                </>
              ) : (
                team ? "Update Team" : "Create Team"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}