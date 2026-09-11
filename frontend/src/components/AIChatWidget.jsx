import React, { useState, useEffect, useRef } from 'react';
import {
  Bot, X, Send, Mic, MicOff, Volume2, VolumeX, Copy, Check,
  Sparkles, Calculator, Code2, ShieldAlert, BookOpen, Minimize2, Maximize2, RefreshCw
} from 'lucide-react';
import { sendChatMessage, fetchChatSuggestions } from '../services/chatService';
import { useLanguage } from '../context/LanguageContext';

export default function AIChatWidget() {
  const { speakText, stopSpeech, isSpeaking } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [activeSpeechIndex, setActiveSpeechIndex] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "👋 **Hello! I am the NER-LIFELINE Universal AI Assistant.**\n\nI can answer **literally all questions**: science, mathematics, coding, history, world trivia, plus high-altitude mountain first-aid, road statuses (NH-13, Sela Tunnel), and emergency SOS dispatch to **+91 78110 75355**.\n\n*How can I assist you today?*",
      source: 'conversational',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Load suggestions on mount
  useEffect(() => {
    fetchChatSuggestions().then((res) => {
      if (res && res.categories) {
        const flat = res.categories.flatMap((c) => c.prompts);
        setSuggestions(flat.slice(0, 5));
      }
    });
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Handle Speech-to-Text via Web Speech Recognition
  const toggleSpeechRecognition = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN'; // Indian English / general

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = (err) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  // Send message
  const handleSend = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const historyPayload = messages.map((m) => ({ role: m.role, content: m.content }));
      const response = await sendChatMessage(text, historyPayload);

      const botMsg = {
        role: 'assistant',
        content: response.answer,
        source: response.source,
        timestamp: response.timestamp,
      };

      setMessages((prev) => [...prev, botMsg]);

      // Update quick suggestions if returned
      if (response.suggestions && response.suggestions.length > 0) {
        setSuggestions(response.suggestions);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ Unable to process query right now. Please verify backend connection.',
          source: 'error',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Voice playback toggling with direct stop
  const handleToggleSpeak = (text, index) => {
    if (isSpeaking && activeSpeechIndex === index) {
      stopSpeech();
      setActiveSpeechIndex(null);
    } else {
      // Clean markdown tags for cleaner speech
      const cleanText = text
        .replace(/\*\*|__|\*|_/g, '')
        .replace(/`{1,3}[\s\S]*?`{1,3}/g, 'code snippet')
        .replace(/#+\s/g, '');
      setActiveSpeechIndex(index);
      speakText(cleanText);
    }
  };

  // Copy text to clipboard
  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Render markdown-like elements safely
  const renderMessageContent = (content) => {
    // Split into code blocks and normal paragraphs
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const lang = lines[0].trim();
        const code = (lang ? lines.slice(1) : lines).join('\n');
        return (
          <div key={i} className="my-2 p-3 bg-slate-950/90 rounded-lg border border-slate-800 font-mono text-xs overflow-x-auto text-cyan-300">
            {lang && <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 border-b border-slate-800 pb-1 font-sans">{lang}</div>}
            <pre className="whitespace-pre">{code}</pre>
          </div>
        );
      }

      // Normal text with bolding and bullet points
      const lines = part.split('\n');
      return (
        <div key={i} className="space-y-1">
          {lines.map((line, lIdx) => {
            if (!line.trim()) return <div key={lIdx} className="h-1" />;
            
            // Format bold text **text**
            const formattedLine = line.split(/(\*\*.*?\*\*)/g).map((seg, sIdx) => {
              if (seg.startsWith('**') && seg.endsWith('**')) {
                return <strong key={sIdx} className="font-semibold text-white">{seg.slice(2, -2)}</strong>;
              }
              return seg;
            });

            if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
              return (
                <div key={lIdx} className="flex items-start space-x-2 pl-2 text-slate-200">
                  <span className="text-cyan-400 font-bold leading-tight">•</span>
                  <span className="flex-1">{formattedLine}</span>
                </div>
              );
            }

            return <p key={lIdx} className="leading-relaxed text-slate-200">{formattedLine}</p>;
          })}
        </div>
      );
    });
  };

  const getSourceBadge = (source) => {
    switch (source) {
      case 'ai_knowledge':
        return <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30"><BookOpen size={10} /> Live Encyclopedia</span>;
      case 'math_engine':
        return <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"><Calculator size={10} /> Math & Units</span>;
      case 'code_engine':
        return <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30"><Code2 size={10} /> Code & Tech</span>;
      case 'ner_logistics':
        return <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30"><ShieldAlert size={10} /> NER Regional Logistics</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"><Sparkles size={10} /> AI Synthesis</span>;
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-full shadow-2xl shadow-cyan-500/25 border border-white/20 transition-all transform hover:scale-105 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-cyan-400"
          title="Open NER AI Assistant"
          aria-label="Open AI Chatbot"
        >
          <div className="relative">
            <Bot size={22} className="text-white transition-transform group-hover:rotate-12" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full animate-pulse" />
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-bold tracking-wide">NER AI Assistant</span>
            <span className="text-[10px] text-cyan-200">Answers Literally Everything</span>
          </div>
        </button>
      )}

      {/* Chat Window Drawer / Modal */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-200 flex flex-col bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl rounded-2xl overflow-hidden
            ${isExpanded 
              ? 'inset-3 sm:inset-6 md:inset-10' 
              : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-[460px] h-[85dvh] max-h-[680px]'
            }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-md flex-shrink-0">
                <Bot size={20} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white truncate">NER-LIFELINE AI</h3>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" /> Online
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">Universal Knowledge • Math • Code • SOS</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                onClick={() => {
                  stopSpeech();
                  setIsOpen(false);
                }}
                className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800/80 transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm scrollbar-thin scrollbar-thumb-slate-700">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={index}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group`}
                >
                  <div
                    className={`max-w-[88%] sm:max-w-[82%] rounded-2xl px-4 py-3 shadow-md text-xs sm:text-sm ${
                      isUser
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none'
                        : 'bg-slate-800/90 text-slate-100 border border-slate-700/70 rounded-tl-none'
                    }`}
                  >
                    {!isUser && msg.source && (
                      <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-700/50 pb-1.5">
                        {getSourceBadge(msg.source)}
                        <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                      </div>
                    )}

                    {renderMessageContent(msg.content)}

                    {isUser && (
                      <div className="mt-1 text-[10px] text-blue-200 text-right">
                        {msg.timestamp}
                      </div>
                    )}
                  </div>

                  {/* Actions for Assistant Messages */}
                  {!isUser && (
                    <div className="flex items-center gap-1 mt-1.5 ml-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleToggleSpeak(msg.content, index)}
                        className={`p-1.5 rounded-md text-xs flex items-center gap-1 transition-colors ${
                          isSpeaking && activeSpeechIndex === index
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                        title={isSpeaking && activeSpeechIndex === index ? "Stop voice readout" : "Read aloud"}
                      >
                        {isSpeaking && activeSpeechIndex === index ? (
                          <>
                            <VolumeX size={14} className="text-amber-400 animate-pulse" />
                            <span className="text-[10px]">Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 size={14} />
                            <span className="text-[10px]">Listen</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleCopy(msg.content, index)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 text-xs flex items-center gap-1 transition-colors"
                        title="Copy text"
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check size={14} className="text-emerald-400" />
                            <span className="text-[10px] text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span className="text-[10px]">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs pl-2">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <RefreshCw size={12} className="animate-spin text-cyan-400" />
                </div>
                <span>Reasoning across all knowledge domains...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          {suggestions.length > 0 && (
            <div className="px-3 py-2 bg-slate-950/60 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0 flex items-center gap-1">
                <Sparkles size={11} className="text-amber-400" /> Ideas:
              </span>
              {suggestions.map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => handleSend(prompt)}
                  disabled={isLoading}
                  className="flex-shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors whitespace-nowrap"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <div className="p-3 bg-slate-900 border-t border-slate-800">
            <div className="flex items-center gap-2 bg-slate-950 rounded-xl px-3 py-2 border border-slate-700/80 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500 transition-all">
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800'
                }`}
                title={isListening ? "Listening... click to stop" : "Speak your question"}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening to your voice..." : "Ask literally anything (Science, Math, Code, SOS)..."}
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none min-w-0"
                disabled={isLoading}
              />

              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!inputMessage.trim() || isLoading}
                className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
                  inputMessage.trim() && !isLoading
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/30'
                    : 'text-slate-600 bg-slate-850 cursor-not-allowed'
                }`}
                title="Send Message"
              >
                <Send size={16} />
              </button>
            </div>
            
            <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-slate-500">
              <span>Press <b>Enter</b> to send</span>
              <span className="text-cyan-500/80">SOS Dispatch: +91 78110 75355</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
