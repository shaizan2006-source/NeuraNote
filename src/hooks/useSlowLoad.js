// src/hooks/useSlowLoad.js
'use client';
import { useState, useEffect } from 'react';

export function useSlowLoad(loading, threshold = 300) {
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShowSkeleton(false);
      return;
    }
    const id = setTimeout(() => setShowSkeleton(true), threshold);
    return () => clearTimeout(id);
  }, [loading, threshold]);

  return showSkeleton;
}
