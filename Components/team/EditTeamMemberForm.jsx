
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { TeamMember } from "@/entities/TeamMember";
import { Loader2 } from 'lucide-react';

const roles = [
  "Marketing Manager", "Content Creator", "Social Media Specialist", 
  "SEO Specialist", "PPC Specialist", "Designer", "Copywriter", "Data Analyst"
];

const skillLabels = {
  content_creation: "Content Creation", social_media: "Social Media", seo: "SEO",
  ppc_advertising: "PPC Advertising", design: "Design", copywriting: "Copywriting",
  analytics: "Analytics", strategy: "Strategy"
};

export default function EditTeamMemberForm({ open, onOpenChange, member, onMemberUpdated }) {
  const [formData, setFormData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || "",
        email: member.email || "",
        role: member.role || "",
        skills: {
          content_creation: member.skills?.content_creation || 5,
          social_media: member.skills?.social_media || 5,
          seo: member.skills?.seo || 5,
          ppc_advertising: member.skills?.ppc_advertising || 5,
          design: member.skills?.design || 5,
          copywriting: member.skills?.copywriting || 5,
          analytics: member.skills?.analytics || 5,
          strategy: member.skills?.strategy || 5
        },
        availability: member.availability || 100,
        current_workload: member.current_workload || 0
      });
    }
  }, [member]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!member || !formData) return;
    setIsSubmitting(true);
    try {
      await TeamMember.update(member.id, formData);
      onMemberUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating team member:", error);
      // Add user-facing error handling here if desired
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkillChange = (skill, value) => {
    setFormData(prev => ({
      ...prev,
      skills: { ...prev.skills, [skill]: value[0] }
    }));
  };
  
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!formData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-semibold">Edit Team Member</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 px-6 pb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-name" className="text-slate-300">Full Name</Label>
              <Input id="edit-name" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} className="bg-slate-700 border-slate-600 text-white" required />
            </div>
            <div>
              <Label htmlFor="edit-email" className="text-slate-300">Email</Label>
              <Input id="edit-email" type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} className="bg-slate-700 border-slate-600 text-white" required />
            </div>
          </div>

          <div>
            <Label className="text-slate-300">Role</Label>
            <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white w-full"><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600 text-white">
                {roles.map(role => <SelectItem key={role} value={role} className="hover:bg-slate-600 focus:bg-slate-600">{role}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300 text-lg font-medium">Skills Assessment</Label>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-3">
              {Object.entries(skillLabels).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-slate-400 text-sm">{label}</Label>
                    <span className="text-blue-400 font-medium text-sm">{formData.skills[key]}/10</span>
                  </div>
                  <Slider 
                    value={[formData.skills[key]]} 
                    onValueChange={(value) => handleSkillChange(key, value)} 
                    max={10} 
                    min={1} 
                    step={1} 
                    className="[&>span:first-child]:h-2 [&>span>span]:bg-blue-500 [&>span>span]:h-2"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between mb-2"><Label className="text-slate-300">Availability</Label><span className="text-green-400 font-medium">{formData.availability}%</span></div>
              <Slider 
                value={[formData.availability]} 
                onValueChange={(value) => handleInputChange('availability', value[0])} 
                max={100} 
                min={0} 
                step={5} 
                className="[&>span:first-child]:h-2 [&>span>span]:bg-green-500 [&>span>span]:h-2"
              />
            </div>
            <div>
              <div className="flex justify-between mb-2"><Label className="text-slate-300">Current Workload</Label><span className="text-yellow-400 font-medium">{formData.current_workload}%</span></div>
              <Slider 
                value={[formData.current_workload]} 
                onValueChange={(value) => handleInputChange('current_workload', value[0])} 
                max={100} 
                min={0} 
                step={5} 
                className="[&>span:first-child]:h-2 [&>span>span]:bg-yellow-500 [&>span>span]:h-2"
              />
            </div>
          </div>
        </form>
        <DialogFooter className="p-6 pt-4 bg-slate-800/50 border-t border-slate-700">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-white">Cancel</Button>
          </DialogClose>
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
