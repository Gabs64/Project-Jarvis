import { useState, useEffect } from 'react';
import { Brain, Search, Trash2, Plus } from 'lucide-react';

interface MemoryItem {
  id: number;
  key: string;
  value: string;
  category: string;
  created_at: string;
}

export const MemoryPanel: React.FC = () => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState('user_preference');
  const [loading, setLoading] = useState(false);

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const url = search ? `/api/memory?q=${encodeURIComponent(search)}` : '/api/memory';
      const res = await fetch(url);
      const data = await res.json();
      setMemories(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, [search]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;

    try {
      await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: newKey.trim(), value: newValue.trim(), category: newCategory })
      });
      setNewKey('');
      setNewValue('');
      fetchMemories();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await fetch(`/api/memory/${encodeURIComponent(key)}`, { method: 'DELETE' });
      fetchMemories();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-cyan-400" />
            <h2 className="hud-font font-bold text-lg text-cyan-200">
              JARVIS LONG-TERM MEMORY REPOSITORY
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Permanent user preferences, project directories, routines, and contextual facts.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recalled memories..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900/80 border border-cyan-500/30 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Add Memory Form */}
      <form onSubmit={handleAdd} className="p-4 rounded-xl bg-slate-900/60 border border-cyan-500/20 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="Memory Key (e.g. primary_project)"
          className="bg-black/40 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-400"
        />
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Value (e.g. StartUpSphere Capstone)"
          className="bg-black/40 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-400"
        />
        <select
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="bg-black/40 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-400"
        >
          <option value="user_preference">User Preference</option>
          <option value="project">Project</option>
          <option value="routine">Routine</option>
          <option value="important_person">Important Person</option>
          <option value="general">General Fact</option>
        </select>
        <button
          type="submit"
          className="btn-jarvis justify-center"
        >
          <Plus className="w-4 h-4" />
          RECORD MEMORY
        </button>
      </form>

      {/* Memories Grid */}
      {loading ? (
        <div className="text-center py-10 text-slate-500 text-xs">Scanning memory neural store...</div>
      ) : memories.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
          No persistent memories recorded yet. Tell JARVIS &ldquo;Remember that my main project is StartUpSphere&rdquo; or add one above.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {memories.map((mem) => (
            <div
              key={mem.id}
              className="p-4 rounded-xl bg-[#0C131D]/90 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between group shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded">
                    {mem.category}
                  </span>
                  <button
                    onClick={() => handleDelete(mem.key)}
                    className="text-slate-600 hover:text-rose-400 transition-colors p-1"
                    title="Forget memory"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h4 className="font-bold text-sm text-slate-200 mono-font mb-1">
                  {mem.key}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {mem.value}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 mono-font">
                Recorded: {mem.created_at ? new Date(mem.created_at).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
