import React from 'react';
import { cn } from '@/lib/utils';
import { Phone, Users } from 'lucide-react';

export type SDRType = 'sdr' | 'social_selling';

interface SDRTypeToggleProps {
  value: SDRType;
  onChange: (value: SDRType) => void;
}

export function SDRTypeToggle({ value, onChange }: SDRTypeToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg bg-muted p-1">
      <button
        onClick={() => onChange('sdr')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
          value === 'sdr'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Phone size={16} />
        <span>SDR</span>
      </button>
      <button
        onClick={() => onChange('social_selling')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
          value === 'social_selling'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Users size={16} />
        <span>Social Selling</span>
      </button>
    </div>
  );
}
