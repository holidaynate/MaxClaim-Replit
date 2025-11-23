import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type TextSize = 'normal' | 'large' | 'extra-large';
type Language = 'en' | 'es';

interface AccessibilitySettings {
  textSize: TextSize;
  highContrast: boolean;
  language: Language;
}

interface AccessibilityContextType extends AccessibilitySettings {
  setTextSize: (size: TextSize) => void;
  setHighContrast: (enabled: boolean) => void;
  setLanguage: (lang: Language) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [textSize, setTextSizeState] = useState<TextSize>(() => {
    const saved = localStorage.getItem('accessibility-text-size');
    return (saved as TextSize) || 'normal';
  });

  const [highContrast, setHighContrastState] = useState<boolean>(() => {
    const saved = localStorage.getItem('accessibility-high-contrast');
    return saved === 'true';
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

  // Apply language to document
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('lang', language);
    localStorage.setItem('accessibility-language', language);
  }, [language]);

  const setTextSize = (size: TextSize) => setTextSizeState(size);
  const setHighContrast = (enabled: boolean) => setHighContrastState(enabled);
  const setLanguage = (lang: Language) => setLanguageState(lang);

  return (
    <AccessibilityContext.Provider
      value={{
        textSize,
        highContrast,
        language,
        setTextSize,
        setHighContrast,
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
