import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
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

const LearningSection: React.FC<LearningSectionProps> = ({ currentLanguage }) => {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [showTopicSelector, setShowTopicSelector] = useState(true);

  const { toast } = useToast();
  const { addLesson, getCachedLessons } = useLessonCache();

  // ---- AUTO DETECTION INTEGRATION ----
  const detectCropFromImage = async (imageBase64: string) => {
    const { data, error } = await supabase.functions.invoke('detect-crop-type', {
      body: { image: imageBase64 }
    });
    if (error) throw error;
    return data.cropType;
  };

  const generateLesson = useCallback(
    async (topic?: string, cropType?: string, season?: string, imageBase64?: string) => {
      setIsLoading(true);
      setIsFromCache(false);
      setShowTopicSelector(false);

      try {
        // If image provided → auto-detect crop type
        let detectedCrop = cropType;
        if (!cropType && imageBase64) {
          detectedCrop = await detectCropFromImage(imageBase64);
        }

        const { data, error } = await supabase.functions.invoke('generate-lesson', {
          body: {
            topic,
            cropType: detectedCrop,
            season,
            language: currentLanguage
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
                   currentLanguage === 'kn' ? 'ಆಫ್‌ಲೈನ್ ಮೋಡ್' : 'Offline Mode',
            description: currentLanguage === 'hi'
              ? 'कैश से पाठ दिखाया गया।'
              : currentLanguage === 'kn'
              ? 'ಕ್ಯಾಶ್ ಮಾಡಿದ ಪಾಠ ತೋರಿಸಲಾಗಿದೆ'
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

  const handleTopicSelect = (topic: string, cropType?: string, season?: string, image?: string) => {
    generateLesson(topic, cropType, season, image);
  };

  return (
    <section id="learn" className="py-12 md:py-20 bg-gradient-earth">
      <div className="container mx-auto px-4">
        {/* HEAD */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold">📚 AI Learning Center</h2>
          <p className="text-muted-foreground text-lg">Personalized micro-lessons in 5 minutes</p>
          <OfflineIndicator currentLanguage={currentLanguage} isFromCache={isFromCache} />
        </div>

        <ProgressDashboard currentLanguage={currentLanguage} />

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-10">
            <Loader2 className="h-12 w-12 mx-auto animate-spin mb-4" />
            <p>{currentLanguage === 'hi' ? 'पाठ तैयार हो रहा है...' :
                 currentLanguage === 'kn' ? 'ಪಾಠ ಸಿದ್ಧವಾಗುತ್ತಿದೆ...' :
                 'Preparing your lesson...'}</p>
          </div>
        )}

        {!lesson && !isLoading && showTopicSelector && (
          <TopicSelector currentLanguage={currentLanguage} onSelectTopic={handleTopicSelect} isLoading={isLoading} />
        )}

        {lesson && !isLoading && (
          <MicroLesson
            lesson={lesson}
            currentLanguage={currentLanguage}
            onNextLesson={handleNextLesson}
          />
        )}
      </div>
    </section>
  );
};

export default LearningSection;
