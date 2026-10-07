
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { TeamMember } from "@/entities/TeamMember";

const roles = [
  "Marketing Manager",
  "Content Creator", 
  "Social Media Specialist",
  "SEO Specialist",
  "PPC Specialist",
  "Designer",
  "Copywriter",
  "Data Analyst"
];

const skillLabels = {
  content_creation: "Content Creation",
  social_media: "Social Media",
  seo: "SEO",
  ppc_advertising: "PPC Advertising", 
  design: "Design",
  copywriting: "Copywriting",
  analytics: "Analytics",
  strategy: "Strategy"
};

export default function AddMemberForm({ open, onOpenChange, onMemberAdded }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    skills: {
      content_creation: 5,
      social_media: 5,
      seo: 5,
      ppc_advertising: 5,
      design: 5,
      copywriting: 5,
      analytics: 5,
      strategy: 5
    },
    availability: 100,
    current_workload: 0
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await TeamMember.create(formData);
      onMemberAdded();
      onOpenChange(false);
      setFormData({
        name: "",
        email: "",
        role: "",
        skills: {
          content_creation: 5,
          social_media: 5,
          seo: 5,
          ppc_advertising: 5,
          design: 5,
          copywriting: 5,
          analytics: 5,
          strategy: 5
        },
        availability: 100,
        current_workload: 0
      });
    } catch (error) {
      console.error("Error adding team member:", error);
    }
    
    setIsSubmitting(false);
  };

  const handleSkillChange = (skill, value) => {
    setFormData(prev => ({
      ...prev,
      skills: {
        ...prev.skills,
        [skill]: value[0]
      }
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add Team Member</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-slate-300">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-300">Role</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {roles.map(role => (
                  <SelectItem key={role} value={role} className="text-white hover:bg-slate-600">
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Skills */}
          <div>
            <Label className="text-slate-300 text-lg font-medium">Skills Assessment</Label>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {Object.entries(skillLabels).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-slate-400 text-sm">{label}</Label>
                    <span className="text-blue-400 font-medium">{formData.skills[key]}/10</span>
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
              <div className="flex justify-between mb-2">
                <Label className="text-slate-300">Availability</Label>
                <span className="text-green-400 font-medium">{formData.availability}%</span>
              </div>
              <Slider
                value={[formData.availability]}
                onValueChange={(value) => setFormData(prev => ({ ...prev, availability: value[0] }))}
                max={100}
                min={0}
                step={5}
                className="[&>span:first-child]:h-2 [&>span>span]:bg-green-500 [&>span>span]:h-2"
              />
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-slate-300">Current Workload</Label>
                <span className="text-yellow-400 font-medium">{formData.current_workload}%</span>
              </div>
              <Slider
                value={[formData.current_workload]}
                onValueChange={(value) => setFormData(prev => ({ ...prev, current_workload: value[0] }))}
                max={100}
                min={0}
                step={5}
                className="[&>span:first-child]:h-2 [&>span>span]:bg-yellow-500 [&>span>span]:h-2"
              />
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
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? "Adding..." : "Add Member"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
