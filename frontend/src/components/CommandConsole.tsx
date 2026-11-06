import React, { useState, useRef, useEffect } from 'react';
import { Terminal, RefreshCw, Trash2, ChevronRight, ChevronDown, CheckCircle2, AlertTriangle, Cpu, Command, ArrowRight } from 'lucide-react';

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
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const CommandConsole: React.FC<CommandConsoleProps> = ({
  logs,
  onClear,
  onRefresh,
  isRefreshing = false,
}) => {
  const [filter, setFilter] = useState<'all' | 'cmds' | 'system'>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever new logs arrive if autoScroll is enabled
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === 'cmds') return log.category === 'cmd';
    if (filter === 'system') return log.category === 'brain' || log.category === 'event' || log.category === 'input';
    return true;
  });

  const getStatusBadge = (status?: string, duration?: string) => {
    if (status === 'SUCCESS') {
      return (
        <span className="console-badge console-badge-ok" title="Executed successfully">
          <CheckCircle2 className="w-2.5 h-2.5 inline mr-0.5" />
          {duration ? `${duration}` : 'OK'}
        </span>
      );
    }
    if (status === 'ERROR') {
      return (
        <span className="console-badge console-badge-err" title="Execution error">
          <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" />
          ERR
        </span>
      );
    }
    if (status === 'PENDING') {
      return (
        <span className="console-badge console-badge-pending" title="Running">
          RUNNING
        </span>
      );
    }
    return null;
  };

  const getCategoryIcon = (category: ConsoleLogEntry['category']) => {
    switch (category) {
      case 'cmd':
        return <Command className="w-3 h-3 text-cyan-400 shrink-0" />;
      case 'brain':
        return <Cpu className="w-3 h-3 text-cyan-300 shrink-0" />;
      case 'input':
        return <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />;
      case 'error':
        return <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />;
      default:
        return <Terminal className="w-3 h-3 text-cyan-500/70 shrink-0" />;
    }
  };

  return (
    <div className="panel console-panel">
      {/* Console Header Bar */}
      <div className="console-header">
        <div className="console-title">
          <div className="console-live-dot" />
          <h3>OPERATIONS & COMMAND LOGS</h3>
          <span className="console-count">{filteredLogs.length}</span>
        </div>

        <div className="console-actions">
          <div className="console-filter-group">
            <button
              type="button"
              className={`console-filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              ALL
            </button>
            <button
              type="button"
              className={`console-filter-btn ${filter === 'cmds' ? 'active' : ''}`}
              onClick={() => setFilter('cmds')}
            >
              CMDS
            </button>
            <button
              type="button"
              className={`console-filter-btn ${filter === 'system' ? 'active' : ''}`}
              onClick={() => setFilter('system')}
            >
              SYS
            </button>
          </div>

          <button
            type="button"
            className="console-icon-btn"
            onClick={onRefresh}
            title="Refresh logs from database"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            type="button"
            className="console-icon-btn"
            onClick={onClear}
            title="Clear console view"
          >
            <Trash2 className="w-3 h-3 hover:text-amber-400" />
          </button>
        </div>
      </div>

      {/* Console Log Feed */}
      <div
        ref={scrollRef}
        className="console-body"
        onScroll={(e) => {
          const el = e.currentTarget;
          const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
          setAutoScroll(isAtBottom);
        }}
      >
        {filteredLogs.length === 0 ? (
          <div className="console-empty">
            <Terminal className="w-5 h-5 text-cyan-500/30 mx-auto mb-1.5" />
            <div>Awaiting system command execution...</div>
            <span className="text-[10px] text-slate-600">Commands and tool telemetry will stream here in real-time.</span>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedIds.has(log.id);
            const hasPayload = (log.args && Object.keys(log.args).length > 0) || Boolean(log.result);

            return (
              <div
                key={log.id}
                className={`console-entry console-entry-${log.category} ${hasPayload ? 'has-payload' : ''}`}
                onClick={() => hasPayload && toggleExpand(log.id)}
              >
                <div className="console-entry-row">
                  <div className="console-entry-meta">
                    <span className="console-time">{log.timestamp}</span>
                    {getCategoryIcon(log.category)}
                  </div>

                  <div className="console-entry-main">
                    <div className="console-entry-title">
                      <span className="console-tag">[{log.category.toUpperCase()}]</span>
                      <span className="console-title-text">{log.title}</span>
                    </div>

                    {log.details && (
                      <div className="console-details">
                        {log.details}
                      </div>
                    )}
                  </div>

                  <div className="console-entry-side">
                    {getStatusBadge(log.status, log.duration)}
                    {hasPayload && (
                      <button
                        type="button"
                        className="console-expand-toggle"
                        aria-label="Toggle details"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(log.id);
                        }}
                      >
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsible Arguments & Output Results */}
                {isExpanded && hasPayload && (
                  <div className="console-payload" onClick={(e) => e.stopPropagation()}>
                    {log.args && Object.keys(log.args).length > 0 && (
                      <div className="console-payload-section">
                        <span className="console-payload-label">ARGUMENTS:</span>
                        <pre className="console-json">{JSON.stringify(log.args, null, 2)}</pre>
                      </div>
                    )}

                    {log.result !== undefined && log.result !== null && (
                      <div className="console-payload-section">
                        <span className="console-payload-label">OUTPUT:</span>
                        <pre className="console-json">
                          {typeof log.result === 'object'
                            ? JSON.stringify(log.result, null, 2)
                            : String(log.result)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Console Footer Status */}
      <div className="console-footer">
        <div className="console-footer-left">
          <span className="console-footer-dot" />
          <span>AUTONOMOUS KERNEL MONITOR</span>
        </div>
        {!autoScroll && (
          <button
            type="button"
            className="console-scroll-btn"
            onClick={() => {
              setAutoScroll(true);
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
            }}
          >
            SCROLL TO BOTTOM ↓
          </button>
        )}
      </div>
    </div>
  );
};
