import { useState, useCallback, useRef, useEffect } from 'react';
import { useSpeechSynthesis } from './useSpeechSynthesis';

// Voice Agent Modes
export type VoiceAgentMode = 'teaching' | 'diagnosis' | 'qa' | 'assistant';

export interface VoiceAgentMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  language: string;
  mode: VoiceAgentMode;
  timestamp: number;
  confidence?: number;
}

export interface VoiceAgentContext {
  cropType?: string;
  region?: string;
  detectionResult?: any;
  lastQuery?: string;
}

interface UseVoiceAgentOptions {
  defaultLanguage?: string;
  defaultMode?: VoiceAgentMode;
  onModeChange?: (mode: VoiceAgentMode) => void;
  onError?: (error: string) => void;
}

// Language codes for speech recognition
const SPEECH_LANG_CODES: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
  te: 'te-IN'
};

// Mode-specific voice responses
const MODE_GREETINGS: Record<VoiceAgentMode, Record<string, string>> = {
  teaching: {
    en: 'Welcome to teaching mode. I will explain farming concepts clearly. What would you like to learn today?',
    hi: 'शिक्षण मोड में आपका स्वागत है। मैं खेती की अवधारणाओं को स्पष्ट रूप से समझाऊंगा। आज आप क्या सीखना चाहते हैं?',
    kn: 'ಬೋಧನಾ ಮೋಡ್‌ಗೆ ಸ್ವಾಗತ. ನಾನು ಕೃಷಿ ಪರಿಕಲ್ಪನೆಗಳನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ವಿವರಿಸುತ್ತೇನೆ. ಇಂದು ನೀವು ಏನು ಕಲಿಯಲು ಬಯಸುತ್ತೀರಿ?',
    te: 'బోధనా మోడ్‌కు స్వాగతం. నేను వ్యవసాయ భావనలను స్పష్టంగా వివరిస్తాను. మీరు ఈరోజు ఏమి నేర్చుకోవాలనుకుంటున్నారు?'
  },
  diagnosis: {
    en: 'Diagnosis mode active. Show me the affected plant or describe the symptoms.',
    hi: 'निदान मोड सक्रिय है। मुझे प्रभावित पौधा दिखाएं या लक्षण बताएं।',
    kn: 'ರೋಗನಿರ್ಣಯ ಮೋಡ್ ಸಕ್ರಿಯವಾಗಿದೆ. ಪೀಡಿತ ಸಸ್ಯವನ್ನು ತೋರಿಸಿ ಅಥವಾ ಲಕ್ಷಣಗಳನ್ನು ವಿವರಿಸಿ.',
    te: 'రోగనిర్ధారణ మోడ్ సక్రియం. ప్రభావిత మొక్కను చూపించండి లేదా లక్షణాలను వివరించండి.'
  },
  qa: {
    en: 'Ask me any farming question. I will give you a short, clear answer.',
    hi: 'कोई भी खेती का सवाल पूछें। मैं आपको संक्षिप्त, स्पष्ट जवाब दूंगा।',
    kn: 'ಯಾವುದೇ ಕೃಷಿ ಪ್ರಶ್ನೆಯನ್ನು ಕೇಳಿ. ನಾನು ನಿಮಗೆ ಸಂಕ್ಷಿಪ್ತ, ಸ್ಪಷ್ಟ ಉತ್ತರ ನೀಡುತ್ತೇನೆ.',
    te: 'ఏదైనా వ్యవసాయ ప్రశ్న అడగండి. నేను మీకు చిన్న, స్పష్టమైన సమాధానం ఇస్తాను.'
  },
  assistant: {
    en: 'I am your farming assistant. How can I help you today?',
    hi: 'मैं आपका खेती सहायक हूं। आज मैं आपकी कैसे मदद कर सकता हूं?',
    kn: 'ನಾನು ನಿಮ್ಮ ಕೃಷಿ ಸಹಾಯಕ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?',
    te: 'నేను మీ వ్యవసాయ సహాయకుడిని. ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?'
  }
};

// Confidence threshold for STT
const STT_CONFIDENCE_THRESHOLD = 0.6;

// Max conversation turns for context
const MAX_CONTEXT_TURNS = 5;

