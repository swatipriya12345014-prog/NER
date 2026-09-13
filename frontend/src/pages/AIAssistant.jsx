import React, { useState, useEffect, useRef } from 'react';
import {
  Bot, Send, Mic, MicOff, Volume2, VolumeX, Copy, Check, Sparkles,
  Calculator, Code2, ShieldAlert, BookOpen, Compass, RefreshCw,
  PhoneCall, HeartPulse, HelpCircle, Layers, Cpu
} from 'lucide-react';
import { sendChatMessage, fetchChatSuggestions } from '../services/chatService';
import { useLanguage } from '../context/LanguageContext';
import { createSpeechRecognizer } from '../services/aiVoiceService';

export default function AIAssistant() {
  const { speakText, stopSpeech, isSpeaking, language } = useLanguage();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "👋 **Welcome to the NER-LIFELINE Universal AI Assistant.**\n\nI am engineered with **authoritative intelligence across the entire North Eastern Region (NER) of India**:\n• **8 North Eastern States**: Complete profiles for Assam, Arunachal Pradesh, Meghalaya, Manipur, Mizoram, Nagaland, Tripura, and Sikkim.\n• **Passes & Engineering Marvels**: Sela Pass & Sela Tunnel (13,000 ft), Nechiphu, Sonapur Tunnel, Nathu La, Bogibeel Bridge (4.94 km), and Dhola-Sadiya Setu (9.15 km).\n• **Highways & Logistics**: NH-13 (Trans-Arunachal), NH-27 (East-West), NH-10 (Sikkim Lifeline), NH-06, NH-29, NH-08, and NH-37.\n• **Disasters & BRO**: Seismic Zone V geology, Glacial Lake Floods (GLOF), landslide clearance, BRO Projects (Vartak, Swastik, Pushpak, Sewak), and LoRa Mesh (865–867 MHz).\n• **Mountain Medicine & SOS**: High-altitude hypothermia, acute mountain sickness (AMS), CPR, cold-chain vaccines, and instant dispatch to **+91 95705 25463**.\n\n*Ask me literally anything about the North Eastern Region!*",
      source: 'conversational',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [autoVoiceResponse, setAutoVoiceResponse] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [activeSpeechIndex, setActiveSpeechIndex] = useState(null);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    fetchChatSuggestions().then((res) => {
      if (res && res.categories) {
        setCategories(res.categories);
      }
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // High-fidelity Speech-to-Text with live streaming interim transcription
  const toggleSpeechRecognition = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      setInterimTranscript('');
      return;
    }

    const recognition = createSpeechRecognizer({
      language,
      onStart: () => {
        setIsListening(true);
        setInterimTranscript('');
      },
      onInterimResult: (interim) => {
        setInterimTranscript(interim);
      },
      onFinalResult: (final) => {
        setInputMessage((prev) => (prev ? `${prev} ${final}` : final));
        setInterimTranscript('');
      },
      onEnd: () => {
        setIsListening(false);
        setInterimTranscript('');
      },
      onError: () => {
        setIsListening(false);
        setInterimTranscript('');
      },
    });

    if (!recognition) {
      alert('Speech recognition is not supported in this browser. Please try Google Chrome or Microsoft Edge.');
      return;
    }

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      console.warn('Speech recognition startup exception:', err);
      setIsListening(false);
    }
  };

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
    setInterimTranscript('');
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

      // If auto-voice response is enabled, speak the answer naturally
      if (autoVoiceResponse) {
        speakText(response.answer);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ An error occurred processing the query. Please retry.',
          source: 'error',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSpeak = (text, index) => {
    if (isSpeaking && activeSpeechIndex === index) {
      stopSpeech();
      setActiveSpeechIndex(null);
    } else {
      setActiveSpeechIndex(index);
      speakText(text);
    }
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const renderMessageContent = (content) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const lang = lines[0].trim();
        const code = (lang ? lines.slice(1) : lines).join('\n');
        return (
          <div key={i} className="my-3 p-4 bg-slate-950/90 rounded-xl border border-slate-800 font-mono text-xs md:text-sm overflow-x-auto text-cyan-300 shadow-inner">
            {lang && (
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-800 pb-1.5 font-sans">
                <span>{lang}</span>
                <span className="text-[10px] text-slate-500">Syntax Highlighted</span>
              </div>
            )}
            <pre className="whitespace-pre">{code}</pre>
          </div>
        );
      }

      const lines = part.split('\n');
      return (
        <div key={i} className="space-y-1.5">
          {lines.map((line, lIdx) => {
            if (!line.trim()) return <div key={lIdx} className="h-1.5" />;
            
            const formattedLine = line.split(/(\*\*.*?\*\*)/g).map((seg, sIdx) => {
              if (seg.startsWith('**') && seg.endsWith('**')) {
                return <strong key={sIdx} className="font-semibold text-white">{seg.slice(2, -2)}</strong>;
              }
              return seg;
            });

            if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
              return (
                <div key={lIdx} className="flex items-start space-x-2 pl-2 text-slate-200">
                  <span className="text-cyan-400 font-bold leading-tight mt-0.5">•</span>
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
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30"><BookOpen size={12} /> Live Encyclopedia</span>;
      case 'math_engine':
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"><Calculator size={12} /> Math & Calculator</span>;
      case 'code_engine':
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30"><Code2 size={12} /> Code & Tech</span>;
      case 'ner_logistics':
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30"><ShieldAlert size={12} /> NER Logistics & Highways</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"><Sparkles size={12} /> AI Reasoning</span>;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-3 sm:p-6 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 rounded-2xl border border-slate-800 shadow-xl mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 flex-shrink-0">
            <Bot size={28} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">NER-LIFELINE Universal AI Assistant</h1>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> Active
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Universal Intelligence Engine • Answers literally any question (Science, Math, Code, History, SOS)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => {
              const next = !autoVoiceResponse;
              setAutoVoiceResponse(next);
              if (!next) stopSpeech();
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              autoVoiceResponse
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Toggle automatic spoken voice replies from the assistant"
          >
            {autoVoiceResponse ? <Volume2 size={14} className="text-cyan-400 animate-pulse" /> : <VolumeX size={14} />}
            <span>Auto Voice: {autoVoiceResponse ? 'ON' : 'OFF'}</span>
          </button>

          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
            <PhoneCall size={14} className="text-red-400" />
            <span>SOS: <b className="text-white">+91 95705 25463</b></span>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        {/* Left Side: Category Navigator & Quick Starters */}
        <div className="hidden lg:flex flex-col bg-slate-900/90 rounded-2xl border border-slate-800 p-4 space-y-4 overflow-y-auto">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <Layers size={16} className="text-cyan-400" />
            <span>Explore Topics</span>
          </div>

          <div className="space-y-3">
            {categories.map((cat, idx) => (
              <div key={idx} className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-2">
                  {cat.title}
                </h4>
                <div className="space-y-1">
                  {cat.prompts.map((p, pIdx) => (
                    <button
                      key={pIdx}
                      onClick={() => handleSend(p)}
                      className="w-full text-left p-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700 leading-snug"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Quick System Diagnostics */}
          <div className="mt-auto pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center justify-between">
              <span>Knowledge Base:</span>
              <span className="text-cyan-400 font-mono">Live Wikipedia / DDG</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Computation:</span>
              <span className="text-emerald-400 font-mono">Realtime Math Engine</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Mountain Medicine:</span>
              <span className="text-amber-400 font-mono">Himalayan Protocols</span>
            </div>
          </div>
        </div>

        {/* Right Side / Center: Chat Console */}
        <div className="lg:col-span-3 flex flex-col bg-slate-900/95 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden min-h-0">
          {/* Top Quick Slider on Mobile/Tablet */}
          <div className="lg:hidden p-2.5 bg-slate-950 border-b border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 flex-shrink-0">
              <Sparkles size={12} className="text-amber-400" /> Try:
            </span>
            <button
              onClick={() => handleSend("What is the status of NH-13 and Sela Tunnel?")}
              className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap"
            >
              NH-13 Status
            </button>
            <button
              onClick={() => handleSend("How to treat high-altitude hypothermia?")}
              className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap"
            >
              Hypothermia Treatment
            </button>
            <button
              onClick={() => handleSend("Calculate (450 * 12) + 180")}
              className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap"
            >
              Calculate
            </button>
            <button
              onClick={() => handleSend("What is quantum computing?")}
              className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap"
            >
              Quantum Computing
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={index}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group`}
                >
                  <div
                    className={`max-w-[92%] sm:max-w-[85%] rounded-2xl px-5 py-4 shadow-lg text-sm sm:text-base ${
                      isUser
                        ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-tr-none'
                        : 'bg-slate-800/90 text-slate-100 border border-slate-700/80 rounded-tl-none'
                    }`}
                  >
                    {!isUser && msg.source && (
                      <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-700/60 pb-2">
                        {getSourceBadge(msg.source)}
                        <span className="text-xs text-slate-400 font-mono">{msg.timestamp}</span>
                      </div>
                    )}

                    {renderMessageContent(msg.content)}

                    {isUser && (
                      <div className="mt-2 text-xs text-blue-200 text-right font-mono">
                        {msg.timestamp}
                      </div>
                    )}
                  </div>

                  {/* Assistant Message Actions */}
                  {!isUser && (
                    <div className="flex items-center gap-2 mt-2 ml-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleToggleSpeak(msg.content, index)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                          isSpeaking && activeSpeechIndex === index
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                        title={isSpeaking && activeSpeechIndex === index ? "Stop voice readout" : "Read aloud"}
                      >
                        {isSpeaking && activeSpeechIndex === index ? (
                          <>
                            <VolumeX size={14} className="text-amber-400 animate-pulse" />
                            <span>Stop Voice</span>
                          </>
                        ) : (
                          <>
                            <Volume2 size={14} />
                            <span>Read Aloud</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleCopy(msg.content, index)}
                        className="px-2.5 py-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
                        title="Copy text"
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check size={14} className="text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-3 text-slate-400 text-sm pl-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <RefreshCw size={16} className="animate-spin text-cyan-400" />
                </div>
                <div>
                  <span className="font-semibold text-slate-200">Querying Universal Intelligence...</span>
                  <p className="text-xs text-slate-500">Checking encyclopedia, calculations, code repositories, and regional databases</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Console */}
          <div className="p-4 bg-slate-900 border-t border-slate-800">
            {/* Live Audio Acoustic Waveform & Streaming Speech Banner */}
            {isListening && (
              <div className="mb-3 px-3.5 py-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-between gap-3 text-xs text-cyan-200 shadow-lg shadow-cyan-950/50 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex items-end gap-0.5 h-4 flex-shrink-0">
                    <span className="w-1 bg-cyan-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-2" />
                    <span className="w-1 bg-cyan-400 rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-4" />
                    <span className="w-1 bg-cyan-400 rounded-full animate-[pulse_0.7s_ease-in-out_infinite] h-3" />
                    <span className="w-1 bg-cyan-400 rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-3.5" />
                  </div>
                  <span className="font-bold text-cyan-300 uppercase tracking-wider text-[10px]">Listening:</span>
                  <span className="truncate italic text-white text-xs">
                    {interimTranscript || "Speak your query naturally..."}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-white border border-red-500/30 text-[11px] font-semibold flex-shrink-0 transition-colors cursor-pointer"
                >
                  Done Speaking
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 bg-slate-950 rounded-2xl px-4 py-3 border border-slate-700/80 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all">
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`p-2 rounded-xl transition-colors flex-shrink-0 ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800'
                }`}
                title={isListening ? "Listening... click to stop" : "Speak question (Speech-to-Text)"}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={isListening ? "Listening to your voice..." : "Ask literally anything: science, history, coding, calculations, or mountain safety..."}
                className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none min-w-0"
                disabled={isLoading}
              />

              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!inputMessage.trim() || isLoading}
                className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                  inputMessage.trim() && !isLoading
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-semibold shadow-lg shadow-cyan-500/25'
                    : 'text-slate-600 bg-slate-850 cursor-not-allowed'
                }`}
                title="Send Message"
              >
                <Send size={18} />
              </button>
            </div>

            <div className="flex items-center justify-between mt-2 px-2 text-xs text-slate-500">
              <span>Press <b className="text-slate-400">Enter</b> to send message • Multi-turn conversation preserved</span>
              <span className="text-cyan-400">Regional SOS Direct Line: +91 95705 25463</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
