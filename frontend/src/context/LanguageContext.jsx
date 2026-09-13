import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { speakNaturalSpeech, stopNaturalSpeech } from '../services/aiVoiceService';

// Supported North Eastern & National Operating Languages
export const SUPPORTED_LANGUAGES = [
  { id: 'en', name: 'English', native: 'English', region: 'Command HQ / Inter-Agency', flag: '🇮🇳' },
  { id: 'as', name: 'Assamese', native: 'অসমীয়া', region: 'Assam / Brahmaputra Corridor', flag: '🏔️' },
  { id: 'bn', name: 'Bengali', native: 'বাংলা', region: 'Tripura & Barak Valley', flag: '🌿' },
  { id: 'hi', name: 'Hindi', native: 'हिन्दी', region: 'NDRF / BRO / Central Emergency', flag: '🛡️' },
  { id: 'mni', name: 'Manipuri', native: 'মৈতৈলোন্', region: 'Manipur / Imphal Valley', flag: '🌸' },
  { id: 'lus', name: 'Mizo', native: 'Mizo ṭawng', region: 'Mizoram / Aizawl Hills', flag: '⛰️' },
  { id: 'kha', name: 'Khasi', native: 'Ka Ktien Khasi', region: 'Meghalaya / Shillong Plateau', flag: '🌧️' }
];

