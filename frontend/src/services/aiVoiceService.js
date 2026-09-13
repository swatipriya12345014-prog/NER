/**
 * NER-LIFELINE Advanced AI Voice Engine
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * High-fidelity, natural voice synthesis (TTS) & recognition (STT).
 *
 * Solves standard Web Speech API awkwardness:
 *  1. Normalizes markdown, symbols, coordinates, units, and highway codes
 *     into smooth, conversational spoken phrasing.
 *  2. Automatically ranks and selects high-quality natural/neural browser voices
 *     (Google Natural, Siri/Samantha Enhanced, Microsoft Jenny/Guy, etc.).
 *  3. Prevents the notorious Chromium 14-second audio stall bug using
 *     sentence chunking and an active synthesis watchdog timer.
 *  4. Native Web Audio acoustic chimes for microphone and assistant states.
 *  5. Real-time interim speech recognition with live streaming preview.
 */

// Acoustic frequency cues generated dynamically via Web Audio API (0 external assets)
export function playVoiceAcousticCue(type = 'listen_start') {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'listen_start') {
      // Gentle, friendly rising double-chime (listening activated)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } else if (type === 'listen_stop') {
      // Soft descending chime (listening finished)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, ctx.currentTime); // E5
      osc.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.14); // E4
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'copilot_speak') {
      // Subtle tactical radio ping
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(740, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    }
  } catch (err) {
    // Non-critical audio warning
  }
}

/**
 * Normalizes text for clean, human-like speech delivery.
 * Strips technical noise, markdown artifacts, raw URLs, and expands abbreviations.
 */
