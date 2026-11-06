import React, { useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Trash2, Copy, Check } from 'lucide-react';

export interface ConsoleLogEntry {
  id: string;
  timestamp: string;
  category: 'cmd' | 'input' | 'brain' | 'event' | 'error';
  title: string;
  details?: string;
  args?: Record<string, any>;
  result?: any;
  status?: 'SUCCESS' | 'ERROR' | 'INFO' | 'PENDING';
  duration?: string;
}

interface CommandConsoleProps {
  logs: ConsoleLogEntry[];
  onClear: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const CommandConsole: React.FC<CommandConsoleProps> = ({
  logs,
  onClear,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  // Auto-scroll to bottom whenever new terminal output arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCopy = () => {
    if (!scrollRef.current) return;
    const text = scrollRef.current.innerText;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Helper to format arguments as clean CLI flags: --param="value"
  const formatCliArgs = (args?: Record<string, any>): string => {
    if (!args || Object.keys(args).length === 0) return '';
    return Object.entries(args)
      .map(([k, v]) => {
        const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
        return `--${k}=${valStr.length > 40 ? valStr.slice(0, 40) + '…' : valStr}`;
      })
      .join(' ');
  };

  // Helper to format result output
  const formatResultOutput = (result?: any, details?: string): string => {
    if (result === undefined || result === null) return details || 'execution finished';
    if (typeof result === 'string') {
      try {
        const parsed = JSON.parse(result);
        if (parsed.message) return parsed.message;
        if (parsed.result) return typeof parsed.result === 'string' ? parsed.result : JSON.stringify(parsed.result);
        return result;
      } catch {
        return result;
      }
    }
    if (typeof result === 'object') {
      if (result.message) return result.message;
      if (result.error) return `Error: ${result.error}`;
      if (result.summary) return result.summary;
      return JSON.stringify(result);
    }
    return String(result);
  };

  return (
    <div className="terminal-window">
      {/* Terminal Title Bar */}
      <div className="terminal-titlebar">
        <div className="terminal-traffic-lights">
          <span className="terminal-dot dot-red" />
          <span className="terminal-dot dot-yellow" />
          <span className="terminal-dot dot-green" />
        </div>

        <div className="terminal-title">
          <TerminalIcon className="w-3 h-3 text-cyan-400" />
          <span>jarvis@neural-core: ~/ops (tty1)</span>
        </div>

        <div className="terminal-actions">
          <button
            type="button"
            className="terminal-action-btn"
            onClick={handleCopy}
            title="Copy terminal contents"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
          <button
            type="button"
            className="terminal-action-btn"
            onClick={onClear}
            title="Clear terminal"
          >
            <Trash2 className="w-3 h-3 hover:text-amber-400" />
          </button>
        </div>
      </div>

      {/* Terminal Screen Body */}
      <div ref={scrollRef} className="terminal-screen">
        <div className="terminal-motd">
          <span className="term-cyan">JARVIS Core OS v2.0</span> — Autonomous Command Execution Engine
          <br />
          <span className="term-dim">Kernel initialized on port 8000. Type or speak commands to execute.</span>
        </div>

        {logs.map((log) => {
          if (log.category === 'cmd') {
            const toolName = log.title.replace(/^EXEC:\s*/i, '');
            const cliArgs = formatCliArgs(log.args);
            const resultMsg = formatResultOutput(log.result, log.details);
            const isOk = log.status !== 'ERROR';

            return (
              <div key={log.id} className="terminal-block">
                <div className="terminal-line">
                  <span className="term-time">{log.timestamp}</span>
                  <span className="term-prompt">jarvis@core:~$</span>
                  <span className="term-cmd">exec {toolName}</span>
                  {cliArgs && <span className="term-args">{cliArgs}</span>}
                </div>
                <div className="terminal-subline">
                  <span className="term-indent">↳</span>
                  <span className={isOk ? 'term-ok' : 'term-err'}>
                    [{log.status || (isOk ? 'OK' : 'ERR')}]
                  </span>
                  <span className="term-output">{resultMsg}</span>
                  {log.duration && <span className="term-dur">({log.duration})</span>}
                </div>
              </div>
            );
          }

          if (log.category === 'input') {
            const cleanCmd = log.details ? log.details.replace(/^›\s*"?|"?$/g, '') : log.title;
            return (
              <div key={log.id} className="terminal-line">
                <span className="term-time">{log.timestamp}</span>
                <span className="term-user-prompt">user@jarvis:~$</span>
                <span className="term-user-cmd">{cleanCmd}</span>
              </div>
            );
          }

          if (log.category === 'brain') {
            return (
              <div key={log.id} className="terminal-line term-system-line">
                <span className="term-time">{log.timestamp}</span>
                <span className="term-sys-prefix">[brain::reason]</span>
                <span className="term-sys-text">{log.details || log.title}</span>
              </div>
            );
          }

          if (log.category === 'error') {
            return (
              <div key={log.id} className="terminal-line term-error-line">
                <span className="term-time">{log.timestamp}</span>
                <span className="term-err-prefix">[kernel::error]</span>
                <span className="term-err-text">{log.details || log.title}</span>
              </div>
            );
          }

          // General event / Voice / Telemetry
          return (
            <div key={log.id} className="terminal-line term-event-line">
              <span className="term-time">{log.timestamp}</span>
              <span className="term-event-prefix">[sys::telemetry]</span>
              <span className="term-event-text">{log.details || log.title}</span>
            </div>
          );
        })}

        {/* Live Active Terminal Prompt with Blinking Cursor */}
        <div className="terminal-active-line">
          <span className="term-prompt">jarvis@core:~$</span>
          <span className="terminal-cursor">▋</span>
        </div>
      </div>
    </div>
  );
};