// Comprehensive translations dictionary across core features
export const TRANSLATIONS = {
  en: {
    // Navigation
    nav_dashboard: 'Dashboard',
    nav_live_map: 'Live Operations Map',
    nav_vehicles: 'Fleet Vehicles',
    nav_shipments: 'Relief Shipments',
    nav_incidents: 'Incidents & Blocks',
    nav_risk_analysis: 'Terrain Risk AI',
    nav_mesh: 'LIFELINE MESH',
    nav_driver: 'Driver Problem Portal',
    nav_field_officer: 'Field Officer',
    nav_alerts: 'Active Alerts',
    nav_analytics: 'Logistics Analytics',
    nav_ai_assistant: 'Universal AI Assistant',
    nav_settings: 'System Settings',
    
    // Topbar & Actions
    search_placeholder: 'Search vehicles, hubs, relief shipments, blocked passes... (Ctrl+K)',
    network_status_online: 'LoRa Mesh & Satellite Online',
    role_officer: 'Emergency Officer',
    operator_guide: 'Field Manual & Guide',
    voice_assistance: 'Voice Readout',
    voice_speaking: 'Reading aloud...',
    audio_chime_toggle: 'Tactical Audio Alerts',
    export_manifest: 'Copy Manifest',
    manifest_copied: 'Route Manifest copied to clipboard!',
    
    // Live Map & Google Routes
    map_safest_route: 'Safest Route (Fortified)',
    map_shortest_route: 'Direct Highway Corridor',
    map_recalculate: 'Refresh Route',
    map_calculating: 'Routing via Google Routes API...',
    map_offline_fallback: 'Offline Sovereign Mode',
    map_google_active: 'Google Routes API Active',
    map_traffic_aware: 'Live Traffic & Terrain Aware',
    map_tilt_3d: '3D Perspective Tilt',
    map_compass_mode: 'Compass Navigation',
    map_north_up: 'North-Up Mode',
    map_heading_up: 'Heading-Up Mode',
    map_sat_view: 'Satellite View',
    map_dark_view: 'Tactical Dark',
    map_terrain_view: 'Terrain Relief',
    
    // Telemetry & Metrics
    metric_remaining_range: 'Remaining Range',
    metric_fuel_buffer: 'Fuel Buffer',
    metric_eta: 'Est. Drive Time',
    metric_distance: 'Real Highway Distance',
    metric_risk_score: 'Terrain Hazard Index',
    metric_weather: 'Weather Impact',
    metric_landslide_prob: 'Landslide Probability',
    
    // Status badges
    status_operational: 'Operational',
    status_critical: 'Critical Alert',
    status_high_risk: 'High Hazard',
    status_moderate: 'Moderate Caution',
    status_safe: 'Clear Passage',
    status_blocked: 'Road Blocked / Closed',
    status_in_transit: 'In Transit',
    status_delivered: 'Delivered',
    
    // Driver HUD
    driver_cockpit_title: 'Driver Emergency & Problem Resolution Portal',
    driver_next_maneuver: 'Next Highway Maneuver',
    driver_emergency_sos: 'Emergency SOS Broadcast',
    driver_sos_sent: 'SOS Sent over LoRa Mesh!',
    driver_speed: 'Safe Convoy Speed',
    driver_fuel_reserve: 'Fuel Reserve Status'
  },
  
  as: {
    // Navigation (Assamese)
    nav_dashboard: 'নিয়ন্ত্ৰণ কক্ষ (ডেচবৰ্ড)',
    nav_live_map: 'প্ৰত্যক্ষ মানচিত্ৰ',
    nav_vehicles: 'যান-বাহন বহৰ',
    nav_shipments: 'সাহায্য সামগ্ৰী',
    nav_incidents: 'দুৰ্যোগ আৰু পথ অৱৰোধ',
    nav_risk_analysis: 'ভূমি স্খলন আশংকা বিশ্লেষণ',
    nav_mesh: 'লাইফলাইন ল’ৰা জাল',
    nav_driver: 'চালক সমস্যা প\'ৰ্টেল',
    nav_field_officer: 'ক্ষেত্ৰ বিষয়া',
    nav_alerts: 'সতৰ্কবাৰ্তা',
    nav_analytics: 'পৰিবহণ বিশ্লেষণ',
    nav_ai_assistant: 'সাৰ্বজনীন এআই সহায়ক',
    nav_settings: 'ব্যৱস্থা ছেটিংছ',
    
    // Topbar & Actions
    search_placeholder: 'বাহন, কেন্দ্ৰ, সামগ্ৰী বা অৱৰোধ সন্ধান কৰক... (Ctrl+K)',
    network_status_online: 'ল’ৰা জাল আৰু উপগ্ৰহ সংযোগী',
    role_officer: 'জৰুৰীকালীন বিষয়া',
    operator_guide: 'ব্যৱহাৰিক নিৰ্দেশনা',
    voice_assistance: 'শব্দ নিৰ্দেশনা শুনক',
    voice_speaking: 'কৈ থকা হৈছে...',
    audio_chime_toggle: 'জৰুৰী শব্দ সতৰ্কতা',
    export_manifest: 'পথ তালিকা প্ৰতিলিপি কৰক',
    manifest_copied: 'পথ তালিকা সফলভাৱে কপি কৰা হ’ল!',
    
    // Live Map & Google Routes
    map_safest_route: 'আটাইতকৈ সুৰক্ষিত পথ',
    map_shortest_route: 'পোনপটীয়া ৰাষ্ট্ৰীয় ঘাইপথ',
    map_recalculate: 'নতুনকৈ পথ নিৰ্ধাৰণ কৰক',
    map_calculating: 'গুগল ৰাউটচ্ জৰিয়তে পথ বিচৰা হৈছে...',
    map_offline_fallback: 'ইণ্টাৰনেটবিহীন জৰুৰীকালীন মোড',
    map_google_active: 'গুগল ৰাউটচ্ সক্ৰিয়',
    map_traffic_aware: 'যান-জঁট আৰু বতৰ পৰিদৰ্শন',
    map_tilt_3d: '৩ডি পাহাৰীয়া দৃশ্য',
    map_compass_mode: 'কম্পাছ চালনা',
    map_north_up: 'উত্তৰ-মুখী দৃশ্য',
    map_heading_up: 'গতি-মুখী দৃশ্য',
    map_sat_view: 'উপগ্ৰহ দৃশ্য',
    map_dark_view: 'নিশাৰ দৃশ্য',
    map_terrain_view: 'পাহাৰ-ভৈয়াম দৃশ্য',
    
    // Telemetry & Metrics
    metric_remaining_range: 'অৱশিষ্ট দূৰত্ব ক্ষমতা',
    metric_fuel_buffer: 'তেলৰ মজুত অৱস্থা',
    metric_eta: 'আনুমানিক সময়',
    metric_distance: 'প্ৰকৃত পথ দূৰত্ব',
    metric_risk_score: 'বিপদৰ মাত্ৰা সূচক',
    metric_weather: 'বতৰৰ প্ৰভাৱ',
    metric_landslide_prob: 'ভূমিস্খলনৰ সম্ভাৱনা',
    
    // Status badges
    status_operational: 'কাৰ্যক্ষম',
    status_critical: 'জৰুৰী সংকট',
    status_high_risk: 'উচ্চ সংকটপূৰ্ণ',
    status_moderate: 'মধ্যমীয়া সতৰ্কতা',
    status_safe: 'নিৰাপদ পথ',
    status_blocked: 'পথ সম্পূৰ্ণ বন্ধ',
    status_in_transit: 'পথত চলি আছে',
    status_delivered: 'গন্তব্যত পাইছে',
    
    // Driver HUD
    driver_cockpit_title: 'চালকৰ জৰুৰীকালীন সমস্যা সমাধান প\'ৰ্টেল',
    driver_next_maneuver: 'পৰৱৰ্তী ঘাইপথ নিৰ্দেশনা',
    driver_emergency_sos: 'জৰুৰীকালীন বিপদ ঘণ্টা (SOS)',
    driver_sos_sent: 'ল’ৰা জাল যোগে সংকেত প্ৰেৰণ কৰা হ’ল!',
    driver_speed: 'নিৰাপদ চালন বেগ',
    driver_fuel_reserve: 'ইন্ধন সংৰক্ষণ অৱস্থা'
  },
  
  bn: {
    // Navigation (Bengali)
    nav_dashboard: 'কন্ট্রোল ড্যাশবোর্ড',
    nav_live_map: 'লাইভ ম্যাপ',
    nav_vehicles: 'যানবাহন বহর',
    nav_shipments: 'ত্রাণ চালান',
    nav_incidents: 'দুর্যোগ ও সড়ক পথ অবরোধ',
    nav_risk_analysis: 'ভূমিধস ঝুঁকি বিশ্লেষণ',
    nav_mesh: 'লাইফলাইন লরা মেশ',
    nav_driver: 'চালক সমস্যা সমাধান পোর্টাল',
    nav_field_officer: 'ফিল্ড অফিসার',
    nav_alerts: 'জরুরি সতর্কতা',
    nav_analytics: 'লজিস্টিক অ্যানালিটিক্স',
    nav_ai_assistant: 'সার্বজনীন এআই সহকারী',
    nav_settings: 'সিস্টেম সেটিংস',
    
    // Topbar & Actions
    search_placeholder: 'যানবাহন, হাব, ত্রাণ চালান বা গিরিপথ খুঁজুন... (Ctrl+K)',
    network_status_online: 'লরা মেশ ও স্যাটেলাইট সক্রিয়',
    role_officer: 'জরুরি সাড়াদান অফিসার',
    operator_guide: 'ফিল্ড গাইড ও নির্দেশিকা',
    voice_assistance: 'ভয়েস নির্দেশনা শুনুন',
    voice_speaking: 'বলছে...',
    audio_chime_toggle: 'জরুরি অডিও সাউন্ড',
    export_manifest: 'চালান কপি করুন',
    manifest_copied: 'রুট ম্যানিফেস্ট ক্লিপবোর্ডে কপি করা হয়েছে!',
    
    // Live Map & Google Routes
    map_safest_route: 'সর্বাধিক নিরাপদ রুট',
    map_shortest_route: 'সরাসরি হাইওয়ে করিডোর',
    map_recalculate: 'রুট রিফ্রেশ করুন',
    map_calculating: 'গুগল রুটস এপিআই দিয়ে হিসাব হচ্ছে...',
    map_offline_fallback: 'অফলাইন জরুরি মোড',
    map_google_active: 'গুগল রুটস এপিআই সক্রিয়',
    map_traffic_aware: 'রিয়েল-টাইম ট্রাফিক ও ভূমি নিরীক্ষা',
    map_tilt_3d: '৩ডি পাহাড়ের ভিউ',
    map_compass_mode: 'কম্পাস অভিমুখ',
    map_north_up: 'উত্তর-মুখী মোড',
    map_heading_up: 'গতিপথ-মুখী মোড',
    map_sat_view: 'স্যাটেলাইট ভিউ',
    map_dark_view: 'ট্যাকটিক্যাল ডার্ক',
    map_terrain_view: 'টেরেন রিলিফ',
    
    // Telemetry & Metrics
    metric_remaining_range: 'অবশিষ্ট রেঞ্জ',
    metric_fuel_buffer: 'জ্বালানি উদ্বৃত্ত',
    metric_eta: 'আনুমানিক সময়',
    metric_distance: 'আসল হাইওয়ে দূরত্ব',
    metric_risk_score: 'বিপদ স্কোর',
    metric_weather: 'আবহাওয়া ঝুঁকি',
    metric_landslide_prob: 'ভূমিধসের সম্ভাবনা',
    
    // Status badges
    status_operational: 'কার্যকরী',
    status_critical: 'সংকটপূর্ণ অ্যালার্ট',
    status_high_risk: 'উচ্চ ঝুঁকি',
    status_moderate: 'সতর্কতা প্রয়োজন',
    status_safe: 'নিরাপদ উন্মুক্ত পথ',
    status_blocked: 'রাস্তা বন্ধ / অবরুদ্ধ',
    status_in_transit: 'পথে চলমান',
    status_delivered: 'পৌঁছেছে',
    
    // Driver HUD
    driver_cockpit_title: 'চালক সমস্যা ও জরুরি সমাধান পোর্টাল',
    driver_next_maneuver: 'পরবর্তী হাইওয়ে মোড়',
    driver_emergency_sos: 'জরুরি এসওএস ব্রডকাস্ট (SOS)',
    driver_sos_sent: 'লরা মেশে জরুরি সংকেত পাঠানো হয়েছে!',
    driver_speed: 'নিরাপদ কনভয় গতি',
    driver_fuel_reserve: 'জ্বালানি স্থিতি'
  },
  
  hi: {
    // Navigation (Hindi)
    nav_dashboard: 'कमांड डैशबोर्ड',
    nav_live_map: 'लाइव ऑपरेशंस मैप',
    nav_vehicles: 'वाहन बेड़ा (फ्लीट)',
    nav_shipments: 'राहत सामग्री खेप',
    nav_incidents: 'आपदा एवं सड़क अवरोध',
    nav_risk_analysis: 'भूस्खलन जोखिम विश्लेषण',
    nav_mesh: 'लाइफलाइन लोरा मेश',
    nav_driver: 'चालक समस्या एवं सहायता पोर्टल',
    nav_field_officer: 'फील्ड अधिकारी',
    nav_alerts: 'सक्रिय चेतावनियां',
    nav_analytics: 'लॉजिस्टिक्स विश्लेषण',
    nav_ai_assistant: 'सार्वभौमिक एआई सहायक',
    nav_settings: 'सिस्टम सेटिंग्स',
    
    // Topbar & Actions
    search_placeholder: 'वाहन, डिपो, राहत खेप या अवरुद्ध मार्ग खोजें... (Ctrl+K)',
    network_status_online: 'लोरा मेश एवं सैटेलाइट लिंक सक्रिय',
    role_officer: 'आपातकालीन राहत अधिकारी',
    operator_guide: 'मार्गदर्शन नियमावली',
    voice_assistance: 'ध्वनि सहायता सुनें',
    voice_speaking: 'बोला जा रहा है...',
    audio_chime_toggle: 'सायरन एवं ध्वनि चेतावनी',
    export_manifest: 'रूट मैनिफेस्ट कॉपी करें',
    manifest_copied: 'रूट विवरण सफलतापूर्वक कॉपी किया गया!',
    
    // Live Map & Google Routes
    map_safest_route: 'सर्वाधिक सुरक्षित मार्ग',
    map_shortest_route: 'सीधा राष्ट्रीय राजमार्ग',
    map_recalculate: 'मार्ग पुनः गणना करें',
    map_calculating: 'गूगल रूट्स द्वारा वास्तविक मार्ग निकाला जा रहा है...',
    map_offline_fallback: 'ऑफलाइन आपातकालीन मोड',
    map_google_active: 'गूगल रूट्स एपीआई सक्रिय',
    map_traffic_aware: 'सजीव यातायात एवं मौसम निगरानी',
    map_tilt_3d: '3D पर्वतीय दृश्य',
    map_compass_mode: 'दिक्सूचक नेविगेशन',
    map_north_up: 'उत्तर-दिशा केंद्रित मोड',
    map_heading_up: 'वाहन दिशा-उन्मुख मोड',
    map_sat_view: 'उपग्रह दृश्य',
    map_dark_view: 'सामरिक डार्क मोड',
    map_terrain_view: 'भूभाग स्थलाकृति',
    
    // Telemetry & Metrics
    metric_remaining_range: 'शेष संचालन दूरी',
    metric_fuel_buffer: 'ईंधन सुरक्षा बफर',
    metric_eta: 'अनुमानित यात्रा समय',
    metric_distance: 'वास्तविक सड़क दूरी',
    metric_risk_score: 'खतरा सूचकांक',
    metric_weather: 'मौसम प्रभाव',
    metric_landslide_prob: 'भूस्खलन संभावना',
    
    // Status badges
    status_operational: 'सक्रिय / कार्यरत',
    status_critical: 'गंभीर आपातकाल',
    status_high_risk: 'उच्च जोखिम क्षेत्र',
    status_moderate: 'मध्यम सावधानी',
    status_safe: 'सुरक्षित मार्ग',
    status_blocked: 'मार्ग अवरुद्ध / बंद',
    status_in_transit: 'मार्ग में अग्रसर',
    status_delivered: 'पहुंच चुका है',
    
    // Driver HUD
    driver_cockpit_title: 'चालक समस्या एवं आपातकालीन सहायता पोर्टल',
    driver_next_maneuver: 'अगला दिशा निर्देश',
    driver_emergency_sos: 'आपातकालीन एसओएस (SOS) भेजें',
    driver_sos_sent: 'लोरा मेश द्वारा एसओएस संदेश प्रसारित!',
    driver_speed: 'सुरक्षित काफिला गति',
    driver_fuel_reserve: 'ईंधन रिज़र्व स्थिति'
  },
  
  mni: {
    // Navigation (Manipuri / Meitei)
    nav_dashboard: 'কমান্দ দ্যাসকোপ',
    nav_live_map: 'লাইভ মেপ',
    nav_vehicles: 'গারীশিং',
    nav_shipments: 'তেংবাং পোৎলম',
    nav_incidents: 'লমবায় খুদোংথিবা',
    nav_risk_analysis: 'চিং কায়বা ৱাখল্লোন',
    nav_mesh: 'লোরা মেস',
    nav_driver: 'ত্রাইভর সমস্যা পোর্তাল',
    nav_field_officer: 'ফিল্ড ওফিসার',
    nav_alerts: 'চেকশিন্না পাউ',
    nav_analytics: 'লোজিস্তিক এনালিতিক্স',
    nav_ai_assistant: 'য়ুনিভার্সেল এআই এসিষ্টেন্ত',
    nav_settings: 'সিস্তেম সেতিংস',
    
    // Topbar & Actions
    search_placeholder: 'গারী, হব, পোৎলম থিবীবা... (Ctrl+K)',
    network_status_online: 'লোরা মেস সেতেলাইত লুপ চৎলে',
    role_officer: 'ইমর্জেন্সী ওফিসার',
    operator_guide: 'ফিল্ড কাংলোন',
    voice_assistance: 'খোল্লাও পাউদম',
    voice_speaking: 'ঙাংলি...',
    audio_chime_toggle: 'পাউচেক খোল্লাও',
    export_manifest: 'মেনিফেষ্ট কোপী',
    manifest_copied: 'কোপী তৌরে!',
    
    // Live Map & Google Routes
    map_safest_route: 'খ্বায়দগী অকায়বা লৈতবা লম্বী',
    map_shortest_route: 'অকুপ্পা হাইৱে লম্বী',
    map_recalculate: 'লম্বী অমুক হন্না য়েংবা',
    map_calculating: 'গুগল রুটসনা লম্বী পুথোক্লি...',
    map_offline_fallback: 'ওফলাইন ইমর্জেন্সী মোদ',
    map_google_active: 'গুগল রুটস সক্ৰিয় ওইরে',
    map_traffic_aware: 'ট্ৰাফিক অমসুং নোংচুপ য়েংবা',
    map_tilt_3d: '৩ডি চিংগী দৃশ্য',
    map_compass_mode: 'কম্পাস লম্বী',
    map_north_up: 'অৱাং মোদ',
    map_heading_up: 'হেদিং-অপ মোদ',
    map_sat_view: 'সেতেলাইত ভ্যু',
    map_dark_view: 'অমোম্বা মোদ',
    map_terrain_view: 'টেরেন মোদ',
    
    // Telemetry & Metrics
    metric_remaining_range: 'লৈহৌরিবা রেঞ্জ',
    metric_fuel_buffer: 'থাউগী ফীভম',
    metric_eta: 'চংগদবা মতম',
    metric_distance: 'লম্বীগী শাংবা',
    metric_risk_score: 'খুদোংথিবা মশীং',
    metric_weather: 'নোং-নুংশিৎকী ফীভম',
    metric_landslide_prob: 'চিং কায়বগী চাং',
    
    // Status badges
    status_operational: 'ওপরেস্নেল',
    status_critical: 'ক্রিতিকেল',
    status_high_risk: 'য়াম্না খুদোংথিবা',
    status_moderate: 'চেকশিনবা মথৌ তাই',
    status_safe: 'অফবা লম্বী',
    status_blocked: 'লম্বী থিংজিল্লে',
    status_in_transit: 'লম্বীদা চৎলি',
    status_delivered: 'য়ৌখ্রে',
    
    // Driver HUD
    driver_cockpit_title: 'ত্রাইভরগী সমস্যা অমসুং মতেং পোর্তাল',
    driver_next_maneuver: 'তুংদা খোঙজেল',
    driver_emergency_sos: 'জরুরী এস.ও.এস (SOS)',
    driver_sos_sent: 'এস.ও.এস পাউজেল থাখ্রে!',
    driver_speed: 'খ্বায়দগী নিংথীবা স্পীদ',
    driver_fuel_reserve: 'থাউগী ফীভম'
  },
  
  lus: {
    // Navigation (Mizo)
    nav_dashboard: 'Command Dashboard',
    nav_live_map: 'Live Operations Map',
    nav_vehicles: 'Motor Rual (Fleet)',
    nav_shipments: 'Chhawmdawlna Bungrua',
    nav_incidents: 'Chhiatrupna & Kawng Ping',
    nav_risk_analysis: 'Leimin Hlauhawm Endikna',
    nav_mesh: 'LIFELINE MESH',
    nav_driver: 'Driver Buaina & Tanpuina Portal',
    nav_field_officer: 'Field Officer',
    nav_alerts: 'Hriattirna Tharlam',
    nav_analytics: 'Phurhchhuah Enchianna',
    nav_ai_assistant: 'Universal AI Tanpuitu',
    nav_settings: 'System Hmanruate',
    
    // Topbar & Actions
    search_placeholder: 'Motor, camp, bungrua zawnna... (Ctrl+K)',
    network_status_online: 'LoRa Mesh & Satellite a inthlunzawm',
    role_officer: 'Khuarel Chhiatrup Officer',
    operator_guide: 'Hman dan Kaihhruaina',
    voice_assistance: 'Aw Ri Hriatna (Voice)',
    voice_speaking: 'A sawi mek e...',
    audio_chime_toggle: 'Chhiatrup Ri Khawk',
    export_manifest: 'Kawng Kal Dan Copy',
    manifest_copied: 'Kawng kal dan copy fel a ni!',
    
    // Live Map & Google Routes
    map_safest_route: 'Kawng Him Ber',
    map_shortest_route: 'Kawng Tawi Ber',
    map_recalculate: 'Kawng Zawn Thar Leh',
    map_calculating: 'Google Routes hmanga zawn mek a ni...',
    map_offline_fallback: 'Internet Tel Lo (Offline)',
    map_google_active: 'Google Routes a nung e',
    map_traffic_aware: 'Motor Tam Dan & Sik leh Sa',
    map_tilt_3d: '3D Tlang Hmelhmang',
    map_compass_mode: 'Hmar/Chhim Kawhhmuhtu',
    map_north_up: 'Hmar Lam Hawi',
    map_heading_up: 'Kaltlang Lam Hawi',
    map_sat_view: 'Satellite Hmuhna',
    map_dark_view: 'Thim Hmuhna',
    map_terrain_view: 'Tlang Hmuhna',
    
    // Telemetry & Metrics
    metric_remaining_range: 'Kal theih chin',
    metric_fuel_buffer: 'Hriak la awm zat',
    metric_eta: 'Thlen hun tur chhut',
    metric_distance: 'Kawng hlat zawng',
    metric_risk_score: 'Hlauhawm tehna',
    metric_weather: 'Sik leh sa boruak',
    metric_landslide_prob: 'Leimin theihna',
    
    // Status badges
    status_operational: 'Hman theih',
    status_critical: 'Hlauhawm Lulpui',
    status_high_risk: 'Hlauhawm Sang',
    status_moderate: 'Fimkhur Ngai',
    status_safe: 'Kawng Tluang',
    status_blocked: 'Kawng Ping',
    status_in_transit: 'Kal mek',
    status_delivered: 'Thleng tawh',
    
    // Driver HUD
    driver_cockpit_title: 'Driver Buaina Chinfelna Portal',
    driver_next_maneuver: 'Peng dawtleh',
    driver_emergency_sos: 'Hmanhmawh Thawm (SOS)',
    driver_sos_sent: 'SOS thawn liam tawh!',
    driver_speed: 'Tlan chak zawng him tawk',
    driver_fuel_reserve: 'Hriak dinhmun'
  },
  
  kha: {
    // Navigation (Khasi)
    nav_dashboard: 'Ka Kot Khubor (Dashboard)',
    nav_live_map: 'Ka Map Ba Im',
    nav_vehicles: 'Ki Kali Bah (Fleet)',
    nav_shipments: 'Ki Tiarkylliang Jingiarap',
    nav_incidents: 'Ki Jingjia & Ka Lad Ba Khang',
    nav_risk_analysis: 'Jingpeit Bniah Twr-khyndew',
    nav_mesh: 'LIFELINE MESH',
    nav_driver: 'Portal Jingeh Nongniah',
    nav_field_officer: 'U Rangbah Shnong / Officer',
    nav_alerts: 'Ki Jingmaham Ba Im',
    nav_analytics: 'Jingpeit Bniah ia ki Kali',
    nav_ai_assistant: 'Nongïarap AI ba Lah Ban Jubab Waroh',
    nav_settings: 'Ki Jingbuh Ryntih',
    
    // Topbar & Actions
    search_placeholder: 'Wad ki kali, ki shnong, tiar jingiarap... (Ctrl+K)',
    network_status_online: 'LoRa Mesh & Satellite ka trei kam',
    role_officer: 'Officer Jingiarap Kyrkieh',
    operator_guide: 'Kot Jingbatai Treikam',
    voice_assistance: 'Ka Ktien Sawangka (Voice)',
    voice_speaking: 'Kren mynta...',
    audio_chime_toggle: 'Ka Ri Ksing Jingmaham',
    export_manifest: 'Copy ia ka Lynti',
    manifest_copied: 'La copy ia ka rukom leit!',
    
    // Live Map & Google Routes
    map_safest_route: 'Ka Lynti Ba Shngain Tam',
    map_shortest_route: 'Ka Lynti Ba Lyngkot',
    map_recalculate: 'Wad biang ia ka Lynti',
    map_calculating: 'Wad lynti lyngba Google Routes...',
    map_offline_fallback: 'Rukom Trei Khlem Internet',
    map_google_active: 'Google Routes ka trei kam bha',
    map_traffic_aware: 'Jingkhapngiah & Jinglong Ka Suinbneng',
    map_tilt_3d: 'Ka Jingieng Lum 3D',
    map_compass_mode: 'Ka Kompas',
    map_north_up: 'Phai Sha Shatei',
    map_heading_up: 'Phai Sha Khmat',
    map_sat_view: 'Jingpeit Satellite',
    map_dark_view: 'Jingpeit Mynmiet',
    map_terrain_view: 'Jingpeit Lum & Wah',
    
    // Telemetry & Metrics
    metric_remaining_range: 'Ka Jingjngai Ba Dang Lah Leit',
    metric_fuel_buffer: 'U Petrol / Umphniang Ba Dang Sah',
    metric_eta: 'Por Ba Thmu Ban Poi',
    metric_distance: 'Ka Jingjngai Shisha',
    metric_risk_score: 'Jingkhein Jingma',
    metric_weather: 'Ka Jingkylla Suinbneng',
    metric_landslide_prob: 'Jingma Twr-khyndew',
    
    // Status badges
    status_operational: 'Trei Kam Bha',
    status_critical: 'Jingma Kyrkieh',
    status_high_risk: 'Jingma Ba Khraw',
    status_moderate: 'Donkam Ban Sumar',
    status_safe: 'Ka Lynti Ba Suk',
    status_blocked: 'Ka Lynti Ba Khang',
    status_in_transit: 'Dang Leit ha Lynti',
    status_delivered: 'La Poi Sha Ka Thmu',
    
    // Driver HUD
    driver_cockpit_title: 'Portal Ban Pynbeit Jingeh U Nongniah',
    driver_next_maneuver: 'Ka Jingphai Ba Bud',
    driver_emergency_sos: 'Jingiarap Kyrkieh (SOS)',
    driver_sos_sent: 'La phah ia ka SOS lyngba LoRa!',
    driver_speed: 'Ka Jingstet Ba Shngain',
    driver_fuel_reserve: 'Jinglong Umphniang'
  }
};

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key, fallback) => fallback || key,
  languagesList: SUPPORTED_LANGUAGES,
  speakText: () => {},
  stopSpeech: () => {},
  playAlertChime: () => {},
  isSpeaking: false,
  soundAlertsEnabled: true,
  setSoundAlertsEnabled: () => {}
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem('ner_preferred_language') || 'en';
    } catch {
      return 'en';
    }
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [soundAlertsEnabled, setSoundAlertsEnabledState] = useState(() => {
    try {
      const stored = localStorage.getItem('ner_sound_alerts_enabled');
      return stored !== null ? JSON.parse(stored) : true;
    } catch {
      return true;
    }
  });

  const setLanguage = useCallback((langId) => {
    if (SUPPORTED_LANGUAGES.some((l) => l.id === langId)) {
      setLanguageState(langId);
      try {
        localStorage.setItem('ner_preferred_language', langId);
      } catch (err) {
        console.warn('Could not persist language preference:', err);
      }
    }
  }, []);

  const setSoundAlertsEnabled = useCallback((enabled) => {
    setSoundAlertsEnabledState(enabled);
    try {
      localStorage.setItem('ner_sound_alerts_enabled', JSON.stringify(enabled));
    } catch (err) {
      console.warn('Could not persist sound alert setting:', err);
    }
  }, []);

  // Preload natural speech voices into browser memory
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      const onVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
      };
    }
  }, []);

  // Translation lookup helper
  const t = useCallback((key, fallback) => {
    const langDict = TRANSLATIONS[language] || TRANSLATIONS.en;
    if (langDict && langDict[key] !== undefined) {
      return langDict[key];
    }
    const enDict = TRANSLATIONS.en;
    if (enDict && enDict[key] !== undefined) {
      return enDict[key];
    }
    return fallback !== undefined ? fallback : key;
  }, [language]);

  // Audio Accessibility: Stop/Cancel speech synthesis immediately
  const stopSpeech = useCallback(() => {
    stopNaturalSpeech();
    setIsSpeaking(false);
  }, []);

  // Audio Accessibility: Enhanced Natural AI Voice Synthesis (TTS)
  const speakText = useCallback((text, options = {}) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      speakNaturalSpeech({
        text,
        language: options.language || language,
        rate: options.rate || 1.02,
        pitch: options.pitch || 1.0,
        preferredGender: options.gender || 'female',
        playChime: options.playChime !== undefined ? options.playChime : true,
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (err) {
      console.warn('Speech synthesis error:', err);
      setIsSpeaking(false);
    }
  }, [language]);

  // Tactical Alert Chime using native Web Audio API (Synthesizer - 0 external files)
  const playAlertChime = useCallback((type = 'alert') => {
    if (!soundAlertsEnabled || typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'sos') {
        // High-urgency warble alarm
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.25);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === 'success') {
        // Confirmation chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else {
        // Standard notification ping
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (err) {
      console.warn('Could not play tactical audio chime:', err);
    }
  }, [soundAlertsEnabled]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        languagesList: SUPPORTED_LANGUAGES,
        speakText,
        stopSpeech,
        playAlertChime,
        isSpeaking,
        soundAlertsEnabled,
        setSoundAlertsEnabled
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
