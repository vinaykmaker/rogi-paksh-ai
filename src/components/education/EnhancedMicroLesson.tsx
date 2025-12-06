import React, { useState, useEffect } from 'react';
import { 
  Volume2, VolumeX, ChevronRight, CheckCircle, Lightbulb, Trophy, 
  RefreshCw, Play, Pause, Video, BookOpen, Clock, Award, Star,
  Download, Share2, Bookmark, MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSpeechSynthesis, getLocalizedText } from '@/hooks/useSpeechSynthesis';
import { useLearningProgress, useLessonCache } from '@/hooks/useOfflineCache';
import { useToast } from '@/hooks/use-toast';

interface MultilingualText {
  en: string;
  hi: string;
  kn: string;
  te?: string;
}

interface StepByStep {
  step: number;
  action: MultilingualText;
  timing?: string;
  materials?: string[];
  warning?: MultilingualText;
}

interface EnhancedLesson {
  title: MultilingualText;
  duration: string;
  difficulty: string;
  icon: string;
  category?: string;
  summary: MultilingualText;
  audioSummary?: MultilingualText;
  keyPoints: Array<MultilingualText>;
  stepByStep?: StepByStep[];
  practicalTip: MultilingualText;
  didYouKnow: MultilingualText;
  doNot?: MultilingualText;
  preventionTips?: Array<MultilingualText>;
  videoTopic?: string;
  videoUrl?: string;
  quiz?: {
    question: MultilingualText;
    options: string[];
    answer: number;
    explanation?: MultilingualText;
  };
  additionalQuizzes?: Array<{
    question: MultilingualText;
    options: string[];
    answer: number;
    explanation?: MultilingualText;
  }>;
  relatedTopics?: string[];
  governmentSchemes?: Array<{
    name: string;
    description: MultilingualText;
    link?: string;
  }>;
  generatedAt?: string;
}

interface EnhancedMicroLessonProps {
  lesson: EnhancedLesson;
  currentLanguage: string;
  onNextLesson: () => void;
  onComplete?: (topic: string, score: number) => void;
  onAskQuestion?: (question: string) => void;
}

