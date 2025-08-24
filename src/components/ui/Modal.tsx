import React, { useEffect } from 'react';

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  // Enhancements
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  overlayClassName?: string;
  contentClassName?: string;
  preventCloseOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
}

export function Modal({
  open,
  onOpenChange,
  children,
  size = 'md',
  overlayClassName = '',
  contentClassName = '',
  preventCloseOnOverlayClick = false,
  closeOnEsc = true,
}: ModalProps) {
  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, closeOnEsc, onOpenChange]);

  if (!open) return null;

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-6xl',
    full: 'max-w-[95vw] h-[95vh]'
  }[size];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 ${overlayClassName}`}
      onClick={() => {
        if (!preventCloseOnOverlayClick) onOpenChange(false);
      }}
      aria-modal="true"
      role="dialog"
    >
      <div
        className={`bg-white rounded-lg shadow-xl w-full ${sizeClass} max-h-[90vh] flex flex-col overflow-hidden p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function ModalHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function ModalTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-xl font-bold ${className}`}>{children}</h2>;
}

export function ModalDescription({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-sm text-gray-500 ${className}`}>{children}</p>;
}

export function ModalFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mt-4 flex justify-end space-x-2 ${className}`}>{children}</div>;
}