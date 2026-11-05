import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: string;
  maxWidthClass?: string;
  maxHeightClass?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}

export const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidthClass = 'max-w-md',
  maxHeightClass = 'max-h-[90vh]',
  children,
  headerRight,
}) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (isOpen && element && !element.open) element.showModal();
    if (!isOpen && element?.open) element.close();
    return () => {if(element?.open) element.close();};
  }, [isOpen]);

  return createPortal(
    <dialog ref={dialog} aria-labelledby={titleId} aria-modal="true" className="m-0 p-0 border-0 bg-transparent text-inherit fixed inset-0 w-screen max-w-none h-dvh max-h-none" onCancel={e => {e.preventDefault();onClose();}}>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-[#141622] border border-[#262a3d] rounded-xl w-full ${maxWidthClass} ${maxHeightClass} flex flex-col shadow-2xl text-xs overflow-hidden animate-in zoom-in-95 duration-100`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#262a3d] bg-[#10111a] shrink-0">
          <div className="flex flex-col min-w-0 pr-2">
            <h3 id={titleId} className="font-bold text-slate-100 uppercase tracking-wider text-xs truncate">
              {title}
            </h3>
            {subtitle && (
              <span className="text-[10px] text-slate-400 truncate">{subtitle}</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerRight}
            <button
              type="button"
              className="text-slate-400 hover:text-white text-base font-bold cursor-pointer w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-[#1f2233]"
              onClick={onClose}
              title="Закрыть (Esc)"
              aria-label="Закрыть окно"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
    </dialog>, document.body
  );
};
