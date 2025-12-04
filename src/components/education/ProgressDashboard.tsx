import React from 'react';
import { Trophy, Flame, BookOpen, Target, Clock, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLearningProgress } from '@/hooks/useOfflineCache';

interface ProgressDashboardProps {
  currentLanguage: string;
}

const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ currentLanguage }) => {
  const { getProgress } = useLearningProgress();
  const progress = getProgress();

  const accuracyPercent = progress.quizzesTotal > 0 
    ? Math.round((progress.quizzesCorrect / progress.quizzesTotal) * 100)
    : 0;

  const labels = {
    en: {
      streak: 'Day Streak',
      lessons: 'Lessons Done',
      quizAccuracy: 'Quiz Accuracy',
      topics: 'Topics Learned',
      timeSpent: 'Time Invested',
      minutes: 'mins',
      keepGoing: 'Keep learning daily!',
      greatProgress: 'Great progress!'
    },
    hi: {
      streak: 'दिन स्ट्रीक',
      lessons: 'पूरे पाठ',
      quizAccuracy: 'क्विज सटीकता',
      topics: 'सीखे विषय',
      timeSpent: 'समय निवेश',
      minutes: 'मिनट',
      keepGoing: 'रोज़ सीखते रहें!',
      greatProgress: 'बढ़िया प्रगति!'
    },
    kn: {
      streak: 'ದಿನ ಸ್ಟ್ರೀಕ್',
      lessons: 'ಪೂರ್ಣ ಪಾಠಗಳು',
      quizAccuracy: 'ಕ್ವಿಜ್ ನಿಖರತೆ',
      topics: 'ಕಲಿತ ವಿಷಯಗಳು',
      timeSpent: 'ಸಮಯ ಹೂಡಿಕೆ',
      minutes: 'ನಿಮಿಷ',
      keepGoing: 'ಪ್ರತಿದಿನ ಕಲಿಯುತ್ತಿರಿ!',
      greatProgress: 'ಅದ್ಭುತ ಪ್ರಗತಿ!'
    }
  };

  const t = labels[currentLanguage as keyof typeof labels] || labels.en;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {/* Streak Card */}
      <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-200 dark:border-orange-800">
        <CardContent className="p-4 text-center">
          <Flame className="h-8 w-8 mx-auto mb-2 text-orange-500" />
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {progress.streak}
          </div>
          <div className="text-xs text-muted-foreground">{t.streak}</div>
        </CardContent>
      </Card>

      {/* Lessons Card */}
      <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-200 dark:border-green-800">
        <CardContent className="p-4 text-center">
          <BookOpen className="h-8 w-8 mx-auto mb-2 text-green-500" />
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {progress.lessonsCompleted}
          </div>
          <div className="text-xs text-muted-foreground">{t.lessons}</div>
        </CardContent>
      </Card>

      {/* Quiz Accuracy Card */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4 text-center">
          <Target className="h-8 w-8 mx-auto mb-2 text-blue-500" />
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {accuracyPercent}%
          </div>
          <div className="text-xs text-muted-foreground">{t.quizAccuracy}</div>
        </CardContent>
      </Card>

      {/* Topics Card */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-200 dark:border-purple-800">
        <CardContent className="p-4 text-center">
          <Star className="h-8 w-8 mx-auto mb-2 text-purple-500" />
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {progress.topicsLearned.length}
          </div>
          <div className="text-xs text-muted-foreground">{t.topics}</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressDashboard;
