
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { User } from "@/entities/User";
import InviteLinkDialog from "@/components/shared/InviteLinkDialog";
import { Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const marketingDesignations = [
  "ABM Specialist", "Data Scientist", "Marketing Analyst", "Marketing Intern", 
  "Content Creator", "Social Media Manager", "SEO Specialist", "PPC Specialist", 
  "Email Marketing Specialist", "Growth Hacker", "Product Marketing Manager", "Brand Manager"
];

const getInitialState = (member) => {
  const initialState = {
    full_name: '',
    email: '',
    role: 'team_member',
    designation: '',
    project_ids: [],
    skills: []
  };

  if (member) {
    return {
      ...initialState,
      ...member,
      skills: member.skills ? String(member.skills).split(',').filter(Boolean) : []
    };
  }
  return initialState;
};

export default function TeamMemberForm({ open, onOpenChange, member, projects, teams, onSaved }) {
  const [formData, setFormData] = useState(getInitialState(member));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openDesignation, setOpenDesignation] = useState(false);
  const [currentSkill, setCurrentSkill] = useState('');
  const [error, setError] = useState('');
  const [invite, setInvite] = useState(null);

  useEffect(() => {
    setFormData(getInitialState(member));
  }, [member]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const dataToSave = { ...formData, skills: Array.isArray(formData.skills) ? formData.skills.join(',') : '' };
      if (member) {
        await User.update(member.id, dataToSave);
      } else {
        const created = await User.create(dataToSave);
        setInvite({ name: created.full_name, token: created.invite_token });
      }
      onSaved();
    } catch (error) {
      console.error("Error saving member:", error);
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkillAdd = () => {
    if (currentSkill && !(formData.skills || []).includes(currentSkill)) { // Ensure formData.skills is treated as an array
      setFormData({...formData, skills: [...(formData.skills || []), currentSkill]});
      setCurrentSkill('');
    }
  };
  
  const handleSkillRemove = (skillToRemove) => {
    setFormData({...formData, skills: (formData.skills || []).filter(s => s !== skillToRemove)}); // Ensure formData.skills is treated as an array
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-600 text-white">
        <DialogHeader><DialogTitle>{member ? 'Edit Member' : 'Add New Member'}</DialogTitle></DialogHeader>
        {!member && <p className="text-sm text-slate-400">An invitation link is generated on save. The member sets their own password.</p>}
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Full Name</Label><Input value={formData.full_name || ''} onChange={e => setFormData({...formData, full_name: e.target.value})} required className="bg-slate-700"/></div>
            <div><Label>Email</Label><Input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} required className="bg-slate-700"/></div>
          </div>
          <div>
            <Label>Designation</Label>
            <Popover open={openDesignation} onOpenChange={setOpenDesignation}>
              <PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between bg-slate-700">{formData.designation || "Select designation..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-slate-800">
                <Command><CommandInput placeholder="Search or type new..." onValueChange={val => setFormData({...formData, designation: val})}/>
                  <CommandEmpty>No designation found. Type to create.</CommandEmpty>
                  <CommandGroup>{marketingDesignations.map(d => (
                    <CommandItem key={d} value={d} onSelect={() => {setFormData({...formData, designation: d}); setOpenDesignation(false);}}>{d}</CommandItem>
                  ))}</CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div><Label>Role</Label>
            <Select value={formData.role || 'team_member'} onValueChange={val => setFormData({...formData, role: val})}>
              <SelectTrigger className="bg-slate-700"><SelectValue/></SelectTrigger>
              <SelectContent className="bg-slate-800 text-white"><SelectItem value="team_member">Team Member</SelectItem><SelectItem value="team_leader">Team Leader</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <Label>Skills</Label>
            <div className="flex gap-2"><Input value={currentSkill} onChange={e => setCurrentSkill(e.target.value)} className="bg-slate-700" /><Button type="button" onClick={handleSkillAdd}>Add</Button></div>
            <div className="flex flex-wrap gap-2 mt-2">{(formData.skills || []).map(s => <Badge key={s}>{s}<button type="button" onClick={() => handleSkillRemove(s)} className="ml-2">x</button></Badge>)}</div>
          </div>
          {/* Project Assignment can be added here similarly */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Member'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <InviteLinkDialog open={!!invite} onOpenChange={(o) => !o && setInvite(null)} name={invite?.name} token={invite?.token} />
    </>
  );
}
