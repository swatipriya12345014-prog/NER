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
        title: 'North Eastern Region (NER)',
        prompts: [
          'What are the 8 states of North East India?',
          'Tell me about the Sela Tunnel and NH-13',
          'How long is the Bogibeel Bridge over Brahmaputra?',
          'What is the status of the Sikkim lifeline (NH-10)?',
          'Why does NER use Bharat Maps instead of Leaflet?',
          'How does the LoRa mesh operate during a blackout?',
        ],
      },
      {
        title: 'Mountain Passes & Tunnels',
        prompts: [
          'What is the elevation and significance of Sela Pass?',
          'Explain the Sonapur Tunnel in Meghalaya',
          'What is Nathu La pass in Sikkim?',
          'Tell me about Bhupen Hazarika Setu (Dhola-Sadiya)',
        ],
      },
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

  // 1. Emergency SOS & Hotline
  if (lower.includes('sos') || lower.includes('emergency') || lower.includes('receiver') || lower.includes('contact')) {
    return {
      answer: '🚨 **Emergency SOS Hotline & Incident Response:**\n\n• **Direct Incident Receiver**: **+91 95705 25463**\n• **National Helpline**: **108** (Ambulance) / **112** (All-India Emergency)\n• **LoRa Mesh Broadcast**: Peer-to-peer telemetry on 865–867 MHz frequency band\n• **Action**: SOS dispatches send GPS coordinates and vehicle status directly to command.',
      source: 'offline_emergency_engine',
      suggestions: ['How to treat hypothermia?', 'What is the protocol for AMS?'],
      timestamp: timeStr,
    };
  }

  // 2. All 8 States Overview
  if (lower.includes('8 states') || lower.includes('seven sisters') || lower.includes('which states') || lower.includes('states in ner')) {
    return {
      answer: '🗺️ **The 8 North Eastern States of India (NER):**\n\n1. **Assam** (Dispur/Guwahati) — Brahmaputra river plain & logistics hub\n2. **Arunachal Pradesh** (Itanagar) — Eastern Himalayan frontier, Sela Tunnel & NH-13\n3. **Meghalaya** (Shillong) — Scotland of the East, Cherrapunji/Mawsynram rainfall & NH-06\n4. **Manipur** (Imphal) — Loktak Lake (floating phumdis) & NH-37/NH-102 trade\n5. **Mizoram** (Aizawl) — Razorback ridges, bamboo ecosystems & NH-306 lifeline\n6. **Nagaland** (Kohima/Dimapur) — Dzukou Valley, Mount Saramati & NH-29 corridor\n7. **Tripura** (Agartala) — Border enclave, Akhaura ICP & NH-08 overland artery\n8. **Sikkim** (Gangtok) — Himalayan crown, Mount Kanchenjunga (8,586m) & NH-10 Teesta lifeline',
      source: 'offline_ner_knowledge',
      suggestions: ['Tell me about Mizoram', 'Explain Sela Tunnel', 'Status of NH-10'],
      timestamp: timeStr,
    };
  }

  // 3. Specific States
  if (lower.includes('mizoram') || lower.includes('aizawl')) {
    return {
      answer: '🎋 **State of Mizoram (Land of the Hill People):**\n\n• **Capital**: Aizawl | **Key Hubs**: Lunglei, Champhai, Kolasib\n• **Geography**: Parallel North–South razorback mountain ridges; extensive bamboo canopy\n• **Lifeline Highway**: NH-306 / NH-06 connecting Silchar (Assam) to Aizawl\n• **International Border Trade**: Zokhawthar / Champhai border post to Myanmar under Kaladan Multi-Modal Project\n• **Terrain Hazards**: High risk of monsoon road slumps and fuel tanker isolation.',
      source: 'offline_ner_knowledge',
      suggestions: ['What is NH-306?', 'What are the 8 states of NER?'],
      timestamp: timeStr,
    };
  }

  if (lower.includes('arunachal') || lower.includes('itanagar') || lower.includes('tawang')) {
    return {
      answer: '🏔️ **State of Arunachal Pradesh:**\n\n• **Capital**: Itanagar | **Forward Centers**: Tawang, Bomdila, Ziro, Pasighat\n• **Mountain Passes**: Sela Pass (4,170m), Bum La Pass (15,200 ft), Nechiphu Pass\n• **Strategic Tunnels**: Sela Tunnel (World\'s longest bi-lane tunnel >13,000 ft), Nechiphu Tunnel\n• **Lifeline Highway**: NH-13 (Trans-Arunachal Highway - 1,559 km)\n• **BRO Projects**: Project Vartak (West Kameng), Project Arunank, Project Brahmank.',
      source: 'offline_ner_knowledge',
      suggestions: ['What is Sela Tunnel?', 'What is NH-13?'],
      timestamp: timeStr,
    };
  }

  if (lower.includes('meghalaya') || lower.includes('shillong') || lower.includes('cherrapunji') || lower.includes('mawsynram')) {
    return {
      answer: '☁️ **State of Meghalaya (The Abode of Clouds):**\n\n• **Capital**: Shillong | **Districts**: Jowai, Tura, Cherrapunji (Sohra)\n• **Global Rainfall Record**: Mawsynram and Cherrapunji receive over 11,800 mm of annual precipitation\n• **Lifeline Highway**: NH-06 connecting Guwahati, Shillong, Jowai, and Silchar (Assam)\n• **Engineering Shelter**: Sonapur Tunnel (NH-06) protects traffic from active mudslides\n• **Living Root Bridges**: Ficus elastica roots guided by Khasi & Jaintia tribes.',
      source: 'offline_ner_knowledge',
      suggestions: ['What is Sonapur Tunnel?', 'Explain NH-06'],
      timestamp: timeStr,
    };
  }

  if (lower.includes('sikkim') || lower.includes('gangtok') || lower.includes('kanchenjunga')) {
    return {
      answer: '❄️ **State of Sikkim (Himalayan Crown):**\n\n• **Capital**: Gangtok | **Guardian Summit**: Mount Kanchenjunga (8,586m — 3rd highest on Earth)\n• **High Passes**: Nathu La (4,310m / 14,140 ft), Jelep La\n• **Sole Lifeline**: NH-10 (Siliguri to Gangtok via Teesta River canyon)\n• **Hazards**: Active landslides at 29th Mile, Glacial Lake Outburst Floods (GLOF) such as the South Lhonak Lake burst\n• **BRO Task Force**: Project Swastik maintains highway clearing.',
      source: 'offline_ner_knowledge',
      suggestions: ['What is Nathu La pass?', 'What is NH-10?'],
      timestamp: timeStr,
    };
  }

  if (lower.includes('assam') || lower.includes('guwahati') || lower.includes('dispur') || lower.includes('brahmaputra')) {
    return {
      answer: '🌿 **State of Assam:**\n\n• **Capital**: Dispur (Guwahati - Gateway of the North East)\n• **Geography**: Mighty Brahmaputra River plain and southern Barak Valley\n• **Bridges**: Bogibeel Bridge (4.94 km rail-cum-road), Bhupen Hazarika Setu / Dhola-Sadiya (9.15 km over water), Saraighat Bridges\n• **Highways**: NH-27 (East-West Corridor), NH-15 (North Bank), NH-29, NH-715\n• **Monsoon Flooding**: Severe annual flooding across Brahmaputra plain affecting Kaziranga & Majuli Island.',
      source: 'offline_ner_knowledge',
      suggestions: ['What is Bogibeel Bridge?', 'What is Kaziranga?'],
      timestamp: timeStr,
    };
  }

  if (lower.includes('nagaland') || lower.includes('kohima') || lower.includes('dimapur')) {
    return {
      answer: '🦅 **State of Nagaland (Land of Festivals):**\n\n• **Capital**: Kohima | **Logistics Hub**: Dimapur\n• **Geography**: Steep hills along Indo-Myanmar watershed; Mount Saramati (3,841m)\n• **Lifeline Highway**: NH-29 (Dimapur–Kohima–Mao) — severe rockslide hazard at Chumukedima / Pagla Pahar\n• **Landmark**: Dzukou Valley (2,452m), famous for endemic Dzukou Lily and rolling bamboo turf.',
      source: 'offline_ner_knowledge',
      suggestions: ['What is Dzukou Valley?', 'Status of NH-29'],
      timestamp: timeStr,
    };
  }

  if (lower.includes('manipur') || lower.includes('imphal') || lower.includes('loktak')) {
    return {
      answer: '💎 **State of Manipur (Jewel of India):**\n\n• **Capital**: Imphal | **Key Gateway**: Moreh (Indo-Myanmar Border Trade)\n• **Highways**: NH-02 (Dimapur-Imphal), NH-37 (Imphal-Jiribam with Makru/Barak bridges), NH-102\n• **Ecological Wonder**: Loktak Lake with circular floating islands (**Phumdis**) and Keibul Lamjao National Park (home to the endangered Sangai deer).',
      source: 'offline_ner_knowledge',
      suggestions: ['What is Loktak Lake?', 'What is NH-37?'],
      timestamp: timeStr,
    };
  }

  if (lower.includes('tripura') || lower.includes('agartala')) {
    return {
      answer: '🏰 **State of Tripura:**\n\n• **Capital**: Agartala | **Key ICP**: Akhaura Border Post to Bangladesh\n• **Lifeline Highway**: NH-08 (Assam-Tripura Highway via Churaibari Pass)\n• **Maritime Link**: Maitri Setu (Feni Bridge) at Sabroom connecting to Chittagong Port (72 km)\n• **Heritage**: Ujjayanta Palace, Neermahal Water Palace, Unakoti rock carvings.',
      source: 'offline_ner_knowledge',
      suggestions: ['What is NH-08?', 'What is Maitri Setu?'],
      timestamp: timeStr,
    };
  }

  // 4. Passes, Tunnels & Bridges
  if (lower.includes('sela') || lower.includes('nh-13')) {
    return {
      answer: '🏔️ **Sela Tunnel & NH-13 (Trans-Arunachal Highway):**\n\n• **World Record**: Longest bi-lane tunnel built above 13,000 ft (3,962 m) elevation.\n• **Structure**: Twin tubes (1,003m & 1,595m) constructed by BRO Project Vartak in West Kameng.\n• **Benefit**: Bypasses dangerous snow-covered hairpin bends of Sela Pass (4,170m), ensuring 365-day all-weather access to Tawang.',
      source: 'offline_ner_knowledge',
      suggestions: ['What is Bogibeel Bridge?', 'What is Sonapur Tunnel?'],
      timestamp: timeStr,
    };
  }

  if (lower.includes('bogibeel')) {
    return {
      answer: '🌉 **Bogibeel Bridge (Dibrugarh, Assam):**\n\n• **Length**: 4.94 km — India\'s longest combined rail-cum-road bridge.\n• **Location**: Spans the Brahmaputra River between Dibrugarh and Dhemaji.\n• **Impact**: Slashes travel time between Assam and eastern Arunachal Pradesh from 14 hours by ferry to 20 minutes.',
      source: 'offline_ner_knowledge',
      suggestions: ['Tell me about Dhola-Sadiya Bridge', 'What is Sela Tunnel?'],
      timestamp: timeStr,
    };
  }

  if (lower.includes('dhola') || lower.includes('sadiya') || lower.includes('bhupen hazarika')) {
    return {
      answer: '🌉 **Bhupen Hazarika Setu (Dhola-Sadiya Bridge):**\n\n• **Length**: 9.15 km (5.69 miles) — India\'s longest bridge over water.\n• **Location**: Spans the Lohit River, connecting Dhola (Tinsukia, Assam) to Sadiya.\n• **Impact**: Reduces journey from Assam into eastern Arunachal (Roing, Tezu) from 6 hours to 30 minutes. Built to support heavy military convoys and 60-tonne tanks.',
      source: 'offline_ner_knowledge',
      suggestions: ['What is Bogibeel Bridge?', 'What is NH-13?'],
      timestamp: timeStr,
    };
  }

  if (lower.includes('sonapur')) {
    return {
      answer: '🛡️ **Sonapur Tunnel (East Jaintia Hills, Meghalaya):**\n\n• A 123-meter reinforced concrete shelter tunnel on NH-06.\n• Built over a notorious mudslide and boulder chute to prevent the total cutoff of road transport between Meghalaya and the Barak Valley, Tripura, and Mizoram.',
      source: 'offline_ner_knowledge',
      suggestions: ['What is NH-06?', 'What are the hazards in Meghalaya?'],
      timestamp: timeStr,
    };
  }

  // 5. Sovereign GIS & LoRa
  if (lower.includes('bharat map') || lower.includes('leaflet') || lower.includes('nic map') || lower.includes('sovereign')) {
    return {
      answer: '🇮🇳 **Sovereign Indian GIS (Bharat Maps / NIC Map Service):**\n\n• Under **NER-LIFELINE System Directives (AGENTS.md)**, external map SDKs (Leaflet, Mapbox, Google Maps API) are **strictly prohibited**.\n• **Reason**: Remote disaster logistics in North East India frequently encounter complete network blackouts and bandwidth limits. External CDNs cause massive payload bloat and fail offline.\n• **Approved Standard**: Bharat Maps (`mapservice.gov.in`), the official sovereign portal by NIC/MeitY, plus self-contained vector maps.',
      source: 'offline_ner_knowledge',
      suggestions: ['How does the LoRa mesh work?', 'Emergency SOS contact'],
      timestamp: timeStr,
    };
  }

  if (lower.includes('lora') || lower.includes('mesh') || lower.includes('865') || lower.includes('frequency')) {
    return {
      answer: '📡 **LIFELINE LoRa Mesh Telemetry (865–867 MHz India Band):**\n\n• **Off-Grid Telemetry**: Operates when monsoon landslides sever mobile telecom towers.\n• **Store-and-Forward (DTN)**: Packets are cached on local ESP32 flash memory and forwarded when a peer vehicle or hilltop gateway is encountered.\n• **Encryption**: AES-128 payload encryption ensures secure telemetry transmission.',
      source: 'offline_ner_knowledge',
      suggestions: ['Why Bharat Maps instead of Leaflet?', 'Who receives SOS calls?'],
      timestamp: timeStr,
    };
  }

  // 6. Generic Offline Fallback
  return {
    answer: `🤖 **NER-LIFELINE AI Assistant (Offline Protocol):**\n\nReceived your inquiry: *"${query}"*.\n\nI have complete offline intelligence on all **8 North Eastern States**, national highways (NH-13, NH-27, NH-10, NH-06, NH-29), mountain passes (Sela Pass/Tunnel, Nathu La), bridges (Bogibeel, Dhola-Sadiya), and emergency medical first-aid.\n\nFor instant field emergency dispatch, call **+91 95705 25463**.`,
    source: 'offline_fallback',
    suggestions: ['What are the 8 states of NER?', 'What is Sela Tunnel?', 'Emergency SOS contact'],
    timestamp: timeStr,
  };
}

