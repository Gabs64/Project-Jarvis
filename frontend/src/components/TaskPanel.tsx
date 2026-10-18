import React, { useState, useEffect } from 'react';
import { Calendar, CheckSquare, Plus, Clock, Trash2, Tag } from 'lucide-react';

interface ReminderItem {
  id: number;
  title: string;
  description?: string;
  scheduled_time: string;
  status: string;
}

interface TaskItem {
  id: number;
  title: string;
  priority: string;
  status: string;
}

export const TaskPanel: React.FC = () => {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  
  // Reminder form
  const [remTitle, setRemTitle] = useState('');
  const [remTime, setRemTime] = useState('19:00');
  
  // Task form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState('normal');

  const fetchData = async () => {
    try {
      const [remsRes, tasksRes] = await Promise.all([
        fetch('/api/reminders'),
        fetch('/api/tasks')
      ]);
      setReminders(await remsRes.json());
      setTasks(await tasksRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remTitle.trim()) return;
    try {
      await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: remTitle.trim(), time: remTime })
      });
      setRemTitle('');
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: taskTitle.trim(), priority: taskPriority })
      });
      setTaskTitle('');
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteReminder = async (id: number) => {
    try {
      await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-cyan-500/20">
        <h2 className="hud-font font-bold text-lg text-cyan-200">
          PRODUCTIVITY, REMINDERS & TASK MATRIX
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Automated schedule alerts and priority tracking managed by JARVIS.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reminders Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-purple-400 hud-font">
            <Calendar className="w-4 h-4" />
            <span>SCHEDULED REMINDERS ({reminders.length})</span>
          </div>

          {/* Create Reminder */}
          <form onSubmit={handleAddReminder} className="p-4 rounded-xl bg-slate-900/60 border border-purple-500/20 flex flex-col sm:flex-row gap-2 text-xs">
            <input
              type="text"
              value={remTitle}
              onChange={(e) => setRemTitle(e.target.value)}
              placeholder="Reminder description..."
              className="flex-1 bg-black/40 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-400"
            />
            <input
              type="text"
              value={remTime}
              onChange={(e) => setRemTime(e.target.value)}
              placeholder="Time (e.g. 7 PM)"
              className="w-full sm:w-28 bg-black/40 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-400"
            />
            <button type="submit" className="btn-jarvis justify-center">
              <Plus className="w-4 h-4" /> SET
            </button>
          </form>

          {/* List */}
          <div className="space-y-2">
            {reminders.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                No reminders pending. Tell JARVIS &ldquo;Remind me at 7 PM to submit assignment&rdquo;.
              </div>
            ) : (
              reminders.map((rem) => (
                <div key={rem.id} className="p-3.5 rounded-xl bg-[#0E1522] border border-slate-800 hover:border-purple-500/40 flex items-center justify-between text-xs transition-all">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <div>
                      <h4 className="font-semibold text-slate-200">{rem.title}</h4>
                      <span className="text-[11px] mono-font text-purple-300">{rem.scheduled_time}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteReminder(rem.id)}
                    className="text-slate-600 hover:text-rose-400 p-1"
                    title="Dismiss reminder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tasks Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-400 hud-font">
            <CheckSquare className="w-4 h-4" />
            <span>DIRECTIVE TASKS ({tasks.length})</span>
          </div>

          {/* Create Task */}
          <form onSubmit={handleAddTask} className="p-4 rounded-xl bg-slate-900/60 border border-emerald-500/20 flex flex-col sm:flex-row gap-2 text-xs">
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="New objective..."
              className="flex-1 bg-black/40 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-400"
            />
            <select
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value)}
              className="w-full sm:w-28 bg-black/40 border border-slate-700 rounded-lg px-2 py-2 text-slate-200 focus:outline-none focus:border-emerald-400"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <button type="submit" className="btn-jarvis justify-center">
              <Plus className="w-4 h-4" /> ADD
            </button>
          </form>

          {/* List */}
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                All objectives complete.
              </div>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="p-3.5 rounded-xl bg-[#0E1522] border border-slate-800 hover:border-emerald-500/40 flex items-center justify-between text-xs transition-all">
                  <div className="flex items-center gap-3">
                    <Tag className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h4 className="font-semibold text-slate-200">{task.title}</h4>
                      <span className="text-[10px] mono-font uppercase text-slate-400">STATUS: {task.status}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                    task.priority === 'urgent'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : task.priority === 'high'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
