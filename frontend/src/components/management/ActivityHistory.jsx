import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Activity, User, Clock, Edit, Plus, Trash2 } from "lucide-react";
import { format } from 'date-fns';

export default function ActivityHistory({ activities = [], currentUser }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');

  const filteredActivities = activities.filter(activity => {
    const entityMatch = activity.entity_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       activity.entity_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       activity.performed_by_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const actionMatch = actionFilter === 'all' || activity.action_type === actionFilter;
    const entityTypeMatch = entityFilter === 'all' || activity.entity_type === entityFilter;
    const userMatch = userFilter === 'all' || activity.performed_by === userFilter;
    return entityMatch && actionMatch && entityTypeMatch && userMatch;
  });

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'Create':
        return <Plus className="w-4 h-4 text-green-400" />;
      case 'Update':
        return <Edit className="w-4 h-4 text-blue-400" />;
      case 'Delete':
        return <Trash2 className="w-4 h-4 text-red-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  const getActionColor = (actionType) => {
    switch (actionType) {
      case 'Create':
        return 'bg-green-500/20 text-green-300 border-green-500/40';
      case 'Update':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'Delete':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  const uniqueUsers = [...new Set(activities.map(a => ({ id: a.performed_by, name: a.performed_by_name })))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Activity History</h2>
        <p className="text-slate-400">Complete audit trail of all system changes</p>
      </div>

      {/* Filters */}
      <Card className="glass-effect-enhanced">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search activities..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-10 bg-slate-700 border-slate-600"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="bg-slate-700 border-slate-600">
                <SelectValue placeholder="Filter by Action" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600 text-white">
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="Create">Create</SelectItem>
                <SelectItem value="Update">Update</SelectItem>
                <SelectItem value="Delete">Delete</SelectItem>
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="bg-slate-700 border-slate-600">
                <SelectValue placeholder="Filter by Entity" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600 text-white">
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="Project">Projects</SelectItem>
                <SelectItem value="Task">Tasks</SelectItem>
                <SelectItem value="Team Member">Team Members</SelectItem>
                <SelectItem value="Resource">Resources</SelectItem>
              </SelectContent>
            </Select>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="bg-slate-700 border-slate-600">
                <SelectValue placeholder="Filter by User" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600 text-white">
                <SelectItem value="all">All Users</SelectItem>
                {uniqueUsers.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button 
              onClick={() => { setSearchTerm(''); setActionFilter('all'); setEntityFilter('all'); setUserFilter('all'); }} 
              className="px-4 py-2 text-sm border border-slate-600 rounded-md hover:bg-slate-700 text-white"
            >
              Clear Filters
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <div className="space-y-4">
        {filteredActivities.map((activity) => (
          <Card key={`${activity.id}-${activity.timestamp}`} className="glass-effect-enhanced">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-slate-600 to-slate-700 rounded-full flex items-center justify-center">
                    {getActionIcon(activity.action_type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`${getActionColor(activity.action_type)} border text-xs`}>
                        {activity.action_type}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {activity.entity_type}
                      </Badge>
                    </div>
                    <h3 className="font-medium text-white">
                      {activity.action_type}d {activity.entity_type.toLowerCase()}: "{activity.entity_name}"
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>{activity.performed_by_name}</span>
                        <Badge variant="outline" className="text-xs ml-1">
                          {activity.performed_by_role?.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{format(new Date(activity.timestamp), 'MMM dd, yyyy at HH:mm')}</span>
                      </div>
                    </div>
                    
                    {/* Changes Details */}
                    {activity.changes && Object.keys(activity.changes).length > 0 && (
                      <div className="mt-3 p-3 bg-slate-700/30 rounded-lg">
                        <p className="text-xs text-slate-400 mb-2">Changes made:</p>
                        {activity.action_type === 'Update' && activity.changes.before && activity.changes.after ? (
                          <div className="text-xs space-y-1">
                            {Object.keys(activity.changes.after).map(key => {
                              const oldValue = activity.changes.before[key];
                              const newValue = activity.changes.after[key];
                              if (oldValue !== newValue) {
                                return (
                                  <div key={key} className="text-slate-300">
                                    <span className="font-medium">{key}:</span>{' '}
                                    <span className="text-red-300">{String(oldValue)}</span> → <span className="text-green-300">{String(newValue)}</span>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-300">
                            {activity.action_type === 'Create' ? 'New record created' : 
                             activity.action_type === 'Delete' ? 'Record deleted' : 
                             'Changes made'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredActivities.length === 0 && (
          <Card className="glass-effect-enhanced">
            <CardContent className="p-8 text-center">
              <Activity className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Activities Found</h3>
              <p className="text-slate-400">No activities match your current filters.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}