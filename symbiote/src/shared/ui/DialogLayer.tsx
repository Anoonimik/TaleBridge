import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { containDialogFocus } from './focus';
/** Accessible native boundary for specialized dialogs that own their visual header. */
export function DialogLayer({
  children,
  title,
  onClose,
}: {
  children: ReactNode;
  title: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    return () => {
      if (element?.open) element.close();
    };
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      aria-label={title}
      aria-modal="true"
      onKeyDown={containDialogFocus}
      className="m-0 p-0 border-0 bg-transparent text-inherit fixed inset-0 w-screen max-w-none h-dvh max-h-none"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {children}
    </dialog>,
    document.body,
  );
}
