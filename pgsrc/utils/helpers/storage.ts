
export const getStorageItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Error getting item ${key} from storage:`, error);
    return null;
  }
};

export const setStorageItem = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Error setting item ${key} in storage:`, error);
  }
};

export const removeStorageItem = (key: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing item ${key} from storage:`, error);
  }
};

export const clearStorage = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.clear();
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
};

// Type-safe storage helpers
export const getStorageObject = <T>(key: string): T | null => {
  const item = getStorageItem(key);
  if (!item) return null;
  
  try {
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error parsing JSON for key ${key}:`, error);
    return null;
  }
};

export const setStorageObject = <T>(key: string, value: T): void => {
  try {
    const serialized = JSON.stringify(value);
    setStorageItem(key, serialized);
  } catch (error) {
    console.error(`Error stringifying object for key ${key}:`, error);
  }
};