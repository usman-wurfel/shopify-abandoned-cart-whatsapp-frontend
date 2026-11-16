'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

type EmbeddedPathContextType = {
  /** Current path when embedded (from hash). e.g. '/' or '/abandoned-carts' */
  embeddedPath: string;
  /** Set path via hash (no parent URL change) */
  setEmbeddedPath: (path: string) => void;
  isEmbedded: boolean;
};

const EmbeddedPathContext = createContext<EmbeddedPathContextType>({
  embeddedPath: '/',
  setEmbeddedPath: () => {},
  isEmbedded: false,
});

export function useEmbeddedPath() {
  return useContext(EmbeddedPathContext);
}

function getPathFromHash(): string {
  if (typeof window === 'undefined') return '/';
  const hash = window.location.hash.slice(1);
  if (!hash || hash === '') return '/';
  return hash.startsWith('/') ? hash : `/${hash}`;
}

export function EmbeddedPathProvider({ children, isEmbedded }: { children: ReactNode; isEmbedded: boolean }) {
  const [embeddedPath, setEmbeddedPathState] = useState('/');

  useEffect(() => {
    if (!isEmbedded) return;
    setEmbeddedPathState(getPathFromHash());
    const handleHashChange = () => setEmbeddedPathState(getPathFromHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isEmbedded]);

  const setEmbeddedPath = useCallback((path: string) => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    if (typeof window !== 'undefined') {
      window.location.hash = normalized;
    }
    setEmbeddedPathState(normalized);
  }, []);

  return (
    <EmbeddedPathContext.Provider value={{ embeddedPath: isEmbedded ? embeddedPath : '/', setEmbeddedPath, isEmbedded }}>
      {children}
    </EmbeddedPathContext.Provider>
  );
}
