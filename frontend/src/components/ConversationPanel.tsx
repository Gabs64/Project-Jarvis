import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, VolumeX, Volume2, Mic, Sparkles } from 'lucide-react';
import { ToolExecutionCard } from './ToolExecutionCard';
import type { AssistantState } from '../hooks/useVoiceEngine';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{
    tool: string;
    arguments?: any;
    result?: any;
    requires_confirmation?: boolean;
    risk_level?: string;
  }>;
  timestamp: string;
}

interface ConversationPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
  isMicActive: boolean;
  onToggleMic: () => void;
  onSpeakText?: (text: string) => void;
  assistantState?: AssistantState;
}

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  messages,
  onSendMessage,
  isSpeaking,
  onStopSpeaking,
  isMicActive,
  onToggleMic,
  onSpeakText,
  assistantState
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, assistantState]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="flex flex-col h-full bg-[#080D14]/85 border-t lg:border-t-0 lg:border-l border-cyan-500/20 backdrop-blur-md relative overflow-hidden">
      {/* Dynamic top ambient light bar based on state */}
      <div 
        className={`h-0.5 w-full transition-all duration-500 ${
          assistantState === 'THINKING' 
            ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 animate-pulse shadow-[0_0_12px_#C084FC]' 
            : assistantState === 'SPEAKING'
            ? 'bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 animate-pulse shadow-[0_0_12px_#62D6A7]'
            : 'bg-gradient-to-r from-cyan-500/30 via-cyan-400/60 to-cyan-500/30'
        }`}
      />

      {/* Header */}
      <div className="p-3.5 border-b border-cyan-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-cyan-400" />
          <span className="hud-font font-bold text-xs text-cyan-300 tracking-wider">
            COMMUNICATION LOG
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-400">
            {messages.length} ENTRIES
          </span>
        </div>

        {isSpeaking && (
          <button
            onClick={onStopSpeaking}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold hover:bg-rose-500/30 transition-colors animate-pulse"
          >
            <VolumeX className="w-3.5 h-3.5" />
            <span>INTERRUPT</span>
          </button>
        )}
      </div>

      {/* Message Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <div className="relative mb-3">
              <div className="absolute inset-0 rounded-full bg-cyan-400/20 filter blur-lg animate-pulse" />
              <Bot className="relative w-10 h-10 text-cyan-400/60" />
            </div>
            <p className="hud-font font-semibold text-slate-400 text-sm">
              SYSTEM STANDBY
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Say &ldquo;Jarvis&rdquo; or type a command to initialize audio synthesis and local Ollama reasoning.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* Speaker Indicator */}
              <div className="flex items-center gap-1.5 mb-1 px-1">
                {msg.role === 'user' ? (
                  <>
                    <span className="text-[10px] text-slate-400 mono-font">{msg.timestamp}</span>
                    <span className="text-xs font-bold text-slate-300 hud-font">OPERATOR</span>
                    <User className="w-3.5 h-3.5 text-slate-400" />
                  </>
                ) : (
                  <>
                    <Bot className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-bold text-cyan-300 hud-font">JARVIS</span>
                    <span className="text-[10px] text-slate-500 mono-font">{msg.timestamp}</span>
                    {onSpeakText && (
                      <button
                        onClick={() => onSpeakText(msg.content)}
                        className="p-1 text-slate-500 hover:text-cyan-300 transition-colors"
                        title="Vocalize this message"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[90%] sm:max-w-[85%] rounded-xl p-3.5 text-sm leading-relaxed transition-all ${
                  msg.role === 'user'
                    ? 'bg-cyan-950/40 border border-cyan-500/40 text-cyan-100 rounded-tr-none shadow-[0_0_15px_rgba(92,200,255,0.08)]'
                    : 'bg-[#0E1724]/90 border border-slate-700/60 text-slate-200 rounded-tl-none shadow-md'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {/* Render any associated Tool Execution Cards */}
                {msg.toolCalls && msg.toolCalls.map((tc, idx) => (
                  <ToolExecutionCard
                    key={idx}
                    tool={tc.tool}
                    arguments={tc.arguments}
                    result={tc.result}
                    requiresConfirmation={tc.requires_confirmation}
                    riskLevel={tc.risk_level || 'LOW'}
                  />
                ))}
              </div>
            </div>
          ))
        )}

        {/* Live Holographic Thinking Bubble */}
        {assistantState === 'THINKING' && (
          <div className="flex flex-col items-start animate-fade-in">
            <div className="flex items-center gap-1.5 mb-1 px-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" />
              <span className="text-xs font-bold text-purple-300 hud-font">SYNTHESIZING...</span>
            </div>
            <div className="rounded-xl p-3.5 text-sm bg-purple-950/30 border border-purple-500/50 text-purple-200 rounded-tl-none shadow-[0_0_20px_rgba(192,132,252,0.15)] flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs mono-font text-purple-200 tracking-wider">
                Ollama neural reasoning in progress...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar (Hybrid Mode: Voice + Text) */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-cyan-500/20 bg-[#060A0F]/90 flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleMic}
          className={`p-2.5 rounded-lg border transition-all ${
            isMicActive
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 animate-pulse'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
          title={isMicActive ? "Disable Microphone" : "Enable Microphone"}
        >
          <Mic className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Command JARVIS or ask a query..."
          className="flex-1 bg-slate-900/80 border border-cyan-500/30 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
        />

        <button
          type="submit"
          className="btn-jarvis p-2.5 rounded-lg"
          title="Send Command"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
