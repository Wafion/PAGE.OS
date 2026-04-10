
"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
type SourceKey = "gutendex" | "web";

export type SourceSettings = Partial<Record<SourceKey, boolean>>;

type ReaderSettings = {
  autoScroll: boolean;
  setAutoScroll: (value: boolean) => void;
  sourceSettings: SourceSettings;
  toggleSource: (sourceKey: SourceKey) => void;
  showBootAnimation: boolean;
  setShowBootAnimation: (value: boolean) => void;
};

const ReaderSettingsContext = createContext<ReaderSettings | undefined>(undefined);

const defaultSourceSettings: SourceSettings = {
  gutendex: true,
};

export function ReaderSettingsProvider({ children }: { children: ReactNode }) {
  const [autoScroll, setAutoScroll] = useState(false);
  const [sourceSettings, setSourceSettings] = useState<SourceSettings>(defaultSourceSettings);
  const [showBootAnimation, setShowBootAnimation] = useState(true);

  const handleSetAutoScroll = useCallback((value: boolean) => {
    try {
      localStorage.setItem('pageos-autoscroll', JSON.stringify(value));
    } catch (error) {
      console.warn(`Error setting autoscroll in localStorage: ${error}`);
    }
    setAutoScroll(value);
  }, []);
  
  const handleSetShowBootAnimation = useCallback((value: boolean) => {
    try {
      localStorage.setItem('pageos-show-boot-animation', JSON.stringify(value));
    } catch (error) {
      console.warn(`Error setting boot animation setting in localStorage: ${error}`);
    }
    setShowBootAnimation(value);
  }, []);

  const toggleSource = useCallback((sourceKey: SourceKey) => {
    setSourceSettings(prev => {
      const newSettings = { ...prev, [sourceKey]: !prev[sourceKey] };
      try {
        localStorage.setItem('pageos-source-settings', JSON.stringify(newSettings));
      } catch (error) {
        console.warn(`Error setting source settings in localStorage: ${error}`);
      }
      return newSettings;
    });
  }, []);

  useEffect(() => {
    try {
      const storedAutoScroll = localStorage.getItem('pageos-autoscroll');
      if (storedAutoScroll) {
        setAutoScroll(JSON.parse(storedAutoScroll));
      }
      const storedSources = localStorage.getItem('pageos-source-settings');
      if (storedSources) {
        // Merge with defaults to ensure new sources are included
        const parsed = JSON.parse(storedSources);
        setSourceSettings(prev => ({ ...prev, ...parsed }));
      } else {
        // If nothing is in localStorage, set the defaults
        localStorage.setItem('pageos-source-settings', JSON.stringify(defaultSourceSettings));
      }
      const storedBootAnimation = localStorage.getItem('pageos-show-boot-animation');
      if (storedBootAnimation !== null) {
        setShowBootAnimation(JSON.parse(storedBootAnimation));
      }

    } catch (error) {
      console.warn(`Error reading settings from localStorage: ${error}`);
    }
  }, []);


  const value = {
    autoScroll,
    setAutoScroll: handleSetAutoScroll,
    sourceSettings,
    toggleSource,
    showBootAnimation,
    setShowBootAnimation: handleSetShowBootAnimation,
  };

  return (
    <ReaderSettingsContext.Provider value={value}>
      {children}
    </ReaderSettingsContext.Provider>
  );
}

export const useReaderSettings = () => {
  const context = useContext(ReaderSettingsContext);
  if (context === undefined) {
    throw new Error('useReaderSettings must be used within a ReaderSettingsProvider');
  }
  return context;
};
