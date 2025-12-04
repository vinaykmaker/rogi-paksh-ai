import React, { useState } from 'react';
import { Volume2, ChevronRight, CheckCircle, Lightbulb, Trophy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSpeechSynthesis, getLocalizedText } from '@/hooks/useSpeechSynthesis';
import { useLearningProgress } from '@/hooks/useOfflineCache';

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

interface MicroLessonProps {
  lesson: Lesson;
  currentLanguage: string;
  onNextLesson: () => void;
  onComplete?: (topic: string) => void;
}

const MicroLesson: React.FC<MicroLessonProps> = ({ 
  lesson, 
  currentLanguage, 
  onNextLesson,
  onComplete 
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const { toggle, isSpeaking } = useSpeechSynthesis({ language: currentLanguage });
  const { recordQuizAnswer, recordLessonComplete } = useLearningProgress();

  const getText = (obj: { en: string; hi: string; kn: string } | undefined) => 
    getLocalizedText(obj, currentLanguage);

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
    
    const isCorrect = index === lesson.quiz?.answer;
    recordQuizAnswer(isCorrect);
  };

  const handleComplete = () => {
    recordLessonComplete(getText(lesson.title), 5);
    onComplete?.(getText(lesson.title));
    onNextLesson();
  };

  const labels = {
    en: { keyPoints: 'Key Points:', tip: 'Practical Tip:', didYouKnow: 'Did You Know?', quiz: 'Quick Quiz:', correct: 'Correct!', incorrect: 'Incorrect. Correct answer highlighted.', next: 'Next Lesson' },
    hi: { keyPoints: 'मुख्य बातें:', tip: 'व्यावहारिक सुझाव:', didYouKnow: 'क्या आप जानते हैं?', quiz: 'त्वरित क्विज:', correct: 'सही!', incorrect: 'गलत। सही जवाब हरे रंग में।', next: 'अगला पाठ' },
    kn: { keyPoints: 'ಮುಖ್ಯ ಅಂಶಗಳು:', tip: 'ಪ್ರಾಯೋಗಿಕ ಸಲಹೆ:', didYouKnow: 'ನಿಮಗೆ ಗೊತ್ತೇ?', quiz: 'ತ್ವರಿತ ಕ್ವಿಜ್:', correct: 'ಸರಿ!', incorrect: 'ತಪ್ಪು. ಸರಿ ಉತ್ತರ ಹಸಿರು ಬಣ್ಣದಲ್ಲಿ.', next: 'ಮುಂದಿನ ಪಾಠ' }
  };
  const t = labels[currentLanguage as keyof typeof labels] || labels.en;

  return (
    <Card className="overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <CardHeader className="bg-gradient-primary text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{lesson.icon}</span>
            <div>
              <CardTitle className="text-xl md:text-2xl mb-1">
                {getText(lesson.title)}
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
            onClick={onNextLesson}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Summary with TTS */}
        <div className="flex items-start gap-3">
          <p className="text-lg leading-relaxed flex-1">{getText(lesson.summary)}</p>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggle(getText(lesson.summary))}
            className="flex-shrink-0"
          >
            <Volume2 className={`h-5 w-5 ${isSpeaking ? 'animate-pulse text-primary' : ''}`} />
          </Button>
        </div>

        {/* Key Points */}
        <div className="bg-muted/50 p-4 rounded-xl">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            {t.keyPoints}
          </h4>
          <ul className="space-y-3">
            {lesson.keyPoints?.map((point, index) => (
              <li key={index} className="flex items-start gap-3">
                <ChevronRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>{getText(point)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Practical Tip */}
        <div className="bg-accent/10 p-4 rounded-xl border border-accent/30">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-accent" />
            💡 {t.tip}
          </h4>
          <p>{getText(lesson.practicalTip)}</p>
        </div>

        {/* Did You Know */}
        <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold mb-2 text-blue-700 dark:text-blue-400">
            🤔 {t.didYouKnow}
          </h4>
          <p className="text-blue-700 dark:text-blue-300">{getText(lesson.didYouKnow)}</p>
        </div>

        {/* Quiz */}
        {lesson.quiz && (
          <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              🎯 {t.quiz}
            </h4>
            <p className="mb-4 font-medium">{getText(lesson.quiz.question)}</p>
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
                {selectedAnswer === lesson.quiz.answer ? `✅ ${t.correct}` : `❌ ${t.incorrect}`}
              </p>
            )}
          </div>
        )}

        {/* Next Lesson Button */}
        <Button onClick={handleComplete} className="w-full touch-target gap-2">
          <RefreshCw className="h-5 w-5" />
          {t.next}
        </Button>
      </CardContent>
    </Card>
  );
};

export default MicroLesson;
