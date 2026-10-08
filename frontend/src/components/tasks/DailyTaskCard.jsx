import React from 'react';
import { GripVertical } from 'lucide-react';
import { motion, useDragControls, useMotionValue, useSpring, useTransform, useVelocity } from 'framer-motion';
import { emitFun } from '@/fun/bus';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Edit3, Clock, Target, User, Calendar } from "lucide-react";
import { DailyTask } from "@/entities/DailyTask";
import { FocusButton } from "@/fun/FocusTimer";
import { format } from 'date-fns';
import { Emoji, Rich } from '@/icons/Emoji';

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

const statusEmoji = { Pending: '⏳', 'In Progress': '🚀', Completed: '✅', Blocked: '🙈' };
const priorityEmoji = { Low: '🌱', Medium: '⚡', High: '🔥', Critical: '🚨' };

export default function DailyTaskCard({ task, onEdit, userName, canEdit = false, onCompleted }) {
  const [completing, setCompleting] = React.useState(false);
  const markDone = async () => {
    setCompleting(true);
    try {
      await DailyTask.update(task.id, { task_status: 'Completed', actual_time_taken: task.actual_time_taken || task.expected_time });
      onCompleted?.(task);
    } catch (e) {
      console.error('Could not complete task:', e);
    } finally {
      setCompleting(false);
    }
  };
  const draggable = canEdit && task.task_status !== 'Completed';
  const controls = useDragControls();
  const x = useMotionValue(0); const y = useMotionValue(0);
  const vx = useVelocity(x); const vy = useVelocity(y);
  // squash and stretch: the card stretches along its direction of travel and wobbles back with a spring when released
  const sx = useSpring(useTransform([vx, vy], ([a, b]) => Math.max(0.82, Math.min(1.2, 1 + Math.abs(a) / 7000 - Math.abs(b) / 14000))), { stiffness: 380, damping: 14 });
  const sy = useSpring(useTransform([vx, vy], ([a, b]) => Math.max(0.82, Math.min(1.2, 1 + Math.abs(b) / 7000 - Math.abs(a) / 14000))), { stiffness: 380, damping: 14 });
  const tilt = useSpring(useTransform(vx, [-1800, 1800], [-7, 7]), { stiffness: 300, damping: 18 });
  const [dropped, setDropped] = React.useState(false);
  const onDragEnd = async (e) => {
    emitFun({ type: 'taskDrag', on: false });
    const r = document.getElementById('drop-jar')?.getBoundingClientRect();
    const cx = e.clientX ?? 0; const cy = e.clientY ?? 0;
    if (r && cx >= r.left - 20 && cx <= r.right + 20 && cy >= r.top - 20 && cy <= r.bottom + 20) {
      setDropped(true);
      setTimeout(markDone, 280);
    }
  };

  const getTimeVariance = () => {
    if (task.actual_time_taken && task.expected_time) {
      const variance = task.actual_time_taken - task.expected_time;
      return variance;
    }
    return 0;
  };

  const timeVariance = getTimeVariance();

  return (
    <motion.div
      drag={draggable} dragListener={false} dragControls={controls} dragSnapToOrigin dragElastic={0.18} dragMomentum={false}
      style={{ x, y, scaleX: sx, scaleY: sy, rotate: tilt, position: 'relative', zIndex: 0 }}
      animate={dropped ? { scale: 0.1, opacity: 0, rotate: 25 } : undefined} transition={{ duration: 0.28 }}
      whileDrag={{ zIndex: 60, boxShadow: '0 18px 32px rgba(0,0,0,.45)' }}
      onDragStart={() => emitFun({ type: 'taskDrag', on: true })} onDragEnd={(e) => onDragEnd(e)}
    >
    <Card className="glass-effect-enhanced hover:border-blue-500/50 transition-all duration-300 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {draggable && <button type="button" onPointerDown={(e) => { e.preventDefault(); controls.start(e); }} aria-label="Drag to the done jar to finish this task" title="Drag me onto the done jar!" className="touch-none cursor-grab active:cursor-grabbing text-slate-500 hover:text-white -ml-1"><GripVertical className="w-4 h-4" /></button>}
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
              <Emoji e={priorityEmoji[task.priority]} className="mr-1" />{task.priority}
            </Badge>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(task)}
                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={`${statusColors[task.task_status]} border px-2 py-1 text-xs`}>
              <Emoji e={statusEmoji[task.task_status]} className="mr-1" />{task.task_status}
            </Badge>
            {canEdit && task.task_status !== 'Completed' && <FocusButton task={task} />}
            {canEdit && task.task_status !== 'Completed' && (
              <Button size="sm" onClick={markDone} disabled={completing} title="Mark as done" className="h-7 px-2 bg-emerald-500 hover:bg-emerald-400 text-ink font-bold rounded-full">
                <Check className="w-4 h-4 mr-1" />{completing ? '…' : 'Done!'}
              </Button>
            )}
          </div>
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
    </motion.div>
  );
}