export function useVoiceAgent(options: UseVoiceAgentOptions = {}) {
  const {
    defaultLanguage = 'en',
    defaultMode = 'assistant',
    onModeChange,
    onError
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentMode, setCurrentMode] = useState<VoiceAgentMode>(defaultMode);
  const [currentLanguage, setCurrentLanguage] = useState(defaultLanguage);
  const [messages, setMessages] = useState<VoiceAgentMessage[]>([]);
  const [context, setContext] = useState<VoiceAgentContext>({});
  const [lastTranscript, setLastTranscript] = useState('');
  const [sttConfidence, setSttConfidence] = useState(1);
  const [isSupported, setIsSupported] = useState(false);
  const [slowSpeechEnabled, setSlowSpeechEnabled] = useState(false);

  const recognitionRef = useRef<any>(null);
  const { speak, stop: stopSpeaking, isSpeaking } = useSpeechSynthesis({
    language: currentLanguage,
    rate: slowSpeechEnabled ? 0.7 : 0.85
  });

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition && 'speechSynthesis' in window);
  }, []);

  // Mode detection keywords
  const detectModeFromText = useCallback((text: string): VoiceAgentMode | null => {
    const lowerText = text.toLowerCase();
    
    // Teaching mode triggers
    if (/teach|learn|explain|what is|how does|tell me about|सीखना|समझाना|ಕಲಿಯಿರಿ|ವಿವರಿಸಿ|నేర్చుకో|వివరించు/.test(lowerText)) {
      return 'teaching';
    }
    
    // Diagnosis mode triggers
    if (/disease|problem|sick|dying|yellow|spots|diagnose|check|scan|रोग|बीमारी|ರೋಗ|ಸಮಸ್ಯೆ|వ్యాధి/.test(lowerText)) {
      return 'diagnosis';
    }
    
    // Q&A mode triggers
    if (/\?$|when|where|which|should i|can i|कब|कहां|कौन|ಯಾವಾಗ|ಎಲ್ಲಿ|ఎప్పుడు|ఎక్కడ/.test(lowerText)) {
      return 'qa';
    }
    
    return null;
  }, []);

  // Change mode
  const changeMode = useCallback((mode: VoiceAgentMode) => {
    setCurrentMode(mode);
    onModeChange?.(mode);
    
    // Speak greeting for new mode
    const greeting = MODE_GREETINGS[mode][currentLanguage] || MODE_GREETINGS[mode].en;
    speak(greeting, currentLanguage);
    
    // Add system message
    setMessages(prev => [...prev, {
      id: `sys-${Date.now()}`,
      role: 'agent',
      content: greeting,
      language: currentLanguage,
      mode,
      timestamp: Date.now()
    }]);
  }, [currentLanguage, onModeChange, speak]);

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported) {
      onError?.('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.maxAlternatives = 3;
    }

    recognitionRef.current.lang = SPEECH_LANG_CODES[currentLanguage] || 'en-IN';

    recognitionRef.current.onresult = (event: any) => {
      const results = event.results[event.results.length - 1];
      const transcript = results[0].transcript;
      const confidence = results[0].confidence || 0.8;
      
      setLastTranscript(transcript);
      setSttConfidence(confidence);
      
      if (results.isFinal) {
        handleUserInput(transcript, confidence);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      if (event.error === 'no-speech') {
        // Silently retry
        return;
      }
      
      onError?.(getErrorMessage(event.error, currentLanguage));
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      console.error('Failed to start recognition:', err);
      onError?.('Failed to start voice recognition');
    }
  }, [isSupported, currentLanguage, onError]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  // Handle user input
  const handleUserInput = useCallback(async (text: string, confidence: number) => {
    if (!text.trim()) return;

    // Check confidence threshold
    if (confidence < STT_CONFIDENCE_THRESHOLD) {
      const clarifyMsg = getClarifyMessage(currentLanguage);
      speak(clarifyMsg, currentLanguage);
      return;
    }

    // Add user message
    const userMessage: VoiceAgentMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      language: currentLanguage,
      mode: currentMode,
      timestamp: Date.now(),
      confidence
    };

    setMessages(prev => {
      const updated = [...prev, userMessage];
      // Keep only last N turns for context
      return updated.slice(-MAX_CONTEXT_TURNS * 2);
    });

    // Auto-detect mode from text
    const detectedMode = detectModeFromText(text);
    if (detectedMode && detectedMode !== currentMode) {
      changeMode(detectedMode);
      return;
    }

    // Process with AI
    setIsProcessing(true);
    try {
      const response = await processWithAI(text, currentMode, currentLanguage, context, messages);
      
      // Add agent response
      const agentMessage: VoiceAgentMessage = {
        id: `agent-${Date.now()}`,
        role: 'agent',
        content: response,
        language: currentLanguage,
        mode: currentMode,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, agentMessage]);
      
      // Speak the response
      speak(response, currentLanguage);
      
    } catch (err) {
      console.error('AI processing error:', err);
      const fallbackResponse = getFallbackResponse(currentMode, currentLanguage);
      speak(fallbackResponse, currentLanguage);
    } finally {
      setIsProcessing(false);
    }
  }, [currentLanguage, currentMode, context, messages, detectModeFromText, changeMode, speak]);

  // Set context from detection result
  const setDetectionContext = useCallback((result: any) => {
    setContext(prev => ({
      ...prev,
      detectionResult: result
    }));
    
    // Auto-switch to diagnosis mode
    if (currentMode !== 'diagnosis') {
      changeMode('diagnosis');
    }
  }, [currentMode, changeMode]);

  // Update user preferences
  const setUserPreferences = useCallback((prefs: { cropType?: string; region?: string }) => {
    setContext(prev => ({ ...prev, ...prefs }));
    
    // Save to localStorage with opt-in
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('agribot_voice_prefs', JSON.stringify(prefs));
    }
  }, []);

  // Load saved preferences
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('agribot_voice_prefs');
      if (saved) {
        try {
          const prefs = JSON.parse(saved);
          setContext(prev => ({ ...prev, ...prefs }));
        } catch {}
      }
    }
  }, []);

  return {
    // State
    isListening,
    isProcessing,
    isSpeaking,
    isSupported,
    currentMode,
    currentLanguage,
    messages,
    lastTranscript,
    sttConfidence,
    slowSpeechEnabled,
    
    // Actions
    startListening,
    stopListening,
    stopSpeaking,
    changeMode,
    setCurrentLanguage,
    setDetectionContext,
    setUserPreferences,
    setSlowSpeechEnabled,
    
    // Send text directly (for fallback UI)
    sendTextMessage: (text: string) => handleUserInput(text, 1.0)
  };
}

