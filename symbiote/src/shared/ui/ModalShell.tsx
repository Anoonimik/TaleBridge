import React from 'react';
import { useEscKey } from '../lib/hooks/useEscKey';

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
  useEscKey(isOpen, onClose);

  if (!isOpen) return null;

  return (
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
            <h3 className="font-bold text-slate-100 uppercase tracking-wider text-xs truncate">
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
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
};
