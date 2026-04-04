import { forwardRef, type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-500 text-surface-900 font-bold hover:bg-primary-400 hover:shadow-[0_0_24px_rgba(245,158,11,0.3)] active:scale-[0.98]',
  secondary:
    'bg-secondary-500 text-white font-bold hover:bg-secondary-400 hover:shadow-[0_0_24px_rgba(16,185,129,0.2)]',
  outline:
    'border border-surface-600 bg-surface-700/50 text-slate-200 hover:border-slate-500 hover:bg-surface-700/80 backdrop-blur-sm',
  ghost:
    'text-slate-300 hover:bg-surface-700/60 hover:text-white',
  danger:
    'bg-error-600 text-white font-bold hover:bg-error-500',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-8 py-3.5 text-base',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center gap-2 rounded-lg
          transition-all duration-200 focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900
          disabled:cursor-not-allowed disabled:opacity-40
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
