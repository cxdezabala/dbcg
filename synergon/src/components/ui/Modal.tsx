'use client';
import { useEffect, type ReactNode } from 'react';
import s from './modal.module.css';

export function Modal({ open, onClose, children, wide, label }: { open: boolean; onClose: () => void; children: ReactNode; wide?: boolean; label?: string }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className={'dialog-backdrop ' + s.backdrop} onClick={onClose}>
      <div className={'dialog ' + s.dialog + (wide ? ' ' + s.wide : '')} role="dialog" aria-modal="true" aria-label={label} onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}
