import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, MessageSquare, Brain, Stethoscope, HelpCircle, User, Settings, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useVoiceAgent, VoiceAgentMode, VoiceAgentMessage } from '@/hooks/useVoiceAgent';
import { cn } from '@/lib/utils';

interface VoiceAgentProps {
  currentLanguage: string;
  translations: any;
  onDetectionResult?: (result: any) => void;
}

const MODE_CONFIG: Record<VoiceAgentMode, { icon: React.ElementType; color: string; label: Record<string, string> }> = {
  teaching: {
    icon: Brain,
    color: 'bg-blue-500',
    label: { en: 'Teaching', hi: 'शिक्षण', kn: 'ಬೋಧನೆ', te: 'బోధన' }
  },
  diagnosis: {
    icon: Stethoscope,
    color: 'bg-red-500',
    label: { en: 'Diagnosis', hi: 'निदान', kn: 'ರೋಗನಿರ್ಣಯ', te: 'రోగనిర్ధారణ' }
  },
  qa: {
    icon: HelpCircle,
    color: 'bg-yellow-500',
    label: { en: 'Q&A', hi: 'प्रश्न-उत्तर', kn: 'ಪ್ರಶ್ನೋತ್ತರ', te: 'ప్రశ్నోత్తరాలు' }
  },
  assistant: {
    icon: User,
    color: 'bg-green-500',
    label: { en: 'Assistant', hi: 'सहायक', kn: 'ಸಹಾಯಕ', te: 'సహాయకుడు' }
  }
};

const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिंदी' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' }
];

