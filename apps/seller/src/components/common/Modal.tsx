import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Dialog Box */}
      <div
        className={cn(
          'relative w-full bg-white rounded-3xl shadow-warm-xl border border-stone-warm-200/80 overflow-hidden z-10 my-8 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]',
          maxWidths[maxWidth]
        )}
      >
        {/* Modal Header */}
        {(title || description) && (
          <div className="p-6 border-b border-stone-warm-200/80 flex items-start justify-between bg-stone-warm-50/50">
            <div>
              {title && (
                <h3 className="text-xl font-display font-bold text-charcoal-900">
                  {title}
                </h3>
              )}
              {description && (
                <p className="mt-1 text-sm text-stone-warm-600">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 -mt-2 text-stone-warm-500 hover:text-charcoal-900 hover:bg-stone-warm-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};
