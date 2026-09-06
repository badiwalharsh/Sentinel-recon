import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, label, leftIcon, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && <label className="block text-xs font-mono font-medium text-slate-300">{label}</label>}
        <div className="relative flex items-center">
          {leftIcon && <div className="absolute left-3 text-slate-400 pointer-events-none">{leftIcon}</div>}
          <input
            type={type}
            ref={ref}
            className={cn(
              'w-full bg-slate-950/70 border border-slate-700/80 rounded-md text-sm text-slate-100 placeholder:text-slate-500',
              'focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors duration-150',
              leftIcon ? 'pl-9 pr-3 py-2' : 'px-3 py-2',
              error && 'border-rose-500 focus:ring-rose-500 focus:border-rose-500',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-rose-400 font-mono">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
