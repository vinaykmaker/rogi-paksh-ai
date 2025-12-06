import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, Send, Mic, MicOff, Volume2, Loader2, 
  Lightbulb, ThumbsUp, ThumbsDown, Copy, Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  helpful?: boolean;
}

interface InteractiveQAProps {
  currentLanguage: string;
  context?: {
    topic?: string;
    crop?: string;
    region?: string;
  };
}

const SUGGESTED_QUESTIONS = {
  en: [
    'How to prevent leaf curl in tomato?',
    'Best time to apply fertilizer for rice?',
    'How to identify nitrogen deficiency?',
    'Natural pest control for cotton?',
    'When to harvest groundnuts?'
  ],
  hi: [
    'टमाटर में पत्ती मुड़ने से कैसे बचाएं?',
    'चावल में खाद कब डालें?',
    'नाइट्रोजन की कमी कैसे पहचानें?',
    'कपास में प्राकृतिक कीट नियंत्रण?',
    'मूंगफली कब काटें?'
  ],
  kn: [
    'ಟೊಮ್ಯಾಟೊದಲ್ಲಿ ಎಲೆ ಸುರುಳಿಯನ್ನು ತಡೆಯುವುದು ಹೇಗೆ?',
    'ಅಕ್ಕಿಗೆ ಗೊಬ್ಬರ ಹಾಕಲು ಉತ್ತಮ ಸಮಯ?',
    'ಸಾರಜನಕ ಕೊರತೆಯನ್ನು ಗುರುತಿಸುವುದು ಹೇಗೆ?',
    'ಹತ್ತಿಗೆ ನೈಸರ್ಗಿಕ ಕೀಟ ನಿಯಂತ್ರಣ?',
    'ಕಡಲೆಕಾಯಿ ಯಾವಾಗ ಕೊಯ್ಯಬೇಕು?'
  ],
  te: [
    'టమాటాలో ఆకు ముడత నివారించడం ఎలా?',
    'వరికి ఎరువులు వేయడానికి ఉత్తమ సమయం?',
    'నత్రజని లోపాన్ని గుర్తించడం ఎలా?',
    'పత్తికి సహజ పురుగుమందు నియంత్రణ?',
    'వేరుశెనగ ఎప్పుడు కోయాలి?'
  ]
};

const InteractiveQA: React.FC<InteractiveQAProps> = ({ currentLanguage, context }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  
  const { speak, toggle, isSpeaking } = useSpeechSynthesis({ language: currentLanguage });
  const { toast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      const langMap: Record<string, string> = {
        en: 'en-IN',
        hi: 'hi-IN',
        kn: 'kn-IN',
        te: 'te-IN'
      };
      recognitionRef.current.lang = langMap[currentLanguage] || 'en-IN';
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };
      
      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [currentLanguage]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: 'Voice input not supported',
        variant: 'destructive'
      });
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('voice-agent', {
        body: {
          message: content,
          mode: 'qa',
          language: currentLanguage,
          context: {
            ...context,
            conversationHistory: messages.slice(-6).map(m => ({
              role: m.role,
              content: m.content
            }))
          }
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || data.text || 'Sorry, I could not process that.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('QA error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: currentLanguage === 'hi' 
          ? 'क्षमा करें, कुछ गड़बड़ हुई। कृपया पुनः प्रयास करें।'
          : currentLanguage === 'kn'
          ? 'ಕ್ಷಮಿಸಿ, ಏನೋ ತಪ್ಪಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.'
          : 'Sorry, something went wrong. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = (messageId: string, helpful: boolean) => {
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, helpful } : m
    ));
    toast({
      title: helpful ? '👍 Thanks for feedback!' : '👎 We\'ll improve!'
    });
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: 'Copied!' });
  };

  const labels = {
    en: {
      title: 'Ask Your Farming Question',
      placeholder: 'Type your question...',
      send: 'Send',
      suggestions: 'Try asking:',
      listening: 'Listening...',
      helpful: 'Was this helpful?'
    },
    hi: {
      title: 'अपना खेती सवाल पूछें',
      placeholder: 'अपना सवाल टाइप करें...',
      send: 'भेजें',
      suggestions: 'ये पूछें:',
      listening: 'सुन रहा हूं...',
      helpful: 'क्या यह मददगार था?'
    },
    kn: {
      title: 'ನಿಮ್ಮ ಕೃಷಿ ಪ್ರಶ್ನೆ ಕೇಳಿ',
      placeholder: 'ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಟೈಪ್ ಮಾಡಿ...',
      send: 'ಕಳುಹಿಸಿ',
      suggestions: 'ಇವನ್ನು ಕೇಳಿ:',
      listening: 'ಕೇಳುತ್ತಿದೆ...',
      helpful: 'ಇದು ಸಹಾಯಕವಾಗಿತ್ತೇ?'
    },
    te: {
      title: 'మీ వ్యవసాయ ప్రశ్న అడగండి',
      placeholder: 'మీ ప్రశ్న టైప్ చేయండి...',
      send: 'పంపండి',
      suggestions: 'ఇవి అడగండి:',
      listening: 'వింటోంది...',
      helpful: 'ఇది సహాయకరంగా ఉందా?'
    }
  };

  const t = labels[currentLanguage as keyof typeof labels] || labels.en;
  const suggestions = SUGGESTED_QUESTIONS[currentLanguage as keyof typeof SUGGESTED_QUESTIONS] || SUGGESTED_QUESTIONS.en;

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          {t.title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center text-muted-foreground py-8">
                <Lightbulb className="h-12 w-12 mx-auto mb-4 text-primary/50" />
                <p className="mb-4">{t.suggestions}</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.slice(0, 4).map((q, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 py-2 px-3"
                    onClick={() => sendMessage(q)}
                  >
                    {q}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/20">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => toggle(message.content)}
                        >
                          <Volume2 className={`h-3 w-3 ${isSpeaking ? 'animate-pulse' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => copyMessage(message.content)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <div className="flex-1" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-6 px-2 ${message.helpful === true ? 'text-green-500' : ''}`}
                          onClick={() => handleFeedback(message.id, true)}
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-6 px-2 ${message.helpful === false ? 'text-red-500' : ''}`}
                          onClick={() => handleFeedback(message.id, false)}
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Button
              variant={isListening ? 'default' : 'outline'}
              size="icon"
              onClick={toggleListening}
              className={isListening ? 'animate-pulse' : ''}
            >
              {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
            <Input
              placeholder={isListening ? t.listening : t.placeholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage(inputValue)}
              disabled={isLoading || isListening}
              className="flex-1"
            />
            <Button
              onClick={() => sendMessage(inputValue)}
              disabled={!inputValue.trim() || isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InteractiveQA;
