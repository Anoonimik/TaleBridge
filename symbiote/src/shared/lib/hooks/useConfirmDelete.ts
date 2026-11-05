import { useState, useRef, useEffect, useCallback } from 'react';

interface UseConfirmDeleteOptions {
  timeoutMs?: number;
  onDelete: () => void;
}

export function useConfirmDelete({ timeoutMs = 3500, onDelete }: UseConfirmDeleteOptions) {
  const [isConfirming, setIsConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      // Shift-click bypasses confirmation
      if (e.shiftKey) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        setIsConfirming(false);
        onDelete();
        return;
      }

      if (isConfirming) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        setIsConfirming(false);
        onDelete();
      } else {
        setIsConfirming(true);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
          setIsConfirming(false);
          timerRef.current = null;
        }, timeoutMs);
      }
    },
    [isConfirming, timeoutMs, onDelete]
  );

  const cancelConfirm = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsConfirming(false);
  }, []);

  return { isConfirming, handleDelete, cancelConfirm };
}
