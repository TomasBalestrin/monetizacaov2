import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EditableCellProps {
  value: number;
  onSave: (newValue: number) => void;
  disabled?: boolean;
  isCurrency?: boolean;
  className?: string;
}

export function EditableCell({ value, onSave, disabled, isCurrency, className }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    setEditValue(String(value));
  }, [value]);

  const handleSave = () => {
    setEditing(false);
    const num = parseFloat(editValue) || 0;
    if (num !== value) {
      onSave(num);
    }
  };

  const formatDisplay = (v: number) => {
    if (isCurrency) {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    }
    return String(v);
  };

  if (disabled) {
    return <span className={className}>{formatDisplay(value)}</span>;
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        type="number"
        step={isCurrency ? '0.01' : '1'}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') { setEditing(false); setEditValue(String(value)); }
        }}
        className="h-7 w-20 text-right text-sm px-1"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        'cursor-pointer hover:bg-primary/10 rounded px-1.5 py-0.5 transition-colors text-right min-w-[3rem] inline-block',
        className
      )}
      title="Clique para editar"
    >
      {formatDisplay(value)}
    </button>
  );
}
