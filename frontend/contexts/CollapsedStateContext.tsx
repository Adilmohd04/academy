'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CollapsedStateContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const CollapsedStateContext = createContext<CollapsedStateContextType | undefined>(undefined);

export const CollapsedStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <CollapsedStateContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </CollapsedStateContext.Provider>
  );
};

export const useCollapsedState = () => {
  const context = useContext(CollapsedStateContext);
  if (!context) {
    throw new Error('useCollapsedState must be used within CollapsedStateProvider');
  }
  return context;
};
