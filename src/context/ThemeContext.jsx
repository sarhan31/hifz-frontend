import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const themes = {
  darkGreen: "bg-gradient-to-b from-green-900 to-black text-white",
  lightPaper: "bg-[#f5f1e6] text-black",
  nightBlue: "bg-blue-950 text-white",
  highContrast: "bg-black text-yellow-300"
};

export const themeNames = {
  darkGreen: "Dark Green",
  lightPaper: "Light Paper",
  nightBlue: "Night Blue",
  highContrast: "High Contrast"
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('appTheme');
    return savedTheme || 'darkGreen';
  });

  useEffect(() => {
    localStorage.setItem('appTheme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
