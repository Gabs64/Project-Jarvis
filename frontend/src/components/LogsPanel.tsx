import { useState, useEffect } from 'react';
import { Shield, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface ToolLogItem {
  id: number;
  timestamp: string;
  user_command?: string;
  tool: string;
  arguments?: any;
  result?: string;
  status: string;
  execution_time: number;
}

export const LogsPanel: React.FC = () => {
  const [logs, setLogs] = useState<ToolLogItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/logs?limit=50');
      const data = await res.json();
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="p-6 h-full overflow-y-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h2 className="hud-font font-bold text-lg text-cyan-200">
              AUDIT & SECURITY TOOL EXECUTION LOGS
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Immutable system logs tracking all AI tool calls, operating parameters, and latency.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="btn-jarvis text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          REFRESH LOGS
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
          No tool logs recorded yet. Execute any command to generate audit entries.
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-xl bg-[#090E17]/90 border border-slate-800 hover:border-cyan-500/40 text-xs mono-font space-y-2 transition-all"
            >
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 font-bold hud-font text-sm">{log.tool}</span>
                  <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-[11px]">{log.execution_time}s</span>
                  {log.status === 'SUCCESS' ? (
                    <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-semibold">
                      <CheckCircle className="w-3.5 h-3.5" /> SUCCESS
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-400 text-[11px] font-semibold">
                      <XCircle className="w-3.5 h-3.5" /> {log.status}
                    </span>
                  )}
                </div>
              </div>

              {log.user_command && (
                <div className="text-slate-300">
                  <span className="text-slate-500">Trigger: </span>
                  &ldquo;{log.user_command}&rdquo;
                </div>
              )}

              {log.arguments && Object.keys(log.arguments).length > 0 && (
                <div className="text-slate-400">
                  <span className="text-slate-500">Args: </span>
                  <span className="text-cyan-300">{JSON.stringify(log.arguments)}</span>
                </div>
              )}

              {log.result && (
                <div className="p-2 rounded bg-black/50 border border-slate-800/80 text-slate-300 text-[11px] max-h-24 overflow-y-auto">
                  {log.result}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
