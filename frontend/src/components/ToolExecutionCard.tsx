import React from 'react';
import { Terminal, CheckCircle2, AlertTriangle, XCircle, Clock, ExternalLink } from 'lucide-react';

interface ToolExecutionCardProps {
  tool: string;
  arguments?: Record<string, any>;
  result?: any;
  riskLevel?: string;
  requiresConfirmation?: boolean;
}

export const ToolExecutionCard: React.FC<ToolExecutionCardProps> = ({
  tool,
  arguments: args,
  result,
  riskLevel = 'LOW',
  requiresConfirmation = false
}) => {
  const isSuccess = result?.success !== false;
  const executionTime = result?.execution_time_seconds ?? 0.05;
  const screenshotUrl = result?.result?.url;

  const getRiskBadge = (risk: string) => {
    switch (risk.toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'MEDIUM':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'LOW':
      default:
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    }
  };

  return (
    <div className="my-2 p-3 rounded-lg bg-[#0F1722]/90 border border-cyan-500/30 text-xs mono-font shadow-lg">
      <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20 mb-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold text-cyan-300 hud-font tracking-wide">
            TOOL: {tool}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getRiskBadge(riskLevel)}`}>
            {riskLevel} RISK
          </span>
        </div>

        <div className="flex items-center gap-2">
          {requiresConfirmation ? (
            <span className="flex items-center gap-1 text-amber-400 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              CONFIRMATION REQUIRED
            </span>
          ) : isSuccess ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              SUCCESS
            </span>
          ) : (
            <span className="flex items-center gap-1 text-rose-400">
              <XCircle className="w-3.5 h-3.5" />
              FAILED
            </span>
          )}
          <span className="text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {executionTime}s
          </span>
        </div>
      </div>

      {/* Arguments preview */}
      {args && Object.keys(args).length > 0 && (
        <div className="text-slate-400 mb-2">
          <span className="text-slate-500">args: </span>
          <span className="text-slate-300">{JSON.stringify(args)}</span>
        </div>
      )}

      {/* Result preview */}
      {result?.result && (
        <div className="p-2 rounded bg-black/40 border border-slate-800 text-slate-300 max-h-36 overflow-y-auto">
          {typeof result.result === 'string' ? (
            <p>{result.result}</p>
          ) : (
            <pre className="text-[11px] whitespace-pre-wrap">
              {JSON.stringify(result.result, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Screenshot display if present */}
      {screenshotUrl && (
        <div className="mt-2 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between text-[11px] text-cyan-400 mb-1">
            <span>Captured Screenshot:</span>
            <a 
              href={screenshotUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center gap-1 hover:underline text-cyan-300"
            >
              Open Full <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <img 
            src={screenshotUrl} 
            alt="Desktop Screenshot" 
            className="w-full max-h-48 object-cover rounded border border-cyan-500/30"
          />
        </div>
      )}
    </div>
  );
};
