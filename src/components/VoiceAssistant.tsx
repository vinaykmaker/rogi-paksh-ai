import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader2, Bot, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VoiceAssistantProps {
  currentLanguage: string;
  translations: any;
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ currentLanguage, translations }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState<{ en: string; hi: string; kn: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

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
        if (finalTranscript) {
          setTranscript(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast({
            title: "Microphone Access Denied",
            description: "Please allow microphone access to use voice input.",
            variant: "destructive"
          });
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in this browser.",
        variant: "destructive"
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      if (transcript) {
        processQuestion(transcript);
      }
    } else {
      setTranscript('');
      setResponse(null);
      
      // Set language for recognition
      const langCodes: { [key: string]: string } = {
        en: 'en-IN',
        hi: 'hi-IN',
        kn: 'kn-IN'
      };
      recognitionRef.current.lang = langCodes[currentLanguage] || 'en-IN';
      
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Failed to start recognition:', error);
      }
    }
  };

  const processQuestion = async (question: string) => {
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('agribot-chat', {
        body: { question }
      });

      if (error) throw error;

      if (data.en && data.hi && data.kn) {
        setResponse(data);
        // Auto-speak the response
        speakResponse(data);
      } else if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to process question:', error);
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const speakResponse = (responseData: { en: string; hi: string; kn: string }) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = responseData[currentLanguage as keyof typeof responseData] || responseData.en;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    const langCodes: { [key: string]: string } = {
      en: 'en-IN',
      hi: 'hi-IN',
      kn: 'kn-IN'
    };
    
    utterance.lang = langCodes[currentLanguage] || 'en-IN';
    utterance.rate = 0.85;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const getLocalizedText = () => {
    if (!response) return '';
    return response[currentLanguage as keyof typeof response] || response.en;
  };

  const exampleQueries = [
    { en: "Why are my tomato leaves turning yellow?", hi: "मेरे टमाटर की पत्तियां पीली क्यों हो रही हैं?", kn: "ನನ್ನ ಟೊಮೆಟೊ ಎಲೆಗಳು ಏಕೆ ಹಳದಿ ಆಗುತ್ತಿವೆ?" },
    { en: "How to control aphids on my crops?", hi: "अपनी फसलों पर एफिड्स कैसे नियंत्रित करें?", kn: "ನನ್ನ ಬೆಳೆಗಳಲ್ಲಿ ಹೇನುಗಳನ್ನು ಹೇಗೆ ನಿಯಂತ್ರಿಸುವುದು?" },
    { en: "Best time to apply fertilizer for rice?", hi: "चावल के लिए खाद डालने का सबसे अच्छा समय?", kn: "ಭತ್ತಕ್ಕೆ ಗೊಬ್ಬರ ಹಾಕಲು ಉತ್ತಮ ಸಮಯ?" }
  ];

  return (
    <Card className="w-full shadow-strong border-2 border-accent/30">
      <CardHeader className="bg-gradient-to-r from-accent to-accent-light text-accent-foreground rounded-t-lg">
        <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
          <Mic className="h-7 w-7" />
          {currentLanguage === 'hi' ? '🎙️ AI आवाज़ सहायक' : 
           currentLanguage === 'kn' ? '🎙️ AI ಧ್ವನಿ ಸಹಾಯಕ' : 
           '🎙️ AI Voice Assistant'}
        </CardTitle>
        <p className="text-accent-foreground/80 text-sm md:text-base">
          {currentLanguage === 'hi' ? 'अपनी भाषा में बोलें और जवाब सुनें' :
           currentLanguage === 'kn' ? 'ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಮಾತನಾಡಿ ಮತ್ತು ಉತ್ತರ ಕೇಳಿ' :
           'Speak in your language and hear the answer'}
        </p>
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
                <span className="text-xs">
                  {currentLanguage === 'hi' ? 'रोकें' : currentLanguage === 'kn' ? 'ನಿಲ್ಲಿಸಿ' : 'Stop'}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Mic className="h-12 w-12 mb-1" />
                <span className="text-xs">
                  {currentLanguage === 'hi' ? 'बोलें' : currentLanguage === 'kn' ? 'ಮಾತನಾಡಿ' : 'Speak'}
                </span>
              </div>
            )}
          </Button>

          <p className="text-center text-muted-foreground text-sm">
            {isListening ? (
              <span className="text-red-500 font-medium animate-pulse">
                {currentLanguage === 'hi' ? '🎤 सुन रहा हूं... बोलें!' :
                 currentLanguage === 'kn' ? '🎤 ಕೇಳುತ್ತಿದೆ... ಮಾತನಾಡಿ!' :
                 '🎤 Listening... Speak now!'}
              </span>
            ) : (
              <span>
                {currentLanguage === 'hi' ? 'बटन दबाकर अपना सवाल बोलें' :
                 currentLanguage === 'kn' ? 'ಬಟನ್ ಒತ್ತಿ ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಹೇಳಿ' :
                 'Press the button and ask your question'}
              </span>
            )}
          </p>
        </div>

        {/* Transcript */}
        {transcript && (
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">
              {currentLanguage === 'hi' ? 'आपने कहा:' : currentLanguage === 'kn' ? 'ನೀವು ಹೇಳಿದ್ದು:' : 'You said:'}
            </p>
            <p className="font-medium text-lg">{transcript}</p>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center justify-center gap-3 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-lg">
              {currentLanguage === 'hi' ? 'सोच रहा हूं...' :
               currentLanguage === 'kn' ? 'ಯೋಚಿಸುತ್ತಿದೆ...' :
               'Thinking...'}
            </span>
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
                  <Button
                    onClick={() => speakResponse(response)}
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                  >
                    {isSpeaking ? (
                      <>
                        <VolumeX className="h-5 w-5" />
                        {currentLanguage === 'hi' ? 'रोकें' : currentLanguage === 'kn' ? 'ನಿಲ್ಲಿಸಿ' : 'Stop'}
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-5 w-5" />
                        {currentLanguage === 'hi' ? 'सुनें' : currentLanguage === 'kn' ? 'ಕೇಳಿ' : 'Listen'}
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-foreground whitespace-pre-line leading-relaxed">
                  {getLocalizedText()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Example Queries */}
        {!response && !transcript && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-medium">
              {currentLanguage === 'hi' ? '💡 ऐसे सवाल पूछें:' :
               currentLanguage === 'kn' ? '💡 ಈ ರೀತಿ ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಿ:' :
               '💡 Try asking questions like:'}
            </p>
            <div className="grid gap-2">
              {exampleQueries.map((query, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="justify-start text-left h-auto py-3 px-4"
                  onClick={() => {
                    const q = query[currentLanguage as keyof typeof query] || query.en;
                    setTranscript(q);
                    processQuestion(q);
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-3 flex-shrink-0" />
                  <span className="text-sm">
                    {query[currentLanguage as keyof typeof query] || query.en}
                  </span>
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
