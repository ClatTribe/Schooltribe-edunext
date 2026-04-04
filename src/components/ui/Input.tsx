import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, className = '', ...props }, ref) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-sm font-bold uppercase tracking-wide text-slate-400"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          className={`
            rounded-lg border bg-surface-700/50 px-4 py-3 text-base text-white
            transition-all placeholder:text-slate-500
            focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20
            ${error ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20' : 'border-surface-600'}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-sm text-error-500"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            id={`${inputId}-helper`}
            className="text-sm text-slate-500"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
