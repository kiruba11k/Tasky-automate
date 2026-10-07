
import React, { useState, useEffect } from "react";
import { Task } from "@/entities/Task";
import { TeamMember } from "@/entities/TeamMember";
import { InvokeLLM } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Zap, Users, CheckSquare, Loader2, Sparkles, TrendingUp, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from 'date-fns';

export default function AIAllocation() {
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAllocating, setIsAllocating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [taskList, members] = await Promise.all([
        Task.filter({ status: "Backlog" }), // Only backlog tasks for allocation
        TeamMember.list()
      ]);
      setTasks(taskList);
      setTeamMembers(members);
    } catch (error) {
      console.error("Error loading data:", error);
      setError("Failed to load data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIAllocations = async () => {
    if (tasks.length === 0 || teamMembers.length === 0) {
      setError("Need both unassigned tasks and team members to generate allocations.");
      return;
    }

    setIsAllocating(true);
    setError(null);

    try {
      const prompt = `
        You are an AI task allocation system for a marketing team. Your goal is to assign the following backlog tasks to the most suitable team members.

        BACKLOG TASKS TO ALLOCATE:
        ${tasks.map(task => `
        - Task ID: ${task.id}
        - Title: ${task.title}
        - Description: ${task.description.substring(0,150)}... 
        - Priority: ${task.priority}
        - Required Skills: ${task.required_skills?.join(', ') || 'None specified'}
        - Estimated Hours: ${task.estimated_hours || 'Not specified'}
        - Due Date: ${task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : 'Not set'}
        `).join('\n')}

        AVAILABLE TEAM MEMBERS:
        ${teamMembers.map(member => `
        - Member ID: ${member.id}
        - Name: ${member.name}
        - Role: ${member.role}
        - Current Workload: ${member.current_workload || 0}% (lower is better)
        - Availability: ${member.availability || 100}% (higher is better)
        - Skills (level 1-10): ${Object.entries(member.skills || {}).map(([skill, level]) => `${skill.replace("_", " ")}: ${level}`).join(', ')}
        `).join('\n')}

        Please provide task allocations as a JSON object. For each task, assign it to ONE team member.
        Consider these factors for each assignment:
        1.  Skill Match: How well do the member's skills align with task requirements?
        2.  Workload: Is the member's current workload reasonable for new tasks?
        3.  Availability: Is the member available to take on new tasks?
        4.  Priority: Ensure high-priority tasks are assigned appropriately.
        5.  Due Dates: Consider due dates when assigning tasks, especially urgent ones.

        The output should be a JSON object with a single key "allocations".
        "allocations" should be an array of objects, where each object represents a task assignment and includes:
        - task_id: (string) The ID of the task.
        - member_id: (string) The ID of the assigned team member.
        - confidence_score: (number, 0.0 to 1.0) Your confidence in this assignment.
        - reasoning: (string) A brief explanation for this assignment (max 50 words).
        - estimated_completion_time_in_days: (number) Your estimate of how many days this task will take for this specific member.

        Example for one allocation object:
        {
          "task_id": "task_abc",
          "member_id": "member_xyz",
          "confidence_score": 0.85,
          "reasoning": "Strong skill match in SEO and content. Member has moderate workload and good availability.",
          "estimated_completion_time_in_days": 3
        }

        Assign all provided tasks. If a task cannot be reasonably assigned, you may omit it but aim to assign as many as possible.
      `;

      const result = await InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            allocations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task_id: { type: "string" },
                  member_id: { type: "string" },
                  confidence_score: { type: "number" },
                  reasoning: { type: "string" },
                  estimated_completion_time_in_days: { type: "number" }
                },
                required: ["task_id", "member_id", "confidence_score", "reasoning", "estimated_completion_time_in_days"]
              }
            }
          },
          required: ["allocations"]
        }
      });
      
      if (result && result.allocations) {
        setAllocations(result.allocations);
      } else {
        console.error("AI did not return expected allocation format:", result);
        setError("AI allocation failed to produce valid results. Please check the AI model or prompt.");
        setAllocations([]);
      }

    } catch (error) {
      console.error("Error generating AI allocations:", error);
      setError("Failed to generate AI allocations. This might be due to an issue with the AI model or the data provided. Please try again.");
    } finally {
      setIsAllocating(false);
    }
  };

  const applyAllocations = async () => {
    setIsAllocating(true); // Show loading on apply button
    try {
      for (const allocation of allocations) {
        await Task.update(allocation.task_id, {
          assigned_to: allocation.member_id,
          status: "In Progress" // Or another status as appropriate
        });
        
        // Optionally update member workload here if you track it dynamically
        const member = teamMembers.find(m => m.id === allocation.member_id);
        const task = tasks.find(t => t.id === allocation.task_id);
        if (member && task && task.estimated_hours) {
            // This is a simplistic workload update. Real system might be more complex.
            // Assuming estimated_hours contributes to workload. A typical 40h week is 100% workload.
            // This update is not saved to backend here, just for frontend reflection if needed.
            // const newWorkload = (member.current_workload || 0) + (task.estimated_hours / 40 * 100);
            // For now, we won't update workload via AI page to avoid complexity.
        }
      }
      
      await loadData(); // Refresh tasks and members
      setAllocations([]); // Clear current AI allocations
      
    } catch (error) {
      console.error("Error applying allocations:", error);
      setError("Failed to apply allocations. Please try again.");
    }
    setIsAllocating(false);
  };

  const getTaskById = (id) => tasks.find(task => task.id === id);
  const getMemberById = (id) => teamMembers.find(member => member.id === id);

  const priorityColors = {
    "Low": "bg-blue-500/20 text-blue-300 border-blue-500/40",
    "Medium": "bg-yellow-500/20 text-yellow-300 border-yellow-500/40", 
    "High": "bg-orange-500/20 text-orange-300 border-orange-500/40",
    "Critical": "bg-red-500/20 text-red-300 border-red-500/40"
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="flex justify-between items-center">
              <div className="h-10 bg-slate-700 rounded w-1/2"></div>
              <div className="h-10 bg-slate-700 rounded w-48"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 glass-effect-enhanced rounded-lg"></div>
              ))}
            </div>
            <div className="h-80 glass-effect-enhanced rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3 tracking-tight">
              <Brain className="w-8 h-8 text-blue-400 animate-pulse" />
              AI Task Allocation Engine
            </h1>
            <p className="text-slate-400">Intelligently assign tasks based on skills, workload, and priority.</p>
          </div>
          <Button 
            onClick={generateAIAllocations}
            disabled={isAllocating || tasks.length === 0 || teamMembers.length === 0}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/30 glow-effect px-6 py-3 text-base"
          >
            {isAllocating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analyzing Data...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Smart Allocations
              </>
            )}
          </Button>
        </div>

        {error && (
          <Alert className="bg-red-900/70 border-red-700 text-red-200 glass-effect-enhanced">
            <AlertDescription className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" /> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Current Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-effect-enhanced border-yellow-500/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Tasks in Backlog</CardTitle>
              <CheckSquare className="h-5 w-5 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{tasks.length}</div>
              <p className="text-xs text-slate-400 mt-1">Awaiting assignment</p>
            </CardContent>
          </Card>

          <Card className="glass-effect-enhanced border-green-500/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Available Team Members</CardTitle>
              <Users className="h-5 w-5 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{teamMembers.length}</div>
              <p className="text-xs text-slate-400 mt-1">Ready for tasks</p>
            </CardContent>
          </Card>

          <Card className="glass-effect-enhanced border-purple-500/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">AI Recommendations</CardTitle>
              <TrendingUp className="h-5 w-5 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{allocations.length}</div>
              <p className="text-xs text-slate-400 mt-1">Smart suggestions generated</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Allocations Results */}
        {allocations.length > 0 && (
          <Card className="glass-effect-enhanced">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <CardTitle className="text-white flex items-center gap-2 text-xl">
                <Brain className="w-6 h-6 text-blue-300" />
                AI Allocation Recommendations
              </CardTitle>
              <Button 
                onClick={applyAllocations}
                disabled={isAllocating}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30"
              >
                 {isAllocating && allocations.length > 0 ? (
                    <> <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Applying... </>
                 ) : (
                    <> <CheckSquare className="w-4 h-4 mr-2" /> Apply All & Update Tasks </>
                 )}
              </Button>
            </CardHeader>
            <CardContent className="max-h-[60vh] overflow-y-auto pr-2">
              <div className="space-y-4">
                {allocations.map((allocation, index) => {
                  const task = getTaskById(allocation.task_id);
                  const member = getMemberById(allocation.member_id);
                  
                  if (!task || !member) return null;

                  return (
                    <div key={index} className="p-4 bg-slate-800/60 rounded-lg border border-slate-700/50 hover:border-blue-500/50 transition-all shadow-md">
                      <div className="flex flex-col sm:flex-row items-start justify-between mb-3 gap-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white text-base">{task.title}</h4>
                          <p className="text-slate-400 text-xs mt-1 line-clamp-2">{task.description}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`${priorityColors[task.priority]} border px-2 py-0.5 text-xs`}>
                            {task.priority}
                          </Badge>
                          <div className="text-right">
                            <div className="text-sm font-medium text-blue-300">
                              {Math.round((allocation.confidence_score || 0) * 100)}% Match
                            </div>
                            <div className="text-xs text-slate-500">Confidence</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium bg-gradient-to-br from-purple-600 to-pink-500`}>
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="text-white font-medium text-sm">{member.name}</div>
                            <div className="text-slate-400 text-xs">{member.role}</div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-slate-300 text-sm">
                            Est. {allocation.estimated_completion_time_in_days} days
                          </div>
                           <div className="text-xs text-slate-500">Completion Time</div>
                        </div>
                      </div>
                      
                      <div className="mt-3 p-3 bg-slate-700/60 rounded border border-slate-600/50 text-xs">
                        <strong className="text-slate-300">AI Reasoning:</strong> <span className="text-slate-400">{allocation.reasoning}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty States & Instructions */}
        {(tasks.length === 0 || teamMembers.length === 0) && !isAllocating && allocations.length === 0 && (
          <div className="text-center py-16 glass-effect-enhanced rounded-lg">
            <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-700/50">
              <Brain className="w-10 h-10 text-slate-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Ready for AI Magic?</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              {tasks.length === 0 && teamMembers.length === 0 
                ? "Add some tasks to your backlog and team members to start using AI-powered allocation."
                : tasks.length === 0 
                ? "Add tasks to your backlog for the AI to assign."
                : "Add team members so the AI can assign tasks to them."
              }
            </p>
          </div>
        )}
         {tasks.length > 0 && teamMembers.length > 0 && allocations.length === 0 && !isAllocating && (
          <div className="text-center py-16 glass-effect-enhanced rounded-lg">
            <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-700/50">
              <Sparkles className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Generate Allocations</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
             Click the "Generate Smart Allocations" button above to let the AI assign your backlog tasks to the most suitable team members.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
