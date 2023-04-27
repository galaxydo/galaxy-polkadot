import { useEffect, useRef } from 'react';

export const useIsMounted = (): { readonly current: boolean } => {
  const isMountedRef = useRef<boolean>(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return isMountedRef;
};