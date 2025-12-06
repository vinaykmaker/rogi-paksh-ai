import React, { useState, useCallback } from 'react';
import { Loader2, BookOpen, MessageCircle, Bell, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLessonCache } from '@/hooks/useOfflineCache';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import ProgressDashboard from './education/ProgressDashboard';
import EnhancedMicroLesson from './education/EnhancedMicroLesson';
import EnhancedTopicSelector from './education/EnhancedTopicSelector';
import InteractiveQA from './education/InteractiveQA';
import LearningNotifications from './education/LearningNotifications';
import OfflineIndicator from './education/OfflineIndicator';

interface Lesson {
  title: { en: string; hi: string; kn: string; te?: string };
  duration: string;
  difficulty: string;
  icon: string;
  category?: string;
  summary: { en: string; hi: string; kn: string; te?: string };
  audioSummary?: { en: string; hi: string; kn: string; te?: string };
  keyPoints: Array<{ en: string; hi: string; kn: string; te?: string }>;
  stepByStep?: Array<{
    step: number;
    action: { en: string; hi: string; kn: string; te?: string };
    timing?: string;
    materials?: string[];
    warning?: { en: string; hi: string; kn: string; te?: string };
  }>;
  practicalTip: { en: string; hi: string; kn: string; te?: string };
  didYouKnow: { en: string; hi: string; kn: string; te?: string };
  doNot?: { en: string; hi: string; kn: string; te?: string };
  preventionTips?: Array<{ en: string; hi: string; kn: string; te?: string }>;
  quiz?: {
    question: { en: string; hi: string; kn: string; te?: string };
    options: string[];
    answer: number;
    explanation?: { en: string; hi: string; kn: string; te?: string };
  };
  additionalQuizzes?: Array<{
    question: { en: string; hi: string; kn: string; te?: string };
    options: string[];
    answer: number;
    explanation?: { en: string; hi: string; kn: string; te?: string };
  }>;
  videoTopic?: string;
  governmentSchemes?: Array<{
    name: string;
    description: { en: string; hi: string; kn: string; te?: string };
  }>;
  relatedTopics?: string[];
  generatedAt?: string;
}

interface LearningSectionProps {
  currentLanguage: string;
  translations: any;
}