export const VoiceAgent: React.FC<VoiceAgentProps> = ({
  currentLanguage,
  translations,
  onDetectionResult
}) => {
  const { toast } = useToast();
  const [textInput, setTextInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const {
    isListening,
    isProcessing,
    isSpeaking,
    isSupported,
    currentMode,
    messages,
    lastTranscript,
    sttConfidence,
    slowSpeechEnabled,
    startListening,
    stopListening,
    stopSpeaking,
    changeMode,
    setCurrentLanguage,
    setSlowSpeechEnabled,
    sendTextMessage
  } = useVoiceAgent({
    defaultLanguage: currentLanguage,
    defaultMode: 'assistant',
    onError: (error) => {
      toast({
        title: getLocalText('error', currentLanguage),
        description: error,
        variant: 'destructive' as const
      });
    }
  });

  // Update language when prop changes
  useEffect(() => {
    setCurrentLanguage(currentLanguage);
  }, [currentLanguage, setCurrentLanguage]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      sendTextMessage(textInput.trim());
      setTextInput('');
    }
  };

  const ModeIcon = MODE_CONFIG[currentMode].icon;

  return (
    <Card className="w-full bg-card/95 backdrop-blur border-border/50">
      <CardContent className="p-4 space-y-4">
        {/* Header with mode selector and settings */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-full", MODE_CONFIG[currentMode].color)}>
              <ModeIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {getLocalText('voiceAssistant', currentLanguage)}
              </h3>
              <p className="text-xs text-muted-foreground">
                {MODE_CONFIG[currentMode].label[currentLanguage] || MODE_CONFIG[currentMode].label.en}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Online status */}
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            
            {/* Settings toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-3">
            {/* Language selector */}
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((lang) => (
                <Button
                  key={lang.code}
                  variant={currentLanguage === lang.code ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentLanguage(lang.code)}
                >
                  {lang.native}
                </Button>
              ))}
            </div>
            
            {/* Slow speech toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="slow-speech" className="text-sm">
                {getLocalText('slowSpeech', currentLanguage)}
              </Label>
              <Switch
                id="slow-speech"
                checked={slowSpeechEnabled}
                onCheckedChange={setSlowSpeechEnabled}
              />
            </div>
          </div>
        )}

        {/* Mode selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(Object.keys(MODE_CONFIG) as VoiceAgentMode[]).map((mode) => {
            const config = MODE_CONFIG[mode];
            const Icon = config.icon;
            return (
              <Button
                key={mode}
                variant={currentMode === mode ? 'default' : 'outline'}
                size="sm"
                onClick={() => changeMode(mode)}
                className="flex-shrink-0"
              >
                <Icon className="h-4 w-4 mr-1" />
                {config.label[currentLanguage] || config.label.en}
              </Button>
            );
          })}
        </div>

        {/* Messages display */}
        <div className="max-h-48 overflow-y-auto space-y-2 bg-muted/30 rounded-lg p-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {getLocalText('startConversation', currentLanguage)}
            </p>
          ) : (
            messages.slice(-6).map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          )}
          
          {/* Live transcript */}
          {isListening && lastTranscript && (
            <div className="text-sm text-muted-foreground italic">
              {lastTranscript}...
              {sttConfidence < 0.7 && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {getLocalText('lowConfidence', currentLanguage)}
                </Badge>
              )}
            </div>
          )}
          
          {/* Processing indicator */}
          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-pulse">●</div>
              {getLocalText('thinking', currentLanguage)}
            </div>
          )}
        </div>

        {/* Voice controls */}
        <div className="flex items-center justify-center gap-4">
          {/* Main mic button */}
          <Button
            size="lg"
            variant={isListening ? 'danger' : 'default'}
            className={cn(
              "h-16 w-16 rounded-full transition-all",
              isListening && "animate-pulse ring-4 ring-red-500/30"
            )}
            onClick={handleVoiceToggle}
            disabled={!isSupported || isProcessing}
          >
            {isListening ? (
              <MicOff className="h-8 w-8" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </Button>
          
          {/* Stop speaking button */}
          {isSpeaking && (
            <Button
              size="icon"
              variant="outline"
              onClick={stopSpeaking}
            >
              <VolumeX className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Text input fallback */}
        <form onSubmit={handleTextSubmit} className="flex gap-2">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={getLocalText('typeMessage', currentLanguage)}
            disabled={isProcessing}
            className="flex-1"
          />
          <Button type="submit" disabled={!textInput.trim() || isProcessing}>
            <MessageSquare className="h-4 w-4" />
          </Button>
        </form>

        {/* Browser support warning */}
        {!isSupported && (
          <p className="text-xs text-destructive text-center">
            {getLocalText('voiceNotSupported', currentLanguage)}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// Message bubble component
const MessageBubble: React.FC<{ message: VoiceAgentMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn(
      "flex",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[85%] px-3 py-2 rounded-lg text-sm",
        isUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted text-foreground"
      )}>
        {message.content}
        {message.confidence && message.confidence < 0.8 && (
          <span className="text-xs opacity-60 ml-2">
            ({Math.round(message.confidence * 100)}%)
          </span>
        )}
      </div>
    </div>
  );
};

// Localization helper
function getLocalText(key: string, lang: string): string {
  const texts: Record<string, Record<string, string>> = {
    voiceAssistant: {
      en: 'AGRIBOT Voice',
      hi: 'एग्रीबॉट वॉयस',
      kn: 'ಅಗ್ರಿಬಾಟ್ ವಾಯ್ಸ್',
      te: 'అగ్రిబాట్ వాయిస్'
    },
    startConversation: {
      en: 'Tap the mic to start talking',
      hi: 'बोलना शुरू करने के लिए माइक पर टैप करें',
      kn: 'ಮಾತನಾಡಲು ಮೈಕ್ ಟ್ಯಾಪ್ ಮಾಡಿ',
      te: 'మాట్లాడడం ప్రారంభించడానికి మైక్‌పై నొక్కండి'
    },
    thinking: {
      en: 'Thinking...',
      hi: 'सोच रहा हूं...',
      kn: 'ಯೋಚಿಸುತ್ತಿದ್ದೇನೆ...',
      te: 'ఆలోచిస్తున్నాను...'
    },
    typeMessage: {
      en: 'Type your message...',
      hi: 'अपना संदेश लिखें...',
      kn: 'ನಿಮ್ಮ ಸಂದೇಶವನ್ನು ಟೈಪ್ ಮಾಡಿ...',
      te: 'మీ సందేశాన్ని టైప్ చేయండి...'
    },
    error: {
      en: 'Error',
      hi: 'त्रुटि',
      kn: 'ದೋಷ',
      te: 'లోపం'
    },
    lowConfidence: {
      en: 'Unclear',
      hi: 'अस्पष्ट',
      kn: 'ಅಸ್ಪಷ್ಟ',
      te: 'అస్పష్టం'
    },
    slowSpeech: {
      en: 'Slow Speech',
      hi: 'धीमी आवाज',
      kn: 'ನಿಧಾನ ಮಾತು',
      te: 'నెమ్మదిగా మాట్లాడటం'
    },
    voiceNotSupported: {
      en: 'Voice features not supported in this browser',
      hi: 'इस ब्राउज़र में वॉयस फीचर समर्थित नहीं है',
      kn: 'ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ವಾಯ್ಸ್ ವೈಶಿಷ್ಟ್ಯಗಳು ಬೆಂಬಲಿತವಾಗಿಲ್ಲ',
      te: 'ఈ బ్రౌజర్‌లో వాయిస్ ఫీచర్లు సపోర్ట్ చేయబడవు'
    }
  };
  
  return texts[key]?.[lang] || texts[key]?.en || key;
}

export default VoiceAgent;
