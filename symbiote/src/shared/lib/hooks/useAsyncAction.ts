import { useEffect, useRef, useState } from 'react';

/** One user action per mounted session. Late results cannot update a replaced session. */
export function useAsyncAction() {
  const mounted = useRef(false);
  const running = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const run = async (action: (isCurrent: () => boolean) => Promise<void>) => {
    if (running.current || !mounted.current) return;
    running.current = true;
    setPending(true);
    setError('');
    try {
      await action(() => mounted.current);
    } catch (cause) {
      if (mounted.current)
        setError(cause instanceof Error ? cause.message : 'Не удалось выполнить действие');
    } finally {
      running.current = false;
      if (mounted.current) setPending(false);
    }
  };
  return { pending, error, run };
}
