import React, { useState, useEffect } from 'react';
import { WifiOff, Database, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLessonCache } from '@/hooks/useOfflineCache';

interface OfflineIndicatorProps {
  currentLanguage: string;
  isFromCache?: boolean;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  currentLanguage, 
  isFromCache 
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { getLessonCount } = useLessonCache();
  const cachedCount = getLessonCount();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const labels = {
    en: { offline: 'Offline Mode', cached: 'From Cache', lessonsAvailable: 'lessons available offline' },
    hi: { offline: 'ऑफलाइन मोड', cached: 'कैश से', lessonsAvailable: 'पाठ ऑफलाइन उपलब्ध' },
    kn: { offline: 'ಆಫ್‌ಲೈನ್ ಮೋಡ್', cached: 'ಕ್ಯಾಶ್‌ನಿಂದ', lessonsAvailable: 'ಪಾಠಗಳು ಆಫ್‌ಲೈನ್ ಲಭ್ಯ' }
  };
  const t = labels[currentLanguage as keyof typeof labels] || labels.en;

  if (isOnline && !isFromCache) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {!isOnline && (
        <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          <WifiOff className="h-3 w-3" />
          {t.offline}
        </Badge>
      )}
      
      {isFromCache && (
        <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <Database className="h-3 w-3" />
          {t.cached}
        </Badge>
      )}

      {cachedCount > 0 && (
        <Badge variant="outline" className="gap-1">
          <CheckCircle className="h-3 w-3 text-green-500" />
          {cachedCount} {t.lessonsAvailable}
        </Badge>
      )}
    </div>
  );
};

export default OfflineIndicator;