const EnhancedMicroLesson: React.FC<EnhancedMicroLessonProps> = ({ 
  lesson, 
  currentLanguage, 
  onNextLesson,
  onComplete,
  onAskQuestion
}) => {
  const [activeTab, setActiveTab] = useState('learn');
  const [currentStep, setCurrentStep] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showAnswers, setShowAnswers] = useState<boolean[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  
  const { speak, stop, toggle, isSpeaking, isSupported } = useSpeechSynthesis({ 
    language: currentLanguage,
    rate: 0.9 // Slower for farmers
  });
  const { recordQuizAnswer, recordLessonComplete } = useLearningProgress();
  const { addLesson } = useLessonCache();
  const { toast } = useToast();

  const getText = (obj: MultilingualText | undefined): string => {
    if (!obj) return '';
    return obj[currentLanguage as keyof MultilingualText] || obj.en || '';
  };

  // Auto-save lesson for offline
  useEffect(() => {
    if (lesson) {
      addLesson(lesson);
    }
  }, [lesson, addLesson]);

  // Track reading progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = window.scrollY;
      setReadingProgress(Math.min((scrolled / scrollHeight) * 100, 100));
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'bg-green-500';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-red-500';
      default: return 'bg-primary';
    }
  };

  const allQuizzes = [
    lesson.quiz,
    ...(lesson.additionalQuizzes || [])
  ].filter(Boolean);

  const handleAnswerSelect = (quizIdx: number, answerIdx: number) => {
    if (showAnswers[quizIdx]) return;
    
    const newSelectedAnswers = [...selectedAnswers];
    newSelectedAnswers[quizIdx] = answerIdx;
    setSelectedAnswers(newSelectedAnswers);
    
    const newShowAnswers = [...showAnswers];
    newShowAnswers[quizIdx] = true;
    setShowAnswers(newShowAnswers);
    
    const isCorrect = answerIdx === allQuizzes[quizIdx]?.answer;
    recordQuizAnswer(isCorrect);
  };

  const calculateScore = () => {
    if (allQuizzes.length === 0) return 100;
    const correct = selectedAnswers.filter((ans, idx) => ans === allQuizzes[idx]?.answer).length;
    return Math.round((correct / allQuizzes.length) * 100);
  };

  const handleComplete = () => {
    const score = calculateScore();
    recordLessonComplete(getText(lesson.title), 5);
    onComplete?.(getText(lesson.title), score);
    
    toast({
      title: currentLanguage === 'hi' ? '🎉 पाठ पूरा!' : 
             currentLanguage === 'kn' ? '🎉 ಪಾಠ ಪೂರ್ಣ!' : '🎉 Lesson Complete!',
      description: `Score: ${score}%`
    });
    
    onNextLesson();
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    toast({
      title: isBookmarked ? 
        (currentLanguage === 'hi' ? 'बुकमार्क हटाया' : 'Bookmark removed') :
        (currentLanguage === 'hi' ? 'बुकमार्क किया' : 'Bookmarked!')
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: getText(lesson.title),
        text: getText(lesson.summary),
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link copied!' });
    }
  };

  const speakFullLesson = () => {
    const fullText = [
      getText(lesson.title),
      getText(lesson.summary),
      ...lesson.keyPoints.map(p => getText(p)),
      getText(lesson.practicalTip)
    ].join('. ');
    speak(fullText);
    setIsAutoPlaying(true);
  };

  const stopAudio = () => {
    stop();
    setIsAutoPlaying(false);
  };

  const labels = {
    en: { 
      learn: 'Learn', practice: 'Practice', quizTab: 'Quiz', resources: 'Resources',
      keyPoints: 'Key Points', tip: 'Practical Tip', didYouKnow: 'Did You Know?', 
      doNot: 'Avoid This', prevention: 'Prevention Tips', stepByStep: 'Step-by-Step Guide',
      quizLabel: 'Quick Quiz', correct: 'Correct!', incorrect: 'Incorrect', 
      next: 'Next Lesson', complete: 'Complete Lesson', listenAll: 'Listen to Full Lesson',
      askQuestion: 'Ask a Question', schemes: 'Government Schemes',
      step: 'Step', materials: 'Materials needed', warning: 'Warning', timing: 'When'
    },
    hi: { 
      learn: 'सीखें', practice: 'अभ्यास', quizTab: 'क्विज', resources: 'संसाधन',
      keyPoints: 'मुख्य बातें', tip: 'व्यावहारिक सुझाव', didYouKnow: 'क्या आप जानते हैं?',
      doNot: 'यह न करें', prevention: 'रोकथाम टिप्स', stepByStep: 'चरण-दर-चरण मार्गदर्शिका',
      quizLabel: 'त्वरित क्विज', correct: 'सही!', incorrect: 'गलत',
      next: 'अगला पाठ', complete: 'पाठ पूरा करें', listenAll: 'पूरा पाठ सुनें',
      askQuestion: 'सवाल पूछें', schemes: 'सरकारी योजनाएं',
      step: 'चरण', materials: 'आवश्यक सामग्री', warning: 'चेतावनी', timing: 'कब'
    },
    kn: { 
      learn: 'ಕಲಿಯಿರಿ', practice: 'ಅಭ್ಯಾಸ', quizTab: 'ಕ್ವಿಜ್', resources: 'ಸಂಪನ್ಮೂಲಗಳು',
      keyPoints: 'ಮುಖ್ಯ ಅಂಶಗಳು', tip: 'ಪ್ರಾಯೋಗಿಕ ಸಲಹೆ', didYouKnow: 'ನಿಮಗೆ ಗೊತ್ತೇ?',
      doNot: 'ಇದನ್ನು ಮಾಡಬೇಡಿ', prevention: 'ತಡೆಗಟ್ಟುವಿಕೆ ಸಲಹೆಗಳು', stepByStep: 'ಹಂತ-ಹಂತವಾಗಿ ಮಾರ್ಗದರ್ಶಿ',
      quizLabel: 'ತ್ವರಿತ ಕ್ವಿಜ್', correct: 'ಸರಿ!', incorrect: 'ತಪ್ಪು',
      next: 'ಮುಂದಿನ ಪಾಠ', complete: 'ಪಾಠ ಪೂರ್ಣಗೊಳಿಸಿ', listenAll: 'ಪೂರ್ಣ ಪಾಠ ಕೇಳಿ',
      askQuestion: 'ಪ್ರಶ್ನೆ ಕೇಳಿ', schemes: 'ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು',
      step: 'ಹಂತ', materials: 'ಅಗತ್ಯ ವಸ್ತುಗಳು', warning: 'ಎಚ್ಚರಿಕೆ', timing: 'ಯಾವಾಗ'
    },
    te: {
      learn: 'నేర్చుకోండి', practice: 'అభ్యాసం', quizTab: 'క్విజ్', resources: 'వనరులు',
      keyPoints: 'ముఖ్య అంశాలు', tip: 'ఆచరణాత్మక చిట్కా', didYouKnow: 'మీకు తెలుసా?',
      doNot: 'ఇది చేయవద్దు', prevention: 'నివారణ చిట్కాలు', stepByStep: 'దశల వారీ గైడ్',
      quizLabel: 'త్వరిత క్విజ్', correct: 'సరి!', incorrect: 'తప్పు',
      next: 'తదుపరి పాఠం', complete: 'పాఠం పూర్తి', listenAll: 'పూర్తి పాఠం వినండి',
      askQuestion: 'ప్రశ్న అడగండి', schemes: 'ప్రభుత్వ పథకాలు',
      step: 'దశ', materials: 'అవసరమైన సామగ్రి', warning: 'హెచ్చరిక', timing: 'ఎప్పుడు'
    }
  };
  const t = labels[currentLanguage as keyof typeof labels] || labels.en;

  return (
    <div className="space-y-4">
      {/* Reading Progress Bar */}
      <Progress value={readingProgress} className="h-1 fixed top-0 left-0 right-0 z-50" />

      <Card className="overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <CardHeader className="bg-gradient-primary text-primary-foreground">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{lesson.icon}</span>
              <div>
                <CardTitle className="text-xl md:text-2xl mb-1">
                  {getText(lesson.title)}
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="bg-white/20 text-primary-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    {lesson.duration}
                  </Badge>
                  <Badge className={`${getDifficultyColor(lesson.difficulty)} text-white`}>
                    {lesson.difficulty}
                  </Badge>
                  {lesson.category && (
                    <Badge variant="outline" className="border-white/40 text-primary-foreground">
                      {lesson.category}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                onClick={handleBookmark}
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-white/20"
              >
                <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
              </Button>
              <Button
                onClick={handleShare}
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-white/20"
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-muted/30 p-0">
              <TabsTrigger value="learn" className="flex-1 data-[state=active]:bg-background">
                <BookOpen className="h-4 w-4 mr-2" />
                {t.learn}
              </TabsTrigger>
              <TabsTrigger value="practice" className="flex-1 data-[state=active]:bg-background">
                <Play className="h-4 w-4 mr-2" />
                {t.practice}
              </TabsTrigger>
            <TabsTrigger value="quiz" className="flex-1 data-[state=active]:bg-background">
              <Trophy className="h-4 w-4 mr-2" />
              {t.quizTab}
            </TabsTrigger>
            </TabsList>

            {/* LEARN TAB */}
            <TabsContent value="learn" className="p-6 space-y-6 m-0">
              {/* Audio Controls */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Button
                  onClick={isAutoPlaying ? stopAudio : speakFullLesson}
                  variant="outline"
                  className="gap-2"
                  disabled={!isSupported}
                >
                  {isAutoPlaying ? (
                    <>
                      <VolumeX className="h-4 w-4" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4" />
                      {t.listenAll}
                    </>
                  )}
                </Button>
                {isSpeaking && (
                  <span className="text-sm text-muted-foreground animate-pulse">
                    🔊 Playing...
                  </span>
                )}
              </div>

              {/* Summary */}
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
                    <li key={index} className="flex items-start gap-3 group">
                      <ChevronRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="flex-1">{getText(point)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => speak(getText(point))}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Practical Tip */}
              <div className="bg-accent/10 p-4 rounded-xl border border-accent/30">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
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

              {/* Mistake to Avoid */}
              {lesson.doNot && (
                <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-xl border border-red-200 dark:border-red-800">
                  <h4 className="font-semibold mb-2 text-red-700 dark:text-red-400">
                    ⚠️ {t.doNot}
                  </h4>
                  <p className="text-red-700 dark:text-red-300">{getText(lesson.doNot)}</p>
                </div>
              )}

              {/* Prevention Tips */}
              {lesson.preventionTips && lesson.preventionTips.length > 0 && (
                <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-xl border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold mb-3 text-green-700 dark:text-green-400">
                    🛡️ {t.prevention}
                  </h4>
                  <ul className="space-y-2">
                    {lesson.preventionTips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2 text-green-700 dark:text-green-300">
                        <span className="text-green-500">✓</span>
                        {getText(tip)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Government Schemes */}
              {lesson.governmentSchemes && lesson.governmentSchemes.length > 0 && (
                <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                  <h4 className="font-semibold mb-3 text-purple-700 dark:text-purple-400">
                    🏛️ {t.schemes}
                  </h4>
                  <div className="space-y-3">
                    {lesson.governmentSchemes.map((scheme, index) => (
                      <div key={index} className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                        <p className="font-medium text-purple-800 dark:text-purple-300">{scheme.name}</p>
                        <p className="text-sm text-purple-600 dark:text-purple-400">{getText(scheme.description)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* PRACTICE TAB - Step by Step */}
            <TabsContent value="practice" className="p-6 space-y-6 m-0">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                {t.stepByStep}
              </h4>

              {lesson.stepByStep && lesson.stepByStep.length > 0 ? (
                <div className="space-y-4">
                  {lesson.stepByStep.map((step, index) => (
                    <div 
                      key={index}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        currentStep === index 
                          ? 'border-primary bg-primary/5' 
                          : 'border-muted bg-muted/30'
                      }`}
                      onClick={() => setCurrentStep(index)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          currentStep >= index ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {step.step}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{getText(step.action)}</p>
                          {step.timing && (
                            <p className="text-sm text-muted-foreground mt-1">
                              ⏰ {t.timing}: {step.timing}
                            </p>
                          )}
                          {step.materials && step.materials.length > 0 && (
                            <p className="text-sm text-muted-foreground mt-1">
                              📦 {t.materials}: {step.materials.join(', ')}
                            </p>
                          )}
                          {step.warning && (
                            <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                              ⚠️ {getText(step.warning)}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            speak(getText(step.action));
                          }}
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Step-by-step guide coming soon...</p>
                </div>
              )}
            </TabsContent>

            {/* QUIZ TAB */}
            <TabsContent value="quiz" className="p-6 space-y-6 m-0">
              {allQuizzes.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-primary" />
                      🎯 {t.quizLabel}
                    </h4>
                    <Badge variant="outline">
                      {showAnswers.filter(Boolean).length}/{allQuizzes.length}
                    </Badge>
                  </div>

                  {allQuizzes.map((quiz, qIdx) => (
                    <div key={qIdx} className="bg-primary/5 p-4 rounded-xl border border-primary/20 mb-4">
                      <p className="mb-4 font-medium flex items-start gap-2">
                        <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                          {qIdx + 1}
                        </span>
                        {getText(quiz?.question)}
                      </p>
                      <div className="grid gap-2">
                        {quiz?.options.map((option, index) => (
                          <Button
                            key={index}
                            variant={
                              showAnswers[qIdx]
                                ? index === quiz.answer
                                  ? 'default'
                                  : selectedAnswers[qIdx] === index
                                  ? 'danger'
                                  : 'outline'
                                : 'outline'
                            }
                            className={`justify-start text-left h-auto py-3 ${
                              showAnswers[qIdx] && index === quiz.answer ? 'bg-green-500 hover:bg-green-500' : ''
                            }`}
                            onClick={() => handleAnswerSelect(qIdx, index)}
                            disabled={showAnswers[qIdx]}
                          >
                            <span className="font-bold mr-3">{String.fromCharCode(65 + index)}.</span>
                            {option}
                          </Button>
                        ))}
                      </div>
                      {showAnswers[qIdx] && (
                        <div className={`mt-3 p-3 rounded-lg ${
                          selectedAnswers[qIdx] === quiz?.answer 
                            ? 'bg-green-100 dark:bg-green-900/30' 
                            : 'bg-red-100 dark:bg-red-900/30'
                        }`}>
                          <p className={`font-medium ${
                            selectedAnswers[qIdx] === quiz?.answer ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {selectedAnswers[qIdx] === quiz?.answer ? `✅ ${t.correct}` : `❌ ${t.incorrect}`}
                          </p>
                          {quiz?.explanation && (
                            <p className="text-sm mt-1 opacity-80">{getText(quiz.explanation)}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Score Summary */}
                  {showAnswers.filter(Boolean).length === allQuizzes.length && (
                    <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-6 rounded-xl text-center">
                      <Award className="h-12 w-12 mx-auto mb-3 text-yellow-500" />
                      <p className="text-2xl font-bold mb-2">{t.score}: {calculateScore()}%</p>
                      <div className="flex gap-2 justify-center">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-6 w-6 ${
                              i < Math.ceil(calculateScore() / 20) 
                                ? 'text-yellow-500 fill-yellow-500' 
                                : 'text-muted'
                            }`} 
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Quiz coming soon...</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Bottom Actions */}
          <div className="p-6 border-t space-y-3">
            {onAskQuestion && (
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => onAskQuestion(getText(lesson.title))}
              >
                <MessageCircle className="h-4 w-4" />
                {t.askQuestion}
              </Button>
            )}
            <Button onClick={handleComplete} className="w-full touch-target gap-2">
              <RefreshCw className="h-5 w-5" />
              {allQuizzes.length > 0 && showAnswers.filter(Boolean).length < allQuizzes.length 
                ? t.complete 
                : t.next}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedMicroLesson;
