import React, { useState, useEffect } from 'react';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmModal({
  isOpen,
  title = 'WAIT!',
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'YES',
  cancelLabel = 'NO',
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-pixel-black/60 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />
      
      {/* The RPG Box itself */}
      <div 
        className="relative z-10 w-full max-w-md bg-pixel-dark border-[4px] border-pixel-border text-pixel-slate-light p-6 animate-in zoom-in-95 duration-200"
        style={{ boxShadow: '8px 8px 0 var(--color-pixel-black)' }}
      >
        <div className="absolute top-0 left-0 right-0 h-[4px] bg-pixel-red opacity-80" />

        <h3 className="font-[family-name:var(--font-pixel)] text-[14px] text-pixel-red mb-4 tracking-wider leading-relaxed">
          {title}
        </h3>
        
        <p className="font-[family-name:var(--font-vt)] text-[24px] min-h-[72px] leading-relaxed text-pixel-slate">
          {message}
        </p>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t-2 border-pixel-border border-dashed">
          <Button variant="danger" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
