'use client';

import { useEffect } from 'react';

export function useFeatureLogger(featureName: string) {
  useEffect(() => {
    console.debug(`[feature] mounted: ${featureName}`);
    return () => {
      console.debug(`[feature] unmounted: ${featureName}`);
    };
  }, [featureName]);
}
