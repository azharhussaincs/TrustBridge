'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, description, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className={cn(
          'relative w-full max-w-md rounded-2xl bg-white p-6 shadow-elevated animate-slide-up',
          className
        )}
      >
        <h3 id="modal-title" className="text-lg font-semibold text-slate-900">
          {title}
        </h3>
        {description && (
          <div className="mt-2 text-sm text-slate-500">{description}</div>
        )}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

interface ModalFooterProps {
  onCancel: () => void;
  onConfirm?: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger' | 'success';
  isSubmit?: boolean;
}

export function ModalFooter({
  onCancel,
  onConfirm,
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  isSubmit = false,
}: ModalFooterProps) {
  return (
    <div className="mt-6 flex gap-3">
      <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
        {cancelLabel}
      </Button>
      <Button
        type={isSubmit ? 'submit' : 'button'}
        variant={confirmVariant}
        onClick={onConfirm}
        className="flex-[2]"
      >
        {confirmLabel}
      </Button>
    </div>
  );
}
