import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { Mic, ArrowUpRight, Square } from 'lucide-react';
import { useChatStore } from '../../chat/store/chatStore';
import { cn } from '../../../utils/cn';

export function WorkspacePromptBar({ className }: { className?: string } = {}) {
  const [prompt, setPrompt] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendMessage = useChatStore((s) => s.sendMessage);
  const isGenerating = useChatStore((s) => s.isGenerating);

  // Auto-grow textarea with content and preserve formatting
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    textarea.style.height = `${Math.min(Math.max(scrollHeight, 24), 200)}px`;
  }, [prompt]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // cleanup
        }
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startVoiceInput = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = typeof window !== 'undefined'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

    if (!SpeechRecognition) {
      alert('Voice dictation is not supported by your current browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let finalStr = '';
        let interimStr = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript;
          } else {
            interimStr += event.results[i][0].transcript;
          }
        }
        if (finalStr) {
          setPrompt((prev) => (prev ? `${prev} ${finalStr}` : finalStr));
        }
        setInterimTranscript(interimStr);
      };

      recognition.onerror = () => {
        stopVoiceInput();
      };

      recognition.onend = () => {
        setIsListening(false);
        if (timerRef.current) clearInterval(timerRef.current);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      setVoiceDuration(0);
      setInterimTranscript('');

      timerRef.current = setInterval(() => {
        setVoiceDuration((d) => d + 1);
      }, 1000);
    } catch {
      setIsListening(false);
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // cleanup
      }
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsListening(false);
    setInterimTranscript('');
  };

  const toggleListening = () => {
    if (isListening) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  };

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || isGenerating) return;

    if (isListening) stopVoiceInput();
    void sendMessage(trimmed);
    setPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn("absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-40 pointer-events-none", className)}>
      <div className="flex flex-col items-center gap-2 pointer-events-auto">
        {/* Voice Equalizer Banner while recording */}
        {isListening && (
          <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-full bg-[#FDFFFC] border border-[#D66F14]/40 shadow-md animate-fadeIn text-xs text-[#334139]">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D66F14] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D66F14]" />
              </span>
              <div className="flex items-center gap-0.5 h-4 px-0.5">
                <div className="w-0.5 bg-[#D66F14] rounded-full animate-soundwave-1" />
                <div className="w-0.5 bg-[#D66F14] rounded-full animate-soundwave-2" />
                <div className="w-0.5 bg-[#D66F14] rounded-full animate-soundwave-3" />
                <div className="w-0.5 bg-[#D66F14] rounded-full animate-soundwave-4" />
              </div>
              <span className="font-semibold truncate max-w-[280px]">
                {interimTranscript ? `"${interimTranscript}"` : `Listening... 0:${voiceDuration.toString().padStart(2, '0')}`}
              </span>
            </div>
            <button
              type="button"
              onClick={stopVoiceInput}
              className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#D66F14] text-[#FDFFFC] cursor-pointer"
            >
              Done
            </button>
          </div>
        )}

        {/* Prompt Input Bar: Voice on LEFT, Multiline Text in CENTER, Slanted Arrow on RIGHT */}
        <form
          onSubmit={handleSubmit}
          style={{ backgroundColor: '#FDFFFC' }}
          className="w-full flex items-end gap-2 px-3 py-2.5 rounded-2xl md:rounded-3xl border border-[#334139]/20 shadow-lg focus-within:border-[#064C1C] focus-within:ring-2 focus-within:ring-[#064C1C]/15 transition-all"
        >
          {/* Voice Icon on the LEFT */}
          <button
            type="button"
            onClick={toggleListening}
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 mb-0.5',
              isListening
                ? 'bg-[#D66F14] text-[#FDFFFC] ring-4 ring-[#D66F14]/25 animate-pulse'
                : 'bg-slate-100 hover:bg-slate-200 text-[#334139] hover:text-[#064C1C] border border-[#334139]/15'
            )}
            title={isListening ? 'Stop recording voice' : 'Start voice prompt'}
            aria-label={isListening ? 'Stop recording voice' : 'Start voice input'}
          >
            {isListening ? <Square size={12} className="fill-current" /> : <Mic size={16} />}
          </button>

          {/* Central Multiline Auto-Growing Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
            placeholder="Ask AuraBI to build, transform, or analyze your pipeline... (Shift+Enter for new line)"
            aria-label="Workspace prompt input"
            className="flex-1 bg-transparent border-none outline-none text-sm text-[#334139] placeholder:text-[#334139]/40 font-sans px-2 py-1.5 min-w-0 resize-none max-h-[200px] overflow-y-auto leading-relaxed whitespace-pre-wrap selection:bg-[#064C1C]/15"
          />

          {/* Send Icon on the RIGHT: Slanted Arrow */}
          <button
            type="submit"
            disabled={!prompt.trim() || isGenerating}
            style={{
              backgroundColor: prompt.trim() ? '#064C1C' : '#334139',
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#FDFFFC] transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-xs mb-0.5"
            title="Send prompt to agent"
            aria-label="Send prompt"
          >
            <ArrowUpRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