const LearningSection: React.FC<LearningSectionProps> = ({ currentLanguage }) => {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [showTopicSelector, setShowTopicSelector] = useState(true);
  const [activeTab, setActiveTab] = useState('lessons');
  const [learningContext, setLearningContext] = useState<{
    topic?: string;
    crop?: string;
    region?: string;
  }>({});

  const { toast } = useToast();
  const { addLesson, getCachedLessons } = useLessonCache();

  const generateLesson = useCallback(
    async (topic?: string, cropType?: string, season?: string, region?: string) => {
      setIsLoading(true);
      setIsFromCache(false);
      setShowTopicSelector(false);
      setLearningContext({ topic, crop: cropType, region });

      try {
        const { data, error } = await supabase.functions.invoke('generate-lesson', {
          body: {
            topic,
            cropType,
            season,
            region,
            language: currentLanguage,
            skillLevel: 'beginner',
            lessonType: 'detailed'
          }
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        setLesson(data);
        addLesson(data);
      } catch (err) {
        console.error('Lesson generation failed:', err);

        const cached = getCachedLessons();
        if (cached.length > 0) {
          setLesson(cached[Math.floor(Math.random() * cached.length)]);
          setIsFromCache(true);
          toast({
            title: currentLanguage === 'hi' ? 'ऑफलाइन मोड' :
                   currentLanguage === 'kn' ? 'ಆಫ್‌ಲೈನ್ ಮೋಡ್' : 
                   currentLanguage === 'te' ? 'ఆఫ్‌లైన్ మోడ్' : 'Offline Mode',
            description: currentLanguage === 'hi'
              ? 'कैश से पाठ दिखाया गया।'
              : currentLanguage === 'kn'
              ? 'ಕ್ಯಾಶ್ ಮಾಡಿದ ಪಾಠ ತೋರಿಸಲಾಗಿದೆ'
              : currentLanguage === 'te'
              ? 'కాష్ చేసిన పాఠం చూపబడింది'
              : 'Showing cached lesson'
          });
        } else {
          toast({
            title: "Error",
            variant: "destructive",
            description: currentLanguage === 'hi'
              ? 'पाठ लोड नहीं हुआ'
              : currentLanguage === 'kn'
              ? 'ಪಾಠ ಲೋಡ್ ವಿಫಲ'
              : currentLanguage === 'te'
              ? 'పాఠం లోడ్ విఫలమైంది'
              : 'Failed to load lesson'
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [currentLanguage, toast, addLesson, getCachedLessons]
  );

  const handleNextLesson = () => {
    setShowTopicSelector(true);
    setLesson(null);
  };

  const handleTopicSelect = (topic: string, cropType?: string, season?: string, region?: string) => {
    generateLesson(topic, cropType, season, region);
  };

  const handleAskQuestion = (topic: string) => {
    setActiveTab('qa');
    setLearningContext(prev => ({ ...prev, topic }));
  };

  const labels = {
    en: { 
      title: '📚 AI Learning Center',
      subtitle: 'Personalized lessons in 5 minutes',
      lessons: 'Lessons',
      qa: 'Ask Expert',
      notifications: 'Reminders',
      preparing: 'Preparing your personalized lesson...'
    },
    hi: { 
      title: '📚 AI शिक्षा केंद्र',
      subtitle: '5 मिनट में व्यक्तिगत पाठ',
      lessons: 'पाठ',
      qa: 'विशेषज्ञ से पूछें',
      notifications: 'रिमाइंडर',
      preparing: 'आपका व्यक्तिगत पाठ तैयार हो रहा है...'
    },
    kn: { 
      title: '📚 AI ಕಲಿಕೆ ಕೇಂದ್ರ',
      subtitle: '5 ನಿಮಿಷದಲ್ಲಿ ವೈಯಕ್ತಿಕ ಪಾಠಗಳು',
      lessons: 'ಪಾಠಗಳು',
      qa: 'ತಜ್ಞರನ್ನು ಕೇಳಿ',
      notifications: 'ಜ್ಞಾಪನೆಗಳು',
      preparing: 'ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಪಾಠ ಸಿದ್ಧವಾಗುತ್ತಿದೆ...'
    },
    te: {
      title: '📚 AI అభ్యసన కేంద్రం',
      subtitle: '5 నిమిషాల్లో వ్యక్తిగత పాఠాలు',
      lessons: 'పాఠాలు',
      qa: 'నిపుణులను అడగండి',
      notifications: 'రిమైండర్లు',
      preparing: 'మీ వ్యక్తిగత పాఠం సిద్ధమవుతోంది...'
    }
  };
  const t = labels[currentLanguage as keyof typeof labels] || labels.en;

  return (
    <section id="learn" className="py-12 md:py-20 bg-gradient-earth">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold">{t.title}</h2>
          <p className="text-muted-foreground text-lg">{t.subtitle}</p>
          <OfflineIndicator currentLanguage={currentLanguage} isFromCache={isFromCache} />
        </div>

        {/* Progress Dashboard */}
        <ProgressDashboard currentLanguage={currentLanguage} />

        {/* Notification Settings Card */}
        <div className="mb-6">
          <LearningNotifications currentLanguage={currentLanguage} />
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full max-w-md mx-auto grid grid-cols-2">
            <TabsTrigger value="lessons" className="gap-2">
              <BookOpen className="h-4 w-4" />
              {t.lessons}
            </TabsTrigger>
            <TabsTrigger value="qa" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              {t.qa}
            </TabsTrigger>
          </TabsList>

          {/* Lessons Tab */}
          <TabsContent value="lessons" className="space-y-6">
            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-10">
                <Loader2 className="h-12 w-12 mx-auto animate-spin mb-4 text-primary" />
                <p className="text-lg">{t.preparing}</p>
                <div className="flex justify-center gap-1 mt-4">
                  {[...Array(3)].map((_, i) => (
                    <Sparkles 
                      key={i} 
                      className="h-5 w-5 text-primary animate-pulse" 
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Topic Selector */}
            {!lesson && !isLoading && showTopicSelector && (
              <EnhancedTopicSelector 
                currentLanguage={currentLanguage} 
                onSelectTopic={handleTopicSelect} 
                isLoading={isLoading}
              />
            )}

            {/* Lesson Display */}
            {lesson && !isLoading && (
              <EnhancedMicroLesson
                lesson={lesson}
                currentLanguage={currentLanguage}
                onNextLesson={handleNextLesson}
                onAskQuestion={handleAskQuestion}
              />
            )}
          </TabsContent>

          {/* Q&A Tab */}
          <TabsContent value="qa">
            <InteractiveQA 
              currentLanguage={currentLanguage}
              context={learningContext}
            />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export default LearningSection;
