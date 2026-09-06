'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  ChevronRight,
  ListTodo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';

import { useParams } from 'next/navigation';

export default function ProgramWorkflowPage() {
  const routerParams = useParams();
  const slug = (routerParams?.slug as string) || '';
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const [phaseName, setPhaseName] = useState('Phase 1: Passive OSINT & DNS Enumeration');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = async () => {
    if (!slug) return;
    try {
      const res = await fetch(`/api/v1/programs/${slug}/workflow`);
      const data = await res.json();
      if (res.ok) {
        setTasks(data.tasks || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchTasks();
    }
  }, [slug]);

  const handleToggleStatus = async (task: any) => {
    let nextStatus = 'IN_PROGRESS';
    if (task.status === 'TODO') nextStatus = 'IN_PROGRESS';
    else if (task.status === 'IN_PROGRESS') nextStatus = 'COMPLETED';
    else nextStatus = 'TODO';

    try {
      await fetch(`/api/v1/programs/${slug}/workflow`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, status: nextStatus }),
      });
      fetchTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(`/api/v1/programs/${slug}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phaseName, title, description }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setTitle('');
        setDescription('');
        fetchTasks();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  // Group tasks by phase
  const phases = tasks.reduce((acc: Record<string, any[]>, task) => {
    acc[task.phaseName] = acc[task.phaseName] || [];
    acc[task.phaseName].push(task);
    return acc;
  }, {});

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-400" /> Structured Reconnaissance Workflow
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Methodology phases, penetration test checklist items, and evidence documentation log
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="font-mono text-xs gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Workflow Task
        </Button>
      </div>

      {/* Progress Bar */}
      <Card className="border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between text-xs font-mono mb-2">
          <span className="text-slate-300 font-semibold">RECONNAISSANCE COMPLETION PROGRESS</span>
          <span className="text-emerald-400 font-bold">
            {completedTasks}/{totalTasks} TASKS COMPLETED ({completionPercentage}%)
          </span>
        </div>
        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </Card>

      {/* Phase Task Boards */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-12 text-slate-500 font-mono text-xs">Loading workflow tasks...</div>
        ) : Object.keys(phases).length === 0 ? (
          <Card className="border-slate-800 text-center py-12">
            <CardContent className="text-xs font-mono text-slate-400">
              No workflow tasks created yet. Click above to add your first checklist item.
            </CardContent>
          </Card>
        ) : (
          Object.entries(phases).map(([phaseTitle, phaseTasks]) => (
            <div key={phaseTitle} className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <h3 className="text-sm font-bold font-mono text-emerald-400 flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-cyan-400" /> {phaseTitle}
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {phaseTasks.filter((t) => t.status === 'COMPLETED').length}/{phaseTasks.length} Completed
                </span>
              </div>

              <div className="space-y-2.5">
                {phaseTasks.map((task) => (
                  <Card
                    key={task.id}
                    className={`border transition-all ${
                      task.status === 'COMPLETED'
                        ? 'border-emerald-500/30 bg-emerald-950/10'
                        : task.status === 'IN_PROGRESS'
                        ? 'border-cyan-500/30 bg-cyan-950/10'
                        : 'border-slate-800 bg-slate-900/60'
                    }`}
                  >
                    <CardContent className="p-4 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleStatus(task)}
                          className="mt-0.5 p-1 rounded hover:bg-slate-800 transition-colors"
                          title="Click to toggle status"
                        >
                          {task.status === 'COMPLETED' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : task.status === 'IN_PROGRESS' ? (
                            <Clock className="w-5 h-5 text-cyan-400 animate-spin" />
                          ) : (
                            <div className="w-5 h-5 rounded border border-slate-600 hover:border-emerald-400" />
                          )}
                        </button>

                        <div className="space-y-1">
                          <h4
                            className={`text-xs font-mono font-semibold ${
                              task.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-100'
                            }`}
                          >
                            {task.title}
                          </h4>
                          <p className="text-xs text-slate-400 font-sans leading-relaxed">{task.description}</p>
                          <div className="flex items-center gap-3 pt-1 text-[10px] font-mono text-slate-500">
                            <span>Operator: {task.assignedToName}</span>
                            {task.evidenceCount > 0 && (
                              <span className="text-cyan-400 font-semibold">
                                {task.evidenceCount} Evidence Logs
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleStatus(task)}
                        className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase font-bold border transition-colors ${
                          task.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : task.status === 'IN_PROGRESS'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {task.status}
                      </button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Task Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Reconnaissance Task"
        description="Append a checklist step to the structured testing workflow."
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">METHODOLOGY PHASE</label>
            <select
              value={phaseName}
              onChange={(e) => setPhaseName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-xs font-mono text-slate-100"
            >
              <option value="Phase 1: Passive OSINT & DNS Enumeration">
                Phase 1: Passive OSINT & DNS Enumeration
              </option>
              <option value="Phase 2: Service & Attack Surface Mapping">
                Phase 2: Service & Attack Surface Mapping
              </option>
              <option value="Phase 3: Vulnerability & Misconfiguration Triage">
                Phase 3: Vulnerability & Misconfiguration Triage
              </option>
            </select>
          </div>

          <Input
            label="TASK TITLE"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Audit wildcard SSL certificates for expiration"
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">DESCRIPTION & GUIDELINES</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Testing instructions, command notes, or target requirements..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-700 rounded-md p-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting}>
              Add Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
