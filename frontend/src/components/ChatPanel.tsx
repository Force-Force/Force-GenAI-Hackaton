import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Flame, Lightbulb, Grid, CheckCircle, Table, GitCommit, Play, Sparkles } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onApplyAction: (actionType: string, payload: any) => void;
  isGenerating: boolean;
}

export default function ChatPanel({
  messages,
  onSendMessage,
  onApplyAction,
  isGenerating
}: ChatPanelProps) {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to lowest point on message updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isGenerating) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handlePillClick = (prompt: string) => {
    if (isGenerating) return;
    onSendMessage(prompt);
  };

  return (
    <div className="w-[25%] h-full bg-[#1E293B] border-r border-[#475569] flex flex-col justify-between overflow-hidden relative shadow-lg">
      
      {/* Panel title / Header */}
      <div className="p-4 border-b border-[#475569]/60 flex items-center justify-between bg-slate-900/40 shrink-0">
        <div className="flex items-center space-x-2">
          <Bot size={18} className="text-[#4F46E5]" />
          <h3 className="text-sm font-sans font-semibold text-[#F8FAFC]">
            AuraAI Data Architect
          </h3>
        </div>
        <span className="bg-[#4F46E5]/15 text-[#4F46E5] text-[10px] font-mono border border-[#4F46E5]/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
          Active Assistant
        </span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 select-text">
        
        {messages.map((msg) => {
          const isAI = msg.sender === 'assistant';
          return (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[90%] ${
                isAI ? 'self-start mr-auto' : 'self-end ml-auto'
              }`}
              style={{ alignSelf: isAI ? 'flex-start' : 'flex-end' }}
            >
              {/* Message Header (Sender name) */}
              <div className={`flex items-center space-x-1.5 text-[10px] text-[#94A3B8] mb-1 font-mono uppercase tracking-wider ${
                isAI ? 'justify-start' : 'justify-end'
              }`}>
                {isAI ? (
                  <>
                    <Bot size={12} className="text-[#06B6D4]" />
                    <span>AuraAI Architect</span>
                  </>
                ) : (
                  <>
                    <span>You (Data Engineer)</span>
                    <User size={12} />
                  </>
                )}
                <span className="text-[9px] text-[#475569]">•</span>
                <span>{msg.timestamp}</span>
              </div>

              {/* Message Card bubble */}
              <div
                className={`p-3.5 rounded-xl text-xs leading-relaxed border shadow-md font-sans ${
                  isAI
                    ? 'bg-[#1E293B] border-[#475569]/60 text-[#CBD5E1]'
                    : 'bg-[#334155] border-[#475569]/90 text-[#F8FAFC]'
                }`}
              >
                {/* Parse lines with formatting manually or basic elements to avoid React markdown crash */}
                <div className="space-y-2 whitespace-pre-wrap">
                  {msg.text.split('\n').map((line, index) => {
                    if (line.startsWith('### ')) {
                      return <h4 key={index} className="text-sm font-semibold text-[#F8FAFC] font-sans mt-2">{line.replace('### ', '')}</h4>;
                    }
                    if (line.startsWith('• ')) {
                      return <div key={index} className="pl-2 text-[#CBD5E1] font-sans flex items-start space-x-1.5 mt-1">
                        <span className="text-[#06B6D4]">•</span>
                        <span>{line.replace('• ', '')}</span>
                      </div>;
                    }
                    if (line.includes('`')) {
                      // replace text inside inline ticks or show simply
                      return <p key={index} className="font-sans leading-relaxed text-[#CBD5E1]">{line}</p>;
                    }
                    return <p key={index} className="font-sans leading-relaxed text-[#CBD5E1]">{line}</p>;
                  })}
                </div>

                {/* AI Structured recommended action triggers */}
                {isAI && msg.actionRequired && (
                  <div className="mt-4 bg-[#0F172A]/80 border border-[#06B6D4]/40 rounded-lg p-3 select-none">
                    <div className="flex items-center space-x-2 text-[11px] font-mono font-bold text-[#06B6D4] mb-2 uppercase tracking-wide">
                      <Sparkles size={12} className="animate-pulse" />
                      <span>Recommended Architecture Action</span>
                    </div>

                    <div className="space-y-1 text-[11px] text-[#CBD5E1] font-sans bg-slate-900/50 p-2 rounded border border-[#475569]/20">
                      {msg.actionRequired.type === 'create_table' && (
                        <>
                          <div className="text-[#F8FAFC] font-bold font-mono">
                            Add Table: {msg.actionRequired.payload.name} ({msg.actionRequired.payload.type.toUpperCase()})
                          </div>
                          <div className="text-[10.5px] leading-relaxed text-[#94A3B8] mt-1">
                            Columns: {msg.actionRequired.payload.columns.map((c: any) => c.name).join(', ')}
                          </div>
                        </>
                      )}
                      {msg.actionRequired.type === 'suggest_pipeline' && (
                        <>
                          <div className="text-[#F8FAFC] font-bold font-mono text-[10.5px]">
                            Implement Pipeline: {msg.actionRequired.payload.pipelineName}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 leading-snug mt-1 max-h-12 overflow-hidden truncate">
                            {msg.actionRequired.payload.sql}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Capsule-styled Pill buttons for action compliance */}
                    <div className="mt-3 flex items-center space-x-2">
                      <button
                        onClick={() => onApplyAction(msg.actionRequired!.type, msg.actionRequired!.payload)}
                        className="flex-1 bg-[#4F46E5] hover:bg-[#4F46E5]/90 text-white font-semibold text-[10.5px] py-1.5 px-3 rounded-full cursor-pointer transition-colors text-center"
                      >
                        Apply Schema
                      </button>
                      <button
                        onClick={() => onApplyAction('explain', msg.actionRequired!.payload)}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-[#CBD5E1] font-semibold text-[10.5px] py-1.5 px-3 rounded-full cursor-pointer transition-colors text-center border border-[#475569]"
                      >
                        Explain Reason
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Gemini AI response skeleton loading states - SPINNERS ARE STRICT DEPRECATED */}
        {isGenerating && (
          <div className="flex flex-col max-w-[85%] self-start space-y-2 mr-auto animate-pulse">
            <div className="flex items-center space-x-1.5 text-[10px] text-[#94A3B8] font-mono uppercase tracking-wider">
              <Bot size={12} className="text-[#06B6D4] animate-spin" />
              <span>AuraAI thinking...</span>
            </div>
            
            {/* Skeleton Layout Box */}
            <div className="bg-[#1E293B] border border-[#475569]/40 p-4 rounded-xl space-y-2.5 w-72">
              <div className="h-3.5 bg-[#475569]/60 rounded-full w-2/3" />
              <div className="h-2.5 bg-[#475569]/40 rounded-full w-11/12" />
              <div className="h-2.5 bg-[#475569]/40 rounded-full w-4/5" />
              <div className="h-2.5 bg-[#475569]/40 rounded-full w-5/6 animate-pulse" />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Shortcuts area */}
      <div className="p-3 bg-slate-900/30 border-t border-[#475569]/40 space-y-2 shrink-0">
        <div className="text-[10px] font-mono tracking-wider text-[#94A3B8] uppercase px-1">
          Suggestions shortcuts
        </div>
        
        {/* Pills Carousel */}
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto select-none pr-1">
          <button
            onClick={() => handlePillClick("Add promotion dimension table")}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-[#06B6D4] px-2.5 py-1 rounded-full border border-[#475569]/30 font-medium transition-all cursor-pointer"
          >
            + DimPromotion Table
          </button>
          
          <button
            onClick={() => handlePillClick("Add currency exchange rate dimension table")}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-[#06B6D4] px-2.5 py-1 rounded-full border border-[#475569]/30 font-medium transition-all cursor-pointer"
          >
            + DimCurrency Lookup
          </button>

          <button
            onClick={() => handlePillClick("Auto layouts dimensions and facts on design canvas")}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-[#CBD5E1] px-2.5 py-1 rounded-full border border-[#475569]/30 font-medium transition-all cursor-pointer"
          >
            <Grid size={10} className="inline mr-1" /> Auto Layout Nodes
          </button>

          <button
            onClick={() => handlePillClick("Explain how FactSales maps database transactional orders")}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-[#CBD5E1] px-2.5 py-1 rounded-full border border-[#475569]/30 font-medium transition-all cursor-pointer"
          >
            Explain FactSales Source
          </button>
        </div>

        {/* Input Text Form */}
        <form onSubmit={handleSubmit} className="flex items-center mt-2.5 relative">
          <input
            id="chat-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isGenerating}
            placeholder={isGenerating ? "AuraAI is writing..." : "Instruct AuraAI to refactor or design schemas..."}
            className="text-xs bg-[#0F172A] text-[#F8FAFC] border border-[#475569] w-full rounded-lg pl-3.5 pr-10 py-2.5 focus:outline-none focus:border-[#4F46E5] placeholder-[#94A3B8] transition-colors disabled:opacity-50 font-sans"
          />
          <button
            id="chat-submit"
            type="submit"
            disabled={!inputText.trim() || isGenerating}
            className="absolute right-1.5 top-1.5 p-1.5 text-white disabled:text-slate-400 bg-[#4F46E5] hover:bg-[#4F46E5]/90 disabled:bg-[#334155] rounded-md transition-all cursor-pointer flex items-center justify-center h-7 w-7"
            title="Send query"
          >
            <Send size={12} />
          </button>
        </form>
      </div>

    </div>
  );
}