// Helper functions
function getErrorMessage(error: string, lang: string): string {
  const messages: Record<string, Record<string, string>> = {
    'not-allowed': {
      en: 'Please allow microphone access to use voice features.',
      hi: 'कृपया वॉयस फीचर्स का उपयोग करने के लिए माइक्रोफोन एक्सेस की अनुमति दें।',
      kn: 'ವಾಯ್ಸ್ ವೈಶಿಷ್ಟ್ಯಗಳನ್ನು ಬಳಸಲು ದಯವಿಟ್ಟು ಮೈಕ್ರೋಫೋನ್ ಪ್ರವೇಶವನ್ನು ಅನುಮತಿಸಿ.',
      te: 'వాయిస్ ఫీచర్లను ఉపయోగించడానికి దయచేసి మైక్రోఫోన్ యాక్సెస్‌ను అనుమతించండి.'
    },
    'network': {
      en: 'Network error. Please check your connection.',
      hi: 'नेटवर्क त्रुटि। कृपया अपना कनेक्शन जांचें।',
      kn: 'ನೆಟ್‌ವರ್ಕ್ ದೋಷ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸಂಪರ್ಕವನ್ನು ಪರಿಶೀಲಿಸಿ.',
      te: 'నెట్‌వర్క్ లోపం. దయచేసి మీ కనెక్షన్‌ని తనిఖీ చేయండి.'
    }
  };
  
  return messages[error]?.[lang] || messages[error]?.en || 'Voice recognition error occurred.';
}

