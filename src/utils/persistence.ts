/**
 * Persistence utility for client-side caching
 */

export const CACHE_KEYS = {
  MESSAGES: 'campushub_messages_cache',
  GROUPS: 'campushub_groups_cache',
  COURSES: 'campushub_courses_cache',
  FILES: 'campushub_files_cache',
};

export const saveToCache = (key: string, data: any) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to cache', e);
  }
};

export const getFromCache = (key: string, defaultValue: any = null) => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error('Failed to get from cache', e);
    return defaultValue;
  }
};
