import React, { createContext, useState, useContext } from 'react';

const UIContext = createContext();

export const UIProvider = ({ children }) => {
  const [isBottomNavVisible, setBottomNavVisible] = useState(true);

  return (
    <UIContext.Provider value={{ isBottomNavVisible, setBottomNavVisible }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => useContext(UIContext);
