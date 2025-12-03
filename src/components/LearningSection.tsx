import React, { useState, useEffect } from 'react';
import { BookOpen, RefreshCw, CheckCircle, Lightbulb, Volume2, ChevronRight, Trophy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Lesson {
  title: { en: string; hi: string; kn: string };
  duration: string;
  difficulty: string;
  icon: string;
  summary: { en: string; hi: string; kn: string };
  keyPoints: Array<{ en: string; hi: string; kn: string }>;
  practicalTip: { en: string; hi: string; kn: string };
  didYouKnow: { en: string; hi: string; kn: string };
  quiz?: {
    question: { en: string; hi: string; kn: string };
    options: string[];
    answer: number;
  };
  generatedAt?: string;
}

interface LearningSectionProps {
  currentLanguage: string;
  translations: any;
}

const LearningSection: React.FC<LearningSectionProps> = ({ currentLanguage, translations }) => {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { toast } = useToast();

  // Predefined topics for variety
  const topics = [
    "organic pest control",
    "soil health improvement",
    "water conservation techniques",
    "crop rotation benefits",
    "composting at home",
    "natural fertilizers",
    "seed selection tips",
    "weather-based farming",
    "pest identification",
    "harvest timing"
  ];

  const generateLesson = async (topic?: string) => {
    setIsLoading(true);
    setSelectedAnswer(null);
    setShowAnswer(false);

    try {
      const randomTopic = topic || topics[Math.floor(Math.random() * topics.length)];
      
      const { data, error } = await supabase.functions.invoke('generate-lesson', {
        body: { 
          topic: randomTopic,
          language: currentLanguage 
        }
      });

      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      setLesson(data);
      
      // Cache in localStorage
      localStorage.setItem('agribot_last_lesson', JSON.stringify({
        ...data,
        cachedAt: new Date().toISOString()
      }));

    } catch (error) {
      console.error('Failed to generate lesson:', error);
      toast({
        title: "Error",
        description: "Failed to generate lesson. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load cached lesson on mount
  useEffect(() => {
    const cached = localStorage.getItem('agribot_last_lesson');
    if (cached) {
      try {
        const parsedLesson = JSON.parse(cached);
        // Use cached if less than 24 hours old
        const cachedTime = new Date(parsedLesson.cachedAt).getTime();
        if (Date.now() - cachedTime < 24 * 60 * 60 * 1000) {
          setLesson(parsedLesson);
        }
      } catch (e) {
        console.error('Failed to parse cached lesson:', e);
      }
    }
  }, []);

  const getLocalizedText = (obj: { en: string; hi: string; kn: string } | undefined) => {
    if (!obj) return '';
    return obj[currentLanguage as keyof typeof obj] || obj.en;
  };

  const speakText = (text: string) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const langCodes: { [key: string]: string } = {
      en: 'en-IN',
      hi: 'hi-IN',
      kn: 'kn-IN'
    };
    utterance.lang = langCodes[currentLanguage] || 'en-IN';
    utterance.rate = 0.85;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'bg-green-500';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-red-500';
      default: return 'bg-primary';
    }
  };

  const handleAnswerSelect = (index: number) => {
    if (showAnswer) return;
    setSelectedAnswer(index);
    setShowAnswer(true);
  };

  return (
    <section id="learn" className="py-12 md:py-20 bg-gradient-earth">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">
            {currentLanguage === 'hi' ? '📚 दैनिक खेती पाठ' :
             currentLanguage === 'kn' ? '📚 ದೈನಿಕ ಕೃಷಿ ಪಾಠ' :
             '📚 Daily Farming Lessons'}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {currentLanguage === 'hi' ? 'हर दिन कुछ नया सीखें - 5 मिनट में' :
             currentLanguage === 'kn' ? 'ಪ್ರತಿದಿನ ಹೊಸದನ್ನು ಕಲಿಯಿರಿ - 5 ನಿಮಿಷದಲ್ಲಿ' :
             'Learn something new every day - in just 5 minutes'}
          </p>
        </div>

        {/* Generate Lesson Button */}
        {!lesson && !isLoading && (
          <div className="max-w-2xl mx-auto text-center">
            <Card className="p-8 bg-card/80 backdrop-blur">
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-4">
                {currentLanguage === 'hi' ? 'आज का पाठ शुरू करें' :
                 currentLanguage === 'kn' ? 'ಇಂದಿನ ಪಾಠ ಪ್ರಾರಂಭಿಸಿ' :
                 'Start Today\'s Lesson'}
              </h3>
              <Button onClick={() => generateLesson()} size="lg" className="touch-target text-lg gap-2">
                <BookOpen className="h-5 w-5" />
                {currentLanguage === 'hi' ? 'पाठ शुरू करें' :
                 currentLanguage === 'kn' ? 'ಪಾಠ ಪ್ರಾರಂಭಿಸಿ' :
                 'Generate Lesson'}
              </Button>
            </Card>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="max-w-2xl mx-auto text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg text-muted-foreground">
              {currentLanguage === 'hi' ? 'आपके लिए पाठ तैयार हो रहा है...' :
               currentLanguage === 'kn' ? 'ನಿಮಗಾಗಿ ಪಾಠ ಸಿದ್ಧವಾಗುತ್ತಿದೆ...' :
               'Preparing your lesson...'}
            </p>
          </div>
        )}

        {/* Lesson Content */}
        {lesson && !isLoading && (
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Lesson Header */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-primary text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{lesson.icon}</span>
                    <div>
                      <CardTitle className="text-xl md:text-2xl mb-1">
                        {getLocalizedText(lesson.title)}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-white/20 text-white">
                          ⏱️ {lesson.duration}
                        </Badge>
                        <Badge className={`${getDifficultyColor(lesson.difficulty)} text-white`}>
                          {lesson.difficulty}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => generateLesson()}
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Summary */}
                <div className="flex items-start gap-3">
                  <p className="text-lg leading-relaxed">{getLocalizedText(lesson.summary)}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => speakText(getLocalizedText(lesson.summary))}
                  >
                    <Volume2 className={`h-5 w-5 ${isSpeaking ? 'animate-pulse text-primary' : ''}`} />
                  </Button>
                </div>

                {/* Key Points */}
                <div className="bg-muted/50 p-4 rounded-xl">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    {currentLanguage === 'hi' ? 'मुख्य बातें:' :
                     currentLanguage === 'kn' ? 'ಮುಖ್ಯ ಅಂಶಗಳು:' :
                     'Key Points:'}
                  </h4>
                  <ul className="space-y-3">
                    {lesson.keyPoints?.map((point, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <ChevronRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span>{getLocalizedText(point)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Practical Tip */}
                <div className="bg-accent/10 p-4 rounded-xl border border-accent/30">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-accent-foreground">
                    <Lightbulb className="h-5 w-5 text-accent" />
                    {currentLanguage === 'hi' ? '💡 व्यावहारिक सुझाव:' :
                     currentLanguage === 'kn' ? '💡 ಪ್ರಾಯೋಗಿಕ ಸಲಹೆ:' :
                     '💡 Practical Tip:'}
                  </h4>
                  <p>{getLocalizedText(lesson.practicalTip)}</p>
                </div>

                {/* Did You Know */}
                <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold mb-2 text-blue-700 dark:text-blue-400">
                    🤔 {currentLanguage === 'hi' ? 'क्या आप जानते हैं?' :
                         currentLanguage === 'kn' ? 'ನಿಮಗೆ ಗೊತ್ತೇ?' :
                         'Did You Know?'}
                  </h4>
                  <p className="text-blue-700 dark:text-blue-300">{getLocalizedText(lesson.didYouKnow)}</p>
                </div>

                {/* Quiz */}
                {lesson.quiz && (
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-primary" />
                      {currentLanguage === 'hi' ? '🎯 त्वरित प्रश्नोत्तरी:' :
                       currentLanguage === 'kn' ? '🎯 ತ್ವರಿತ ಕ್ವಿಜ್:' :
                       '🎯 Quick Quiz:'}
                    </h4>
                    <p className="mb-4 font-medium">{getLocalizedText(lesson.quiz.question)}</p>
                    <div className="grid gap-2">
                      {lesson.quiz.options.map((option, index) => (
                        <Button
                          key={index}
                          variant={
                            showAnswer
                              ? index === lesson.quiz!.answer
                                ? 'default'
                                : selectedAnswer === index
                                ? 'danger'
                                : 'outline'
                              : 'outline'
                          }
                          className={`justify-start text-left h-auto py-3 ${
                            showAnswer && index === lesson.quiz!.answer ? 'bg-green-500 hover:bg-green-500' : ''
                          }`}
                          onClick={() => handleAnswerSelect(index)}
                          disabled={showAnswer}
                        >
                          <span className="font-bold mr-3">{String.fromCharCode(65 + index)}.</span>
                          {option}
                        </Button>
                      ))}
                    </div>
                    {showAnswer && (
                      <p className={`mt-3 font-medium ${selectedAnswer === lesson.quiz.answer ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedAnswer === lesson.quiz.answer
                          ? (currentLanguage === 'hi' ? '✅ सही जवाब!' : currentLanguage === 'kn' ? '✅ ಸರಿಯಾದ ಉತ್ತರ!' : '✅ Correct!')
                          : (currentLanguage === 'hi' ? '❌ गलत। सही जवाब ऊपर हरे रंग में है।' : currentLanguage === 'kn' ? '❌ ತಪ್ಪು. ಸರಿಯಾದ ಉತ್ತರ ಮೇಲೆ ಹಸಿರು ಬಣ್ಣದಲ್ಲಿ.' : '❌ Incorrect. Correct answer is highlighted in green.')}
                      </p>
                    )}
                  </div>
                )}

                {/* Next Lesson Button */}
                <Button onClick={() => generateLesson()} className="w-full touch-target gap-2">
                  <RefreshCw className="h-5 w-5" />
                  {currentLanguage === 'hi' ? 'अगला पाठ लोड करें' :
                   currentLanguage === 'kn' ? 'ಮುಂದಿನ ಪಾಠ ಲೋಡ್ ಮಾಡಿ' :
                   'Load Next Lesson'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
};

export default LearningSection;
