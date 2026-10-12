import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, error, hint, id, className, rows = 5, ...props }, ref) {
    const inputId = id ?? props.name;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-text"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={error && inputId ? `${inputId}-error` : undefined}
          className={cn(
            'w-full rounded-xl border bg-surface px-4 py-3 text-sm text-text',
            'placeholder:text-muted',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
            error ? 'border-danger-500' : 'border-border',
            className
          )}
          {...props}
        />
        {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
        {error && (
          <p id={inputId ? `${inputId}-error` : undefined} className="mt-1 text-xs text-danger-600">
            {error}
          </p>
        )}
      </div>
    );
  }
);
