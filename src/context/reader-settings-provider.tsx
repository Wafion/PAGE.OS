
"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-provider';

type SourceKey = "gutendex" | "web";
export type UiMode = "classic" | "lounge";

export type SourceSettings = Partial<Record<SourceKey, boolean>>;

type ReaderSettings = {
  autoScroll: boolean;
  setAutoScroll: (value: boolean) => void;
  uiMode: UiMode;
  setUiMode: (value: UiMode) => void;
  sourceSettings: SourceSettings;
  toggleSource: (sourceKey: SourceKey) => void;
  showBootAnimation: boolean;
  setShowBootAnimation: (value: boolean) => void;
};

const ReaderSettingsContext = createContext<ReaderSettings | undefined>(undefined);

const defaultSourceSettings: SourceSettings = {
  gutendex: true,
};

const normalizeUiMode = (value: string | null | undefined): UiMode => {
  if (value === "lounge" || value === "simple") {
    return "lounge";
  }

  return "classic";
};

export function ReaderSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [autoScroll, setAutoScroll] = useState(false);
  const [uiMode, setUiMode] = useState<UiMode>(() => {
    if (typeof window === "undefined") {
      return "classic";
    }

    return normalizeUiMode(window.localStorage.getItem("pageos-ui-mode"));
  });
  const [sourceSettings, setSourceSettings] = useState<SourceSettings>(defaultSourceSettings);
  const [showBootAnimation, setShowBootAnimation] = useState(true);

  const applyUiMode = useCallback((value: UiMode) => {
    const root = window.document.documentElement;
    root.classList.remove("ui-classic", "ui-lounge");
    root.classList.add(value === "lounge" ? "ui-lounge" : "ui-classic");
    setUiMode(value);
  }, []);

  const saveUiModeToFirebase = useCallback(async (value: UiMode) => {
    if (!user) {
      return;
    }

    try {
      await setDoc(
        doc(db, "users", user.uid, "preferences", "interface"),
        {
          uiMode: value,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    } catch (error) {
      console.warn(`Error saving UI mode to Firebase: ${error}`);
    }
  }, [user]);

  const handleSetAutoScroll = useCallback((value: boolean) => {
    try {
      localStorage.setItem('pageos-autoscroll', JSON.stringify(value));
    } catch (error) {
      console.warn(`Error setting autoscroll in localStorage: ${error}`);
    }
    setAutoScroll(value);
  }, []);

  const handleSetUiMode = useCallback((value: UiMode) => {
    try {
      localStorage.setItem("pageos-ui-mode", value);
    } catch (error) {
      console.warn(`Error setting UI mode in localStorage: ${error}`);
    }

    applyUiMode(value);
    void saveUiModeToFirebase(value);
  }, [applyUiMode, saveUiModeToFirebase]);
  
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
      const storedUiMode = normalizeUiMode(localStorage.getItem("pageos-ui-mode"));
      localStorage.setItem("pageos-ui-mode", storedUiMode);
      applyUiMode(storedUiMode);

    } catch (error) {
      console.warn(`Error reading settings from localStorage: ${error}`);
    }
  }, [applyUiMode]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let isMounted = true;
    const userId = user.uid;

    async function loadRemoteUiMode() {
      try {
        const preferenceRef = doc(db, "users", userId, "preferences", "interface");
        const preferenceSnapshot = await getDoc(preferenceRef);
        const remoteMode = normalizeUiMode(preferenceSnapshot.data()?.uiMode);

        if (preferenceSnapshot.exists()) {
          if (!isMounted) {
            return;
          }

          localStorage.setItem("pageos-ui-mode", remoteMode);
          applyUiMode(remoteMode);
          return;
        }

        const localMode = normalizeUiMode(localStorage.getItem("pageos-ui-mode"));
        await setDoc(
          preferenceRef,
          {
            uiMode: localMode,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      } catch (error) {
        console.warn(`Error loading UI mode from Firebase: ${error}`);
      }
    }

    void loadRemoteUiMode();

    return () => {
      isMounted = false;
    };
  }, [applyUiMode, user]);


  const value = {
    autoScroll,
    setAutoScroll: handleSetAutoScroll,
    uiMode,
    setUiMode: handleSetUiMode,
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
