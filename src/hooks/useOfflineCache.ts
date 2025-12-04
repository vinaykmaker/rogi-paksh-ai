import { useState, useEffect, useCallback } from 'react';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const CACHE_PREFIX = 'agribot_';
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function useOfflineCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = DEFAULT_TTL
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const cacheKey = `${CACHE_PREFIX}${key}`;

  const getFromCache = useCallback((): T | null => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const item: CacheItem<T> = JSON.parse(cached);
      if (Date.now() > item.expiresAt) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      return item.data;
    } catch {
      return null;
    }
  }, [cacheKey]);

  const setToCache = useCallback((data: T) => {
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl
      };
      localStorage.setItem(cacheKey, JSON.stringify(item));
    } catch (e) {
      console.warn('Failed to cache data:', e);
    }
  }, [cacheKey, ttl]);

  const refresh = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    // Try cache first if not forcing refresh
    if (!forceRefresh) {
      const cached = getFromCache();
      if (cached) {
        setData(cached);
        setIsFromCache(true);
        setIsLoading(false);
        return cached;
      }
    }

    try {
      const freshData = await fetchFn();
      setData(freshData);
      setToCache(freshData);
      setIsFromCache(false);
      return freshData;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to fetch data';
      setError(errorMsg);
      
      // Fallback to cache on error
      const cached = getFromCache();
      if (cached) {
        setData(cached);
        setIsFromCache(true);
      }
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, getFromCache, setToCache]);

  const clearCache = useCallback(() => {
    localStorage.removeItem(cacheKey);
    setData(null);
    setIsFromCache(false);
  }, [cacheKey]);

  useEffect(() => {
    const cached = getFromCache();
    if (cached) {
      setData(cached);
      setIsFromCache(true);
    }
  }, [getFromCache]);

  return { data, isLoading, error, isFromCache, refresh, clearCache, setData };
}

// Hook for managing lesson cache with max items
export function useLessonCache(maxLessons = 20) {
  const LESSONS_KEY = `${CACHE_PREFIX}lessons_cache`;

  const getCachedLessons = useCallback(() => {
    try {
      const cached = localStorage.getItem(LESSONS_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }, []);

  const addLesson = useCallback((lesson: any) => {
    try {
      const lessons = getCachedLessons();
      const newLessons = [
        { ...lesson, cachedAt: Date.now() },
        ...lessons.filter((l: any) => l.title?.en !== lesson.title?.en)
      ].slice(0, maxLessons);
      localStorage.setItem(LESSONS_KEY, JSON.stringify(newLessons));
    } catch (e) {
      console.warn('Failed to cache lesson:', e);
    }
  }, [getCachedLessons, maxLessons]);

  const getLessonCount = useCallback(() => {
    return getCachedLessons().length;
  }, [getCachedLessons]);

  const clearOldLessons = useCallback((maxAge = 7 * 24 * 60 * 60 * 1000) => {
    try {
      const lessons = getCachedLessons();
      const filtered = lessons.filter((l: any) => 
        Date.now() - l.cachedAt < maxAge
      );
      localStorage.setItem(LESSONS_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Failed to clear old lessons:', e);
    }
  }, [getCachedLessons]);

  return { getCachedLessons, addLesson, getLessonCount, clearOldLessons };
}

// Progress tracking hook
export function useLearningProgress() {
  const PROGRESS_KEY = `${CACHE_PREFIX}learning_progress`;

  const getProgress = useCallback(() => {
    try {
      const stored = localStorage.getItem(PROGRESS_KEY);
      return stored ? JSON.parse(stored) : {
        lessonsCompleted: 0,
        quizzesCorrect: 0,
        quizzesTotal: 0,
        streak: 0,
        lastActiveDate: null,
        topicsLearned: [],
        totalTimeMinutes: 0
      };
    } catch {
      return {
        lessonsCompleted: 0,
        quizzesCorrect: 0,
        quizzesTotal: 0,
        streak: 0,
        lastActiveDate: null,
        topicsLearned: [],
        totalTimeMinutes: 0
      };
    }
  }, []);

  const updateProgress = useCallback((update: Partial<ReturnType<typeof getProgress>>) => {
    try {
      const current = getProgress();
      const today = new Date().toDateString();
      const lastActive = current.lastActiveDate;
      
      // Calculate streak
      let newStreak = current.streak;
      if (lastActive) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastActive === yesterday.toDateString()) {
          newStreak = current.streak + 1;
        } else if (lastActive !== today) {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }

      const updated = {
        ...current,
        ...update,
        streak: newStreak,
        lastActiveDate: today
      };
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.warn('Failed to update progress:', e);
      return getProgress();
    }
  }, [getProgress]);

  const recordLessonComplete = useCallback((topic: string, timeMinutes: number) => {
    const current = getProgress();
    return updateProgress({
      lessonsCompleted: current.lessonsCompleted + 1,
      totalTimeMinutes: current.totalTimeMinutes + timeMinutes,
      topicsLearned: [...new Set([...current.topicsLearned, topic])]
    });
  }, [getProgress, updateProgress]);

  const recordQuizAnswer = useCallback((correct: boolean) => {
    const current = getProgress();
    return updateProgress({
      quizzesCorrect: current.quizzesCorrect + (correct ? 1 : 0),
      quizzesTotal: current.quizzesTotal + 1
    });
  }, [getProgress, updateProgress]);

  return { getProgress, updateProgress, recordLessonComplete, recordQuizAnswer };
}