function getClarifyMessage(lang: string): string {
  const messages: Record<string, string> = {
    en: 'I didn\'t catch that clearly. Could you please repeat?',
    hi: 'मैंने स्पष्ट रूप से नहीं सुना। क्या आप कृपया दोहरा सकते हैं?',
    kn: 'ನನಗೆ ಸ್ಪಷ್ಟವಾಗಿ ಕೇಳಿಸಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಹೇಳುತ್ತೀರಾ?',
    te: 'నాకు స్పష్టంగా వినిపించలేదు. దయచేసి మళ్ళీ చెప్పగలరా?'
  };
  return messages[lang] || messages.en;
}

function getFallbackResponse(mode: VoiceAgentMode, lang: string): string {
  const fallbacks: Record<VoiceAgentMode, Record<string, string>> = {
    teaching: {
      en: 'I\'m having trouble understanding. Let me connect you with a lesson instead.',
      hi: 'मुझे समझने में परेशानी हो रही है। मैं आपको एक पाठ से जोड़ता हूं।',
      kn: 'ನನಗೆ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ತೊಂದರೆಯಾಗುತ್ತಿದೆ. ಬದಲಿಗೆ ನಾನು ನಿಮ್ಮನ್ನು ಪಾಠದೊಂದಿಗೆ ಸಂಪರ್ಕಿಸುತ್ತೇನೆ.',
      te: 'నాకు అర్థం చేసుకోవడంలో ఇబ్బంది కలుగుతోంది. బదులుగా నేను మిమ్మల్ని పాఠంతో కనెక్ట్ చేస్తాను.'
    },
    diagnosis: {
      en: 'I cannot make a diagnosis from this. Please try scanning the plant with the camera for accurate results.',
      hi: 'मैं इससे निदान नहीं कर पा रहा हूं। सटीक परिणामों के लिए कृपया कैमरे से पौधे को स्कैन करें।',
      kn: 'ಇದರಿಂದ ನಾನು ರೋಗನಿರ್ಣಯ ಮಾಡಲು ಸಾಧ್ಯವಿಲ್ಲ. ನಿಖರ ಫಲಿತಾಂಶಗಳಿಗಾಗಿ ದಯವಿಟ್ಟು ಕ್ಯಾಮೆರಾದಿಂದ ಸಸ್ಯವನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ.',
      te: 'దీని నుండి నేను రోగనిర్ధారణ చేయలేకపోతున్నాను. ఖచ్చితమైన ఫలితాల కోసం దయచేసి కెమెరాతో మొక్కను స్కాన్ చేయండి.'
    },
    qa: {
      en: 'I\'m not sure about that. Let me look this up for you.',
      hi: 'मुझे इसके बारे में निश्चित नहीं है। मैं आपके लिए इसे खोजता हूं।',
      kn: 'ಅದರ ಬಗ್ಗೆ ನನಗೆ ಖಚಿತವಿಲ್ಲ. ನಾನು ನಿಮಗಾಗಿ ಇದನ್ನು ಹುಡುಕುತ್ತೇನೆ.',
      te: 'దాని గురించి నాకు ఖచ్చితంగా తెలియదు. నేను మీ కోసం దీన్ని చూస్తాను.'
    },
    assistant: {
      en: 'I\'m here to help. Could you rephrase that?',
      hi: 'मैं मदद के लिए यहां हूं। क्या आप इसे दोबारा कह सकते हैं?',
      kn: 'ನಾನು ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿದ್ದೇನೆ. ನೀವು ಅದನ್ನು ಮತ್ತೆ ಹೇಳಬಹುದೇ?',
      te: 'నేను సహాయం చేయడానికి ఇక్కడ ఉన్నాను. మీరు దానిని మళ్ళీ చెప్పగలరా?'
    }
  };
  
  return fallbacks[mode]?.[lang] || fallbacks[mode]?.en;
}

// AI processing function
async function processWithAI(
  text: string, 
  mode: VoiceAgentMode, 
  language: string, 
  context: VoiceAgentContext,
  history: VoiceAgentMessage[]
): Promise<string> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  // Build conversation context
  const recentHistory = history.slice(-6).map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content
  }));

  const response = await fetch(`${supabaseUrl}/functions/v1/voice-agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
    },
    body: JSON.stringify({
      message: text,
      mode,
      language,
      context,
      history: recentHistory
    })
  });

  if (!response.ok) {
    throw new Error('AI processing failed');
  }

  const data = await response.json();
  return data.response;
}
