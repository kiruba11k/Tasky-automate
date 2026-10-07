import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit3, Clock, Target, User, Calendar } from "lucide-react";
import { format } from 'date-fns';

const priorityColors = {
  "Low": "bg-blue-500/20 text-blue-300 border-blue-500/40",
  "Medium": "bg-yellow-500/20 text-yellow-300 border-yellow-500/40", 
  "High": "bg-orange-500/20 text-orange-300 border-orange-500/40",
  "Critical": "bg-red-500/20 text-red-300 border-red-500/40"
};

const statusColors = {
  "Pending": "bg-slate-500/20 text-slate-300 border-slate-500/40",
  "In Progress": "bg-blue-500/20 text-blue-300 border-blue-500/40",
  "Completed": "bg-green-500/20 text-green-300 border-green-500/40",
  "Blocked": "bg-red-500/20 text-red-300 border-red-500/40"
};

export default function DailyTaskCard({ task, onEdit, userName, canEdit = false }) {
  const getTimeVariance = () => {
    if (task.actual_time_taken && task.expected_time) {
      const variance = task.actual_time_taken - task.expected_time;
      return variance;
    }
    return 0;
  };

  const timeVariance = getTimeVariance();

  return (
    <Card className="glass-effect-enhanced hover:border-blue-500/50 transition-all duration-300 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">{format(new Date(task.date), 'MMM dd, yyyy')}</span>
              {userName && (
                <>
                  <User className="w-4 h-4 text-slate-400 ml-2" />
                  <span className="text-sm text-slate-400">{userName}</span>
                </>
              )}
            </div>
            <CardTitle className="text-white text-base font-semibold mb-2 group-hover:text-blue-300 transition-colors">
              {task.task}
            </CardTitle>
            <p className="text-slate-400 text-sm line-clamp-2">{task.expected_outcome}</p>
          </div>
          <div className="flex items-start gap-2 ml-4">
            <Badge className={`${priorityColors[task.priority]} border px-2 py-1 text-xs`}>
              {task.priority}
            </Badge>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(task)}
                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge className={`${statusColors[task.task_status]} border px-2 py-1 text-xs`}>
            {task.task_status}
          </Badge>
          {task.category && (
            <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded">
              {task.category}
            </span>
          )}
        </div>

        {/* Time Information */}
        <div className="bg-slate-800/40 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Expected
            </span>
            <span className="text-white">{task.expected_time}h</span>
          </div>
          
          {task.actual_time_taken > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Actual</span>
              <span className="text-white">{task.actual_time_taken}h</span>
            </div>
          )}

          {timeVariance !== 0 && task.actual_time_taken > 0 && (
            <div className="flex items-center justify-between text-sm pt-1 border-t border-slate-700">
              <span className="text-slate-400">Variance</span>
              <span className={timeVariance > 0 ? "text-red-300" : "text-green-300"}>
                {timeVariance > 0 ? '+' : ''}{timeVariance.toFixed(1)}h
              </span>
            </div>
          )}
        </div>

        {/* Progress/Completion */}
        {task.tasks_done && (
          <div className="bg-slate-800/40 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-green-400" />
              <span className="text-sm text-slate-300">Completed</span>
            </div>
            <p className="text-sm text-slate-400 line-clamp-2">{task.tasks_done}</p>
          </div>
        )}

        {task.notes && (
          <div className="text-xs text-slate-500 bg-slate-800/30 p-2 rounded border-l-2 border-blue-500/30">
            <strong>Notes:</strong> {task.notes}
          </div>
        )}
      </CardContent>
    </Card>
  );
}