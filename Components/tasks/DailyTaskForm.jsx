import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DailyTask } from "@/entities/DailyTask";
import { User } from "@/entities/User";
import { CalendarIcon, Loader2, Clock, Target, ListTodo } from 'lucide-react';
import { format } from 'date-fns';

const priorities = ["Low", "Medium", "High", "Critical"];
const statuses = ["Pending", "In Progress", "Completed", "Blocked"];

export default function DailyTaskForm({ open, onOpenChange, task, onTaskSaved, mode = "create", teamMembers = [] }) {
  const [formData, setFormData] = useState({
    date: new Date(),
    task: "",
    expected_outcome: "",
    expected_time: 1,
    tasks_done: "",
    actual_time_taken: 0,
    task_status: "Pending",
    priority: "Medium",
    category: "",
    notes: "",
    user_id: ""
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (task) {
      setFormData({
        date: task.date ? new Date(task.date) : new Date(),
        task: task.task || "",
        expected_outcome: task.expected_outcome || "",
        expected_time: task.expected_time || 1,
        tasks_done: task.tasks_done || "",
        actual_time_taken: task.actual_time_taken || 0,
        task_status: task.task_status || "Pending",
        priority: task.priority || "Medium",
        category: task.category || "",
        notes: task.notes || "",
        user_id: task.user_id || ""
      });
    } else if (currentUser) {
      setFormData(prev => ({ ...prev, user_id: currentUser.id }));
    }
  }, [task, currentUser]);

  const loadCurrentUser = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
      if (!task) {
        setFormData(prev => ({ ...prev, user_id: user.id }));
      }
    } catch (error) {
      console.error("Error loading current user:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const dataToSave = {
        ...formData,
        date: format(formData.date, 'yyyy-MM-dd'),
        assigned_by: currentUser?.role === 'team_leader' && formData.user_id !== currentUser.id ? currentUser.id : null
      };

      if (mode === "edit" && task) {
        await DailyTask.update(task.id, dataToSave);
      } else {
        await DailyTask.create(dataToSave);
      }
      
      onTaskSaved();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        date: new Date(),
        task: "",
        expected_outcome: "",
        expected_time: 1,
        tasks_done: "",
        actual_time_taken: 0,
        task_status: "Pending",
        priority: "Medium",
        category: "",
        notes: "",
        user_id: currentUser?.id || ""
      });
    } catch (error) {
      console.error("Error saving daily task:", error);
    }
    
    setIsSubmitting(false);
  };

  const isTeamLeader = currentUser?.role === 'team_leader';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <ListTodo className="w-6 h-6 text-blue-400" />
            {mode === "edit" ? "Edit Daily Task" : "Add Daily Task"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start bg-slate-700 border-slate-600 hover:bg-slate-600 text-white">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.date, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-slate-700 border-slate-600">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => setFormData(prev => ({ ...prev, date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {isTeamLeader && teamMembers.length > 0 && (
                <div>
                  <Label className="text-slate-300">Assign To</Label>
                  <Select value={formData.user_id} onValueChange={(value) => setFormData(prev => ({ ...prev, user_id: value }))}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600 text-white">
                      <SelectItem value={currentUser?.id} className="hover:bg-slate-600">Myself</SelectItem>
                      {teamMembers.map(member => (
                        <SelectItem key={member.id} value={member.id} className="hover:bg-slate-600">
                          {member.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-slate-300 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Task Description
                </Label>
                <Textarea
                  value={formData.task}
                  onChange={(e) => setFormData(prev => ({ ...prev, task: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Describe the task to be completed..."
                  required
                />
              </div>

              <div>
                <Label className="text-slate-300">Expected Outcome</Label>
                <Textarea
                  value={formData.expected_outcome}
                  onChange={(e) => setFormData(prev => ({ ...prev, expected_outcome: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="What should be achieved..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-300">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600 text-white">
                      {priorities.map(p => (
                        <SelectItem key={p} value={p} className="hover:bg-slate-600">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-slate-300">Status</Label>
                  <Select value={formData.task_status} onValueChange={(value) => setFormData(prev => ({ ...prev, task_status: value }))}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600 text-white">
                      {statuses.map(s => (
                        <SelectItem key={s} value={s} className="hover:bg-slate-600">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-300 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Expected Time (hrs)
                  </Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.1"
                    value={formData.expected_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, expected_time: parseFloat(e.target.value) }))}
                    className="bg-slate-700 border-slate-600 text-white"
                    required
                  />
                </div>

                <div>
                  <Label className="text-slate-300">Actual Time (hrs)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.actual_time_taken}
                    onChange={(e) => setFormData(prev => ({ ...prev, actual_time_taken: parseFloat(e.target.value) }))}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-300">Category/Project</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="e.g., Marketing, Development, Research..."
                />
              </div>

              <div>
                <Label className="text-slate-300">Tasks Done</Label>
                <Textarea
                  value={formData.tasks_done}
                  onChange={(e) => setFormData(prev => ({ ...prev, tasks_done: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="What was actually completed..."
                />
              </div>

              <div>
                <Label className="text-slate-300">Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Additional notes or comments..."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-700">
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
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {mode === "edit" ? "Updating..." : "Creating..."}
                </>
              ) : (
                mode === "edit" ? "Update Task" : "Create Task"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}