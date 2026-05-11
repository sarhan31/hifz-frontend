import React, { createContext, useState, useContext, useEffect } from 'react';
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import gu from '../locales/gu.json';
import ur from '../locales/ur.json';

const LanguageContext = createContext();

const translations = {
  en,
  hi,
  gu,
  ur,
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('appLanguage');
    console.log('LanguageProvider: Initializing. Saved language:', saved);
    return saved || 'en';
  });

  useEffect(() => {
    console.log('LanguageProvider: Language changed to:', language);
    localStorage.setItem('appLanguage', language);
    // document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr';
  }, [language]);

  const t = (key) => {
    const translation = translations[language][key];
    if (!translation) {
      console.warn(`LanguageProvider: Missing translation for key "${key}" in language "${language}"`);
      return key;
    }
    return translation;
  };

  const changeLanguage = (lang) => {
    if (translations[lang]) {
      console.log('LanguageProvider: Changing language to:', lang);
      setLanguage(lang);
    } else {
      console.error('LanguageProvider: Invalid language code:', lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
