import React, { useState } from 'react';
import { ProjectResource } from '@/entities/ProjectResource';
import { UploadFile } from '@/integrations/Core';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Filter, Plus, Edit, Trash2, FileText, Upload, Link as LinkIcon, StickyNote } from "lucide-react";

export default function ResourcesCRUD({ resources = [], projects = [], currentUser, onDataChange, onLogActivity }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    project_id: '',
    title: '',
    description: '',
    type: 'Note',
    content: '',
    file: null
  });

  const filteredResources = resources.filter(resource => {
    const titleMatch = resource.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const typeMatch = typeFilter === 'all' || resource.type === typeFilter;
    const projectMatch = projectFilter === 'all' || resource.project_id === projectFilter;
    return titleMatch && typeMatch && projectMatch;
  });

  const handleCreateEdit = (resource = null) => {
    if (resource) {
      setEditingResource(resource);
      setFormData({
        project_id: resource.project_id || '',
        title: resource.title || '',
        description: resource.description || '',
        type: resource.type || 'Note',
        content: resource.content || '',
        file: null
      });
    } else {
      setEditingResource(null);
      setFormData({
        project_id: '',
        title: '',
        description: '',
        type: 'Note',
        content: '',
        file: null
      });
    }
    setShowForm(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData({...formData, file, type: 'File'});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      let dataToSave = { ...formData };
      delete dataToSave.file;

      // Handle file upload if it's a file type
      if (formData.type === 'File' && formData.file) {
        setIsUploading(true);
        try {
          const uploadResult = await UploadFile({ file: formData.file });
          dataToSave.content = uploadResult.file_url;
          dataToSave.file_name = formData.file.name;
          dataToSave.file_size = formData.file.size;
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
          alert('Error uploading file. Please try again.');
          return;
        } finally {
          setIsUploading(false);
        }
      }

      dataToSave.uploaded_by = currentUser?.id;

      let result;
      if (editingResource) {
        result = await ProjectResource.update(editingResource.id, dataToSave);
        await onLogActivity('Update', 'Resource', editingResource.id, formData.title, {
          before: editingResource,
          after: dataToSave
        });
      } else {
        result = await ProjectResource.create(dataToSave);
        await onLogActivity('Create', 'Resource', result.id, formData.title);
      }
      
      setShowForm(false);
      onDataChange();
    } catch (error) {
      console.error('Error saving resource:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (resource) => {
    if (window.confirm(`Are you sure you want to delete resource "${resource.title}"?`)) {
      try {
        await ProjectResource.delete(resource.id);
        await onLogActivity('Delete', 'Resource', resource.id, resource.title);
        onDataChange();
      } catch (error) {
        console.error('Error deleting resource:', error);
      }
    }
  };

  const getProjectName = (projectId) => {
    return projects.find(p => p.id === projectId)?.name || 'Unknown Project';
  };

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'team_leader';

  const getResourceIcon = (type) => {
    switch (type) {
      case 'File':
        return <FileText className="w-4 h-4" />;
      case 'Link':
        return <LinkIcon className="w-4 h-4" />;
      default:
        return <StickyNote className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Project Resources</h2>
          <p className="text-slate-400">Manage project files, notes, and links</p>
        </div>
        {canManage && (
          <Button onClick={() => handleCreateEdit()} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Resource
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
                placeholder="Search resources..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-10 bg-slate-700 border-slate-600"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-slate-700 border-slate-600">
                <SelectValue placeholder="Filter by Type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600 text-white">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Note">Notes</SelectItem>
                <SelectItem value="File">Files</SelectItem>
                <SelectItem value="Link">Links</SelectItem>
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
              onClick={() => { setSearchTerm(''); setTypeFilter('all'); setProjectFilter('all'); }} 
              className="border-slate-600 hover:bg-slate-700"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResources.map((resource) => (
          <Card key={resource.id} className="glass-effect-enhanced group">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                    {getResourceIcon(resource.type)}
                  </div>
                  <div>
                    <CardTitle className="text-white text-sm">{resource.title}</CardTitle>
                    <p className="text-slate-400 text-xs">{getProjectName(resource.project_id)}</p>
                  </div>
                </div>
                <Badge className={`${
                  resource.type === 'File' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                  resource.type === 'Link' ? 'bg-green-500/20 text-green-300 border-green-500/40' :
                  'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                } border text-xs`}>
                  {resource.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {resource.description && (
                <p className="text-slate-400 text-sm line-clamp-2">{resource.description}</p>
              )}
              
              {resource.type === 'Note' && (
                <p className="text-slate-300 text-sm line-clamp-3">{resource.content}</p>
              )}
              
              {resource.type === 'File' && (
                <div className="text-sm text-slate-400">
                  <p>File: {resource.file_name}</p>
                  {resource.file_size && (
                    <p>Size: {(resource.file_size / 1024).toFixed(1)} KB</p>
                  )}
                </div>
              )}
              
              {resource.type === 'Link' && (
                <a 
                  href={resource.content} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm truncate block"
                >
                  {resource.content}
                </a>
              )}

              {canManage && (
                <div className="flex gap-2 pt-2 border-t border-slate-700/50">
                  <Button variant="ghost" size="sm" onClick={() => handleCreateEdit(resource)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(resource)} className="text-red-400 hover:text-red-300">
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
            <DialogTitle>{editingResource ? 'Edit Resource' : 'Add New Resource'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                  className="bg-slate-700"
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                  <SelectTrigger className="bg-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 text-white">
                    <SelectItem value="Note">Note</SelectItem>
                    <SelectItem value="File">File</SelectItem>
                    <SelectItem value="Link">Link</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

            {formData.type === 'Note' && (
              <div>
                <Label htmlFor="content">Note Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  className="bg-slate-700 h-32"
                  required
                />
              </div>
            )}

            {formData.type === 'Link' && (
              <div>
                <Label htmlFor="content">URL</Label>
                <Input
                  id="content"
                  type="url"
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  placeholder="https://..."
                  required
                  className="bg-slate-700"
                />
              </div>
            )}

            {formData.type === 'File' && (
              <div>
                <Label htmlFor="file">Upload File</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  className="bg-slate-700"
                  required={!editingResource}
                />
                {isUploading && (
                  <p className="text-sm text-blue-400 mt-2">Uploading file...</p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isUploading}>
                {isSubmitting || isUploading ? 'Saving...' : (editingResource ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}