export function cleanTextForSpeech(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let s = raw;

  // 1. Remove code blocks, tables, and raw script snippets
  s = s.replace(/```[\s\S]*?```/g, ' ');
  s = s.replace(/`([^`]+)`/g, '$1');

  // 2. Remove URLs entirely (avoid awkward letter-by-letter reading)
  s = s.replace(/https?:\/\/\S+/gi, ' ');

  // 3. Remove markdown headers, bold, italics, strikethrough, blockquotes
  s = s.replace(/^#{1,6}\s+/gm, ' ');
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/\*([^*]+)\*/g, '$1');
  s = s.replace(/__([^_]+)__/g, '$1');
  s = s.replace(/_([^_]+)_/g, '$1');
  s = s.replace(/~~([^~]+)~~/g, '$1');
  s = s.replace(/^>\s+/gm, ' ');

  // 4. Clean markdown links [text](url) -> text
  s = s.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

  // 5. Convert markdown bullet points & numbered lists into natural pauses
  s = s.replace(/^\s*[-*+]\s+/gm, '. ');
  s = s.replace(/^\s*\d+\.\s+/gm, '. ');

  // 6. Expand regional highway, terrain & emergency abbreviations
  s = s.replace(/\bNH[- ]?(\d+)\b/gi, 'National Highway $1');
  s = s.replace(/\bSH[- ]?(\d+)\b/gi, 'State Highway $1');
  s = s.replace(/\bkm\/h\b/gi, 'kilometers per hour');
  s = s.replace(/\bkmph\b/gi, 'kilometers per hour');
  s = s.replace(/\bkm\b/gi, 'kilometers');
  s = s.replace(/\bm\b(?=\s|$|[.,])/gi, 'meters');
  s = s.replace(/\bmin(s)?\b/gi, 'minutes');
  s = s.replace(/\bhr(s)?\b/gi, 'hours');
  s = s.replace(/°C/g, ' degrees Celsius');
  s = s.replace(/\bdeg C\b/gi, ' degrees Celsius');
  s = s.replace(/\bLat\b/gi, 'Latitude');
  s = s.replace(/\bLng\b/gi, 'Longitude');
  s = s.replace(/\bLoRa\b/gi, 'Lora mesh');
  s = s.replace(/\bESP32\b/gi, 'E S P 32');
  s = s.replace(/\bSOS\b/gi, 'S O S Emergency');
  s = s.replace(/\bAI\b/gi, 'A I');
  s = s.replace(/\bETA\b/gi, 'estimated arrival time');
  s = s.replace(/\bNER\b/gi, 'North East Region');
  s = s.replace(/\bBRO\b/gi, 'Border Roads Organisation');
  s = s.replace(/\bSDRF\b/gi, 'State Disaster Response Force');
  s = s.replace(/\bNDRF\b/gi, 'National Disaster Response Force');
  s = s.replace(/\bIV\b/gi, 'I V');
  s = s.replace(/\bO-Negative\b/gi, 'O Negative');

  // 7. Strip emojis and unicode symbols
  s = s.replace(/[\u{1F600}-\u{1F6FF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ');

  // 8. Replace technical separators and bracket artifacts
  s = s.replace(/[|•·]/g, ', ');
  s = s.replace(/[:;]/g, ', ');
  s = s.replace(/[–—]/g, ', ');
  s = s.replace(/[()\[\]{}]/g, ' ');

  // 9. Normalize multiple spaces and line breaks into rhythmic pauses
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

/**
 * Selects the highest quality natural/neural voice available for the language.
 */
export function getBestVoice(language = 'en', preferredGender = 'female') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Language code normalization
  const langPrefix = language.split('-')[0].toLowerCase();

  // Filter voices matching the target language
  const matchingVoices = voices.filter(v => {
    const vLang = v.lang.toLowerCase();
    if (vLang.startsWith(langPrefix)) return true;
    if (langPrefix === 'hi' && vLang.includes('hi')) return true;
    if (langPrefix === 'bn' && vLang.includes('bn')) return true;
    return false;
  });

  const candidates = matchingVoices.length > 0 ? matchingVoices : voices;

  // Natural / High-quality scoring system
  const scoreVoice = (v) => {
    let score = 0;
    const name = v.name.toLowerCase();
    const isLangMatch = v.lang.toLowerCase().startsWith(langPrefix);

    if (isLangMatch) score += 100;

    // Favor natural, online, enhanced, neural voices
    if (name.includes('natural') || name.includes('neural')) score += 50;
    if (name.includes('enhanced') || name.includes('premium')) score += 40;
    if (name.includes('google')) score += 30;
    if (name.includes('siri')) score += 30;

    // Well-known premium voices by name
    const premiumNames = ['samantha', 'karen', 'daniel', 'serena', 'rishi', 'moira', 'ava', 'jenny', 'guy', 'neerja', 'swara', 'lekha', 'deepa'];
    if (premiumNames.some(p => name.includes(p))) score += 25;

    // Match preferred gender hints
    if (preferredGender === 'female' && (name.includes('female') || name.includes('samantha') || name.includes('karen') || name.includes('serena') || name.includes('ava') || name.includes('jenny') || name.includes('neerja') || name.includes('swara') || name.includes('deepa'))) {
      score += 15;
    }
    if (preferredGender === 'male' && (name.includes('male') || name.includes('daniel') || name.includes('rishi') || name.includes('guy') || name.includes('madhur') || name.includes('bashkar'))) {
      score += 15;
    }

    // Penalize known robotic / monotone voices
    if (name.includes('fred') || name.includes('albert') || name.includes('junior') || name.includes('ralph') || name.includes('zarvox') || name.includes('trinoids') || name.includes('whisper')) {
      score -= 80;
    }

    return score;
  };

  candidates.sort((a, b) => scoreVoice(b) - scoreVoice(a));
  return candidates[0] || null;
}

// Global active synthesis state
let activeUtterances = [];
let watchdogTimer = null;

function clearWatchdog() {
  if (watchdogTimer) {
    clearInterval(watchdogTimer);
    watchdogTimer = null;
  }
}

/**
 * Splits long text into natural sentence chunks to eliminate Chromium's 14-second stall.
 */
function splitIntoNaturalChunks(text) {
  const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [text];
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if ((currentChunk + ' ' + trimmed).length < 180) {
      currentChunk = currentChunk ? `${currentChunk} ${trimmed}` : trimmed;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = trimmed;
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks.length > 0 ? chunks : [text];
}

/**
 * Speaks text naturally with fluid pacing, high-fidelity voice selection,
 * and chunked boundary playback.
 */
export function speakNaturalSpeech({
  text,
  language = 'en',
  rate = 1.02,
  pitch = 1.0,
  preferredGender = 'female',
  playChime = true,
  onStart,
  onEnd,
  onError,
}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  stopNaturalSpeech();

  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) {
    if (onEnd) onEnd();
    return;
  }

  if (playChime) {
    playVoiceAcousticCue('copilot_speak');
  }

  const voice = getBestVoice(language, preferredGender);
  const chunks = splitIntoNaturalChunks(cleaned);
  let chunkIndex = 0;

  // Active Chromium speech resume watchdog
  clearWatchdog();
  watchdogTimer = setInterval(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    } else {
      clearWatchdog();
    }
  }, 10000);

  const speakNextChunk = () => {
    if (chunkIndex >= chunks.length) {
      clearWatchdog();
      if (onEnd) onEnd();
      return;
    }

    const currentText = chunks[chunkIndex];
    chunkIndex++;

    const utterance = new SpeechSynthesisUtterance(currentText);
    utterance.rate = rate;
    utterance.pitch = pitch;
    if (voice) utterance.voice = voice;

    if (chunkIndex === 1 && onStart) {
      utterance.onstart = onStart;
    }

    utterance.onend = () => {
      speakNextChunk();
    };

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('Speech chunk synthesis warning:', e);
      }
      clearWatchdog();
      if (onError) onError(e);
      if (onEnd) onEnd();
    };

    activeUtterances.push(utterance);
    window.speechSynthesis.speak(utterance);
  };

  speakNextChunk();
}

/**
 * Stops all ongoing speech synthesis immediately and clears queues.
 */
export function stopNaturalSpeech() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  clearWatchdog();
  activeUtterances = [];
  try {
    window.speechSynthesis.cancel();
  } catch (e) {}
}

/**
 * Speech-to-Text Recognizer with real-time interim results and language mapping
 */
export function createSpeechRecognizer({
  language = 'en',
  onInterimResult,
  onFinalResult,
  onStart,
  onEnd,
  onError,
}) {
  if (typeof window === 'undefined') return null;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;

  // Language mapping for accurate regional accents
  const langMap = {
    en: 'en-IN',
    hi: 'hi-IN',
    bn: 'bn-IN',
    as: 'as-IN',
    mni: 'en-IN',
    lus: 'en-IN',
    kha: 'en-IN',
    garo: 'en-IN',
  };
  recognition.lang = langMap[language] || 'en-IN';

  let hasSpoken = false;

  recognition.onstart = () => {
    hasSpoken = false;
    playVoiceAcousticCue('listen_start');
    if (onStart) onStart();
  };

  recognition.onresult = (event) => {
    hasSpoken = true;
    let interim = '';
    let final = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        final += transcript;
      } else {
        interim += transcript;
      }
    }

    if (interim && onInterimResult) {
      onInterimResult(interim);
    }
    if (final && onFinalResult) {
      onFinalResult(final);
    }
  };

  recognition.onerror = (event) => {
    if (event.error !== 'no-speech') {
      console.warn('Speech recognition notice:', event.error);
    }
    playVoiceAcousticCue('listen_stop');
    if (onError) onError(event);
  };

  recognition.onend = () => {
    playVoiceAcousticCue('listen_stop');
    if (onEnd) onEnd();
  };

  return recognition;
}
