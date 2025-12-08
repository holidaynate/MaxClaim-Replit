import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type TextSize = 'normal' | 'large' | 'extra-large';
type FontStyle = 'sans-serif' | 'serif' | 'dyslexia-friendly';
type Language = 'en' | 'es';

interface AccessibilitySettings {
  textSize: TextSize;
  fontStyle: FontStyle;
  highContrast: boolean;
  reduceMotion: boolean;
  language: Language;
}

interface AccessibilityContextType extends AccessibilitySettings {
  setTextSize: (size: TextSize) => void;
  setFontStyle: (style: FontStyle) => void;
  setHighContrast: (enabled: boolean) => void;
  setReduceMotion: (enabled: boolean) => void;
  setLanguage: (lang: Language) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [textSize, setTextSizeState] = useState<TextSize>(() => {
    const saved = localStorage.getItem('accessibility-text-size');
    return (saved as TextSize) || 'normal';
  });

  const [fontStyle, setFontStyleState] = useState<FontStyle>(() => {
    const saved = localStorage.getItem('accessibility-font-style');
    return (saved as FontStyle) || 'sans-serif';
  });

  const [highContrast, setHighContrastState] = useState<boolean>(() => {
    const saved = localStorage.getItem('accessibility-high-contrast');
    return saved === 'true';
  });

  const [reduceMotion, setReduceMotionState] = useState<boolean>(() => {
    const saved = localStorage.getItem('accessibility-reduce-motion');
    if (saved !== null) return saved === 'true';
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  });

  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('accessibility-language');
    return (saved as Language) || 'en';
  });

  // Apply text size to document
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-text-size', textSize);
    localStorage.setItem('accessibility-text-size', textSize);
  }, [textSize]);

  // Apply font style to document
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-font-style', fontStyle);
    localStorage.setItem('accessibility-font-style', fontStyle);
  }, [fontStyle]);

  // Apply high contrast to document
  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    localStorage.setItem('accessibility-high-contrast', String(highContrast));
  }, [highContrast]);

  // Apply reduced motion to document
  useEffect(() => {
    const root = document.documentElement;
    if (reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
    localStorage.setItem('accessibility-reduce-motion', String(reduceMotion));
  }, [reduceMotion]);

  // Apply language to document
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('lang', language);
    localStorage.setItem('accessibility-language', language);
  }, [language]);

  const setTextSize = (size: TextSize) => setTextSizeState(size);
  const setFontStyle = (style: FontStyle) => setFontStyleState(style);
  const setHighContrast = (enabled: boolean) => setHighContrastState(enabled);
  const setReduceMotion = (enabled: boolean) => setReduceMotionState(enabled);
  const setLanguage = (lang: Language) => setLanguageState(lang);

  return (
    <AccessibilityContext.Provider
      value={{
        textSize,
        fontStyle,
        highContrast,
        reduceMotion,
        language,
        setTextSize,
        setFontStyle,
        setHighContrast,
        setReduceMotion,
        setLanguage,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}
