import React from 'react';
import { ShieldAlert, AlertTriangle, X, Check } from 'lucide-react';

interface PermissionDialogProps {
  isOpen: boolean;
  tool: string;
  arguments?: Record<string, any>;
  promptText: string;
  riskLevel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PermissionDialog: React.FC<PermissionDialogProps> = ({
  isOpen,
  tool,
  arguments: args,
  promptText,
  riskLevel = 'HIGH',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0D1520] border-2 border-rose-500/60 rounded-xl p-6 shadow-[0_0_40px_rgba(255,107,107,0.3)]">
        {/* Top header warning */}
        <div className="flex items-center gap-3 text-rose-400 mb-4 pb-3 border-b border-rose-500/30">
          <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/40 animate-pulse">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="hud-font font-bold text-base tracking-wide text-rose-200">
              JARVIS SECURITY INTERCEPT
            </h2>
            <p className="text-xs text-rose-400/80 mono-font">
              {riskLevel} RISK ACTION CONFIRMATION REQUIRED
            </p>
          </div>
        </div>

        {/* Prompt description */}
        <div className="mb-4">
          <p className="text-sm text-slate-200 leading-relaxed font-medium">
            {promptText}
          </p>

          <div className="mt-3 p-3 rounded-lg bg-black/50 border border-slate-800 text-xs mono-font">
            <div className="text-slate-400 mb-1">
              <span className="text-slate-500">Operation: </span>
              <span className="text-cyan-300 font-bold">{tool}</span>
            </div>
            {args && Object.keys(args).length > 0 && (
              <div className="text-slate-400">
                <span className="text-slate-500">Parameters: </span>
                <span className="text-slate-300">{JSON.stringify(args)}</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-[11px] text-slate-400 italic mb-5 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          You can confirm by saying &ldquo;Yes&rdquo; or clicking the authorization button.
        </p>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold hud-font flex items-center gap-1.5 transition-all"
          >
            <X className="w-4 h-4" />
            CANCEL ACTION
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold hud-font flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,107,107,0.5)] transition-all hover:scale-105"
          >
            <Check className="w-4 h-4" />
            AUTHORIZE & EXECUTE
          </button>
        </div>
      </div>
    </div>
  );
};
