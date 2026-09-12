// Service for Universal AI Chatbot System
// Connects to FastAPI /api/chat with resilient fallback & voice support

const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost') {
    return `http://${window.location.hostname}:8000`;
  }
  return 'http://localhost:8000';
};

const API_BASE_URL = getApiBase();

export async function sendChatMessage(message, history = [], language = 'en', context = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        history,
        language,
        context,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    return {
      answer: data.answer,
      source: data.source,
      suggestions: data.suggestions || [],
      timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  } catch (err) {
    console.warn('Backend /api/chat unreachable, activating offline AI fallback:', err);
    return getOfflineChatFallback(message);
  }
}

export async function fetchChatSuggestions() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/suggestions`);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.warn('Could not fetch suggestions:', e);
  }

  // Fallback default suggestions
  return {
    categories: [
      {
        title: 'Road & Logistics',
        prompts: [
          'What is the status of NH-13 and Sela Tunnel?',
          'What are the cold chain storage requirements for blood and vaccines?',
          'Who receives the emergency SOS call?',
        ],
      },
      {
        title: 'Emergency & First Aid',
        prompts: [
          'How to treat high-altitude hypothermia?',
          'What is the protocol for Acute Mountain Sickness (AMS)?',
          'What is the emergency CPR procedure?',
        ],
      },
      {
        title: 'Math & Calculations',
        prompts: [
          'Calculate (450 * 12) + 180',
          'Convert 25 C to Fahrenheit',
          'What is the square root of 144?',
        ],
      },
      {
        title: 'Universal Science & Knowledge',
        prompts: [
          'What is quantum computing?',
          'Explain the theory of relativity in simple terms',
          'Who was Albert Einstein?',
        ],
      },
      {
        title: 'Java & Polyglot Coding',
        prompts: [
          'Show binary search implementation in Java 21',
          'Show Java Spring Boot REST Controller for fleet',
          'Show Java AIS-140 VLTD packet parser',
          'Show Go goroutine telemetry worker',
          'Show C++ LoRa ESP32 packet struct',
        ],
      },
    ],
  };
}

function getOfflineChatFallback(query) {
  const lower = query.toLowerCase();
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (lower.includes('sos') || lower.includes('emergency')) {
    return {
      answer: '🚨 **Emergency SOS Hotline:**\n• **Direct Incident Receiver**: **+91 95705 25463**\n• **National Helpline**: 108 / 112\n• Automated alerts are relayed instantly over LoRa 865–867 MHz.',
      source: 'offline_emergency_engine',
      suggestions: ['Who receives the SOS call?', 'How to treat hypothermia?'],
      timestamp: timeStr,
    };
  }

  if (lower.includes('nh-13') || lower.includes('sela')) {
    return {
      answer: '🛣️ **NH-13 & Sela Pass Corridor:**\nTrans-Arunachal artery connecting Tawang. Sela Tunnel provides all-weather clearance bypassing snowbound heights.',
      source: 'offline_gis_engine',
      suggestions: ['Check fleet vehicles', 'High altitude medical tips'],
      timestamp: timeStr,
    };
  }

  return {
    answer: `🤖 **NER AI Assistant (Offline Mode):**\nReceived your inquiry: *"${query}"*.\nFor live calculations, encyclopedia lookups, or code generation, please verify backend connectivity at port 8000. For emergency field response, contact **+91 95705 25463**.`,
    source: 'offline_fallback',
    suggestions: ['What is the status of NH-13?', 'Emergency SOS contact'],
    timestamp: timeStr,
  };
}
