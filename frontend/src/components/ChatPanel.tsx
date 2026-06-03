import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Flame, Lightbulb, Grid, CheckCircle, Table, GitCommit, Play, Sparkles, ChevronLeft } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onApplyAction: (actionType: string, payload: any) => void;
  isGenerating: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function ChatPanel({
  messages,
  onSendMessage,
  onApplyAction,
  isGenerating,
  isCollapsed,
  onToggleCollapse
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
    <div className={`h-full bg-white border-r border-slate-200 flex flex-col justify-between overflow-hidden relative shadow-lg transition-all duration-300 ease-in-out ${
      isCollapsed ? 'w-0 border-r-0 pointer-events-none opacity-0' : 'w-[25%] min-w-[285px]'
    }`}>
      
      {/* Panel title / Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
        <div className="flex items-center space-x-2">
          <Bot size={18} className="text-[#4F46E5]" />
          <h3 className="text-sm font-sans font-semibold text-slate-800">
            AuraAI Architect
          </h3>
        </div>
        <div className="flex items-center space-x-1.5 shrink-0">
          <span className="bg-[#4F46E5]/10 text-[#4F46E5] text-[10px] font-mono border border-[#4F46E5]/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Active
          </span>
          <button
            onClick={onToggleCollapse}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded transition-colors cursor-pointer"
            title="Collapse AuraAI"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
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
              <div className={`flex items-center space-x-1.5 text-[10px] text-slate-400 mb-1 font-mono uppercase tracking-wider ${
                isAI ? 'justify-start' : 'justify-end'
              }`}>
                {isAI ? (
                  <>
                    <Bot size={12} className="text-indigo-600" />
                    <span>AuraAI Architect</span>
                  </>
                ) : (
                  <>
                    <span>You (Data Engineer)</span>
                    <User size={12} />
                  </>
                )}
                <span className="text-[9px] text-slate-300">•</span>
                <span>{msg.timestamp}</span>
              </div>

              {/* Message Card bubble */}
              <div
                className={`p-3.5 rounded-xl text-xs leading-relaxed border shadow-sm font-sans ${
                  isAI
                    ? 'bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-indigo-600 border-indigo-700 text-white shadow-indigo-100'
                }`}
              >
                {/* Parse lines with formatting manually or basic elements to avoid React markdown crash */}
                <div className="space-y-2 whitespace-pre-wrap">
                  {msg.text.split('\n').map((line, index) => {
                    if (line.startsWith('### ')) {
                      return <h4 key={index} className={`text-sm font-semibold font-sans mt-2 ${isAI ? 'text-slate-900' : 'text-white'}`}>{line.replace('### ', '')}</h4>;
                    }
                    if (line.startsWith('• ')) {
                      return <div key={index} className={`pl-2 font-sans flex items-start space-x-1.5 mt-1 ${isAI ? 'text-slate-700' : 'text-indigo-100'}`}>
                        <span className="text-indigo-500">•</span>
                        <span>{line.replace('• ', '')}</span>
                      </div>;
                    }
                    if (line.includes('`')) {
                      return <p key={index} className={`font-sans leading-relaxed ${isAI ? 'text-slate-700' : 'text-indigo-50'}`}>{line}</p>;
                    }
                    return <p key={index} className={`font-sans leading-relaxed ${isAI ? 'text-slate-700' : 'text-indigo-50'}`}>{line}</p>;
                  })}
                </div>

                {/* AI Structured recommended action triggers */}
                {isAI && msg.actionRequired && (
                  <div className="mt-4 bg-white border border-slate-200 rounded-lg p-3 select-none shadow-sm animate-fadeIn">
                    <div className="flex items-center space-x-2 text-[11px] font-mono font-bold text-indigo-600 mb-2 uppercase tracking-wide">
                      <Sparkles size={12} className="animate-pulse" />
                      <span>Recommended Architecture Action</span>
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-700 font-sans bg-slate-50 p-2 rounded border border-slate-100">
                      {msg.actionRequired.type === 'create_table' && (
                        <>
                          <div className="text-slate-900 font-bold font-mono">
                            Add Table: {msg.actionRequired.payload.name} ({msg.actionRequired.payload.type.toUpperCase()})
                          </div>
                          <div className="text-[10.5px] leading-relaxed text-slate-500 mt-1">
                            Columns: {msg.actionRequired.payload.columns.map((c: any) => c.name).join(', ')}
                          </div>
                        </>
                      )}
                      {msg.actionRequired.type === 'suggest_pipeline' && (
                        <>
                          <div className="text-slate-900 font-bold font-mono text-[10.5px]">
                            Implement Pipeline: {msg.actionRequired.payload.pipelineName}
                          </div>
                          <div className="text-[10px] font-mono text-slate-450 leading-snug mt-1 max-h-12 overflow-hidden truncate">
                            {msg.actionRequired.payload.sql}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Capsule-styled Pill buttons for action compliance */}
                    <div className="mt-3 flex items-center space-x-2">
                      <button
                        onClick={() => onApplyAction(msg.actionRequired!.type, msg.actionRequired!.payload)}
                        className="flex-1 bg-[#4F46E5] hover:bg-[#4F46E5]/90 text-white font-bold text-[10.5px] py-1.5 px-3 rounded-full cursor-pointer border-b-[3px] border-indigo-800 hover:border-b-[4px] hover:-translate-y-[1px] active:border-b-[1px] active:translate-y-[2px] transition-all duration-150 text-center shadow-xs"
                      >
                        Apply Schema
                      </button>
                      <button
                        onClick={() => onApplyAction('explain', msg.actionRequired!.payload)}
                        className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[10.5px] py-1.5 px-3 rounded-full cursor-pointer transition-all duration-150 border border-slate-200 border-b-[3px] border-slate-300 hover:border-b-[4px] hover:-translate-y-[1px] active:border-b-[1px] active:translate-y-[2px] text-center shadow-2xs"
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

        {/* Gemini AI response skeleton loading states */}
        {isGenerating && (
          <div className="flex flex-col max-w-[85%] self-start space-y-2 mr-auto animate-pulse">
            <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono uppercase tracking-wider">
              <Bot size={12} className="text-indigo-600 animate-spin" />
              <span>AuraAI thinking...</span>
            </div>
            
            {/* Skeleton Layout Box */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2.5 w-72 shadow-xs">
              <div className="h-3.5 bg-slate-200 rounded-full w-2/3" />
              <div className="h-2.5 bg-slate-200 rounded-full w-11/12" />
              <div className="h-2.5 bg-slate-200 rounded-full w-4/5" />
              <div className="h-2.5 bg-slate-200 rounded-full w-5/6 animate-pulse" />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Shortcuts area */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2 shrink-0">
        <div className="text-[10px] font-mono tracking-wider text-slate-400 uppercase px-1">
          Suggestions shortcuts
        </div>
        
        {/* Pills Carousel */}
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto select-none pr-1">
          <button
            onClick={() => handlePillClick("Add promotion dimension table")}
            className="text-[10px] bg-white hover:bg-slate-50 text-indigo-600 px-2.5 py-1 rounded-full border border-slate-200 border-b-[2.5px] border-slate-300 hover:border-b-[3.5px] hover:-translate-y-[1px] active:border-b-[1px] active:translate-y-[1.5px] font-bold transition-all duration-150 cursor-pointer shadow-2xs"
          >
            + DimPromotion Table
          </button>
          
          <button
            onClick={() => handlePillClick("Add currency exchange rate dimension table")}
            className="text-[10px] bg-white hover:bg-slate-50 text-indigo-600 px-2.5 py-1 rounded-full border border-slate-200 border-b-[2.5px] border-slate-300 hover:border-b-[3.5px] hover:-translate-y-[1px] active:border-b-[1px] active:translate-y-[1.5px] font-bold transition-all duration-150 cursor-pointer shadow-2xs"
          >
            + DimCurrency Lookup
          </button>

          <button
            onClick={() => handlePillClick("Auto layouts dimensions and facts on design canvas")}
            className="text-[10px] bg-white hover:bg-slate-50 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200 border-b-[2.5px] border-slate-300 hover:border-b-[3.5px] hover:-translate-y-[1px] active:border-b-[1px] active:translate-y-[1.5px] font-bold transition-all duration-150 cursor-pointer shadow-2xs"
          >
            <Grid size={10} className="inline mr-1 text-slate-400" /> Auto Layout Nodes
          </button>

          <button
            onClick={() => handlePillClick("Explain how FactSales maps database transactional orders")}
            className="text-[10px] bg-white hover:bg-slate-50 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200 border-b-[2.5px] border-slate-300 hover:border-b-[3.5px] hover:-translate-y-[1px] active:border-b-[1px] active:translate-y-[1.5px] font-bold transition-all duration-150 cursor-pointer shadow-2xs"
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
            placeholder={isGenerating ? "AuraAI is writing..." : "Instruct AuraAI to refactor or design..."}
            className="text-xs bg-white text-slate-800 border border-slate-200 w-full rounded-lg pl-3.5 pr-10 py-2.5 focus:outline-none focus:border-[#4F46E5] placeholder-slate-400 font-sans shadow-2xs focus:ring-1 focus:ring-indigo-505"
          />
          <button
            id="chat-submit"
            type="submit"
            disabled={!inputText.trim() || isGenerating}
            className="absolute right-1.5 top-1.5 p-1.5 text-white disabled:text-slate-400 bg-[#4F46E5] hover:bg-[#4F46E5]/90 disabled:bg-slate-200 rounded-md transition-all cursor-pointer flex items-center justify-center h-7 w-7"
            title="Send query"
          >
            <Send size={12} />
          </button>
        </form>
      </div>

    </div>
  );
}
