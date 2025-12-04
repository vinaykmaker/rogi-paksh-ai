import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Loader2, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLessonCache, useLearningProgress } from '@/hooks/useOfflineCache';
import ProgressDashboard from './education/ProgressDashboard';
import MicroLesson from './education/MicroLesson';
import TopicSelector from './education/TopicSelector';
import OfflineIndicator from './education/OfflineIndicator';

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
  const [isFromCache, setIsFromCache] = useState(false);
  const [showTopicSelector, setShowTopicSelector] = useState(true);
  const { toast } = useToast();
  const { addLesson, getCachedLessons } = useLessonCache();
  const { getProgress } = useLearningProgress();

  const generateLesson = useCallback(async (topic?: string, cropType?: string, season?: string) => {
    setIsLoading(true);
    setIsFromCache(false);
    setShowTopicSelector(false);

    try {
      const { data, error } = await supabase.functions.invoke('generate-lesson', {
        body: { 
          topic,
          cropType,
          season,
          language: currentLanguage 
        }
      });

      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      setLesson(data);
      addLesson(data);

    } catch (error) {
      console.error('Failed to generate lesson:', error);
      
      // Try to get from cache if offline
      const cached = getCachedLessons();
      if (cached.length > 0) {
        const randomCached = cached[Math.floor(Math.random() * cached.length)];
        setLesson(randomCached);
        setIsFromCache(true);
        toast({
          title: currentLanguage === 'hi' ? 'ऑफलाइन मोड' : currentLanguage === 'kn' ? 'ಆಫ್‌ಲೈನ್ ಮೋಡ್' : 'Offline Mode',
          description: currentLanguage === 'hi' ? 'कैश्ड पाठ दिखाया जा रहा है' : currentLanguage === 'kn' ? 'ಕ್ಯಾಶ್ ಮಾಡಿದ ಪಾಠ ತೋರಿಸಲಾಗುತ್ತಿದೆ' : 'Showing cached lesson',
        });
      } else {
        toast({
          title: "Error",
          description: currentLanguage === 'hi' ? 'पाठ लोड करने में विफल' : currentLanguage === 'kn' ? 'ಪಾಠ ಲೋಡ್ ಮಾಡಲು ವಿಫಲವಾಗಿದೆ' : 'Failed to load lesson',
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentLanguage, toast, addLesson, getCachedLessons]);

  const handleNextLesson = () => {
    setShowTopicSelector(true);
    setLesson(null);
  };

  const handleTopicSelect = (topic: string, cropType?: string, season?: string) => {
    generateLesson(topic || undefined, cropType, season);
  };

  // Load cached lesson on mount
  useEffect(() => {
    const cached = getCachedLessons();
    if (cached.length > 0 && !lesson) {
      // Don't auto-load, let user choose
    }
  }, []);

  const labels = {
    en: { title: '📚 AI Learning Center', subtitle: 'Personalized micro-lessons in 5 minutes', startLesson: 'Start Learning' },
    hi: { title: '📚 AI शिक्षा केंद्र', subtitle: '5 मिनट में व्यक्तिगत माइक्रो-पाठ', startLesson: 'सीखना शुरू करें' },
    kn: { title: '📚 AI ಕಲಿಕಾ ಕೇಂದ್ರ', subtitle: '5 ನಿಮಿಷದಲ್ಲಿ ವೈಯಕ್ತಿಕ ಮೈಕ್ರೋ-ಪಾಠಗಳು', startLesson: 'ಕಲಿಯಲು ಪ್ರಾರಂಭಿಸಿ' }
  };
  const t = labels[currentLanguage as keyof typeof labels] || labels.en;

  return (
    <section id="learn" className="py-12 md:py-20 bg-gradient-earth">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">
            {t.title}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-4">
            {t.subtitle}
          </p>
          <OfflineIndicator currentLanguage={currentLanguage} isFromCache={isFromCache} />
        </div>

        {/* Progress Dashboard */}
        <div className="max-w-4xl mx-auto">
          <ProgressDashboard currentLanguage={currentLanguage} />
        </div>

        {/* Main Content */}
        <div className="max-w-3xl mx-auto">
          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-lg text-muted-foreground">
                {currentLanguage === 'hi' ? 'आपके लिए पाठ तैयार हो रहा है...' :
                 currentLanguage === 'kn' ? 'ನಿಮಗಾಗಿ ಪಾಠ ಸಿದ್ಧವಾಗುತ್ತಿದೆ...' :
                 'Preparing your personalized lesson...'}
              </p>
            </div>
          )}

          {/* Topic Selector */}
          {!lesson && !isLoading && showTopicSelector && (
            <TopicSelector
              currentLanguage={currentLanguage}
              onSelectTopic={handleTopicSelect}
              isLoading={isLoading}
            />
          )}

          {/* Lesson Content */}
          {lesson && !isLoading && (
            <MicroLesson
              lesson={lesson}
              currentLanguage={currentLanguage}
              onNextLesson={handleNextLesson}
            />
          )}
        </div>
      </div>
    </section>
  );
};

export default LearningSection;
