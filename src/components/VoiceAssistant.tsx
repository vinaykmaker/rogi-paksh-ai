import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader2, Bot, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSpeechSynthesis, getLocalizedText } from '@/hooks/useSpeechSynthesis';

interface VoiceAssistantProps {
  currentLanguage: string;
  translations: any;
}

const LANG_CODES: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  kn: 'kn-IN'
};

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ currentLanguage, translations }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState<{ en: string; hi: string; kn: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();
  const { speak, stop, isSpeaking, isSupported: ttsSupported } = useSpeechSynthesis({ 
    language: currentLanguage,
    rate: 0.85 
  });

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) setTranscript(finalTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast({
            title: currentLanguage === 'hi' ? 'माइक्रोफ़ोन अनुमति अस्वीकृत' : currentLanguage === 'kn' ? 'ಮೈಕ್ರೋಫೋನ್ ಅನುಮತಿ ನಿರಾಕರಿಸಲಾಗಿದೆ' : 'Microphone Access Denied',
            description: currentLanguage === 'hi' ? 'कृपया माइक्रोफ़ोन की अनुमति दें' : currentLanguage === 'kn' ? 'ದಯವಿಟ್ಟು ಮೈಕ್ರೋಫೋನ್ ಪ್ರವೇಶವನ್ನು ಅನುಮತಿಸಿ' : 'Please allow microphone access',
            variant: "destructive"
          });
        }
      };

      recognitionRef.current.onend = () => setIsListening(false);
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [toast, currentLanguage]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      toast({
        title: currentLanguage === 'hi' ? 'समर्थित नहीं' : currentLanguage === 'kn' ? 'ಬೆಂಬಲವಿಲ್ಲ' : 'Not Supported',
        description: currentLanguage === 'hi' ? 'इस ब्राउज़र में वॉयस समर्थित नहीं है' : currentLanguage === 'kn' ? 'ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಬೆಂಬಲವಿಲ್ಲ' : 'Voice not supported in this browser',
        variant: "destructive"
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      if (transcript) processQuestion(transcript);
    } else {
      setTranscript('');
      setResponse(null);
      recognitionRef.current.lang = LANG_CODES[currentLanguage] || 'en-IN';
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Failed to start recognition:', error);
      }
    }
  }, [isListening, transcript, currentLanguage, toast]);

  const processQuestion = async (question: string) => {
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('agribot-chat', {
        body: { question }
      });

      if (error) throw error;

      if (data.en && data.hi && data.kn) {
        setResponse(data);
        // Auto-speak response
        const textToSpeak = getLocalizedText(data, currentLanguage);
        speak(textToSpeak);
      } else if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error('Failed to process question:', error);
      toast({
        title: currentLanguage === 'hi' ? 'त्रुटि' : currentLanguage === 'kn' ? 'ದೋಷ' : 'Error',
        description: currentLanguage === 'hi' ? 'जवाब पाने में विफल। पुनः प्रयास करें।' : currentLanguage === 'kn' ? 'ಉತ್ತರ ಪಡೆಯಲು ವಿಫಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.' : 'Failed to get response. Please try again.',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSpeak = () => {
    if (!response) return;
    if (isSpeaking) {
      stop();
    } else {
      speak(getLocalizedText(response, currentLanguage));
    }
  };

  const exampleQueries = [
    { en: "Why are my tomato leaves turning yellow?", hi: "मेरे टमाटर की पत्तियां पीली क्यों हो रही हैं?", kn: "ನನ್ನ ಟೊಮೆಟೊ ಎಲೆಗಳು ಏಕೆ ಹಳದಿ ಆಗುತ್ತಿವೆ?" },
    { en: "How to control aphids on my crops?", hi: "अपनी फसलों पर एफिड्स कैसे नियंत्रित करें?", kn: "ನನ್ನ ಬೆಳೆಗಳಲ್ಲಿ ಹೇನುಗಳನ್ನು ಹೇಗೆ ನಿಯಂತ್ರಿಸುವುದು?" },
    { en: "Best time to apply fertilizer for rice?", hi: "चावल के लिए खाद डालने का सबसे अच्छा समय?", kn: "ಭತ್ತಕ್ಕೆ ಗೊಬ್ಬರ ಹಾಕಲು ಉತ್ತಮ ಸಮಯ?" }
  ];

  const labels = {
    en: { title: '🎙️ AI Voice Assistant', subtitle: 'Speak and hear answers in your language', speak: 'Speak', stop: 'Stop', listening: '🎤 Listening... Speak now!', pressToSpeak: 'Press the button and ask your question', youSaid: 'You said:', thinking: 'Thinking...', listen: 'Listen', tryAsking: '💡 Try asking:' },
    hi: { title: '🎙️ AI आवाज़ सहायक', subtitle: 'अपनी भाषा में बोलें और जवाब सुनें', speak: 'बोलें', stop: 'रोकें', listening: '🎤 सुन रहा हूं... बोलें!', pressToSpeak: 'बटन दबाकर अपना सवाल बोलें', youSaid: 'आपने कहा:', thinking: 'सोच रहा हूं...', listen: 'सुनें', tryAsking: '💡 ऐसे सवाल पूछें:' },
    kn: { title: '🎙️ AI ಧ್ವನಿ ಸಹಾಯಕ', subtitle: 'ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಮಾತನಾಡಿ ಮತ್ತು ಉತ್ತರ ಕೇಳಿ', speak: 'ಮಾತನಾಡಿ', stop: 'ನಿಲ್ಲಿಸಿ', listening: '🎤 ಕೇಳುತ್ತಿದೆ... ಮಾತನಾಡಿ!', pressToSpeak: 'ಬಟನ್ ಒತ್ತಿ ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಹೇಳಿ', youSaid: 'ನೀವು ಹೇಳಿದ್ದು:', thinking: 'ಯೋಚಿಸುತ್ತಿದೆ...', listen: 'ಕೇಳಿ', tryAsking: '💡 ಈ ರೀತಿ ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಿ:' }
  };
  const t = labels[currentLanguage as keyof typeof labels] || labels.en;

  return (
    <Card className="w-full shadow-strong border-2 border-accent/30">
      <CardHeader className="bg-gradient-to-r from-accent to-accent-light text-accent-foreground rounded-t-lg">
        <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
          <Mic className="h-7 w-7" />
          {t.title}
        </CardTitle>
        <p className="text-accent-foreground/80 text-sm md:text-base">{t.subtitle}</p>
      </CardHeader>

      <CardContent className="p-4 md:p-6 space-y-6">
        {/* Voice Input Button */}
        <div className="flex flex-col items-center space-y-4">
          <Button
            onClick={toggleListening}
            disabled={isProcessing}
            size="lg"
            className={`w-32 h-32 rounded-full text-lg transition-all duration-300 ${
              isListening 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse scale-110' 
                : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {isListening ? (
              <div className="flex flex-col items-center">
                <MicOff className="h-12 w-12 mb-1" />
                <span className="text-xs">{t.stop}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Mic className="h-12 w-12 mb-1" />
                <span className="text-xs">{t.speak}</span>
              </div>
            )}
          </Button>

          <p className="text-center text-muted-foreground text-sm">
            {isListening ? (
              <span className="text-red-500 font-medium animate-pulse">{t.listening}</span>
            ) : (
              <span>{t.pressToSpeak}</span>
            )}
          </p>
        </div>

        {/* Transcript */}
        {transcript && (
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">{t.youSaid}</p>
            <p className="font-medium text-lg">{transcript}</p>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center justify-center gap-3 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-lg">{t.thinking}</span>
          </div>
        )}

        {/* Response */}
        {response && !isProcessing && (
          <div className="bg-primary/10 p-4 rounded-xl border border-primary/20 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">
                    {currentLanguage === 'hi' ? 'एग्रीबॉट' : currentLanguage === 'kn' ? 'ಅಗ್ರಿಬಾಟ್' : 'AgriBot'}
                  </span>
                  <Button onClick={handleSpeak} variant="ghost" size="sm" className="gap-2">
                    {isSpeaking ? (
                      <><VolumeX className="h-5 w-5" />{t.stop}</>
                    ) : (
                      <><Volume2 className="h-5 w-5" />{t.listen}</>
                    )}
                  </Button>
                </div>
                <p className="text-foreground whitespace-pre-line leading-relaxed">
                  {getLocalizedText(response, currentLanguage)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Example Queries */}
        {!response && !transcript && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-medium">{t.tryAsking}</p>
            <div className="grid gap-2">
              {exampleQueries.map((query, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="justify-start text-left h-auto py-3 px-4"
                  onClick={() => {
                    const q = getLocalizedText(query, currentLanguage);
                    setTranscript(q);
                    processQuestion(q);
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-3 flex-shrink-0" />
                  <span className="text-sm">{getLocalizedText(query, currentLanguage)}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceAssistant;
